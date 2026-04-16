import type { Tag } from '@rolodex/types';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';
import { TagChip } from '@/components/rolodex/tag-chip';

const meta = {
  title: 'Controls/Badge',
  component: Badge,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

const aiTag: Tag = {
  id: 'tag-ai',
  userId: 'user-1',
  name: 'AI',
  color: '#0052FF',
  createdAt: new Date('2026-04-01T12:00:00.000Z'),
  updatedAt: new Date('2026-04-01T12:00:00.000Z'),
};

const founderTag: Tag = {
  id: 'tag-founder',
  userId: 'user-1',
  name: 'Founder',
  color: '#DD5B00',
  createdAt: new Date('2026-04-01T12:00:00.000Z'),
  updatedAt: new Date('2026-04-01T12:00:00.000Z'),
};

export const Gallery: Story = {
  render: () => (
    <div className="flex min-h-[300px] items-start justify-center bg-background p-6">
      <div className="w-full max-w-3xl rounded-[var(--rdx-radius-featured)] border border-border bg-[var(--rdx-color-bg-raised)] p-6 shadow-rdx-card">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Badges
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.2px] text-foreground">
            Tags and status should read fast, then disappear.
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge>Connected</Badge>
          <Badge variant="secondary">Quiet</Badge>
          <Badge variant="outline">Needs follow-up</Badge>
          <TagChip tag={aiTag} />
          <TagChip tag={founderTag} />
        </div>
      </div>
    </div>
  ),
};
