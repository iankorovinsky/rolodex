import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Row({
  label,
  style,
  children,
}: {
  label: string;
  style: CSSProperties;
  children: string;
}) {
  return (
    <div className="grid gap-3 border-t border-border py-5 md:grid-cols-[180px_1fr] md:items-baseline">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div style={style}>{children}</div>
    </div>
  );
}

export const Scale: Story = {
  render: () => (
    <div className="min-h-screen bg-muted px-8 py-10 text-foreground">
      <div className="mx-auto max-w-5xl rounded-[var(--rdx-radius-featured)] border border-border bg-card px-6 py-8 shadow-rdx-card md:px-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Type hierarchy
          </p>
          <h1 className="font-display text-[64px] leading-none tracking-[-1.8px] font-normal">
            Editorial on top. Utility underneath.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Serif carries framing moments. Sans handles every dense, operational part of the app.
          </p>
        </div>

        <div className="mt-8">
          <Row
            label="Hero Display"
            style={{ fontFamily: 'var(--rdx-font-display)', fontSize: 64, lineHeight: 1, letterSpacing: -1.8 }}
          >
            Know who matters, and why.
          </Row>
          <Row
            label="Section Display"
            style={{
              fontFamily: 'var(--rdx-font-display)',
              fontSize: 48,
              lineHeight: 1.02,
              letterSpacing: -1.2,
            }}
          >
            Relationship intelligence without visual noise.
          </Row>
          <Row
            label="Page Heading"
            style={{
              fontFamily: 'var(--rdx-font-sans)',
              fontSize: 32,
              lineHeight: 1.15,
              letterSpacing: -0.4,
              fontWeight: 500,
            }}
          >
            People you should follow up with
          </Row>
          <Row
            label="Card Heading"
            style={{
              fontFamily: 'var(--rdx-font-sans)',
              fontSize: 24,
              lineHeight: 1.2,
              letterSpacing: -0.2,
              fontWeight: 500,
            }}
          >
            Warm, precise, and quietly structured
          </Row>
          <Row
            label="Body"
            style={{
              fontFamily: 'var(--rdx-font-sans)',
              fontSize: 16,
              lineHeight: 1.5,
              fontWeight: 400,
              color: 'var(--rdx-color-fg-muted)',
            }}
          >
            Product UI should stay readable at speed. Hierarchy comes from spacing and composition
            before color.
          </Row>
          <Row
            label="Section Label"
            style={{
              fontFamily: 'var(--rdx-font-sans)',
              fontSize: 12,
              lineHeight: 1.35,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--rdx-color-fg-muted)',
            }}
          >
            Rolodex brand system
          </Row>
        </div>
      </div>
    </div>
  ),
};
