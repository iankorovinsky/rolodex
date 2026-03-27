'use client';

import { useMemo, useState } from 'react';
import { Loader2, CheckIcon, Star, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Tag } from '@rolodex/types';

export type PersonFormValues = {
  firstName: string;
  lastName?: string;
  description?: string;
  phoneNumbers?: string[];
  linkedinUrl?: string;
  xUrl?: string;
  emails?: string[];
  isFavorite?: boolean;
  tagNames?: string[];
};

interface PersonFormProps {
  initialData?: {
    firstName?: string;
    lastName?: string;
    description?: string;
    phoneNumbers?: string[];
    linkedinUrl?: string;
    xUrl?: string;
    emails?: string[];
    isFavorite?: boolean;
    tagNames?: string[];
  };
  tags: Tag[];
  onSubmit: (data: PersonFormValues) => Promise<void>;
  onCancel: () => void;
  onTagCreated?: (tag: Tag) => void;
  isLoading?: boolean;
}

export function PersonForm({
  initialData,
  tags,
  onSubmit,
  onCancel,
  onTagCreated,
  isLoading,
}: PersonFormProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [phoneNumbersText, setPhoneNumbersText] = useState(
    (initialData?.phoneNumbers || []).join('\n')
  );
  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedinUrl || '');
  const [xUrl, setXUrl] = useState(initialData?.xUrl || '');
  const [emailsText, setEmailsText] = useState((initialData?.emails || []).join('\n'));
  const [isFavorite, setIsFavorite] = useState(initialData?.isFavorite || false);
  const [selectedTagNames, setSelectedTagNames] = useState(initialData?.tagNames || []);

  const tagOptions = useMemo(
    () =>
      tags
        .map((tag) => ({
          label: tag.name,
          value: tag.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tags]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emails = emailsText
      .split(/[\n,]/)
      .map((email) => email.trim())
      .filter(Boolean);
    const phoneNumbers = phoneNumbersText
      .split(/[\n,]/)
      .map((phoneNumber) => phoneNumber.trim())
      .filter(Boolean);

    await onSubmit({
      firstName,
      lastName: lastName || undefined,
      description: description || undefined,
      phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
      linkedinUrl: linkedinUrl || undefined,
      xUrl: xUrl || undefined,
      emails: emails.length > 0 ? emails : undefined,
      isFavorite,
      tagNames: selectedTagNames.length > 0 ? selectedTagNames : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-full flex-col bg-background">
      <div className="space-y-6 px-6 py-6">
        <section className="space-y-4">

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name" className="inline-flex items-baseline gap-1">
                First Name<span className="text-destructive">*</span>
              </Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tagline</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Co-Director @ Hack the North, Student @ University of Waterloo"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="favorite" className="flex items-center gap-2 text-sm font-medium">
              <Star
                className={cn(
                  'h-4 w-4',
                  isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                )}
              />
              Favorite
            </Label>
            <Switch id="favorite" checked={isFavorite} onCheckedChange={setIsFavorite} />
          </div>
        </section>

        <section className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="emails">Emails</Label>
            <Textarea
              id="emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder={'john@example.com\njohn@work.com'}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone-numbers">Phone Numbers</Label>
              <Textarea
                id="phone-numbers"
                value={phoneNumbersText}
                onChange={(e) => setPhoneNumbersText(e.target.value)}
                placeholder={'+1 416 123 4567\n+1 647 987 6543'}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin-url">LinkedIn</Label>
              <Input
                id="linkedin-url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/ian-korovinsky"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="x-url">X</Label>
            <Input
              id="x-url"
              value={xUrl}
              onChange={(e) => setXUrl(e.target.value)}
              placeholder="https://x.com/ikorovinsky"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <ComboboxCreatable
              options={tagOptions}
              values={selectedTagNames}
              onChange={setSelectedTagNames}
              onCreateNew={
                onTagCreated
                  ? async (name) => {
                      const { createTag } = await import('@/lib/rolodex/api');
                      const newTag = await createTag({ name });
                      onTagCreated(newTag);
                    }
                  : undefined
              }
              placeholder="Search tags..."
              createLabel={(query) => `Create "${query}"`}
            />
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 mt-auto border-t bg-background px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">You can edit the details later.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <Trash2Icon className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={!firstName.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
