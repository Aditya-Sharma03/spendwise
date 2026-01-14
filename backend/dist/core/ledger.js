"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cascadeRecalculation = exports.recalculateMonth = exports.getOrCreateMonthlyBalance = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const date_fns_1 = require("date-fns");
const getOrCreateMonthlyBalance = async (walletId, date) => {
    const month = (0, date_fns_1.format)(date, 'yyyy-MM');
    let ledger = await prisma_1.default.walletMonthlyBalance.findUnique({
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
        const prevMonthDate = (0, date_fns_1.addMonths)(date, -1);
        const prevMonthStr = (0, date_fns_1.format)(prevMonthDate, 'yyyy-MM');
        const prevLedger = await prisma_1.default.walletMonthlyBalance.findUnique({
            where: { walletId_month: { walletId, month: prevMonthStr } }
        });
        const openingBalance = prevLedger ? prevLedger.closingBalance : 0;
        ledger = await prisma_1.default.walletMonthlyBalance.create({
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
exports.getOrCreateMonthlyBalance = getOrCreateMonthlyBalance;
// This function calculates totals for a specific month based on raw transactions
// AND updates the ledger.
const recalculateMonth = async (walletId, month) => {
    // 1. Get Opening Balance (from previous month or 0)
    const monthDate = (0, date_fns_1.parseISO)(`${month}-01`);
    const prevMonthDate = (0, date_fns_1.addMonths)(monthDate, -1);
    const prevMonthStr = (0, date_fns_1.format)(prevMonthDate, 'yyyy-MM');
    const prevLedger = await prisma_1.default.walletMonthlyBalance.findUnique({
        where: { walletId_month: { walletId, month: prevMonthStr } }
    });
    const openingBalance = prevLedger ? prevLedger.closingBalance : 0;
    // 2. Sum Income
    const incomes = await prisma_1.default.income.aggregate({
        where: {
            walletId,
            date: {
                gte: (0, date_fns_1.startOfMonth)(monthDate),
                lte: (0, date_fns_1.endOfMonth)(monthDate)
            }
        },
        _sum: { amount: true }
    });
    const totalIncome = incomes._sum.amount || 0;
    // 3. Sum Expense
    const expenses = await prisma_1.default.expense.aggregate({
        where: {
            walletId,
            date: {
                gte: (0, date_fns_1.startOfMonth)(monthDate),
                lte: (0, date_fns_1.endOfMonth)(monthDate)
            }
        },
        _sum: { amount: true }
    });
    const totalExpense = expenses._sum.amount || 0;
    // 4. Update Ledger
    const closingBalance = openingBalance + totalIncome - totalExpense;
    const updatedLedger = await prisma_1.default.walletMonthlyBalance.upsert({
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
exports.recalculateMonth = recalculateMonth;
// Cascades changes forward
const cascadeRecalculation = async (walletId, startFromDate) => {
    let currentDate = (0, date_fns_1.startOfMonth)(startFromDate);
    // Safety limit: 12 months forward max for now to prevent infinite loops
    let monthsProcessed = 0;
    while (monthsProcessed < 12) {
        const monthStr = (0, date_fns_1.format)(currentDate, 'yyyy-MM');
        // Check if ledger exists or needs creating (if transactions exist later?)
        // For strictly enforced ledger, we simply recalculate.
        // Optimization: Only continue if a ledger entry strictly exists OR if we just updated the previous month.
        // Here, we'll try to update.
        await (0, exports.recalculateMonth)(walletId, monthStr);
        // Move to next
        currentDate = (0, date_fns_1.addMonths)(currentDate, 1);
        // Break if we are far in future and no ledger exists? 
        // For MVP, just going 1 year forward or until no ledger found is safer.
        const nextMonthStr = (0, date_fns_1.format)(currentDate, 'yyyy-MM');
        const nextLedger = await prisma_1.default.walletMonthlyBalance.findUnique({
            where: { walletId_month: { walletId, month: nextMonthStr } }
        });
        if (!nextLedger)
            break; // Stop if no future chain
        monthsProcessed++;
    }
};
exports.cascadeRecalculation = cascadeRecalculation;
