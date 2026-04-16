import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Controls/Button',
  component: Button,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Gallery: Story = {
  render: () => (
    <div className="flex min-h-[420px] items-start justify-center bg-muted p-6">
      <div className="w-full max-w-4xl rounded-[var(--rdx-radius-featured)] border border-border bg-card p-6 shadow-rdx-card">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Buttons
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.2px] text-foreground">
            Action is blue. Secondary actions stay quiet.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Button>Add person</Button>
              <Button variant="secondary">Review notes</Button>
              <Button variant="ghost">View activity</Button>
              <Button variant="destructive">
                <Trash2 />
                Remove
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Sizes and icon usage</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">
                <Plus />
                Quick add
              </Button>
              <Button>
                <Search />
                Search contacts
              </Button>
              <Button size="lg">Create introduction</Button>
              <Button size="icon" variant="secondary">
                <Plus />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">States</p>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
