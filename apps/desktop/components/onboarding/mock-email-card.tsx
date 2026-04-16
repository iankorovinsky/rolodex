'use client';

import { Archive, Reply, Search, Star } from 'lucide-react';

export function MockEmailCard() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
      <div className="flex items-center justify-between border-b border-stone-200 bg-[#f8f6f1] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <div className="rounded-lg bg-white px-2.5 py-1 shadow-sm">Gmail</div>
          <div className="hidden rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-stone-400 sm:flex sm:items-center sm:gap-2">
            <Search className="h-3.5 w-3.5" />
            Search mail
          </div>
        </div>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Thread</div>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-[1.25rem] border border-stone-200 bg-[#fcfbf8] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">Maya Chen</p>
              <p className="mt-1 text-xs text-stone-500">maya@northstar.com</p>
            </div>
            <div className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              Follow-up
            </div>
          </div>

          <h4 className="mt-4 text-base font-semibold text-stone-950">
            Re: intros for infra engineers
          </h4>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Good catching up today. Sending the two names I mentioned. Could you also share the
            recruiting brief when you have a chance?
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-stone-400">
            <Star className="h-3.5 w-3.5" />
            Starred
            <span className="text-stone-300">•</span>
            2:14 PM
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.1rem] bg-stone-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Rolodex could capture
            </p>
            <p className="mt-2 text-sm text-stone-700">Asked for two intros</p>
          </div>
          <div className="rounded-[1.1rem] bg-stone-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Next action
            </p>
            <p className="mt-2 text-sm text-stone-700">Share recruiting brief</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-stone-500">
        <div className="flex items-center gap-2 text-sm">
          <Reply className="h-4 w-4" />
          Reply
        </div>
        <Archive className="h-4 w-4" />
      </div>
    </div>
  );
}
