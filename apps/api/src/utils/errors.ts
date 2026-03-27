import type { AppError } from '../middlewares/errorHandler';

export const createAppError = (message: string, status = 400, code?: string) => {
  const error = new Error(message) as AppError;
  error.status = status;
  error.code = code;
  return error;
};
