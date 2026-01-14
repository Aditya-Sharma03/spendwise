import express from 'express';
import { createTransaction, getTransactions, transferFunds } from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTransactions);
router.post('/', createTransaction); // Unified creation
router.post('/transfer', transferFunds); // Transfer logic

export default router;
