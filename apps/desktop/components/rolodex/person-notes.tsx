'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notepad } from '@/components/ui/notepad';
import type { PersonNote } from '@rolodex/types';

interface PersonNotesProps {
  notes: PersonNote[];
  onAdd: (content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PersonNotes({ notes, onAdd, onDelete }: PersonNotesProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onAdd(content.trim());
      setContent('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Notepad
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Add a note about this person..."
        rows={5}
        disabled={isSaving}
        header={<p className="font-medium text-foreground">Quick note</p>}
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!content.trim() || isSaving}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-start justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(note.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
