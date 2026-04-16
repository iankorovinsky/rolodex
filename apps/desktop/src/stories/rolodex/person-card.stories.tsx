import type { JSX } from 'react';
import type { Person } from '@rolodex/types';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonCard } from '@/components/rolodex/person-card';

const meta = {
  title: 'Rolodex/PersonCard',
  component: PersonCard,
  decorators: [
    (Story: () => JSX.Element) => (
      <MemoryRouter>
        <div className="min-h-screen bg-muted p-6">
          <div className="mx-auto max-w-md">
            <Story />
          </div>
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PersonCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const basePerson = {
  id: 'person-1',
  userId: 'user-1',
  firstName: 'Maya',
  lastName: 'Chen',
  description: 'Operator turned founder. Strong on GTM systems and warm intros.',
  linkedinUrl: null,
  xUrl: null,
  isFavorite: true,
  createdAt: new Date('2026-04-01T12:00:00.000Z'),
  updatedAt: new Date('2026-04-10T12:00:00.000Z'),
  deletedAt: null,
  roles: [
    {
      id: 'role-1',
      personId: 'person-1',
      companyId: 'company-1',
      title: 'Founder',
      company: 'Northline',
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:00:00.000Z'),
      companyRecord: null,
    },
  ],
  tags: [
    {
      id: 'tag-1',
      userId: 'user-1',
      name: 'AI',
      color: '#0052FF',
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:00:00.000Z'),
    },
    {
      id: 'tag-2',
      userId: 'user-1',
      name: 'Founder',
      color: '#DD5B00',
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:00:00.000Z'),
    },
    {
      id: 'tag-3',
      userId: 'user-1',
      name: 'Toronto',
      color: '#1AAE39',
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:00:00.000Z'),
    },
  ],
  phones: [],
  emails: [
    {
      id: 'email-1',
      personId: 'person-1',
      email: 'maya@northline.ai',
      isPrimary: true,
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:00:00.000Z'),
    },
  ],
  messageEvent: {
    id: 'message-1',
    personId: 'person-1',
    body: 'Happy to introduce you after the launch settles.',
    sentAt: new Date('2026-04-09T16:35:00.000Z'),
    direction: 'OUTBOUND',
    createdAt: new Date('2026-04-09T16:35:00.000Z'),
    updatedAt: new Date('2026-04-09T16:35:00.000Z'),
  },
  emailEvents: [],
  calendarEvents: [],
  notes: [],
  requests: [
    {
      id: 'request-1',
      personId: 'person-1',
      type: 'ASK',
      description: 'Ask for an intro to the enterprise buyer at Figma.',
      completed: false,
      parentId: null,
      position: 0,
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:00:00.000Z'),
    },
  ],
} as Person;

export const Default: Story = {
  args: {
    person: basePerson,
  },
};

export const BusyRelationship: Story = {
  args: {
    person: {
      ...basePerson,
      requests: [
        ...basePerson.requests,
        {
          id: 'request-2',
          personId: 'person-1',
          type: 'FAVOUR',
          description: 'Review her new hiring page copy.',
          completed: false,
          parentId: null,
          position: 1,
          createdAt: new Date('2026-04-02T12:00:00.000Z'),
          updatedAt: new Date('2026-04-02T12:00:00.000Z'),
        },
      ],
    },
  },
};
