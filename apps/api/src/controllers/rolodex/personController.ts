import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse, CreatePersonRequest, Person, UpdatePersonRequest } from '@rolodex/types';
import {
  createPerson,
  getPersonById,
  listPeople,
  softDeletePerson,
  updatePerson,
} from '../../services/rolodex/person';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import { createAppError } from '../../utils/errors';

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getPeople = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const tagIds =
      typeof req.query.tagIds === 'string'
        ? req.query.tagIds
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : undefined;
    const limit = typeof req.query.limit === 'string' ? parseNumber(req.query.limit) : undefined;
    const offset = typeof req.query.offset === 'string' ? parseNumber(req.query.offset) : undefined;

    const people = await listPeople(userId, {
      search,
      tagIds,
      limit,
      offset,
    });

    const response: ApiResponse<Person[]> = {
      success: true,
      data: people,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getPerson = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const person = await getPersonById(userId, req.params.id);
    if (!person) {
      throw createAppError('Person not found.', 404);
    }

    const response: ApiResponse<Person> = {
      success: true,
      data: person,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createPersonHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const body = req.body as CreatePersonRequest;
    if (!body.firstName?.trim()) {
      throw createAppError('First name is required.', 400);
    }

    const person = await createPerson(userId, body);
    const response: ApiResponse<Person> = {
      success: true,
      data: person,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updatePersonHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const body = req.body as UpdatePersonRequest;
    const person = await updatePerson(userId, req.params.id, body);
    if (!person) {
      throw createAppError('Person not found.', 404);
    }

    const response: ApiResponse<Person> = {
      success: true,
      data: person,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deletePersonHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const person = await softDeletePerson(userId, req.params.id);
    if (!person) {
      throw createAppError('Person not found.', 404);
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
