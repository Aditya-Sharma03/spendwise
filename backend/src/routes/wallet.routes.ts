import express from 'express';
import { getWallets, getMonthlyLedger } from '../controllers/wallet.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getWallets);
router.get('/:id/monthly/:month', getMonthlyLedger);

export default router;
