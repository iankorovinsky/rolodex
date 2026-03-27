import { Router } from 'express';
import {
  createNoteHandler,
  deleteNoteHandler,
  getNotes,
} from '../../controllers/rolodex/noteController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/', getNotes);
router.post('/', createNoteHandler);
router.delete('/:id', deleteNoteHandler);

export default router;
