import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const meta = {
  title: 'Controls/Input',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {children}
    </label>
  );
}

export const Gallery: Story = {
  render: () => (
    <div className="flex min-h-[520px] items-start justify-center bg-muted p-6">
      <div className="w-full max-w-3xl rounded-[var(--rdx-radius-featured)] border border-border bg-card p-6 shadow-rdx-card">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Inputs
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.2px] text-foreground">
            Functional controls with quiet chrome.
          </h2>
        </div>

        <div className="grid gap-5">
          <Field label="Default">
            <Input placeholder="Search people, companies, or notes" />
          </Field>

          <Field label="Error state">
            <div className="space-y-2">
              <Input aria-invalid defaultValue="missing@context" />
              <p className="text-sm text-destructive">
                Add context so this contact method is useful later.
              </p>
            </div>
          </Field>

          <Field label="Textarea">
            <Textarea
              defaultValue="Met at the operator dinner in Toronto. Knows the growth team at Figma. Follow up next month after the product launch."
              className="min-h-28"
            />
          </Field>

          <Field label="Select">
            <Select defaultValue="warm">
              <SelectTrigger>
                <SelectValue placeholder="Choose density" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm editorial</SelectItem>
                <SelectItem value="quiet">Quiet utility</SelectItem>
                <SelectItem value="focused">Focused operator</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  ),
};
