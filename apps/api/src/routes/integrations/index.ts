import { Router } from 'express';
import deviceTokensRoutes from './deviceTokensRoutes';
import integrationRoutes from './integrationRoutes';
import imessageRoutes from './imessageRoutes';

const router = Router();

router.use('/', integrationRoutes);
router.use('/device-tokens', deviceTokensRoutes);
router.use('/imessage', imessageRoutes);

export default router;
