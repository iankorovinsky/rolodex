import { prisma } from '@rolodex/db';
import type { Prisma } from '@rolodex/db';
import type {
  Person,
  PeopleFilters,
  CreatePersonRequest,
  UpdatePersonRequest,
  RoleInput,
} from '@rolodex/types';
import { dedupeNormalizedValues, normalizeEmail, normalizePhoneNumber } from '@rolodex/types';
import { createAppError } from '../../utils/errors';
import { ensureRoleCompaniesBackfilled, resolveRoleCompany } from './company';
import { ensureRequestPositions } from './request';

const personInclude = {
  roles: {
    include: {
      companyRecord: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  phones: {
    orderBy: [{ isPrimary: 'desc' as const }, { phoneNumber: 'asc' as const }],
  },
  emails: {
    orderBy: [{ isPrimary: 'desc' as const }, { email: 'asc' as const }],
  },
  messageEvent: true,
  emailEvents: {
    orderBy: {
      occurredAt: 'desc' as const,
    },
  },
  calendarEvents: {
    orderBy: {
      startsAt: 'desc' as const,
    },
  },
  notes: true,
  requests: {
    orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.PersonInclude;

type PersonWithRelations = Prisma.PersonGetPayload<{
  include: typeof personInclude;
}>;

const mapPerson = (person: PersonWithRelations): Person => {
  const { tags, roles, ...rest } = person;
  return {
    ...rest,
    roles: roles.map((role) => ({
      ...role,
      company: role.companyRecord?.name ?? role.company ?? null,
      companyRecord: role.companyRecord,
    })),
    tags: tags.map((personTag) => personTag.tag),
  };
};

const validateTagIds = async (userId: string, tagIds: string[]) => {
  if (tagIds.length === 0) {
    return;
  }

  const count = await prisma.tag.count({
    where: {
      userId,
      id: { in: tagIds },
    },
  });

  if (count !== tagIds.length) {
    throw createAppError('One or more tags do not belong to the user.', 400);
  }
};

const normalizeRoles = (roles: RoleInput[] | undefined) =>
  roles
    ?.map((role) => ({
      title: role.title.trim(),
      company: role.company?.trim() || undefined,
      companyId: role.companyId?.trim() || undefined,
    }))
    .filter((role) => role.title.length > 0) ?? [];

const normalizeEmails = (emails: string[] | undefined) => {
  return dedupeNormalizedValues(emails ?? [], normalizeEmail);
};

const normalizePhoneNumbers = (phoneNumbers: string[] | undefined) =>
  dedupeNormalizedValues(phoneNumbers ?? [], normalizePhoneNumber);

export const listPeople = async (userId: string, filters: PeopleFilters) => {
  await ensureRoleCompaniesBackfilled(userId);
  await ensureRequestPositions(userId);

  const where: Prisma.PersonWhereInput = {
    userId,
    deletedAt: null,
  };

  if (filters.search) {
    const search = filters.search;
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { linkedinUrl: { contains: search, mode: 'insensitive' } },
      { xUrl: { contains: search, mode: 'insensitive' } },
      {
        phones: {
          some: {
            phoneNumber: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        emails: {
          some: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        roles: {
          some: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        roles: {
          some: {
            company: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        roles: {
          some: {
            companyRecord: {
              is: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      },
    ];
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }

  const people = await prisma.person.findMany({
    where,
    include: personInclude,
    orderBy: [{ isFavorite: 'desc' }, { firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
    take: filters.limit,
    skip: filters.offset,
  });

  return people.map(mapPerson);
};

export const getPersonById = async (userId: string, id: string) => {
  await ensureRoleCompaniesBackfilled(userId);
  await ensureRequestPositions(userId);

  const person = await prisma.person.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
    },
    include: personInclude,
  });

  return person ? mapPerson(person) : null;
};

export const createPerson = async (userId: string, data: CreatePersonRequest) => {
  const tagIds = data.tagIds ?? [];
  const roles = normalizeRoles(data.roles);
  const emails = normalizeEmails(data.emails);
  const phoneNumbers = normalizePhoneNumbers(data.phoneNumbers);
  await validateTagIds(userId, tagIds);

  const resolvedRoles = await Promise.all(
    roles.map(async (role) => ({
      title: role.title,
      ...(await resolveRoleCompany(prisma, userId, role)),
    }))
  );

  const person = await prisma.person.create({
    data: {
      userId,
      firstName: data.firstName?.trim() || null,
      lastName: data.lastName?.trim() || undefined,
      description: data.description,
      linkedinUrl: data.linkedinUrl?.trim() || undefined,
      xUrl: data.xUrl?.trim() || undefined,
      isFavorite: data.isFavorite ?? false,
      phones: phoneNumbers.length
        ? {
            create: phoneNumbers.map((phoneNumber, index) => ({
              phoneNumber,
              isPrimary: index === 0,
            })),
          }
        : undefined,
      emails: emails.length
        ? {
            create: emails.map((email, index) => ({
              email,
              isPrimary: index === 0,
            })),
          }
        : undefined,
      roles: resolvedRoles.length
        ? {
            create: resolvedRoles,
          }
        : undefined,
      tags: tagIds.length
        ? {
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: personInclude,
  });

  return mapPerson(person);
};

export const updatePerson = async (userId: string, id: string, data: UpdatePersonRequest) => {
  const existing = await prisma.person.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const tagIds = data.tagIds;
  const roles = data.roles ? normalizeRoles(data.roles) : undefined;
  const emails = data.emails ? normalizeEmails(data.emails) : undefined;
  const phoneNumbers = data.phoneNumbers ? normalizePhoneNumbers(data.phoneNumbers) : undefined;
  if (tagIds) {
    await validateTagIds(userId, tagIds);
  }

  const resolvedRoles =
    roles !== undefined
      ? await Promise.all(
          roles.map(async (role) => ({
            title: role.title,
            ...(await resolveRoleCompany(prisma, userId, role)),
          }))
        )
      : undefined;

  const person = await prisma.person.update({
    where: { id },
    data: {
      firstName: data.firstName?.trim() || (data.firstName !== undefined ? null : undefined),
      lastName: data.lastName?.trim() || undefined,
      description: data.description,
      linkedinUrl: data.linkedinUrl?.trim() || undefined,
      xUrl: data.xUrl?.trim() || undefined,
      isFavorite: data.isFavorite,
      phones:
        phoneNumbers !== undefined
          ? {
              deleteMany: {},
              create: phoneNumbers.map((phoneNumber, index) => ({
                phoneNumber,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      emails:
        emails !== undefined
          ? {
              deleteMany: {},
              create: emails.map((email, index) => ({
                email,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      roles:
        resolvedRoles !== undefined
          ? {
              deleteMany: {},
              create: resolvedRoles,
            }
          : undefined,
      tags: tagIds
        ? {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: personInclude,
  });

  return mapPerson(person);
};

export const softDeletePerson = async (userId: string, id: string) => {
  const existing = await prisma.person.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  return prisma.person.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
