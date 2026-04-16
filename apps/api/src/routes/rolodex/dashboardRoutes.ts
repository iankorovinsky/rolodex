import { Router } from 'express';
import { getDashboardSummaryHandler } from '../../controllers/rolodex/dashboardController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/', getDashboardSummaryHandler);

export default router;
