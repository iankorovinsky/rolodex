import { Router } from 'express';
import {
  getSyncStatusHandler,
  syncContactsHandler,
  syncMessagesHandler,
} from '../../controllers/integrations/imessageController';
import { requireDeviceToken } from '../../middlewares/requireUser';

const router = Router();

router.use(requireDeviceToken);
router.get('/status', getSyncStatusHandler);
router.post('/sync/contacts', syncContactsHandler);
router.post('/sync/messages', syncMessagesHandler);

export default router;
