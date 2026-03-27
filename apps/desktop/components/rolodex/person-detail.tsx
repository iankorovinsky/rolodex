'use client';

import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  Building,
  Calendar,
  Link2,
  Mail,
  Pencil,
  Phone,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RequestsList } from './requests-list';
import { PersonNotes } from './person-notes';
import { RoleForm } from './role-form';
import { TagChip } from './tag-chip';
import { getLatestMessageSummary, getPersonDisplayName } from '@/lib/rolodex/person';
import type {
  Request,
  Person,
  PersonNote,
  RoleInput,
  Tag,
  UpdatePersonRequest,
} from '@rolodex/types';

interface PersonDetailProps {
  person: Person;
  tags: Tag[];
  onBack: () => void;
  onUpdate: (data: UpdatePersonRequest) => Promise<Person>;
  onDelete: () => Promise<void>;
  onAddRequest: (description: string, type: 'ASK' | 'FAVOUR') => Promise<void>;
  onUpdateRequest: (id: string, description: string) => Promise<void>;
  onToggleRequest: (id: string, completed: boolean) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function PersonDetail({
  person,
  tags,
  onBack,
  onUpdate,
  onDelete,
  onAddRequest,
  onUpdateRequest,
  onToggleRequest,
  onDeleteRequest,
  onAddNote,
  onDeleteNote,
}: PersonDetailProps) {
  const fullName = getPersonDisplayName(person);
  const latestMessage = getLatestMessageSummary(person);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState(person.firstName || '');
  const [editLastName, setEditLastName] = useState(person.lastName || '');
  const [editDescription, setEditDescription] = useState(person.description || '');
  const [editEmailsText, setEditEmailsText] = useState(
    person.emails.map((email) => email.email).join('\n')
  );
  const [editPhoneNumbersText, setEditPhoneNumbersText] = useState(
    person.phones.map((phone) => phone.phoneNumber).join('\n')
  );
  const [editLinkedinUrl, setEditLinkedinUrl] = useState(person.linkedinUrl || '');
  const [editXUrl, setEditXUrl] = useState(person.xUrl || '');
  const [editRoles, setEditRoles] = useState<RoleInput[]>(
    person.roles.map((role) => ({ title: role.title, company: role.company || '' }))
  );
  const [editTagIds, setEditTagIds] = useState<string[]>(person.tags.map((tag) => tag.id));

  const resetEditState = useCallback(() => {
    setEditFirstName(person.firstName || '');
    setEditLastName(person.lastName || '');
    setEditDescription(person.description || '');
    setEditEmailsText(person.emails.map((email) => email.email).join('\n'));
    setEditPhoneNumbersText(person.phones.map((phone) => phone.phoneNumber).join('\n'));
    setEditLinkedinUrl(person.linkedinUrl || '');
    setEditXUrl(person.xUrl || '');
    setEditRoles(person.roles.map((role) => ({ title: role.title, company: role.company || '' })));
    setEditTagIds(person.tags.map((tag) => tag.id));
  }, [person]);

  const toggleEditTag = (tagId: string) => {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    const emails = editEmailsText
      .split(/[\n,]/)
      .map((email) => email.trim())
      .filter(Boolean);
    const phoneNumbers = editPhoneNumbersText
      .split(/[\n,]/)
      .map((phoneNumber) => phoneNumber.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      await onUpdate({
        firstName: editFirstName.trim(),
        lastName: editLastName || undefined,
        description: editDescription || undefined,
        emails,
        phoneNumbers,
        linkedinUrl: editLinkedinUrl || undefined,
        xUrl: editXUrl || undefined,
        roles: editRoles,
        tagIds: editTagIds,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetEditState();
    setIsEditing(false);
  };

  const handleToggleFavorite = async () => {
    await onUpdate({ isFavorite: !person.isFavorite });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this person?')) {
      return;
    }

    await onDelete();
  };

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={editFirstName}
                  onChange={(event) => setEditFirstName(event.target.value)}
                  className="text-xl font-semibold"
                  placeholder="First name"
                />
                <Input
                  value={editLastName}
                  onChange={(event) => setEditLastName(event.target.value)}
                  className="text-xl font-semibold"
                  placeholder="Last name"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-semibold">{fullName}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleToggleFavorite}>
              <Star
                className={`h-4 w-4 ${person.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </Button>

            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6 space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="How do you know this person?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Emails</Label>
                <Textarea
                  value={editEmailsText}
                  onChange={(event) => setEditEmailsText(event.target.value)}
                  placeholder={'john@example.com\njohn@work.com'}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone numbers</Label>
                  <Textarea
                    value={editPhoneNumbersText}
                    onChange={(event) => setEditPhoneNumbersText(event.target.value)}
                    placeholder={'+1 555 123 4567\n+1 647 111 2222'}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input
                    value={editLinkedinUrl}
                    onChange={(event) => setEditLinkedinUrl(event.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>X</Label>
                <Input
                  value={editXUrl}
                  onChange={(event) => setEditXUrl(event.target.value)}
                  placeholder="https://x.com/johndoe"
                />
              </div>
            </>
          ) : (
            <>
              {person.description ? (
                <p className="text-muted-foreground">{person.description}</p>
              ) : null}

              <div className="flex flex-wrap gap-4 text-sm">
                {person.phones.map((phone) => (
                  <a
                    key={phone.id}
                    href={`tel:${phone.phoneNumber}`}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    {phone.phoneNumber}
                  </a>
                ))}
                {person.linkedinUrl ? (
                  <a
                    href={person.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="h-4 w-4" />
                    LinkedIn
                  </a>
                ) : null}
                {person.xUrl ? (
                  <a
                    href={person.xUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <AtSign className="h-4 w-4" />X
                  </a>
                ) : null}
              </div>

              {person.emails.length > 0 ? (
                <div className="space-y-2">
                  {person.emails.map((email) => (
                    <a
                      key={email.id}
                      href={`mailto:${email.email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{email.email}</span>
                      {email.isPrimary ? (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">Primary</span>
                      ) : null}
                    </a>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium">Latest message</h2>
          {latestMessage ? (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium capitalize">{latestMessage.direction}</span>
                <span className="text-muted-foreground">{latestMessage.sentAtLabel}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{latestMessage.body}</p>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No messages synced yet</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium">Roles</h2>
          {isEditing ? (
            <RoleForm roles={editRoles} onChange={setEditRoles} />
          ) : person.roles.length > 0 ? (
            <div className="space-y-2">
              {person.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Building className="h-4 w-4" />
                  <span>
                    {role.title}
                    {role.company ? ` @ ${role.company}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No roles</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium">Tags</h2>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleEditTag(tag.id)}
                  className="focus:outline-none"
                >
                  <TagChip
                    tag={{ ...tag, color: editTagIds.includes(tag.id) ? tag.color : null }}
                  />
                </button>
              ))}
            </div>
          ) : person.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {person.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No tags</p>
          )}
        </div>

        <Separator className="my-6" />

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium">Email activity</h2>
          {person.emailEvents.length > 0 ? (
            <div className="space-y-3">
              {person.emailEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{event.subject || 'Untitled email'}</span>
                    <span className="text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {event.direction ? <span>{event.direction.toLowerCase()}</span> : null}
                    {event.emailAddress ? <span>{event.emailAddress}</span> : null}
                    {event.source ? <span>{event.source}</span> : null}
                  </div>
                  {event.snippet ? (
                    <p className="mt-2 text-sm text-muted-foreground">{event.snippet}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No email events yet</p>
          )}
        </div>

        <Separator className="my-6" />

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium">Calendar activity</h2>
          {person.calendarEvents.length > 0 ? (
            <div className="space-y-3">
              {person.calendarEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    <span>{event.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(event.startsAt).toLocaleString()}
                    {event.endsAt ? ` to ${new Date(event.endsAt).toLocaleString()}` : ''}
                  </p>
                  {event.location ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.location}</p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No calendar events yet</p>
          )}
        </div>

        <Separator className="my-6" />

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium">Notes</h2>
          <PersonNotes
            notes={person.notes || ([] as PersonNote[])}
            onAdd={onAddNote}
            onDelete={onDeleteNote}
          />
        </div>

        <Separator className="my-6" />

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium">Asks (things you asked for)</h2>
          <RequestsList
            requests={person.requests || ([] as Request[])}
            type="ASK"
            placeholder="Add something you asked for..."
            emptyMessage="No asks yet"
            onAdd={(description) => onAddRequest(description, 'ASK')}
            onUpdate={onUpdateRequest}
            onToggle={onToggleRequest}
            onDelete={onDeleteRequest}
          />
        </div>

        <Separator className="my-6" />

        <div>
          <h2 className="mb-3 text-sm font-medium">Favours (things you did for them)</h2>
          <RequestsList
            requests={person.requests || ([] as Request[])}
            type="FAVOUR"
            placeholder="Add a favour you did..."
            emptyMessage="No favours yet"
            onAdd={(description) => onAddRequest(description, 'FAVOUR')}
            onUpdate={onUpdateRequest}
            onToggle={onToggleRequest}
            onDelete={onDeleteRequest}
          />
        </div>
      </div>
    </div>
  );
}
