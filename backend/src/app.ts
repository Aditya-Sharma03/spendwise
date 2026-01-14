import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import transactionRoutes from './routes/transaction.routes';
import insightsRoutes from './routes/insights.routes';
import dueRoutes from './routes/due.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('SpendWise API V2 Running 🚀');
});

app.use('/auth', authRoutes);
app.use('/wallets', walletRoutes);
app.use('/transactions', transactionRoutes);
app.use('/insights', insightsRoutes);
app.use('/due', dueRoutes);


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
