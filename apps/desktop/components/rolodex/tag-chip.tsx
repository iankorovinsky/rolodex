import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { Tag } from '@rolodex/types';

interface TagChipProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'default';
}

export function TagChip({ tag, onRemove, size = 'default' }: TagChipProps) {
  const bgColor = tag.color ? `${tag.color}20` : undefined;
  const textColor = tag.color || undefined;

  return (
    <Badge
      variant="outline"
      className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : ''} ${onRemove ? 'pr-1' : ''}`}
      style={{ backgroundColor: bgColor, borderColor: textColor, color: textColor }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
