'use client';

import { InlineChecklist } from '@/components/ui/inline-checklist';
import type { Request, RequestType } from '@rolodex/types';

interface RequestsListProps {
  requests: Request[];
  type: RequestType;
  placeholder: string;
  emptyMessage: string;
  onAdd: (description: string) => Promise<void>;
  onUpdate: (id: string, description: string) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function RequestsList({
  requests,
  type,
  placeholder,
  emptyMessage,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}: RequestsListProps) {
  const filteredRequests = requests.filter((r) => r.type === type);

  return (
    <InlineChecklist
      items={filteredRequests}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onToggle={onToggle}
      onDelete={onDelete}
    />
  );
}
