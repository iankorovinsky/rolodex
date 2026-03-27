'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxCreatableProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  onCreateNew?: (value: string) => Promise<void>;
  placeholder?: string;
  createLabel?: (query: string) => string;
}

export function ComboboxCreatable({
  options,
  values,
  onChange,
  onCreateNew,
  placeholder = 'Search tags...',
  createLabel = (query) => `Create "${query}"`,
}: ComboboxCreatableProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedValues = new Set(values.map((v) => v.toLowerCase()));
  const normalizedQuery = query.trim().toLowerCase();

  const filteredOptions = options.filter(
    (option) =>
      !normalizedValues.has(option.value.toLowerCase()) &&
      option.label.toLowerCase().includes(normalizedQuery)
  );

  const canCreate =
    normalizedQuery.length > 0 &&
    !options.some((option) => option.value.toLowerCase() === normalizedQuery) &&
    !normalizedValues.has(normalizedQuery);

  const selectedOptions = values.map((value) => {
    const existingOption = options.find(
      (option) => option.value.toLowerCase() === value.toLowerCase()
    );
    return existingOption || { label: value, value };
  });

  const handleSelect = async (value: string, isNew: boolean = false) => {
    const normalizedValue = value.trim();
    if (!normalizedValue || normalizedValues.has(normalizedValue.toLowerCase())) {
      return;
    }

    onChange([...values, normalizedValue]);
    setQuery('');
    inputRef.current?.focus();

    if (isNew && onCreateNew) {
      onCreateNew(normalizedValue).catch((error) => {
        console.error('Failed to create tag:', error);
      });
    }
  };

  const handleRemove = (value: string) => {
    onChange(values.filter((v) => v.toLowerCase() !== value.toLowerCase()));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showResults = isOpen && (filteredOptions.length > 0 || canCreate);

  return (
    <div ref={containerRef} className="space-y-2">
      {selectedOptions.length > 0 && (
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
      )}

      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full"
        />

        {showResults && (
          <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left"
                >
                  {option.label}
                </button>
              ))}

              {canCreate && (
                <>
                  {filteredOptions.length > 0 && (
                    <div className="my-1 h-px bg-border" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim(), true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left text-muted-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    {createLabel(query.trim())}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
