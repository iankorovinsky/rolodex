import type { Request, Response, NextFunction } from 'express';
import type {
  ApiResponse,
  CreateScoutRequest,
  Scout,
  ScoutRunResponse,
  UpdateScoutRequest,
} from '@rolodex/types';
import type { AuthenticatedRequest } from '../middlewares/requireUser';
import {
  createScout,
  deleteScout,
  getScoutById,
  listScouts,
  pauseScout,
  resumeScout,
  runScoutNow,
  updateScout,
} from '../services/scouts';

export const getScoutsHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const scouts = await listScouts(userId);
    const response: ApiResponse<Scout[]> = {
      success: true,
      data: scouts,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const scout = await getScoutById(userId, req.params.id);
    const response: ApiResponse<Scout> = {
      success: true,
      data: scout,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const scout = await createScout(userId, req.body as CreateScoutRequest);
    const response: ApiResponse<Scout> = {
      success: true,
      data: scout,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const scout = await updateScout(userId, req.params.id, req.body as UpdateScoutRequest);
    const response: ApiResponse<Scout> = {
      success: true,
      data: scout,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const pauseScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const scout = await pauseScout(userId, req.params.id);
    const response: ApiResponse<Scout> = {
      success: true,
      data: scout,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const resumeScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const scout = await resumeScout(userId, req.params.id);
    const response: ApiResponse<Scout> = {
      success: true,
      data: scout,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const runScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const queued = await runScoutNow(userId, req.params.id);
    const response: ApiResponse<ScoutRunResponse> = {
      success: true,
      data: queued,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteScoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    await deleteScout(userId, req.params.id);
    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
