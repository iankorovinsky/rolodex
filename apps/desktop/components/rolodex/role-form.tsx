'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RoleInput } from '@rolodex/types';

interface RoleFormProps {
  roles: RoleInput[];
  onChange: (roles: RoleInput[]) => void;
}

export function RoleForm({ roles, onChange }: RoleFormProps) {
  const updateRole = (index: number, nextRole: RoleInput) => {
    onChange(roles.map((role, roleIndex) => (roleIndex === index ? nextRole : role)));
  };

  const addRole = () => {
    onChange([...roles, { title: '', company: '' }]);
  };

  const removeRole = (index: number) => {
    onChange(roles.filter((_, roleIndex) => roleIndex !== index));
  };

  return (
    <div className="space-y-3">
      {roles.length > 0 ? (
        roles.map((role, index) => (
          <div
            key={`${role.title}-${role.company}-${index}`}
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <Input
              value={role.title}
              onChange={(event) => updateRole(index, { ...role, title: event.target.value })}
              placeholder="Role title"
            />
            <Input
              value={role.company || ''}
              onChange={(event) => updateRole(index, { ...role, company: event.target.value })}
              placeholder="Company"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRole(index)}
              className="text-stone-500 hover:bg-white hover:text-stone-900"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No roles yet.</p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRole}>
        <Plus className="mr-2 h-4 w-4" />
        Add role
      </Button>
    </div>
  );
}
