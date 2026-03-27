# Secure iMessage Sync Runner v1

## Summary
Build a new monorepo package, `packages/imessage-sync`, as a macOS-only local CLI that reads macOS Contacts and Apple Messages `chat.db`, then syncs that data into Rolodex through dedicated API endpoints.

The final v1 shape is:
- keep `Person` as the main entity
- add `PersonPhone` for multiple phone numbers
- keep `PersonEmail`, but store canonical normalized email directly in the existing field
- add `MessageEvent` with one latest-message row per person
- add `UserSyncCursor`
- add `UserDeviceToken`
- harden API auth so neither the app nor the runner can impersonate users with `x-user-id`

All phone/email matching is exact only. No name matching. No external identity table. Contacts sync runs before messages sync.

## Key Changes

### Data model
Update Prisma schema to support multi-phone people, latest-message sync, and secure incremental ingestion.

Schema changes:
- Make `Person.firstName` nullable.
  This allows creation of phone-only or email-only people from sync without fake placeholder names.
- Add `PersonPhone`:
  - `id`, `personId`, `phoneNumber`, `isPrimary`, `createdAt`, `updatedAt`
  - `phoneNumber` stores the canonical normalized value
  - unique on `(personId, phoneNumber)`
  - index on `phoneNumber`
- Keep `PersonEmail`, but store canonical lowercase trimmed email directly in `email`
  - add an index on `email` if not already sufficient for matching workload
- Add `MessageEvent`:
  - `id`, `personId`, `body`, `sentAt`, `direction`, `createdAt`, `updatedAt`
  - unique on `personId`
  - semantics: latest known synced message summary for that person
- Add `UserSyncCursor`:
  - `id`, `userId`, `source`, `cursor`, `lastSuccessAt`, `createdAt`, `updatedAt`
  - unique on `(userId, source)`
- Add `UserDeviceToken`:
  - `id`, `userId`, `name`, `tokenHash`, `lastUsedAt`, `revokedAt`, `createdAt`

Shared type changes:
- Extend `Person` in [packages/types/src/rolodex.ts](/Users/iankorovinsky/Projects/rolodex/packages/types/src/rolodex.ts) to include:
  - `phones: PersonPhone[]`
  - `messageEvent: MessageEvent | null`
- Extend person request types to support `phoneNumbers?: string[]`
- Keep manual UI validation stricter than sync if desired, but server-side sync ingestion must allow missing names

Normalization rules:
- Normalize before every write and comparison
- Persist only canonical values
- Do not store separate normalized columns
- Phone normalization should be one shared utility used by API, runner, and frontend form submission
- Email normalization should be one shared utility used everywhere

### Matching and sync behavior
Use deterministic exact matching only.

Contact sync:
- Runner reads macOS Contacts first
- For each contact, normalize all phones and emails before sending
- API matches in this order:
  1. exact `PersonPhone.phoneNumber`
  2. exact `PersonEmail.email`
- If matched:
  - add any missing phone numbers
  - add any missing emails
  - fill blank `firstName` / `lastName` only
  - do not overwrite non-empty names already in Rolodex
- If not matched:
  - create new `Person`
  - set names from Contacts when available
  - create `PersonPhone` rows
  - create `PersonEmail` rows

Message sync:
- Runner performs message sync only after successful contacts sync
- Runner reads new rows from `chat.db`
- For each new handle:
  - normalize as phone or email
  - match using:
    1. exact `PersonPhone.phoneNumber`
    2. exact `PersonEmail.email`
- Do not use contact-derived fallback names during message sync
- If matched:
  - update that person’s `MessageEvent`
- If not matched:
  - create new `Person` with null name fields
  - create `PersonPhone` or `PersonEmail`
  - create `MessageEvent`

Latest message semantics:
- `MessageEvent` is one-row-per-person in v1
- Newer synced messages replace older message summary values for that person
- UI derives “last contacted” and preview text from `messageEvent`, not from duplicated fields on `Person`

Idempotency:
- Sync endpoints must be idempotent
- Repeating the same contact batch must not duplicate phones/emails
- Repeating the same message batch must not create duplicate `MessageEvent` rows

### Cursor strategy
Use row-id cursor for messages and pragmatic incremental handling for contacts.

Message cursor:
- Use SQLite message row id as the cursor
- Store the highest committed row id in `UserSyncCursor.cursor` for `imessage_messages`
- Advance only after successful DB transaction

Contact cursor:
- Prefer contact modification timestamp if the local bridge exposes it
- If not available reliably, rescan all contacts every run
- Rely on exact merge logic and idempotent writes rather than a fragile contact cursor
- Still keep a `UserSyncCursor` row for `imessage_contacts` so status UI has a consistent model

Server-side cursor ownership:
- `UserSyncCursor` is the source of truth
- Runner may keep local cached state for operational convenience, but must fetch server status before syncing and treat server cursor as authoritative

### API and security
Harden authentication as part of this work.

Normal app auth:
- Replace `x-user-id` trust in the API with verified bearer auth from Supabase
- Web app sends the user’s access token
- API verifies token server-side and derives authenticated `userId`
- Existing rolodex routes should move to this verified auth path

