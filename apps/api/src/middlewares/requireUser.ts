import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '@rolodex/types';
import { prisma } from '@rolodex/db';
import { extractBearerToken, hashDeviceToken, verifySupabaseAccessToken } from '../utils/auth';

interface AuthenticatedSupabaseUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  authUser: AuthenticatedSupabaseUser;
}

export interface DeviceAuthenticatedRequest extends Request {
  userId: string;
  deviceTokenId: string;
}

const unauthorized = (res: Response, message: string) => {
  const response: ApiResponse<null> = {
    success: false,
    error: {
      message,
      status: 401,
      code: 'UNAUTHORIZED',
    },
  };
  res.status(401).json(response);
};

export const requireUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    unauthorized(res, 'Missing bearer token.');
    return;
  }

  try {
    const user = await verifySupabaseAccessToken(token);
    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).authUser = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    };
    next();
  } catch {
    unauthorized(res, 'Invalid bearer token.');
  }
};

export const requireDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    unauthorized(res, 'Missing device token.');
    return;
  }

  try {
    const tokenHash = hashDeviceToken(token);
    const deviceToken = await prisma.userDeviceToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!deviceToken) {
      unauthorized(res, 'Invalid device token.');
      return;
    }

    await prisma.userDeviceToken.update({
      where: { id: deviceToken.id },
      data: { lastUsedAt: new Date() },
    });

    (req as DeviceAuthenticatedRequest).userId = deviceToken.userId;
    (req as DeviceAuthenticatedRequest).deviceTokenId = deviceToken.id;
    next();
  } catch {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Invalid device token.',
        status: 401,
        code: 'UNAUTHORIZED',
      },
    };
    res.status(401).json(response);
  }
};
