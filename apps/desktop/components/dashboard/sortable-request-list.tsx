'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { Request } from '@rolodex/types';
import { cn } from '@/lib/utils';

interface SortableRequestListProps {
  items: Request[];
  emptyMessage: string;
  onUpdate: (id: string, description: string) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
}

const getRequestOwnerLabel = (item: Request) =>
  [item.person?.firstName, item.person?.lastName].filter(Boolean).join(' ') || 'Unnamed person';

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function SortableRequestList({
  items,
  emptyMessage,
  onUpdate,
  onToggle,
  onReorder,
}: SortableRequestListProps) {
  const visibleItems = useMemo(() => items.filter((item) => !item.completed), [items]);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
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

  const handleCommit = async (item: Request, nextDescription?: string) => {
    const rawValue = nextDescription ?? editingValues[item.id] ?? item.description;
    const trimmed = rawValue.trim();

    if (!trimmed) {
      setEditingValues((current) => ({ ...current, [item.id]: item.description }));
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

  const handleToggle = async (item: Request) => {
    setBusy(item.id, true);
    try {
      await onToggle(item.id, !item.completed);
    } finally {
      setBusy(item.id, false);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }

    const fromIndex = visibleItems.findIndex((item) => item.id === draggingId);
    const toIndex = visibleItems.findIndex((item) => item.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }

    setBusy('reorder', true);
    try {
      const nextOrder = moveItem(visibleItems, fromIndex, toIndex).map((item) => item.id);
      await onReorder(nextOrder);
    } finally {
      setBusy('reorder', false);
      setDraggingId(null);
      setDropTargetId(null);
    }
  };

  if (visibleItems.length === 0) {
    return <p className="px-1 text-sm italic text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => {
        const value = editingValues[item.id] ?? item.description;
        const isBusy = busyIds[item.id] === true || busyIds.reorder === true;
        const isDropTarget = dropTargetId === item.id && draggingId !== item.id;

        return (
          <div
            key={item.id}
            className={cn(
              'grid grid-cols-[auto_auto_1fr] gap-3 rounded-[20px] border border-border/70 bg-card/70 px-3.5 py-3 shadow-[0_6px_24px_rgba(15,23,42,0.04)] transition',
              'hover:border-border hover:bg-accent/30',
              isDropTarget && 'border-primary/50 bg-primary/5'
            )}
            onDragOver={(event) => {
              if (!draggingId) {
                return;
              }
              event.preventDefault();
              if (dropTargetId !== item.id) {
                setDropTargetId(item.id);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              void handleDrop(item.id);
            }}
          >
            <button
              type="button"
              aria-label={`Reorder "${item.description}"`}
              draggable={!isBusy}
              onDragStart={(event) => {
                setDraggingId(item.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              className={cn(
                'mt-1 grid h-6 w-6 shrink-0 grid-cols-2 gap-[3px] rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground',
                isBusy && 'cursor-not-allowed opacity-50'
              )}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} className="h-1.5 w-1.5 rounded-full bg-current/70" />
              ))}
            </button>

            <button
              type="button"
              aria-label={`Mark "${item.description}" complete`}
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]',
                isBusy && 'pointer-events-none opacity-50'
              )}
              onClick={() => void handleToggle(item)}
              disabled={isBusy}
            >
              <Check className="h-3 w-3" />
            </button>

            <div className="min-w-0">
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
                    void handleCommit(item, value).then(() => itemRefs.current[item.id]?.blur());
                  }
                }}
                disabled={isBusy}
                className={cn(
                  'h-7 w-full rounded-md border-0 bg-transparent px-0 text-sm font-medium outline-none',
                  'placeholder:text-muted-foreground',
                  'focus-visible:ring-0 disabled:cursor-not-allowed'
                )}
              />
              <p className="truncate text-xs text-muted-foreground/90">{getRequestOwnerLabel(item)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
