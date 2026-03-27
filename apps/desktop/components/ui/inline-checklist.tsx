'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineChecklistItem {
  id: string;
  description: string;
  completed: boolean;
}

interface InlineChecklistProps<T extends InlineChecklistItem> {
  items: T[];
  placeholder?: string;
  emptyMessage?: string;
  ariaLabel?: string;
  onAdd: (description: string) => Promise<void>;
  onUpdate: (id: string, description: string) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function InlineChecklist<T extends InlineChecklistItem>({
  items,
  placeholder = 'Add a list item...',
  emptyMessage,
  ariaLabel,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}: InlineChecklistProps<T>) {
  const visibleItems = useMemo(() => items.filter((item) => !item.completed), [items]);
  const [draftValue, setDraftValue] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const draftRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const skipBlurCommitIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setEditingValues((current) => {
      const next = { ...current };

      for (const item of visibleItems) {
        if (!(item.id in next)) {
          next[item.id] = item.description;
        }
      }

      for (const id of Object.keys(next)) {
        if (!visibleItems.some((item) => item.id === id)) {
          delete next[id];
        }
      }

      return next;
    });
  }, [visibleItems]);

  const setBusy = (id: string, value: boolean) => {
    setBusyIds((current) => ({ ...current, [id]: value }));
  };

  const focusDraft = () => {
    requestAnimationFrame(() => {
      draftRef.current?.focus();
      draftRef.current?.setSelectionRange(
        draftRef.current.value.length,
        draftRef.current.value.length
      );
    });
  };

  const focusAdjacentItem = (currentId: string) => {
    const currentIndex = visibleItems.findIndex((item) => item.id === currentId);
    const previous = visibleItems[currentIndex - 1];
    const next = visibleItems[currentIndex + 1];
    const targetId = previous?.id ?? next?.id;

    requestAnimationFrame(() => {
      if (targetId) {
        itemRefs.current[targetId]?.focus();
        return;
      }
      focusDraft();
    });
  };

  const handleAdd = async () => {
    const trimmed = draftValue.trim();
    if (!trimmed) return;

    setBusy('draft', true);
    try {
      await onAdd(trimmed);
      setDraftValue('');
      focusDraft();
    } finally {
      setBusy('draft', false);
    }
  };

  const handleCommit = async (item: T, nextDescription?: string) => {
    const rawValue = nextDescription ?? editingValues[item.id] ?? item.description;
    const trimmed = rawValue.trim();

    if (!trimmed) {
      if (!onDelete) {
        setEditingValues((current) => ({ ...current, [item.id]: item.description }));
        return;
      }

      setBusy(item.id, true);
      try {
        await onDelete(item.id);
      } finally {
        setBusy(item.id, false);
      }
      return;
    }

    if (trimmed === item.description) {
      setEditingValues((current) => ({ ...current, [item.id]: trimmed }));
      return;
    }

    setBusy(item.id, true);
    try {
      await onUpdate(item.id, trimmed);
      setEditingValues((current) => ({ ...current, [item.id]: trimmed }));
    } finally {
      setBusy(item.id, false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;

    setBusy(id, true);
    try {
      await onDelete(id);
      focusAdjacentItem(id);
    } finally {
      setBusy(id, false);
    }
  };

  const handleToggle = async (item: T) => {
    setBusy(item.id, true);
    try {
      await onToggle(item.id, !item.completed);
    } finally {
      setBusy(item.id, false);
    }
  };

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      {visibleItems.length === 0 && emptyMessage ? (
        <p className="px-1 text-sm italic text-muted-foreground">{emptyMessage}</p>
      ) : null}

      {visibleItems.map((item) => {
        const value = editingValues[item.id] ?? item.description;
        const isBusy = busyIds[item.id] === true;

        return (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-md px-1 transition-colors hover:bg-muted/40"
          >
            <button
              type="button"
              aria-label={`Mark "${item.description}" complete`}
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                'border-muted-foreground/45 text-primary hover:border-primary hover:bg-primary/5',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]',
                isBusy && 'pointer-events-none opacity-50'
              )}
              onClick={() => handleToggle(item)}
              disabled={isBusy}
            >
              <Check className="h-3 w-3" />
            </button>

            <input
              ref={(node) => {
                itemRefs.current[item.id] = node;
              }}
              value={value}
              onChange={(event) =>
                setEditingValues((current) => ({
                  ...current,
                  [item.id]: event.target.value,
                }))
              }
              onBlur={() => {
                if (skipBlurCommitIds.current.has(item.id)) {
                  skipBlurCommitIds.current.delete(item.id);
                  return;
                }

                void handleCommit(item);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  skipBlurCommitIds.current.add(item.id);
                  void handleCommit(item, value).then(() => focusDraft());
                }

                if (event.key === 'Backspace' && !value && onDelete) {
                  event.preventDefault();
                  void handleDelete(item.id);
                }
              }}
              disabled={isBusy}
              className={cn(
                'h-9 flex-1 border-0 bg-transparent px-0 text-sm outline-none',
                'placeholder:text-muted-foreground',
                'focus-visible:ring-0 disabled:cursor-not-allowed'
              )}
            />

            {onDelete ? (
              <button
                type="button"
                aria-label={`Delete "${item.description}"`}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition',
                  'hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none',
                  'group-hover:opacity-100',
                  isBusy && 'pointer-events-none opacity-40'
                )}
                onClick={() => void handleDelete(item.id)}
                disabled={isBusy}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}

      <div className="flex items-center gap-2 rounded-md px-1 transition-colors hover:bg-muted/25">
        <div className="h-5 w-5 shrink-0 rounded-full border border-dashed border-muted-foreground/35" />
        <input
          ref={draftRef}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleAdd();
            }
          }}
          placeholder={placeholder}
          disabled={busyIds.draft === true}
          className={cn(
            'h-9 flex-1 border-0 bg-transparent px-0 text-sm outline-none',
            'placeholder:text-muted-foreground',
            'focus-visible:ring-0 disabled:cursor-not-allowed'
          )}
        />
      </div>
    </div>
  );
}
