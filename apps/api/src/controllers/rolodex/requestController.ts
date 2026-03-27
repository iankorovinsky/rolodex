import type { Request, Response, NextFunction } from 'express';
import type {
  ApiResponse,
  Request as RequestType,
  CreateRequestRequest,
  UpdateRequestRequest,
  RequestType as RequestTypeEnum,
} from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import { createAppError } from '../../utils/errors';
import { parseQueryBoolean } from '../../utils/query';
import {
  createRequest,
  deleteRequest,
  listRequests,
  updateRequest,
} from '../../services/rolodex/request';

export const getRequests = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const personId = typeof req.query.personId === 'string' ? req.query.personId : undefined;
    const type =
      typeof req.query.type === 'string' ? (req.query.type as RequestTypeEnum) : undefined;
    const completed = parseQueryBoolean(req.query.completed);

    const requests = await listRequests(userId, { personId, type, completed });
    const response: ApiResponse<RequestType[]> = {
      success: true,
      data: requests,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createRequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const body = req.body as CreateRequestRequest;
    if (!body.personId || !body.type || !body.description) {
      throw createAppError('personId, type, and description are required.', 400);
    }

    const request = await createRequest(userId, body);
    const response: ApiResponse<RequestType> = {
      success: true,
      data: request,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateRequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const body = req.body as UpdateRequestRequest;
    const request = await updateRequest(userId, req.params.id, body);
    if (!request) {
      throw createAppError('Request not found.', 404);
    }

    const response: ApiResponse<RequestType> = {
      success: true,
      data: request,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteRequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const request = await deleteRequest(userId, req.params.id);
    if (!request) {
      throw createAppError('Request not found.', 404);
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
