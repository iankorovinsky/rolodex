import { prisma } from '@rolodex/db';
import type { Prisma } from '@rolodex/db';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@rolodex/types';
import { createAppError } from '../../utils/errors';

type DbClient = typeof prisma | Prisma.TransactionClient;

const companyOrderBy = [{ name: 'asc' as const }, { id: 'asc' as const }];

function normalizeCompanyName(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function findCompanyByName(client: DbClient, userId: string, name: string) {
  return client.company.findFirst({
    where: {
      userId,
      name: { equals: name, mode: 'insensitive' },
    },
  });
}

async function getOrCreateCompany(client: DbClient, userId: string, rawName: string) {
  const name = normalizeCompanyName(rawName);
  if (!name) {
    return null;
  }

  const existing = await findCompanyByName(client, userId, name);
  if (existing) {
    if (existing.deletedAt) {
      return client.company.update({
        where: { id: existing.id },
        data: {
          name,
          deletedAt: null,
        },
      });
    }

    if (existing.name !== name) {
      return client.company.update({
        where: { id: existing.id },
        data: { name },
      });
    }

    return existing;
  }

  return client.company.create({
    data: {
      userId,
      name,
    },
  });
}

export async function ensureCompanyOwnedByUser(userId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      userId,
      deletedAt: null,
    },
  });

  if (!company) {
    throw createAppError('Company not found.', 404);
  }

  return company;
}

export async function ensureRoleCompaniesBackfilled(userId: string) {
  const roles = await prisma.role.findMany({
    where: {
      companyId: null,
      company: { not: null },
      person: {
        userId,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      company: true,
    },
  });

  if (roles.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const role of roles) {
      const companyName = normalizeCompanyName(role.company);
      if (!companyName) {
        continue;
      }

      const company = await getOrCreateCompany(tx, userId, companyName);
      if (!company) {
        continue;
      }

      await tx.role.update({
        where: { id: role.id },
        data: {
          companyId: company.id,
          company: company.name,
        },
      });
    }
  });
}

export async function resolveRoleCompany(
  client: DbClient,
  userId: string,
  input: { companyId?: string; company?: string }
) {
  if (input.companyId) {
    const company = await client.company.findFirst({
      where: {
        id: input.companyId,
        userId,
        deletedAt: null,
      },
    });

    if (!company) {
      throw createAppError('Company not found.', 400);
    }

    return {
      companyId: company.id,
      company: company.name,
    };
  }

  if (!input.company?.trim()) {
    return {
      companyId: undefined,
      company: undefined,
    };
  }

  const company = await getOrCreateCompany(client, userId, input.company);
  if (!company) {
    return {
      companyId: undefined,
      company: undefined,
    };
  }

  return {
    companyId: company.id,
    company: company.name,
  };
}

export async function listCompanies(userId: string): Promise<Company[]> {
  await ensureRoleCompaniesBackfilled(userId);

  return prisma.company.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: companyOrderBy,
  });
}

export async function getCompanyById(userId: string, id: string): Promise<Company | null> {
  await ensureRoleCompaniesBackfilled(userId);

  return prisma.company.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
    },
  });
}

export async function createCompany(userId: string, data: CreateCompanyRequest): Promise<Company> {
  const name = normalizeCompanyName(data.name);
  if (!name) {
    throw createAppError('Company name is required.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const company = await getOrCreateCompany(tx, userId, name);
    if (!company) {
      throw createAppError('Company name is required.', 400);
    }

    return company;
  });
}

export async function updateCompany(
  userId: string,
  id: string,
  data: UpdateCompanyRequest
): Promise<Company | null> {
  const existing = await prisma.company.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  const name = normalizeCompanyName(data.name);
  if (!name) {
    throw createAppError('Company name is required.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const conflicting = await findCompanyByName(tx, userId, name);
    if (conflicting && conflicting.id !== id && !conflicting.deletedAt) {
      throw createAppError('A company with that name already exists.', 409);
    }

    if (conflicting && conflicting.id !== id && conflicting.deletedAt) {
      throw createAppError('A deleted company with that name already exists.', 409);
    }

    const company = await tx.company.update({
      where: { id },
      data: { name },
    });

    await tx.role.updateMany({
      where: { companyId: id },
      data: { company: name },
    });

    return company;
  });
}

export async function deleteCompany(userId: string, id: string): Promise<Company | null> {
  const existing = await prisma.company.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    await tx.role.updateMany({
      where: { companyId: id },
      data: { companyId: null },
    });

    return tx.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  });
}