Runner auth:
- Runner uses a device token, not a user id
- Add endpoints:
  - `POST /api/integrations/device-tokens`
  - `GET /api/integrations/device-tokens`
  - `DELETE /api/integrations/device-tokens/:id`
- Add sync endpoints:
  - `POST /api/integrations/imessage/sync/contacts`
  - `POST /api/integrations/imessage/sync/messages`
  - `GET /api/integrations/imessage/status`
- Device tokens:
  - generated with high entropy
  - shown once on creation
  - only hashed value stored in DB
  - bearer token resolves owning user server-side
  - revoked tokens immediately stop working

Delete-token security:
- `DELETE /api/integrations/device-tokens/:id` must require normal authenticated user bearer auth
- Server must load the token by `id` and confirm ownership against the authenticated user
- If the token is not owned by the caller, return 404 or 403
- Do not allow device-token auth to revoke tokens

Security controls:
- never accept `userId` from request bodies or headers on sync endpoints
- ignore or reject caller-supplied user identifiers
- TLS only
- rate-limit token creation and sync endpoints
- strict payload size limits and batch size limits
- log token creation, revocation, sync success/failure, but never raw token values
- avoid logging message bodies in production
- use transactions for sync writes
- advance cursors only after commit
- use least-privilege route separation:
  - app routes use verified user auth
  - sync routes use verified device-token auth only

### Runner package
Create `packages/imessage-sync` as a CLI package in the monorepo.

Responsibilities:
- provide a single command such as `rolodex-imessage-sync run`
- read:
  - macOS Contacts
  - Apple Messages `chat.db`
- normalize data before upload
- upload contacts first, then messages
- fetch server sync status before each run
- fail clearly when permissions are missing:
  - Contacts access
  - Full Disk Access for Messages DB
- handle locked DB and transient network failures without advancing cursor

Runner payloads:
- contacts batch:
  - names
  - normalized phone numbers
  - normalized emails
  - optional modified marker if available
- messages batch:
  - normalized phone or email handle
  - latest message text
  - message timestamp
  - direction
  - highest local SQLite row id included in batch

Packaging:
- keep the package in this repo
- add a root script alias for development and local ops
- first delivery is a scheduled CLI, not a desktop shell
- LaunchAgent setup can follow after the CLI is stable

## Frontend Adjustments
The frontend needs explicit support for the new auth model, new person shape, and sync management UX.

Auth and API client:
- Update [apps/desktop/lib/rolodex/api.ts](/Users/iankorovinsky/Projects/rolodex/apps/desktop/lib/rolodex/api.ts) and related API helpers to send bearer auth from Supabase instead of `x-user-id`
- Add a shared authenticated fetch path for all API requests
- Remove assumptions that the API will trust client-supplied user ids

Rolodex person UX:
- Update person forms and detail views to support multiple phone numbers instead of a single `phoneNumber`
- Adjust create/edit payloads to send `phoneNumbers`
- Show latest message preview and timestamp from `messageEvent` on person detail and optionally person list rows
- Handle nullable names gracefully in UI:
  - use best available fallback label such as primary phone or primary email when a person has no first/last name
- Update search behavior if needed so phone and email lookup still work against the new child relations

Settings / integrations UX:
- Add an “iMessage Sync” section in app settings or integrations UI
- Support:
  - create device token
  - show token once with copy UX
  - list existing runner tokens
  - revoke token
  - show last contacts sync time
  - show last messages sync time
  - show last error or stale-sync state if API exposes it
- Include setup instructions for:
  - install runner
  - set API URL + device token
  - grant Contacts permission
  - grant Full Disk Access

Frontend typing:
- Update all shared `Person` consumers to use `phones` and `messageEvent`
- Remove reliance on `person.phoneNumber` in list/detail/forms
- Ensure nullable `firstName` does not break rendering or form defaults

## Test Plan
- Migration tests:
  - `Person.firstName` nullable migration succeeds
  - `PersonPhone`, `MessageEvent`, `UserSyncCursor`, and `UserDeviceToken` migrate cleanly
- API auth tests:
  - rolodex routes reject invalid bearer tokens
  - sync routes reject invalid or revoked device tokens
  - token revoke route enforces ownership
- Sync tests:
  - contact sync merges by phone
  - contact sync merges by email
  - contact sync creates person with multiple phones/emails
  - message sync updates existing person’s `MessageEvent`
  - unknown messaged handle creates person plus phone/email plus `MessageEvent`
  - repeated sync is idempotent
  - message cursor advances only after successful commit
- Frontend tests:
  - person forms support multiple phones
  - unnamed synced people render with phone/email fallback labels
  - settings page can create and revoke device tokens
  - API client sends bearer auth correctly
- End-to-end scenario:
  - user creates device token in web UI
  - runner syncs one new contact and one new message
  - person appears in rolodex with phones/emails and latest message preview
  - sync status is visible in frontend

## Assumptions and Defaults
- v1 is macOS-only
- contacts always sync before messages
- no name matching
- phones and emails are stored only in canonical normalized form
- one `MessageEvent` row per person in v1
- message sync uses SQLite row id as cursor
- contact sync uses modification marker if available, otherwise full rescan with idempotent merge
- security hardening of existing API auth is part of this work, not optional follow-up
