"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyLedger = exports.getWallets = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const ledger_1 = require("../core/ledger");
const getWallets = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallets = await prisma_1.default.wallet.findMany({
            where: { userId },
            include: {
            // Optionally include current month balance
            }
        });
        // For each wallet, fetch 'current month' balance
        const currentMonth = new Date();
        const result = await Promise.all(wallets.map(async (w) => {
            const ledger = await (0, ledger_1.getOrCreateMonthlyBalance)(w.id, currentMonth);
            return { ...w, currentBalance: ledger?.closingBalance || 0 };
        }));
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
};
exports.getWallets = getWallets;
const getMonthlyLedger = async (req, res) => {
    try {
        const id = req.params.id;
        const month = req.params.month;
        const userId = req.user.id;
        // Helper to validation ownership
        const wallet = await prisma_1.default.wallet.findUnique({ where: { id } });
        if (!wallet || wallet.userId !== userId)
            return res.sendStatus(403);
        const ledger = await (0, ledger_1.getOrCreateMonthlyBalance)(id, new Date(`${month}-01`));
        res.json(ledger);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
};
exports.getMonthlyLedger = getMonthlyLedger;
