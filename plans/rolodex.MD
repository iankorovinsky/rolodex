# Rolodex Product Plan

## Overview
Rolodex is a contact management system for tracking people you meet. It includes basic contact information, tags for organization, and a system for tracking asks and favours.

## Data Layer (Prisma Schema)

### Core Models

```prisma
model Person {
  id          String   @id @default(uuid())
  userId      String   @db.Uuid
  name        String
  description String?
  email       String?
  phone       String?
  isFavorite  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  roles       Role[]
  tags        PersonTag[]
  notes       PersonNote[]
  asks        Ask[]
  favours     Favour[]

  @@index([userId])
  @@index([name])
  @@index([userId, isFavorite])
  @@index([userId, deletedAt])
  @@map("people")
}

model Role {
  id          String   @id @default(uuid())
  personId    String   @db.Uuid
  title       String
  company     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@index([personId])
  @@index([title])
  @@index([company])
  @@map("roles")
}

model Tag {
  id          String   @id @default(uuid())
  userId      String   @db.Uuid
  name        String
  color       String?  // Hex color for UI
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  people      PersonTag[]

  @@unique([userId, name])
  @@index([userId])
  @@map("tags")
}

model PersonTag {
  id        String   @id @default(uuid())
  personId  String   @db.Uuid
  tagId     String   @db.Uuid
  createdAt DateTime @default(now())

  person    Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([personId, tagId])
  @@index([personId])
  @@index([tagId])
  @@map("person_tags")
}

model PersonNote {
  id        String   @id @default(uuid())
  personId  String   @db.Uuid
  content   String   @db.Text
  createdAt DateTime @default(now())

  person    Person   @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@index([personId])
  @@map("person_notes")
}

model Ask {
  id          String   @id @default(uuid())
  personId    String   @db.Uuid
  parentId    String?  @db.Uuid
  description String
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  parent      Ask?     @relation("AskToAsk", fields: [parentId], references: [id])
  children    Ask[]    @relation("AskToAsk")

  @@index([personId])
  @@index([completed])
  @@index([parentId])
  @@map("asks")
}

model Favour {
  id          String   @id @default(uuid())
  personId    String   @db.Uuid
  parentId    String?  @db.Uuid
  description String
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  parent      Favour?  @relation("FavourToFavour", fields: [parentId], references: [id])
  children    Favour[] @relation("FavourToFavour")

  @@index([personId])
  @@index([completed])
  @@index([parentId])
  @@map("favours")
}
```

### User Model Extension
Add relations to existing `User` model:
```prisma
model User {
  // ... existing fields
  people      Person[]
  tags        Tag[]
}
```

## Backend Layer

### API Routes Structure

```
/api/rolodex/people      - GET (list), POST (create)
/api/rolodex/people/:id  - GET, PUT, DELETE
/api/rolodex/tags         - GET (list), POST (create)
/api/rolodex/tags/:id     - PUT, DELETE
/api/rolodex/asks         - GET (list), POST (create)
/api/rolodex/asks/:id     - PUT, DELETE
/api/rolodex/favours      - GET (list), POST (create)
/api/rolodex/favours/:id  - PUT, DELETE
```

### Controllers

#### `personController.ts`
- `getPeople(userId, filters)` - List with search, tag filtering
  - Query params: `search?`, `tagIds?`, `limit?`, `offset?`
  - Search across: name, description, role.title, role.company
  - Always filter out soft-deleted people (`deletedAt IS NULL`)
- `getPersonById(id, userId)` - Get single person with relations
- `createPerson(userId, data)` - Create person with optional roles/tags
- `updatePerson(id, userId, data)` - Update person
- `deletePerson(id, userId)` - Soft delete (set `deletedAt`), with optional hard delete path later

#### `tagController.ts`
- `getTags(userId)` - List all user's tags
- `createTag(userId, data)` - Create tag
- `updateTag(id, userId, data)` - Update tag name/color
- `deleteTag(id, userId)` - Delete tag (cascade removes PersonTag relations)

