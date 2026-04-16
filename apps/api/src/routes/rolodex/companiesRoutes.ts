import { Router } from 'express';
import {
  createCompanyHandler,
  deleteCompanyHandler,
  getCompanies,
  getCompany,
  updateCompanyHandler,
} from '../../controllers/rolodex/companyController';
import { requireUser } from '../../middlewares/requireUser';

const router = Router();

router.use(requireUser);

router.get('/', getCompanies);
router.get('/:id', getCompany);
router.post('/', createCompanyHandler);
router.put('/:id', updateCompanyHandler);
router.delete('/:id', deleteCompanyHandler);

export default router;
