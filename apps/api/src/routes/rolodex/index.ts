import { Router } from 'express';
import peopleRoutes from './peopleRoutes';
import tagsRoutes from './tagsRoutes';
import requestsRoutes from './requestsRoutes';
import notesRoutes from './notesRoutes';

const router = Router();

router.use('/people', peopleRoutes);
router.use('/tags', tagsRoutes);
router.use('/requests', requestsRoutes);
router.use('/notes', notesRoutes);

export default router;
