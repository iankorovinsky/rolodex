import type { NextFunction, Request, Response } from 'express';
import type {
  ApiResponse,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import { createAppError } from '../../utils/errors';
import {
  createCompany,
  deleteCompany,
  getCompanyById,
  listCompanies,
  updateCompany,
} from '../../services/rolodex/company';

export const getCompanies = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const companies = await listCompanies(userId);
    const response: ApiResponse<Company[]> = {
      success: true,
      data: companies,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getCompany = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const company = await getCompanyById(userId, req.params.id);
    if (!company) {
      throw createAppError('Company not found.', 404);
    }

    const response: ApiResponse<Company> = {
      success: true,
      data: company,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createCompanyHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const company = await createCompany(userId, req.body as CreateCompanyRequest);
    const response: ApiResponse<Company> = {
      success: true,
      data: company,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateCompanyHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const company = await updateCompany(userId, req.params.id, req.body as UpdateCompanyRequest);
    if (!company) {
      throw createAppError('Company not found.', 404);
    }

    const response: ApiResponse<Company> = {
      success: true,
      data: company,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteCompanyHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const company = await deleteCompany(userId, req.params.id);
    if (!company) {
      throw createAppError('Company not found.', 404);
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