#### `askController.ts`
- `getAsks(userId, filters)` - List asks, optionally filtered by personId, completed
- `createAsk(userId, data)` - Create ask for a person
- `updateAsk(id, userId, data)` - Update ask (including completed status)
- `deleteAsk(id, userId)` - Delete ask

#### `favourController.ts`
- `getFavours(userId, filters)` - List favours, optionally filtered by personId, completed
- `createFavour(userId, data)` - Create favour for a person
- `updateFavour(id, userId, data)` - Update favour (including completed status)
- `deleteFavour(id, userId)` - Delete favour

### Models

#### `person.ts`
- Prisma queries with user scoping
- Search helper using Prisma's `OR` with `contains` for text fields
- Include relations: roles, tags (via PersonTag), asks, favours

#### `tag.ts`
- Prisma queries with user scoping
- Validation for unique tag names per user

#### `ask.ts` / `favour.ts`
- Prisma queries with user scoping via person relation
- Simple CRUD operations

### Request/Response Types (`@rolodex/types`)

```typescript
// packages/types/src/rolodex.ts

export interface Person {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
   isFavorite: boolean;
  roles: Role[];
  tags: Tag[];
  notes: PersonNote[];
  asks: Ask[];
  favours: Favour[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Role {
  id: string;
  personId: string;
  title: string;
  company: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonNote {
  id: string;
  personId: string;
  content: string;
  createdAt: Date;
}

export interface Ask {
  id: string;
  personId: string;
  parentId: string | null;
  description: string;
  completed: boolean;
  children?: Ask[]; // Included when fetching tree
  createdAt: Date;
  updatedAt: Date;
}

export interface Favour {
  id: string;
  personId: string;
  parentId: string | null;
  description: string;
  completed: boolean;
  children?: Favour[]; // Included when fetching tree
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreatePersonRequest {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  isFavorite?: boolean;
  roleIds?: string[]; // For existing roles
  tagIds?: string[];
}

export interface UpdatePersonRequest {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  isFavorite?: boolean;
  tagIds?: string[]; // Replace all tags
}

export interface CreateRoleRequest {
  personId: string;
  title: string;
  company?: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface CreateAskRequest {
  personId: string;
  description: string;
  parentId?: string;
}

export interface CreateFavourRequest {
  personId: string;
  description: string;
  parentId?: string;
}

export interface UpdateAskRequest {
  description?: string;
  completed?: boolean;
  parentId?: string | null;
}

export interface UpdateFavourRequest {
  description?: string;
  completed?: boolean;
  parentId?: string | null;
}

// Query params
export interface PeopleQueryParams {
  search?: string;
  tagIds?: string; // Comma-separated
  limit?: number;
  offset?: number;
}
```

## UI Layer

### Page Structure

```
/app/
  ├── page.tsx              - Main list view with search/filter
  ├── layout.tsx            - Rolodex-specific layout
  ├── [id]/
  │   ├── page.tsx          - Person detail view
  │   └── edit/
  │       └── page.tsx      - Edit person form
  └── tags/
      └── page.tsx          - Tag management
```

### Components

#### Main List Page (`/app/page.tsx`)
- **Search bar** - Text input for searching name, description, role title/company
- **Tag filter** - Multi-select or chip-based filter for tags
- **People list** - Card/list view showing:
  - Name
  - Favorite star toggle (filled if favorite)
  - Description (truncated)
  - Primary role (title @ company) if exists
  - Tags (colored chips)
  - Quick stats: # of asks, # of favours
  - Sort mode defaults to favorites-first (favorites, then others by name or recency)
- **Add person button** - Opens dialog/form

#### Person Detail Page (`/app/[id]/page.tsx`)
- **Header** - Name, inline edit toggle, delete (soft-delete) button
- **Inline edit mode** - Toggling edit turns the entire view into a form in-place (no dialogs/routes):
  - Name, description, email, phone
  - Tags (multi-select)
  - Favorite star
  - Save / Cancel (revert to read-only view)
