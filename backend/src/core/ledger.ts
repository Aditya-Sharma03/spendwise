import prisma from '../utils/prisma';
import { startOfMonth, endOfMonth, addMonths, format, parseISO } from 'date-fns';
import { Prisma } from '@prisma/client';

export const getOrCreateMonthlyBalance = async (walletId: string, date: Date) => {
    // Ensure we are working with the 1st of the month
    const monthDate = startOfMonth(date);

    let ledger = await prisma.monthlyBalance.findUnique({
        where: {
            walletId_month: {
                walletId,
                month: monthDate,
            },
        },
    });

    if (!ledger) {
        // If not found, try to find previous month
        const prevMonthDate = addMonths(monthDate, -1);
        const prevLedger = await prisma.monthlyBalance.findUnique({
            where: { walletId_month: { walletId, month: prevMonthDate } }
        });

        const openingBalance = prevLedger ? prevLedger.closingBalance : new Prisma.Decimal(0);

        // Create new ledger with opening = closing = previous closing
        ledger = await prisma.monthlyBalance.create({
            data: {
                walletId,
                month: monthDate,
                openingBalance,
                closingBalance: openingBalance,
            },
        });
    }

    return ledger;
};

export const recalculateMonth = async (walletId: string, _monthDate: Date) => {
    const monthDate = startOfMonth(_monthDate);

    // 1. Get Opening Balance (from previous month)
    const prevMonthDate = addMonths(monthDate, -1);
    const prevLedger = await prisma.monthlyBalance.findUnique({
        where: { walletId_month: { walletId, month: prevMonthDate } }
    });

    const openingBalance = prevLedger ? prevLedger.closingBalance : new Prisma.Decimal(0);

    // 2. Sum Income & Expenses for this month
    const transactions = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
            walletId,
            date: {
                gte: monthDate,
                lte: endOfMonth(monthDate)
            }
        },
        _sum: { amount: true }
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);

    transactions.forEach(t => {
        if (t.type === 'INCOME') totalIncome = totalIncome.add(t._sum.amount || 0);
        if (t.type === 'EXPENSE') totalExpense = totalExpense.add(t._sum.amount || 0);
        // TRANSFER logic depends on if it's IN or OUT. 
        // For V2, let's treat TRANSFER as simple movement. 
        // If needed, we can split TRANSFER into TRANSFER_IN and TRANSFER_OUT in future.
        // For now, assuming naive Income/Expense:
    });

    // 3. Update Ledger
    const closingBalance = openingBalance.add(totalIncome).sub(totalExpense);

    const updatedLedger = await prisma.monthlyBalance.upsert({
        where: { walletId_month: { walletId, month: monthDate } },
        update: {
            openingBalance,
            closingBalance
        },
        create: {
            walletId,
            month: monthDate,
            openingBalance,
            closingBalance
        }
    });

    return updatedLedger;
};

// Cascades changes forward
export const cascadeRecalculation = async (walletId: string, startFromDate: Date) => {
    let currentDate = startOfMonth(startFromDate);
    // Safety limit: up to 24 months forward
    let monthsProcessed = 0;

    while (monthsProcessed < 24) {
        // Recalculate current month
        await recalculateMonth(walletId, currentDate);

        // Move to next month
        currentDate = addMonths(currentDate, 1);

        // Check if next month exists. If NOT, we stop the chain, 
        // UNLESS we want to effectively "open" future months.
        // For now, stop if no ledger exists to prevent infinite generation.
        const nextLedger = await prisma.monthlyBalance.findUnique({
            where: { walletId_month: { walletId, month: currentDate } }
        });

        if (!nextLedger) break;

        monthsProcessed++;
    }
};
