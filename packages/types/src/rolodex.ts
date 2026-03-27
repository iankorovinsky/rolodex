import type {
  Request as DbRequest,
  RequestType as DbRequestType,
  Person as DbPerson,
  PersonCalendarEvent as DbPersonCalendarEvent,
  PersonEmail as DbPersonEmail,
  PersonEmailEvent as DbPersonEmailEvent,
  PersonPhone as DbPersonPhone,
  MessageEvent as DbMessageEvent,
  MessageDirection as DbMessageDirection,
  PersonNote as DbPersonNote,
  Role as DbRole,
  Tag as DbTag,
} from '@rolodex/db';

export type Role = DbRole;
export type Tag = DbTag;
export type PersonNote = DbPersonNote;
export type PersonEmail = DbPersonEmail;
export type PersonPhone = DbPersonPhone;
export type MessageEvent = DbMessageEvent;
export type MessageDirection = DbMessageDirection;
export type PersonEmailEvent = DbPersonEmailEvent;
export type PersonCalendarEvent = DbPersonCalendarEvent;
export type RequestType = DbRequestType;

export type Request = DbRequest & {
  children?: Request[];
};

export type Person = DbPerson & {
  roles: Role[];
  tags: Tag[];
  phones: PersonPhone[];
  emails: PersonEmail[];
  messageEvent: MessageEvent | null;
  emailEvents: PersonEmailEvent[];
  calendarEvents: PersonCalendarEvent[];
  notes: PersonNote[];
  requests: Request[];
};

export type RoleInput = {
  title: string;
  company?: string;
};

export type CreatePersonRequest = {
  firstName?: string;
  lastName?: string;
  description?: string;
  phoneNumbers?: string[];
  linkedinUrl?: string;
  xUrl?: string;
  emails?: string[];
  isFavorite?: boolean;
  roles?: RoleInput[];
  tagIds?: string[];
};

export type UpdatePersonRequest = {
  firstName?: string;
  lastName?: string;
  description?: string;
  phoneNumbers?: string[];
  linkedinUrl?: string;
  xUrl?: string;
  emails?: string[];
  isFavorite?: boolean;
  roles?: RoleInput[];
  tagIds?: string[];
};

export type CreateRoleRequest = {
  personId: string;
  title: string;
  company?: string;
};

export type CreateTagRequest = {
  name: string;
  color?: string;
};

export type UpdateTagRequest = {
  name?: string;
  color?: string;
};

export type CreateRequestRequest = {
  personId: string;
  type: RequestType;
  description: string;
  parentId?: string;
};

export type UpdateRequestRequest = {
  description?: string;
  completed?: boolean;
  parentId?: string | null;
};

export type CreatePersonNoteRequest = {
  personId: string;
  content: string;
};

export type DeletePersonNoteRequest = {
  id: string;
};

// Query/filter types
export interface PeopleQueryParams {
  search?: string;
  tagIds?: string;
  limit?: number;
  offset?: number;
}

export interface PeopleFilters {
  search?: string;
  tagIds?: string[];
  limit?: number;
  offset?: number;
}

export interface RequestFilters {
  personId?: string;
  type?: RequestType;
  completed?: boolean;
}

export interface PersonNoteFilters {
  personId?: string;
}

export type SyncContactPayload = {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumbers?: string[];
  emails?: string[];
  modifiedAt?: string | null;
};

export type SyncMessagePayload = {
  handle: string;
  body?: string | null;
  sentAt: string;
  direction: MessageDirection;
  cursor: number;
};
