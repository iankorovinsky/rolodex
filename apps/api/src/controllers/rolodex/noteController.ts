import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse, CreatePersonNoteRequest, PersonNote } from '@rolodex/types';
import type { AuthenticatedRequest } from '../../middlewares/requireUser';
import { createAppError } from '../../utils/errors';
import { createNote, deleteNote, listNotes } from '../../services/rolodex/note';

export const getNotes = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const personId = typeof req.query.personId === 'string' ? req.query.personId : undefined;
    const notes = await listNotes(userId, { personId });
    const response: ApiResponse<PersonNote[]> = {
      success: true,
      data: notes,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createNoteHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const body = req.body as CreatePersonNoteRequest;
    if (!body.personId) {
      throw createAppError('Person is required.', 400);
    }

    if (!body.content?.trim()) {
      throw createAppError('Note content is required.', 400);
    }

    const note = await createNote(userId, {
      personId: body.personId,
      content: body.content.trim(),
    });
    const response: ApiResponse<PersonNote> = {
      success: true,
      data: note,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteNoteHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const note = await deleteNote(userId, req.params.id);
    if (!note) {
      throw createAppError('Note not found.', 404);
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
