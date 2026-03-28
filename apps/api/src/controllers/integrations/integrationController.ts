import type { NextFunction, Request, Response } from 'express';
import type {
  ApiResponse,
  ConnectGranolaIntegrationRequest,
  IntegrationConnection,
  IntegrationType,
} from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import {
  connectGranolaIntegration,
  disconnectUserIntegration,
  listUserIntegrations,
} from '../../services/integrations/integrations';
import { createAppError } from '../../utils/errors';

export const listIntegrationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listUserIntegrations((req as AuthenticatedRequest).userId);
    const response: ApiResponse<IntegrationConnection[]> = { success: true, data };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const connectIntegrationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const type = req.params.type as IntegrationType;

    if (type !== 'granola') {
      throw createAppError('This integration is not available yet.', 400);
    }

    const data = await connectGranolaIntegration(
      (req as AuthenticatedRequest).userId,
      req.body as ConnectGranolaIntegrationRequest
    );

    const response: ApiResponse<IntegrationConnection> = { success: true, data };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const disconnectIntegrationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const type = req.params.type as IntegrationType;
    await disconnectUserIntegration((req as AuthenticatedRequest).userId, type);
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
