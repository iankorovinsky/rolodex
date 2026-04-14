'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface NotepadProps extends React.ComponentProps<'textarea'> {
  containerClassName?: string;
  contentClassName?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Notepad = React.forwardRef<HTMLTextAreaElement, NotepadProps>(
  (
    { className, containerClassName, contentClassName, header, footer, rows = 8, ...props },
    ref
  ) => {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(255,250,240,0.94))] shadow-sm',
          containerClassName
        )}
      >
        {header ? (
          <div className="border-b border-border/60 bg-background/40 px-4 py-3 text-sm">
            {header}
          </div>
        ) : null}

        <div
          className={cn(
            'bg-[linear-gradient(transparent_31px,rgba(148,163,184,0.16)_32px)] bg-[length:100%_32px] px-4 py-3',
            contentClassName
          )}
        >
          <textarea
            ref={ref}
            rows={rows}
            data-slot="notepad"
            className={cn(
              'placeholder:text-muted-foreground/90 min-h-32 w-full resize-none border-0 bg-transparent p-0 text-sm leading-8 text-foreground outline-none',
              'focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
        </div>

        {footer ? (
          <div className="border-t border-border/60 bg-background/40 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    );
  }
);

Notepad.displayName = 'Notepad';

export { Notepad };
