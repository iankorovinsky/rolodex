'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CreatableMultiSelectOption {
  label: string;
  value: string;
}

interface CreatableMultiSelectProps {
  options: CreatableMultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  createLabel?: (query: string) => string;
}

export function CreatableMultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  createLabel = (query) => `Add "${query}"`,
}: CreatableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const normalizedValues = useMemo(
    () => new Set(values.map((value) => value.toLowerCase())),
    [values]
  );
  const normalizedQuery = query.trim().toLowerCase();

  const availableOptions = useMemo(
    () => options.filter((option) => !normalizedValues.has(option.value.toLowerCase())),
    [normalizedValues, options]
  );

  const selectedOptions = values.map((value) => {
    const existingOption = options.find(
      (option) => option.value.toLowerCase() === value.toLowerCase()
    );
    return existingOption || { label: value, value };
  });

  const canCreate =
    normalizedQuery.length > 0 &&
    !options.some((option) => option.value.toLowerCase() === normalizedQuery) &&
    !normalizedValues.has(normalizedQuery);

  const handleSelect = (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue || normalizedValues.has(normalizedValue.toLowerCase())) {
      return;
    }

    onChange([...values, normalizedValue]);
    setQuery('');
    setOpen(false);
  };

  const handleRemove = (value: string) => {
    onChange(values.filter((existingValue) => existingValue.toLowerCase() !== value.toLowerCase()));
  };

  return (
    <div className="space-y-2">
      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="outline" className="gap-1 pr-1">
              {option.label}
              <button
                type="button"
                onClick={() => handleRemove(option.value)}
                className="rounded-full p-0.5 hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter>
            <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>{canCreate ? null : emptyText}</CommandEmpty>
              <CommandGroup>
                {availableOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check className={cn('h-4 w-4 opacity-0')} />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreate ? (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem value={query} onSelect={() => handleSelect(query)}>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      {createLabel(query.trim())}
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
