'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Integration } from '@rolodex/types';

interface IntegrationCardProps {
  integration: Integration;
  onRemove: () => void;
  onToggle: () => void;
}

export function IntegrationCard({ integration, onRemove, onToggle }: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: integration.connected ? '#22c55e' : '#94a3b8',
          }}
        />
        <div>
          <p className="font-medium">{integration.name}</p>
          {integration.email && (
            <p className="text-sm text-muted-foreground">{integration.email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={integration.connected}
          onCheckedChange={onToggle}
          aria-label="Toggle integration"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove integration"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
