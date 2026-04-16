import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Color',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Swatch({
  name,
  value,
  textClassName = 'text-foreground',
}: {
  name: string;
  value: string;
  textClassName?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--rdx-radius-featured)] border border-border bg-card shadow-rdx-card">
      <div className="h-20 w-full" style={{ backgroundColor: value }} />
      <div className="space-y-1 px-4 py-3">
        <div className={`text-sm font-medium ${textClassName}`}>{name}</div>
        <div className="font-mono text-xs text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}

export const Palette: Story = {
  render: () => (
    <div className="min-h-screen bg-background px-8 py-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Rolodex foundation
          </p>
          <h1 className="font-display text-5xl leading-none tracking-[-1.2px] font-normal">
            Coinbase blue with warmer product surfaces.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Blue stays functional. Warm neutrals carry the layout. Borders and shadows stay quiet.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-[-0.2px]">Brand and action</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Swatch name="brand.blue" value="var(--rdx-color-brand)" textClassName="text-white" />
            <Swatch name="brand.blueHover" value="var(--rdx-color-brand-hover)" />
            <Swatch
              name="brand.blueActive"
              value="var(--rdx-color-brand-active)"
              textClassName="text-white"
            />
            <Swatch name="brand.blueTint" value="var(--rdx-color-brand-tint)" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-[-0.2px]">Surfaces and ink</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Swatch name="surface.page" value="var(--rdx-color-bg)" />
            <Swatch name="surface.alt" value="var(--rdx-color-bg-alt)" />
            <Swatch name="surface.raised" value="var(--rdx-color-bg-raised)" />
            <Swatch
              name="surface.dark"
              value="var(--rdx-color-bg-dark)"
              textClassName="text-white"
            />
            <Swatch name="ink.strong" value="var(--rdx-color-fg)" textClassName="text-white" />
            <Swatch
              name="ink.default"
              value="var(--rdx-color-fg-default)"
              textClassName="text-white"
            />
            <Swatch name="ink.muted" value="var(--rdx-color-fg-muted)" textClassName="text-white" />
            <Swatch name="ink.subtle" value="var(--rdx-color-fg-subtle)" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-[-0.2px]">Structure and semantic</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Swatch name="border.whisper" value="var(--rdx-color-border)" />
            <Swatch name="border.strong" value="var(--rdx-color-border-strong)" />
            <Swatch name="focus.ring" value="var(--rdx-color-focus)" />
            <Swatch name="success" value="var(--rdx-color-success)" textClassName="text-white" />
            <Swatch name="warning" value="var(--rdx-color-warning)" textClassName="text-white" />
          </div>
        </section>
      </div>
    </div>
  ),
};
