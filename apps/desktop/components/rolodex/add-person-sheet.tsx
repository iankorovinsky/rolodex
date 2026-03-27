'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PersonForm, type PersonFormValues } from '@/components/rolodex/person-form';
import { createPerson, createTag, getTags } from '@/lib/rolodex/api';
import type { CreatePersonRequest, Person, Tag } from '@rolodex/types';
import { Separator } from '@radix-ui/react-separator';

interface AddPersonSheetProps {
  tags: Tag[];
  onPersonCreated: (person: Person) => void;
}

export function AddPersonSheet({ tags, onPersonCreated }: AddPersonSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [availableTags, setAvailableTags] = useState(tags);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setAvailableTags(tags);
    }
    setIsOpen(nextOpen);
  };

  const resolveTagIds = async (tagNames: string[] | undefined) => {
    if (!tagNames?.length) {
      return undefined;
    }

    const normalizedNames = Array.from(
      new Set(tagNames.map((name) => name.trim()).filter(Boolean))
    );
    if (normalizedNames.length === 0) {
      return undefined;
    }

    const tagMap = new Map(availableTags.map((tag) => [tag.name.toLowerCase(), tag]));
    const resolvedTags: Tag[] = [];

    for (const name of normalizedNames) {
      const existingTag = tagMap.get(name.toLowerCase());
      if (existingTag) {
        resolvedTags.push(existingTag);
        continue;
      }

      try {
        const newTag = await createTag({ name });
        tagMap.set(newTag.name.toLowerCase(), newTag);
        resolvedTags.push(newTag);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create tag';

        if (!message.toLowerCase().includes('already exists')) {
          throw error;
        }

        const refreshedTags = await getTags();
        const matchedTag = refreshedTags.find(
          (tag) => tag.name.toLowerCase() === name.toLowerCase()
        );
        if (!matchedTag) {
          throw error;
        }

        refreshedTags.forEach((tag) => tagMap.set(tag.name.toLowerCase(), tag));
        resolvedTags.push(matchedTag);
      }
    }

    const nextAvailableTags = Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setAvailableTags(nextAvailableTags);

    return resolvedTags.map((tag) => tag.id);
  };

  const handleCreatePerson = async (data: PersonFormValues) => {
    setIsCreating(true);
    try {
      const tagIds = await resolveTagIds(data.tagNames);
      const payload: CreatePersonRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        description: data.description,
        phoneNumbers: data.phoneNumbers,
        linkedinUrl: data.linkedinUrl,
        xUrl: data.xUrl,
        emails: data.emails,
        isFavorite: data.isFavorite,
        tagIds,
      };
      const newPerson = await createPerson(payload);
      onPersonCreated(newPerson);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create person:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-hidden border-l bg-background p-0 sm:max-w-xl">
        <SheetHeader className=" bg-white px-6 py-5 pr-14">
          <SheetTitle className="text-xl">Add Person</SheetTitle>
        </SheetHeader>
        <Separator />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PersonForm
            tags={availableTags}
            onSubmit={handleCreatePerson}
            onCancel={() => setIsOpen(false)}
            onTagCreated={(tag) => setAvailableTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))}
            isLoading={isCreating}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
