import type { NextFunction, Request, Response } from 'express';
import { AvatarId } from '@rolodex/db';
import type { ApiResponse, UpdateUserProfileRequest, UserProfile } from '@rolodex/types';
import type { AuthenticatedRequest } from '../middlewares/requireUser';
import { createAppError } from '../utils/errors';
import { ensureUser, updateUserProfile } from '../services/user';

const toUserProfile = (user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarId: AvatarId | null;
}): UserProfile => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  avatarId: user.avatarId,
});

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  const { authUser } = req as AuthenticatedRequest;

  try {
    const user = await ensureUser(authUser);
    const response: ApiResponse<UserProfile> = {
      success: true,
      data: toUserProfile(user),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, authUser } = req as AuthenticatedRequest;
  const body = req.body as UpdateUserProfileRequest;

  try {
    await ensureUser(authUser);

    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim() || null;

    if (!firstName) {
      throw createAppError('A firstName is required.', 400);
    }

    if (!body.avatarId || !Object.values(AvatarId).includes(body.avatarId as AvatarId)) {
      throw createAppError('A valid avatarId is required.', 400);
    }

    const user = await updateUserProfile(userId, {
      firstName,
      lastName,
      avatarId: body.avatarId as AvatarId,
    });
    const response: ApiResponse<UserProfile> = {
      success: true,
      data: toUserProfile(user),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
