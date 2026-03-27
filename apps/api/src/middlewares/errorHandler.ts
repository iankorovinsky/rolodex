import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@rolodex/types';

export interface AppError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  const response: ApiResponse<null> = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status,
      code: err.code,
    },
  };
  res.status(status).json(response);
};
