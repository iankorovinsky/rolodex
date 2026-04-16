import { UserRound } from 'lucide-react';
import type { Person } from '@rolodex/types';
import { getPeople } from '@/lib/rolodex/api';
import { getPersonDisplayName } from '@/lib/rolodex/person';
import type { CommandEntityResult } from '@/commands/types';

interface SearchPeopleOptions {
  query?: string;
  limit?: number;
  onSelect: (personId: string) => void | Promise<void>;
}

function buildPersonSubtitle(person: Person) {
  const role = person.roles[0];

  if (role?.company) {
    return `${role.title} @ ${role.company}`;
  }

  if (role?.title) {
    return role.title;
  }

  return person.description || person.emails[0]?.email || person.phones[0]?.phoneNumber;
}

function buildPersonKeywords(person: Person) {
  return [
    person.firstName,
    person.lastName,
    person.description,
    person.linkedinUrl,
    person.xUrl,
    ...person.roles.flatMap((role) => [role.title, role.company]),
    ...person.emails.map((email) => email.email),
    ...person.phones.map((phone) => phone.phoneNumber),
    ...person.tags.map((tag) => tag.name),
  ].filter((value): value is string => Boolean(value?.trim()));
}

function rankPersonAgainstQuery(person: Person, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 0;
  }

  const title = getPersonDisplayName(person).toLowerCase();
  const subtitle = buildPersonSubtitle(person)?.toLowerCase() || '';
  const keywords = buildPersonKeywords(person).map((keyword) => keyword.toLowerCase());

  if (title === normalizedQuery) return -300;
  if (title.startsWith(normalizedQuery)) return -200;
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) return -120;
  if (title.includes(normalizedQuery)) return -80;
  if (subtitle.includes(normalizedQuery)) return -40;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) return -20;

  return 0;
}

function toCommandEntityResult(
  person: Person,
  onSelect: SearchPeopleOptions['onSelect']
): CommandEntityResult {
  return {
    id: `person:${person.id}`,
    title: getPersonDisplayName(person),
    subtitle: buildPersonSubtitle(person),
    keywords: buildPersonKeywords(person),
    group: 'people',
    icon: UserRound,
    kind: 'entity',
    priority: 0,
    perform: () => onSelect(person.id),
  };
}

export async function searchPeopleCommands({
  query,
  limit = 8,
  onSelect,
}: SearchPeopleOptions): Promise<CommandEntityResult[]> {
  const normalizedQuery = query?.trim().toLowerCase() || '';
  const people = await getPeople({
    search: query?.trim() || undefined,
    limit,
  });

  return people
    .sort((a, b) => {
      const rankDelta =
        rankPersonAgainstQuery(a, normalizedQuery) - rankPersonAgainstQuery(b, normalizedQuery);
      if (rankDelta !== 0) {
        return rankDelta;
      }

      return getPersonDisplayName(a).localeCompare(getPersonDisplayName(b));
    })
    .map((person) => toCommandEntityResult(person, onSelect));
}
