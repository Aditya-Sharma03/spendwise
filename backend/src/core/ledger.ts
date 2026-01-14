import prisma from '../utils/prisma';
import { startOfMonth, endOfMonth, addMonths, format, parseISO, isAfter } from 'date-fns';

export const getOrCreateMonthlyBalance = async (walletId: string, date: Date) => {
    const month = format(date, 'yyyy-MM');

    let ledger = await prisma.walletMonthlyBalance.findUnique({
        where: {
            walletId_month: {
                walletId,
                month,
            },
        },
    });

    if (!ledger) {
        // If this is the very first month, opening is 0.
        // If not, it should be the closing of previous month.
        // However, if previous month doesn't exist, we must traverse back or assume 0 (for new wallets).

        // Simplification: Try to find previous month
        const prevMonthDate = addMonths(date, -1);
        const prevMonthStr = format(prevMonthDate, 'yyyy-MM');

        const prevLedger = await prisma.walletMonthlyBalance.findUnique({
            where: { walletId_month: { walletId, month: prevMonthStr } }
        });

        const openingBalance = prevLedger ? prevLedger.closingBalance : 0;

        ledger = await prisma.walletMonthlyBalance.create({
            data: {
                walletId,
                month,
                openingBalance,
                closingBalance: openingBalance, // Initially closing = opening
            },
        });
    }

    return ledger;
};

// This function calculates totals for a specific month based on raw transactions
// AND updates the ledger.
export const recalculateMonth = async (walletId: string, month: string) => {
    // 1. Get Opening Balance (from previous month or 0)
    const monthDate = parseISO(`${month}-01`);
    const prevMonthDate = addMonths(monthDate, -1);
    const prevMonthStr = format(prevMonthDate, 'yyyy-MM');

    const prevLedger = await prisma.walletMonthlyBalance.findUnique({
        where: { walletId_month: { walletId, month: prevMonthStr } }
    });

    const openingBalance = prevLedger ? prevLedger.closingBalance : 0;

    // 2. Sum Income
    const incomes = await prisma.income.aggregate({
        where: {
            walletId,
            date: {
                gte: startOfMonth(monthDate),
                lte: endOfMonth(monthDate)
            }
        },
        _sum: { amount: true }
    });
    const totalIncome = incomes._sum.amount || 0;

    // 3. Sum Expense
    const expenses = await prisma.expense.aggregate({
        where: {
            walletId,
            date: {
                gte: startOfMonth(monthDate),
                lte: endOfMonth(monthDate)
            }
        },
        _sum: { amount: true }
    });
    const totalExpense = expenses._sum.amount || 0;

    // 4. Update Ledger
    const closingBalance = openingBalance + totalIncome - totalExpense;

    const updatedLedger = await prisma.walletMonthlyBalance.upsert({
        where: { walletId_month: { walletId, month } },
        update: {
            openingBalance,
            totalIncome,
            totalExpense,
            closingBalance
        },
        create: {
            walletId,
            month,
            openingBalance,
            totalIncome,
            totalExpense,
            closingBalance
        }
    });

    return updatedLedger;
};

// Cascades changes forward
export const cascadeRecalculation = async (walletId: string, startFromDate: Date) => {
    let currentDate = startOfMonth(startFromDate);
    // Safety limit: 12 months forward max for now to prevent infinite loops
    let monthsProcessed = 0;

    while (monthsProcessed < 12) {
        const monthStr = format(currentDate, 'yyyy-MM');

        // Check if ledger exists or needs creating (if transactions exist later?)
        // For strictly enforced ledger, we simply recalculate.
        // Optimization: Only continue if a ledger entry strictly exists OR if we just updated the previous month.
        // Here, we'll try to update.

        await recalculateMonth(walletId, monthStr);

        // Move to next
        currentDate = addMonths(currentDate, 1);

        // Break if we are far in future and no ledger exists? 
        // For MVP, just going 1 year forward or until no ledger found is safer.
        const nextMonthStr = format(currentDate, 'yyyy-MM');
        const nextLedger = await prisma.walletMonthlyBalance.findUnique({
            where: { walletId_month: { walletId, month: nextMonthStr } }
        });

        if (!nextLedger) break; // Stop if no future chain

        monthsProcessed++;
    }
};
