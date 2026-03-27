import { Router } from 'express';
import {
  createPersonHandler,
  deletePersonHandler,
  getPeople,
  getPerson,
  updatePersonHandler,
} from '../../controllers/rolodex/personController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/', getPeople);
router.post('/', createPersonHandler);
router.get('/:id', getPerson);
router.put('/:id', updatePersonHandler);
router.delete('/:id', deletePersonHandler);

export default router;
