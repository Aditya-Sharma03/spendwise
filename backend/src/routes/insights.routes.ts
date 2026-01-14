import express from 'express';
import { getBurnRate } from '../controllers/insights.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/burn-rate', getBurnRate);

export default router;
