'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagChip } from './tag-chip';
import type { Tag } from '@rolodex/types';

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
}

export function TagFilter({ tags, selectedTagIds, onToggle, onClear }: TagFilterProps) {
  const hasFilters = selectedTagIds.length > 0;

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onToggle(tag.id)}
          className="focus:outline-none"
        >
          <TagChip
            tag={{
              ...tag,
              color: selectedTagIds.includes(tag.id) ? tag.color : null,
            }}
          />
        </button>
      ))}
      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
