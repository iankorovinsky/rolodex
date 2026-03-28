import { Router } from 'express';
import { getCurrentUser, updateCurrentUserProfile } from '../controllers/userController';
import { requireUser } from '../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/me', getCurrentUser);
router.patch('/me', updateCurrentUserProfile);

export default router;
