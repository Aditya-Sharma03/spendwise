import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getOrCreateMonthlyBalance, recalculateMonth, cascadeRecalculation } from '../core/ledger';

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { walletId, amount, type, date, category, description } = req.body;
        const userId = req.user!.id;

        // Verify wallet ownership
        const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
        if (!wallet || wallet.userId !== userId) {
            return res.status(403).json({ error: 'Wallet not found or unauthorized' });
        }

        const tx = await prisma.transaction.create({
            data: {
                walletId,
                amount: parseFloat(amount),
                type, // INCOME | EXPENSE
                date: new Date(date),
                category,
                description
            }
        });

        // Update Ledger
        await getOrCreateMonthlyBalance(walletId, new Date(date));
        await recalculateMonth(walletId, new Date(date));
        await cascadeRecalculation(walletId, new Date(date));

        res.status(201).json(tx);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};

export const transferFunds = async (req: AuthRequest, res: Response) => {
    try {
        const { fromWalletId, toWalletId, amount, date, description } = req.body;
        const userId = req.user!.id;
        const dateObj = new Date(date);

        // Verify ownership
        const [fromWallet, toWallet] = await Promise.all([
            prisma.wallet.findUnique({ where: { id: fromWalletId } }),
            prisma.wallet.findUnique({ where: { id: toWalletId } })
        ]);

        if (!fromWallet || fromWallet.userId !== userId || !toWallet || toWallet.userId !== userId) {
            return res.status(403).json({ error: 'Invalid wallets' });
        }

        // Atomic Transaction: Create Expense on Source, Income on Dest
        await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
                data: {
                    walletId: fromWalletId,
                    amount: parseFloat(amount),
                    type: 'EXPENSE',
                    date: dateObj,
                    category: 'Transfer',
                    description: `Transfer to ${toWallet.name}: ${description || ''}`
                }
            });

            await tx.transaction.create({
                data: {
                    walletId: toWalletId,
                    amount: parseFloat(amount),
                    type: 'INCOME', // Treating transfer in as Income effectively
                    date: dateObj,
                    category: 'Transfer',
                    description: `Transfer from ${fromWallet.name}: ${description || ''}`
                }
            });
        });

        // Update Ledgers (Outside Prisma TX to avoid long locks if complex, or keep inside? 
        // Recalculation is heavy, keep outside for responsiveness)

        // 1. Source Wallet Update
        await getOrCreateMonthlyBalance(fromWalletId, dateObj);
        await recalculateMonth(fromWalletId, dateObj);
        await cascadeRecalculation(fromWalletId, dateObj);

        // 2. Dest Wallet Update
        await getOrCreateMonthlyBalance(toWalletId, dateObj);
        await recalculateMonth(toWalletId, dateObj);
        await cascadeRecalculation(toWalletId, dateObj);

        res.status(201).json({ message: 'Transfer successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process transfer' });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const monthParam = req.query.month as string; // YYYY-MM
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

        const whereClause: any = {
            wallet: {
                userId: userId
            }
        };

        if (monthParam) {
            const start = new Date(`${monthParam}-01`);
            const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
            whereClause.date = {
                gte: start,
                lt: end
            };
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: { wallet: true },
            orderBy: { date: 'desc' },
            take: limit
        });

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
