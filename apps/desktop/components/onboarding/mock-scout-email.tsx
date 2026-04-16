'use client';

import { ChevronLeft, MoreHorizontal, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Compact Gmail-inspired thread mock for onboarding (Scouts).
 */
export function MockScoutInboxEmail() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)]">
      <div className="flex h-10 items-center gap-3 border-b border-border/60 bg-muted/30 px-3">
        <div className="flex gap-1.5 pl-0.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <p className="min-w-0 flex-1 truncate text-center text-[12px] font-medium text-muted-foreground">
          Inbox — scouts@rolodex.app
        </p>
        <div className="w-10 shrink-0" aria-hidden />
      </div>

      <div className="border-b border-border/60 bg-muted/15 px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-[13px] text-muted-foreground">Thread</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 text-muted-foreground"
            aria-label="More"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-medium leading-snug tracking-tight text-foreground">
              Re: intros for infra engineers
            </h2>
            <p className="text-[13px] text-muted-foreground">Inbox · 12 messages</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-medium text-primary-foreground">
              S
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div>
                  <span className="text-sm font-medium text-foreground">Scouts</span>
                  <span className="text-sm text-muted-foreground"> &lt;scouts@rolodex.app&gt;</span>
                </div>
                <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime="14:02">
                  2:14 PM
                </time>
              </div>
              <p className="text-[14px] leading-relaxed text-foreground">
                Vihaan just posted that he’s leaving Salesforce. Given what you’ve shared about
                Maya’s team, he looks like a strong fit - worth reaching out while he’s fresh on the
                market.
              </p>
              <p className="text-xs text-muted-foreground">— Rolodex Scout</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-full px-4 text-[13px] font-medium"
          >
            <Reply className="size-4" />
            Reply
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 rounded-full text-[13px]">
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
