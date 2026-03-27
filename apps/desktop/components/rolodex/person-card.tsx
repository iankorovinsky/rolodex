'use client';

import { Link } from 'react-router-dom';
import { Star, MessageSquare, HandHeart } from 'lucide-react';
import { TagChip } from './tag-chip';
import type { Person } from '@rolodex/types';
import { getLatestMessageSummary, getPersonDisplayName } from '@/lib/rolodex/person';

interface PersonCardProps {
  person: Person;
}

export function PersonCard({ person }: PersonCardProps) {
  const fullName = getPersonDisplayName(person);
  const primaryRole = person.roles?.[0];
  const pendingAsks = person.requests?.filter((r) => r.type === 'ASK' && !r.completed).length || 0;
  const pendingFavours =
    person.requests?.filter((r) => r.type === 'FAVOUR' && !r.completed).length || 0;
  const latestMessage = getLatestMessageSummary(person);

  return (
    <Link
      to={`/app/${person.id}`}
      className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{fullName}</h3>
            {person.isFavorite && (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            )}
          </div>

          {primaryRole && (
            <p className="text-sm text-muted-foreground truncate">
              {primaryRole.title}
              {primaryRole.company && ` @ ${primaryRole.company}`}
            </p>
          )}

          {person.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{person.description}</p>
          )}

          {latestMessage ? (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
              {latestMessage.body}
            </p>
          ) : null}

          {person.tags && person.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {person.tags.slice(0, 3).map((tag) => (
                <TagChip key={tag.id} tag={tag} size="sm" />
              ))}
              {person.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{person.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          {pendingAsks > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{pendingAsks}</span>
            </div>
          )}
          {pendingFavours > 0 && (
            <div className="flex items-center gap-1">
              <HandHeart className="h-3 w-3" />
              <span>{pendingFavours}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
