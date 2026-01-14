import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getOrCreateMonthlyBalance } from '../core/ledger';

export const getWallets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const wallets = await prisma.wallet.findMany({
            where: { userId },
            include: {
                // Optionally include current month balance
            }
        });

        // For each wallet, fetch 'current month' balance
        const currentMonth = new Date();
        const result = await Promise.all(wallets.map(async (w: any) => {
            const ledger = await getOrCreateMonthlyBalance(w.id, currentMonth);
            return { ...w, currentBalance: ledger?.closingBalance || 0 };
        }));

        res.json(result);
    } catch (err) {
        console.error('getWallets Error:', err);
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
};

export const getMonthlyLedger = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const month = req.params.month as string;
        const userId = req.user!.id;

        // Helper to validation ownership
        const wallet = await prisma.wallet.findUnique({ where: { id } });
        if (!wallet || wallet.userId !== userId) return res.sendStatus(403);

        const ledger = await getOrCreateMonthlyBalance(id, new Date(`${month}-01`));

        res.json(ledger);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
}
