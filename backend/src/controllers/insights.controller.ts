import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { getOrCreateMonthlyBalance } from '../core/ledger';

export const getBurnRate = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // 1. Calculate Total Liquid Assets (Cash + Bank)
        const wallets = await prisma.wallet.findMany({
            where: {
                userId,
                type: { in: ['CASH', 'BANK'] }
            }
        });

        const currentMonth = new Date();
        let totalLiquid = 0;

        for (const w of wallets) {
            const ledger = await getOrCreateMonthlyBalance(w.id, currentMonth);
            totalLiquid += Number(ledger.closingBalance);
        }

        // 2. Calculate Average Monthly Expense (Last 3 months)       
        const threeMonthsAgo = subMonths(new Date(), 3);

        const expenses = await prisma.transaction.aggregate({
            where: {
                wallet: { userId },
                type: 'EXPENSE',
                date: { gte: threeMonthsAgo }
            },
            _sum: { amount: true }
        });

        const totalBurnLast3Months = expenses._sum.amount ? Number(expenses._sum.amount) : 0;
        const monthlyBurnRate = totalBurnLast3Months / 3;

        // 3. Calculate Runway
        let runway = 0;
        if (monthlyBurnRate > 0) {
            runway = totalLiquid / monthlyBurnRate;
        } else {
            runway = totalLiquid > 0 ? 999 : 0; // Infinite runway if no burn
        }

        res.json({
            totalLiquid,
            monthlyBurnRate: Number(monthlyBurnRate.toFixed(2)),
            runway: Number(runway.toFixed(1)),
            message: getHealthMessage(runway)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calculate insights' });
    }
};

function getHealthMessage(runway: number): string {
    if (runway === 999) return "Great! You are spending nothing.";
    if (runway < 1) return "CRITICAL: You are out of money in less than a month!";
    if (runway < 3) return "WARNING: Less than 3 months of runway.";
    if (runway < 6) return "Caution: You have about 6 months of runway.";
    return "Healthy: You have a solid financial runway.";
}
