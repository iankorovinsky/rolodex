import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse, CreateTagRequest, Tag, UpdateTagRequest } from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import { createAppError } from '../../utils/errors';
import { createTag, deleteTag, listTags, updateTag } from '../../services/rolodex/tag';

export const getTags = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const tags = await listTags(userId);
    const response: ApiResponse<Tag[]> = {
      success: true,
      data: tags,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createTagHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const body = req.body as CreateTagRequest;
    if (!body.name) {
      throw createAppError('Tag name is required.', 400);
    }

    const tag = await createTag(userId, body);
    const response: ApiResponse<Tag> = {
      success: true,
      data: tag,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateTagHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const body = req.body as UpdateTagRequest;
    const tag = await updateTag(userId, req.params.id, body);
    if (!tag) {
      throw createAppError('Tag not found.', 404);
    }

    const response: ApiResponse<Tag> = {
      success: true,
      data: tag,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteTagHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const tag = await deleteTag(userId, req.params.id);
    if (!tag) {
      throw createAppError('Tag not found.', 404);
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
