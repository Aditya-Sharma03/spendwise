import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getOrCreateMonthlyBalance, recalculateMonth, cascadeRecalculation } from '../core/ledger';

export const addIncome = async (req: AuthRequest, res: Response) => {
    try {
        const { walletId, amount, date, source, notes } = req.body;
        const userId = req.user!.id;

        // 1. Create Income Record
        const income = await prisma.income.create({
            data: {
                userId,
                walletId,
                amount: parseFloat(amount),
                date: new Date(date),
                source,
                notes
            }
        });

        // 2. Update Ledger for that month
        const monthStr = date.substring(0, 7); // YYYY-MM
        await getOrCreateMonthlyBalance(walletId, new Date(date));
        await recalculateMonth(walletId, monthStr);

        // 3. Cascade to future
        await cascadeRecalculation(walletId, new Date(date));

        res.status(201).json(income);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add income' });
    }
};

export const addExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { walletId, amount, date, category, notes } = req.body;
        const userId = req.user!.id;

        // 1. Check Balance (Prevent Overdraft if desired, but monthly ledger allows negative transiently)
        // For strictness, let's allow it but warn? Or strictly block?
        // User requirement: "Wallets maintain monthly balances".
        // We will just record it.

        const expense = await prisma.expense.create({
            data: {
                userId,
                walletId,
                amount: parseFloat(amount),
                date: new Date(date),
                category,
                notes
            }
        });

        // 2. Update Ledger
        const monthStr = date.substring(0, 7);
        await getOrCreateMonthlyBalance(walletId, new Date(date));
        await recalculateMonth(walletId, monthStr);

        // 3. Cascade
        await cascadeRecalculation(walletId, new Date(date));

        res.status(201).json(expense);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const monthParam = req.query.month as string; // Expect YYYY-MM

        let dateFilter: any = {};
        let limit = limitParam;

        if (monthParam) {
            // If month is provided, ignore limit usually, or keep it? 
            // Better to show all for that month or keep pagination? 
            // Let's keep limit specifically high or remove it if month is chosen to see full history.
            // But for now, let's just filter.
            const start = new Date(`${monthParam}-01`);
            const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

            dateFilter = {
                gte: start,
                lt: end
            };

            // If filtering by specific month, probably want all transactions
            limit = 1000;
        }

        const [incomes, expenses] = await Promise.all([
            prisma.income.findMany({
                where: {
                    userId,
                    ...(monthParam ? { date: dateFilter } : {})
                },
                include: { wallet: true },
                orderBy: { date: 'desc' },
                take: limit
            }),
            prisma.expense.findMany({
                where: {
                    userId,
                    ...(monthParam ? { date: dateFilter } : {})
                },
                include: { wallet: true },
                orderBy: { date: 'desc' },
                take: limit
            })
        ]);

        // Unite and Sort
        const all = [
            ...incomes.map((i: any) => ({ ...i, type: 'INCOME' })),
            ...expenses.map((e: any) => ({ ...e, type: 'EXPENSE' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(all);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
