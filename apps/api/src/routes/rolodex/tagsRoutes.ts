import { Router } from 'express';
import {
  createTagHandler,
  deleteTagHandler,
  getTags,
  updateTagHandler,
} from '../../controllers/rolodex/tagController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/', getTags);
router.post('/', createTagHandler);
router.put('/:id', updateTagHandler);
router.delete('/:id', deleteTagHandler);

export default router;
