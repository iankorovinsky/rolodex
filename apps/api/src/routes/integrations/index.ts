import { Router } from 'express';
import deviceTokensRoutes from './deviceTokensRoutes';
import imessageRoutes from './imessageRoutes';

const router = Router();

router.use('/device-tokens', deviceTokensRoutes);
router.use('/imessage', imessageRoutes);

export default router;
