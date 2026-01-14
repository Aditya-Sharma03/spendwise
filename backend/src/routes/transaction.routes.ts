import express from 'express';
import { addIncome, addExpense, getTransactions } from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getTransactions);
router.post('/income', addIncome);
router.post('/expense', addExpense);

export default router;
