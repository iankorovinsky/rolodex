import { Router } from 'express';
import {
  getSyncStatusHandler,
  syncContactsHandler,
  syncMessagesHandler,
} from '../../controllers/integrations/imessageController';
import { requireDeviceToken, requireUser } from '../../middlewares/requireUser';

const router = Router();

router.get('/status', requireUser, getSyncStatusHandler);
router.use(requireDeviceToken);
router.post('/sync/contacts', syncContactsHandler);
router.post('/sync/messages', syncMessagesHandler);

export default router;
