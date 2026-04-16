'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AddPersonSheet } from '@/components/rolodex/add-person-sheet';
import { PersonCard } from '@/components/rolodex/person-card';
import { Input } from '@/components/ui/input';
import { getPeople, getTags } from '@/lib/rolodex/api';
import { getPersonDisplayName } from '@/lib/rolodex/person';
import type { Person, Tag } from '@rolodex/types';

const EMPTY_TAG_IDS: string[] = [];

export function RolodexIndexRoute() {
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const selectedTagIds = EMPTY_TAG_IDS;

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [peopleData, tagsData] = await Promise.all([getPeople(), getTags()]);
        setPeople(peopleData);
        setTags(tagsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredPeople = useMemo(() => {
    let result = people;

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          getPersonDisplayName(p).toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.phones?.some((phone) => phone.phoneNumber.toLowerCase().includes(query)) ||
          p.linkedinUrl?.toLowerCase().includes(query) ||
          p.xUrl?.toLowerCase().includes(query) ||
          p.emails?.some((email) => email.email.toLowerCase().includes(query)) ||
          p.roles?.some(
            (r) => r.title.toLowerCase().includes(query) || r.company?.toLowerCase().includes(query)
          )
      );
    }

    if (selectedTagIds.length > 0) {
      result = result.filter((p) => p.tags?.some((t) => selectedTagIds.includes(t.id)));
    }

    return [...result].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return getPersonDisplayName(a).localeCompare(getPersonDisplayName(b));
    });
  }, [people, search, selectedTagIds]);

  const handlePersonCreated = (person: Person) => {
    setPeople((prev) => [...prev, person]);
    setTags((prev) => {
      const nextTags = new Map(prev.map((tag) => [tag.id, tag]));
      person.tags.forEach((tag) => nextTags.set(tag.id, tag));
      return Array.from(nextTags.values()).sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const hasFilters = search.trim() || selectedTagIds.length > 0;

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Rolodex</h1>
            <p className="text-sm text-muted-foreground">
              Track people, context, asks, favours, and relationship history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AddPersonSheet tags={tags} onPersonCreated={handlePersonCreated} />
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filteredPeople.length > 0 ? (
          <div className="space-y-3">
            {filteredPeople.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {hasFilters
                ? 'No people match your search'
                : 'No people yet. Add someone to get started.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
