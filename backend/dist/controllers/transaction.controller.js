"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.addExpense = exports.addIncome = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const ledger_1 = require("../core/ledger");
const addIncome = async (req, res) => {
    try {
        const { walletId, amount, date, source, notes } = req.body;
        const userId = req.user.id;
        // 1. Create Income Record
        const income = await prisma_1.default.income.create({
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
        await (0, ledger_1.getOrCreateMonthlyBalance)(walletId, new Date(date));
        await (0, ledger_1.recalculateMonth)(walletId, monthStr);
        // 3. Cascade to future
        await (0, ledger_1.cascadeRecalculation)(walletId, new Date(date));
        res.status(201).json(income);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add income' });
    }
};
exports.addIncome = addIncome;
const addExpense = async (req, res) => {
    try {
        const { walletId, amount, date, category, notes } = req.body;
        const userId = req.user.id;
        // 1. Check Balance (Prevent Overdraft if desired, but monthly ledger allows negative transiently)
        // For strictness, let's allow it but warn? Or strictly block?
        // User requirement: "Wallets maintain monthly balances".
        // We will just record it.
        const expense = await prisma_1.default.expense.create({
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
        await (0, ledger_1.getOrCreateMonthlyBalance)(walletId, new Date(date));
        await (0, ledger_1.recalculateMonth)(walletId, monthStr);
        // 3. Cascade
        await (0, ledger_1.cascadeRecalculation)(walletId, new Date(date));
        res.status(201).json(expense);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};
exports.addExpense = addExpense;
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const limitParam = req.query.limit ? parseInt(req.query.limit) : 20;
        const monthParam = req.query.month; // Expect YYYY-MM
        let dateFilter = {};
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
            prisma_1.default.income.findMany({
                where: {
                    userId,
                    ...(monthParam ? { date: dateFilter } : {})
                },
                include: { wallet: true },
                orderBy: { date: 'desc' },
                take: limit
            }),
            prisma_1.default.expense.findMany({
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
            ...incomes.map((i) => ({ ...i, type: 'INCOME' })),
            ...expenses.map((e) => ({ ...e, type: 'EXPENSE' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(all);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
exports.getTransactions = getTransactions;
