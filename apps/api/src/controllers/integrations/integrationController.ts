import type { NextFunction, Request, Response } from 'express';
import type {
  ApiResponse,
  ConnectGranolaIntegrationRequest,
  ConnectOAuthIntegrationRequest,
  IntegrationConnection,
  IntegrationType,
  OAuthIntegrationType,
} from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import {
  connectGranolaIntegration,
  connectOAuthIntegration,
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

    if (type === 'granola') {
      const data = await connectGranolaIntegration(
        (req as AuthenticatedRequest).userId,
        req.body as ConnectGranolaIntegrationRequest
      );

      const response: ApiResponse<IntegrationConnection> = { success: true, data };
      res.status(201).json(response);
      return;
    }

    if (type === 'google' || type === 'outlook') {
      const data = await connectOAuthIntegration(
        (req as AuthenticatedRequest).userId,
        type as OAuthIntegrationType,
        req.body as ConnectOAuthIntegrationRequest
      );

      const response: ApiResponse<IntegrationConnection> = { success: true, data };
      res.status(201).json(response);
      return;
    }

    throw createAppError('This integration is not available yet.', 400);
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
    const integrationId = req.params.id;
    await disconnectUserIntegration((req as AuthenticatedRequest).userId, integrationId);
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
