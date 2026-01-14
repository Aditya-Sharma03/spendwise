import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { recalculateMonth, getOrCreateMonthlyBalance, cascadeRecalculation } from '../core/ledger';

export const createDue = async (req: Request, res: Response) => {
    try {
        const { type, personName, amount, reason, date, walletId } = req.body;
        const userId = (req as any).user.id; // Auth middleware attaches user

        if (!type || !personName || !amount || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const validTypes = ['GIVE', 'TAKE'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }

        const numericAmount = parseFloat(amount);
        const txDate = date ? new Date(date) : new Date();

        // Transactional creation
        const newDue = await prisma.$transaction(async (tx) => {
            // 1. Create Due Record
            const due = await tx.dueTransaction.create({
                data: {
                    userId,
                    type,
                    personName,
                    amount: numericAmount,
                    reason,
                    dueDate: txDate, // Using provided date as 'due date' or 'transaction date' reference
                    walletId: walletId || null,
                    status: 'PENDING'
                }
            });

            // 2. If Wallet selected, create Ledger Transaction
            if (walletId) {
                // GIVE (Lent) = Expense (Money out)
                // TAKE (Borrowed) = Income (Money in)
                const txType = type === 'GIVE' ? 'EXPENSE' : 'INCOME';

                // Create the Transaction record
                await tx.transaction.create({
                    data: {
                        walletId,
                        amount: numericAmount,
                        type: txType,
                        date: txDate,
                        category: type === 'GIVE' ? 'Lent Money' : 'Borrowed Money',
                        description: `${reason} (${personName})`
                    }
                });

                // We'll handle ledger recalculation *outside* the prisma transaction or after
                // Note: Ledger functions use prisma.$transaction internally or require it. 
                // Since our ledger logic is complex, we'll run it AFTER this atomic block to avoid nested transaction locking issues if not careful.
                // Or simplified: Just create the transaction here. The user expects simple ledger updates.
                // The prompt REQUIRES monthly ledger logic.
            }

            return due;
        });

        // 3. Post-Transaction: Trigger Ledger Recalculation if wallet involved
        if (walletId) {
            // Re-fetch monthly balance and cascade
            // For now, simpler approach: Just call recalculateMonth logic manually
            // But since `recalculateMonth` aggregates ALL transactions, simply adding the transaction above is enough!
            // We just need to ensure the MonthlyBalance exists and trigger recalc.

            // Get Month Date (1st of month)
            const monthDate = new Date(txDate.getFullYear(), txDate.getMonth(), 1);

            // Ensure balance record exists (it might create one)
            await getOrCreateMonthlyBalance(walletId, monthDate);

            // Recalculate
            await recalculateMonth(walletId, monthDate);

            // Cascade changes to future
            await cascadeRecalculation(walletId, monthDate);
        }

        res.status(201).json(newDue);
    } catch (error) {
        console.error('Create Due Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const settleDue = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const due = await prisma.dueTransaction.findUnique({ where: { id } });

        if (!due || due.userId !== userId) {
            return res.status(404).json({ error: 'Record not found' });
        }

        if (due.status === 'SETTLED') {
            return res.status(400).json({ error: 'Already settled' });
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            // 1. Mark as SETTLED
            await tx.dueTransaction.update({
                where: { id },
                data: {
                    status: 'SETTLED',
                    settledAt: now
                }
            });

            // 2. Reverse Flow if wallet was involved
            if (due.walletId) {
                // Orig: GIVE (Expense) -> Settle: Income
                // Orig: TAKE (Income)  -> Settle: Expense
                const reverseType = due.type === 'GIVE' ? 'INCOME' : 'EXPENSE';

                await tx.transaction.create({
                    data: {
                        walletId: due.walletId,
                        amount: due.amount,
                        type: reverseType,
                        date: now,
                        category: due.type === 'GIVE' ? 'Debt Repayment Received' : 'Debt Repayment Paid',
                        description: `Settlement: ${due.reason} (${due.personName})`
                    }
                });
            }
        });

        // 3. Post-Transaction Ledger Update
        if (due.walletId) {
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            await getOrCreateMonthlyBalance(due.walletId, currentMonth);
            await recalculateMonth(due.walletId, currentMonth);
            await cascadeRecalculation(due.walletId, currentMonth);
        }

        res.json({ message: 'Settled successfully' });

    } catch (error) {
        console.error('Settle Due Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getActiveDues = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const dues = await prisma.dueTransaction.findMany({
            where: { userId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { wallet: { select: { name: true } } }
        });
        res.json(dues);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDueHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const dues = await prisma.dueTransaction.findMany({
            where: { userId, status: 'SETTLED' },
            orderBy: { settledAt: 'desc' },
            include: { wallet: { select: { name: true } } }
        });
        res.json(dues);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
