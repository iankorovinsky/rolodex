import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse, DashboardSummary } from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import { getDashboardSummary } from '../../services/rolodex/dashboard';

export const getDashboardSummaryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const summary = await getDashboardSummary(userId);
    const response: ApiResponse<DashboardSummary> = {
      success: true,
      data: summary,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};
