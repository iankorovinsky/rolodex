import { Router } from 'express';
import peopleRoutes from './peopleRoutes';
import tagsRoutes from './tagsRoutes';
import companiesRoutes from './companiesRoutes';
import dashboardRoutes from './dashboardRoutes';
import requestsRoutes from './requestsRoutes';
import notesRoutes from './notesRoutes';

const router = Router();

router.use('/people', peopleRoutes);
router.use('/tags', tagsRoutes);
router.use('/companies', companiesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/requests', requestsRoutes);
router.use('/notes', notesRoutes);

export default router;