- **Basic info** - Description and core fields shown read-only when not editing
- **Roles section** - List of roles with add/edit/delete
- **Tags section** - Tag chips with add/remove
- **Asks section** - Checklist of asks with add/complete/delete
- **Favours section** - Checklist of favours with add/complete/delete

#### Person Form (`/app/[id]/edit/page.tsx` or dialog)
- Name (required)
- Description (textarea)
- Email, phone
- Tags (multi-select with create option)
- Save/Cancel

#### Create Person Sheet
- **Trigger** - “Add person” button on main list opens a right-hand `Sheet`
- **Sheet content**:
  - Same fields as person form (name, description, email, phone, tags, favorite)
  - Submit creates the person and closes the sheet, list updates
  - Cancel just closes the sheet

#### Tag Management (`/app/tags/page.tsx`)
- List of all tags with color indicators
- Create tag dialog
- Edit tag (name, color)
- Delete tag (with confirmation if used)

### Component Library

#### `components/rolodex/`
- `person-card.tsx` - Person card for list view
- `person-detail.tsx` - Person detail view component
- `person-form.tsx` - Create/edit person form
- `role-form.tsx` - Add/edit role form
- `tag-filter.tsx` - Tag filter component (multi-select)
- `tag-chip.tsx` - Tag display chip with color
- `ask-item.tsx` - Ask checklist item
- `favour-item.tsx` - Favour checklist item
- `asks-list.tsx` - List of asks with add functionality
- `favours-list.tsx` - List of favours with add functionality

### API Integration

#### `lib/rolodex/`
- `api.ts` - API client functions:
  - `getPeople(params)`
  - `getPersonById(id)`
  - `createPerson(data)`
  - `updatePerson(id, data)`
  - `deletePerson(id)`
  - `getTags()`
  - `createTag(data)`
  - `updateTag(id, data)`
  - `deleteTag(id)`
  - `getAsks(params)`
  - `createAsk(data)`
  - `updateAsk(id, data)`
  - `deleteAsk(id)`
  - `getFavours(params)`
  - `createFavour(data)`
  - `updateFavour(id, data)`
  - `deleteFavour(id)`

### UI Features

#### Search
- Real-time search as user types (debounced)
- Search across: name, description, role.title, role.company
- Highlight matches in results

#### Filtering
- Tag filter: multi-select dropdown or chip-based
- Show active filters with clear option
- Combine with search

#### Lists
- Virtualized list for performance if >100 people
- Pagination or infinite scroll
- Sort options: name (A-Z), recently added, recently updated

#### Forms
- Inline editing for quick updates (e.g., complete ask/favour)
- Full form for complex edits
- Validation feedback
- Optimistic updates where appropriate

## Implementation Order

1. **Data layer**
   - Add Prisma models
   - Run migration
   - Generate Prisma client

2. **Types**
   - Add rolodex types to `@rolodex/types`
   - Export from index

3. **Backend**
   - Create models
   - Create controllers
   - Create routes
   - Wire up in `app.ts`
   - Add tests

4. **Frontend - Basic**
   - Create API client functions
   - Create main list page with search
   - Create person detail page
   - Create person form

5. **Frontend - Tags**
   - Tag management page
   - Tag filter component
   - Tag assignment in person form

6. **Frontend - Asks & Favours**
   - Asks list component
   - Favours list component
   - Add to person detail page

7. **Polish**
   - Loading states
   - Error handling
   - Empty states
   - Responsive design

## Notes

- All data scoped to authenticated user (userId)
- Use shadcn/ui components where possible
- Follow existing patterns from integrations page
- MVP focus: keep it simple, iterate later
- Consider soft deletes for people (add `deletedAt` field) if needed
- Tags can be reused across people (many-to-many)
- Roles are per-person (one-to-many)
- Asks and favours are simple checklists, can expand later with due dates, priorities, etc.
