import { Router } from 'express';
import {
  createDeviceTokenHandler,
  listDeviceTokensHandler,
  revokeDeviceTokenHandler,
} from '../../controllers/integrations/imessageController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);
router.post('/', createDeviceTokenHandler);
router.get('/', listDeviceTokensHandler);
router.delete('/:id', revokeDeviceTokenHandler);

export default router;
