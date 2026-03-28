import { Router } from 'express';
import {
  connectIntegrationHandler,
  disconnectIntegrationHandler,
  listIntegrationsHandler,
} from '../../controllers/integrations/integrationController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);
router.get('/', listIntegrationsHandler);
router.post('/:type/connect', connectIntegrationHandler);
router.delete('/:type', disconnectIntegrationHandler);

export default router;
