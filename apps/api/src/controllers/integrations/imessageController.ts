import type { NextFunction, Request, Response } from 'express';
import type {
  ApiResponse,
  CreateUserDeviceTokenRequest,
  CreateUserDeviceTokenResponse,
  IMessageSyncStatus,
  SyncContactsRequest,
  SyncMessagesRequest,
  UserDeviceToken,
} from '@rolodex/types';
import type {
  AuthenticatedRequest,
  DeviceAuthenticatedRequest,
} from '../../middlewares/requireUser';
import {
  createUserDeviceToken,
  getIMessageSyncStatus,
  listUserDeviceTokens,
  revokeUserDeviceToken,
  syncContacts,
  syncMessages,
} from '../../services/integrations/imessage';

export const createDeviceTokenHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createUserDeviceToken(
      (req as AuthenticatedRequest).userId,
      req.body as CreateUserDeviceTokenRequest
    );
    const response: ApiResponse<CreateUserDeviceTokenResponse> = { success: true, data };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const listDeviceTokensHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listUserDeviceTokens((req as AuthenticatedRequest).userId);
    const response: ApiResponse<UserDeviceToken[]> = { success: true, data };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const revokeDeviceTokenHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await revokeUserDeviceToken((req as AuthenticatedRequest).userId, req.params.id);
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const syncContactsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as SyncContactsRequest;
    await syncContacts((req as DeviceAuthenticatedRequest).userId, body.contacts ?? []);
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const syncMessagesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as SyncMessagesRequest;
    await syncMessages((req as DeviceAuthenticatedRequest).userId, body.messages ?? []);
    const response: ApiResponse<null> = { success: true, data: null };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getSyncStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getIMessageSyncStatus((req as DeviceAuthenticatedRequest).userId);
    const response: ApiResponse<IMessageSyncStatus> = { success: true, data };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
