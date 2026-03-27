import type { Person } from '@rolodex/types';

export const getPersonDisplayName = (person: Pick<Person, 'firstName' | 'lastName' | 'phones' | 'emails'>) =>
  [person.firstName, person.lastName].filter(Boolean).join(' ') ||
  person.phones[0]?.phoneNumber ||
  person.emails[0]?.email ||
  'Unnamed person';

export const getLatestMessageSummary = (person: Pick<Person, 'messageEvent'>) => {
  if (!person.messageEvent) {
    return null;
  }

  return {
    body: person.messageEvent.body || 'No message preview',
    sentAtLabel: new Date(person.messageEvent.sentAt).toLocaleString(),
    direction: person.messageEvent.direction.toLowerCase(),
  };
};
