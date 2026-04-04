import { Router } from 'express';
import { requireUser } from '../middlewares/requireUser';
import {
  createScoutHandler,
  deleteScoutHandler,
  getScoutHandler,
  getScoutsHandler,
  pauseScoutHandler,
  resumeScoutHandler,
  runScoutHandler,
  updateScoutHandler,
} from '../controllers/scoutController';

const router = Router();

router.use(requireUser);

router.get('/', getScoutsHandler);
router.post('/', createScoutHandler);
router.get('/:id', getScoutHandler);
router.put('/:id', updateScoutHandler);
router.delete('/:id', deleteScoutHandler);
router.post('/:id/pause', pauseScoutHandler);
router.post('/:id/resume', resumeScoutHandler);
router.post('/:id/run', runScoutHandler);

export default router;
