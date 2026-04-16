'use client';

import type { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CommandGroupKey, CommandItem as PaletteCommandItem } from '@/commands/types';

type GroupedCommandItems = Record<CommandGroupKey, PaletteCommandItem[]>;

const groupLabels: Record<CommandGroupKey, string> = {
  navigation: 'Navigation',
  create: 'Create',
  page: 'This Page',
  people: 'People',
  account: 'Account',
};

function CommandIcon({ icon: Icon }: { icon?: ComponentType<{ className?: string }> }) {
  return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null;
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  query,
  onQueryChange,
  groupedItems,
  isPeopleLoading,
  onSelectItem,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  groupedItems: GroupedCommandItems;
  isPeopleLoading: boolean;
  onSelectItem: (item: PaletteCommandItem) => void;
}) {
  const hasVisibleItems = Object.values(groupedItems).some((items) => items.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
        <Command shouldFilter={false} className="rounded-none border-0">
          <CommandInput
            placeholder="Search actions or people..."
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList className="max-h-[28rem]">
            {!hasVisibleItems && !isPeopleLoading ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : null}

            {(['navigation', 'create', 'page', 'people', 'account'] as const).map((group) => {
              const items = groupedItems[group];

              if (items.length === 0 && !(group === 'people' && isPeopleLoading)) {
                return null;
              }

              return (
                <CommandGroup key={group} heading={groupLabels[group]}>
                  {items.map((item) => (
                    <CommandItem key={item.id} value={item.id} onSelect={() => onSelectItem(item)}>
                      <CommandIcon icon={item.icon} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{item.title}</div>
                        {item.subtitle ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                  {group === 'people' && isPeopleLoading ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading people…
                    </div>
                  ) : null}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
