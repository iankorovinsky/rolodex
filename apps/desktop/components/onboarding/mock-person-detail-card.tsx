'use client';

import { ArrowLeft, AtSign, Building, Calendar, Link2, Mail, Phone, Star } from 'lucide-react';

export function MockPersonDetailCard() {
  return (
    <div className="rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(28,25,23,0.08)]">
      <div className="mb-5 flex items-center gap-4">
        <div className="flex-1">
          <h3 className="text-2xl font-semibold text-stone-950">Maya Chen</h3>
          <p className="mt-1 text-sm text-stone-500">
            Product Lead at Tribal. Met through a second-degree intro.
          </p>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-500"
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-4 text-sm text-stone-500">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          +1 647 111 2222
        </div>
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          LinkedIn
        </div>
        <div className="flex items-center gap-2">
          <AtSign className="h-4 w-4" />X
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <section>
            <p className="mb-2 text-sm font-medium text-stone-900">Roles</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Building className="h-4 w-4" />
                Product Lead @ Tribal
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium text-stone-900">Contact</p>
            <div className="space-y-2 rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                maya@tribal.camp
                <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px]">Primary</span>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium text-stone-900">Email Activity</p>
            <div className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-stone-900">Re: intros for infra engineers</span>
                <span className="text-stone-400">2:14 PM</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-400"></div>
              <p className="mt-2 text-sm text-stone-600">
                Asked for the names you mentioned after coffee.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section>
            <p className="mb-2 text-sm font-medium text-stone-900">Calendar Activity</p>
            <div className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                <Calendar className="h-4 w-4" />
                <span>Tribal hiring sync</span>
              </div>
              <p className="mt-1 text-xs text-stone-400">Thursday, 3:00 PM to 3:45 PM</p>
              <p className="mt-2 text-sm text-stone-600">
                Discussed PM hiring, team gaps, and intro requests.
              </p>
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium text-stone-900">Notes</p>
            <div className="space-y-2">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                Favour: send two infra intros by Friday.
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Ask: JD for PM role.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
