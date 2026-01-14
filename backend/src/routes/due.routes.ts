import { Router } from 'express';
import { createDue, settleDue, getActiveDues, getDueHistory } from '../controllers/due.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', createDue);
router.post('/:id/settle', settleDue);
router.get('/active', getActiveDues);
router.get('/history', getDueHistory);

export default router;
