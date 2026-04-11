import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import type { CommandAction } from '@/commands/types';
import { PersonDetail } from '@/components/rolodex/person-detail';
import { Button } from '@/components/ui/button';
import { useRegisterCommandActions } from '@/commands/hooks/use-register-command-actions';
import {
  createNote,
  createRequest,
  deleteNote,
  deletePerson,
  deleteRequest,
  getPersonById,
  getTags,
  updatePerson,
  updateRequest,
} from '@/lib/rolodex/api';
import type { Person, Tag, UpdatePersonRequest } from '@rolodex/types';
import { getPersonDisplayName } from '@/lib/rolodex/person';

export function PersonRoute() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [person, setPerson] = useState<Person | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [personData, tagsData] = await Promise.all([getPersonById(id), getTags()]);
      setPerson(personData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load person:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const commandActions = useMemo<CommandAction[]>(
    () =>
      person
        ? [
            {
              id: `page:person:refresh:${person.id}`,
              title: `Refresh ${getPersonDisplayName(person)}`,
              subtitle: 'Reload this person from the API',
              keywords: ['reload person', 'refresh'],
              group: 'page',
              icon: RotateCcw,
              kind: 'action',
              priority: 0,
              perform: loadData,
            },
          ]
        : [],
    [loadData, person]
  );

  useRegisterCommandActions(commandActions);

  const handleUpdate = async (data: UpdatePersonRequest) => {
    const updated = await updatePerson(id, data);
    setPerson(updated);
    return updated;
  };

  const handleDelete = async () => {
    await deletePerson(id);
    navigate('/app');
  };

  const handleAddRequest = async (description: string, type: 'ASK' | 'FAVOUR') => {
    const newRequest = await createRequest({ personId: id, type, description });
    setPerson((prev) =>
      prev ? { ...prev, requests: [...(prev.requests || []), newRequest] } : null
    );
  };

  const handleToggleRequest = async (requestId: string, completed: boolean) => {
    const updated = await updateRequest(requestId, { completed });
    setPerson((prev) =>
      prev
        ? {
            ...prev,
            requests: prev.requests.map((request) =>
              request.id === requestId ? updated : request
            ),
          }
        : null
    );
  };

  const handleUpdateRequest = async (requestId: string, description: string) => {
    const updated = await updateRequest(requestId, { description });
    setPerson((prev) =>
      prev
        ? {
            ...prev,
            requests: prev.requests.map((request) =>
              request.id === requestId ? updated : request
            ),
          }
        : null
    );
  };

  const handleDeleteRequest = async (requestId: string) => {
    await deleteRequest(requestId);
    setPerson((prev) =>
      prev
        ? { ...prev, requests: prev.requests.filter((request) => request.id !== requestId) }
        : null
    );
  };

  const handleAddNote = async (content: string) => {
    const note = await createNote({ personId: id, content });
    setPerson((prev) => (prev ? { ...prev, notes: [note, ...(prev.notes || [])] } : null));
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    setPerson((prev) =>
      prev ? { ...prev, notes: prev.notes.filter((note) => note.id !== noteId) } : null
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-2xl py-12 text-center">
          <p className="text-muted-foreground">Person not found</p>
          <Button variant="link" onClick={() => navigate('/app')}>
            Back to Rolodex
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PersonDetail
      person={person}
      tags={tags}
      onBack={() => navigate('/app')}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onAddRequest={handleAddRequest}
      onUpdateRequest={handleUpdateRequest}
      onToggleRequest={handleToggleRequest}
      onDeleteRequest={handleDeleteRequest}
      onAddNote={handleAddNote}
      onDeleteNote={handleDeleteNote}
    />
  );
}
