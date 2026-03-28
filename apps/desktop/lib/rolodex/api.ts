import type {
  ApiResponse,
  AvatarIdValue,
  ConnectGranolaIntegrationRequest,
  Person,
  Tag,
  Request,
  RequestType,
  PersonNote,
  CreatePersonRequest,
  UpdatePersonRequest,
  CreateTagRequest,
  UpdateTagRequest,
  CreateRequestRequest,
  UpdateRequestRequest,
  CreatePersonNoteRequest,
  PeopleQueryParams,
  CreateUserDeviceTokenRequest,
  CreateUserDeviceTokenResponse,
  IMessageSyncStatus,
  IntegrationConnection,
  IntegrationType,
  UpdateUserProfileRequest,
  UserProfile,
  UserDeviceToken,
} from '@rolodex/types';
import { createClient } from '@/lib/supabase/client';

const API_URL = import.meta.env.API_URL;

async function getAuthHeaders(headers?: HeadersInit): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...headers,
  };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error('Missing API URL. Set API_URL.');
  }

  const headers = await getAuthHeaders(options?.headers);
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: { message: 'Request failed' } satisfies ApiResponse<never>['error'],
    }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }

  const payload = (await res.json()) as ApiResponse<T>;
  return payload.data as T;
}

// People
export async function getPeople(params?: PeopleQueryParams): Promise<Person[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.tagIds) searchParams.set('tagIds', params.tagIds);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  return fetchApi<Person[]>(`/api/rolodex/people${query ? `?${query}` : ''}`);
}

export async function getPersonById(id: string): Promise<Person> {
  return fetchApi<Person>(`/api/rolodex/people/${id}`);
}

export async function createPerson(data: CreatePersonRequest): Promise<Person> {
  return fetchApi<Person>('/api/rolodex/people', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePerson(id: string, data: UpdatePersonRequest): Promise<Person> {
  return fetchApi<Person>(`/api/rolodex/people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePerson(id: string): Promise<void> {
  await fetchApi(`/api/rolodex/people/${id}`, { method: 'DELETE' });
}

// Tags
export async function getTags(): Promise<Tag[]> {
  return fetchApi<Tag[]>('/api/rolodex/tags');
}

export async function createTag(data: CreateTagRequest): Promise<Tag> {
  return fetchApi<Tag>('/api/rolodex/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTag(id: string, data: UpdateTagRequest): Promise<Tag> {
  return fetchApi<Tag>(`/api/rolodex/tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTag(id: string): Promise<void> {
  await fetchApi(`/api/rolodex/tags/${id}`, { method: 'DELETE' });
}

// Requests
export async function getRequests(personId?: string, type?: RequestType): Promise<Request[]> {
  const params = new URLSearchParams();
  if (personId) params.set('personId', personId);
  if (type) params.set('type', type);
  const query = params.toString();
  return fetchApi<Request[]>(`/api/rolodex/requests${query ? `?${query}` : ''}`);
}

export async function createRequest(data: CreateRequestRequest): Promise<Request> {
  return fetchApi<Request>('/api/rolodex/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRequest(id: string, data: UpdateRequestRequest): Promise<Request> {
  return fetchApi<Request>(`/api/rolodex/requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRequest(id: string): Promise<void> {
  await fetchApi(`/api/rolodex/requests/${id}`, { method: 'DELETE' });
}

// Notes
export async function getNotes(personId?: string): Promise<PersonNote[]> {
  const query = personId ? `?personId=${personId}` : '';
  return fetchApi<PersonNote[]>(`/api/rolodex/notes${query}`);
}

export async function createNote(data: CreatePersonNoteRequest): Promise<PersonNote> {
  return fetchApi<PersonNote>('/api/rolodex/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteNote(id: string): Promise<void> {
  await fetchApi(`/api/rolodex/notes/${id}`, { method: 'DELETE' });
}

export async function createDeviceToken(
  data: CreateUserDeviceTokenRequest
): Promise<CreateUserDeviceTokenResponse> {
  return fetchApi<CreateUserDeviceTokenResponse>('/api/integrations/device-tokens', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDeviceTokens(): Promise<UserDeviceToken[]> {
  return fetchApi<UserDeviceToken[]>('/api/integrations/device-tokens');
}

export async function revokeDeviceToken(id: string): Promise<void> {
  await fetchApi(`/api/integrations/device-tokens/${id}`, {
    method: 'DELETE',
  });
}

export async function getIMessageSyncStatus(): Promise<IMessageSyncStatus> {
  return fetchApi<IMessageSyncStatus>('/api/integrations/imessage/status');
}

export async function getIntegrations(): Promise<IntegrationConnection[]> {
  return fetchApi<IntegrationConnection[]>('/api/integrations');
}

export async function connectGranolaIntegration(
  data: ConnectGranolaIntegrationRequest
): Promise<IntegrationConnection> {
  return fetchApi<IntegrationConnection>('/api/integrations/granola/connect', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function disconnectIntegration(type: IntegrationType): Promise<void> {
  await fetchApi(`/api/integrations/${type}`, {
    method: 'DELETE',
  });
}

export async function getCurrentUser(): Promise<UserProfile> {
  return fetchApi<UserProfile>('/api/users/me');
}

export async function updateCurrentUserProfile(
  data: UpdateUserProfileRequest
): Promise<UserProfile> {
  const body: UpdateUserProfileRequest = data;

  return fetchApi<UserProfile>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
