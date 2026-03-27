import { Router } from 'express';
import {
  createRequestHandler,
  deleteRequestHandler,
  getRequests,
  updateRequestHandler,
} from '../../controllers/rolodex/requestController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/', getRequests);
router.post('/', createRequestHandler);
router.put('/:id', updateRequestHandler);
router.delete('/:id', deleteRequestHandler);

export default router;
