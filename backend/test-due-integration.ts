
import prisma from './src/utils/prisma';
import { createDue, settleDue } from './src/controllers/due.controller';
import { getOrCreateMonthlyBalance } from './src/core/ledger';

// Mock Request/Response to reuse controller logic or just call prisma directly?
// Calling prisma directly is safer and tests the core logic.

async function testDueLogic() {
    console.log('--- Starting Due/Ledger Integration Test ---');

    // 1. Create a Test User and Wallet
    const email = `duetest_${Date.now()}@test.com`;
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: 'hash',
            wallets: {
                create: {
                    name: 'Test Wallet',
                    type: 'CASH',
                    monthlyBalances: {
                        create: {
                            // Create PREVIOUS month so 'recalculateMonth' picks up the opening balance correctly
                            month: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                            openingBalance: 1000,
                            closingBalance: 1000
                        }
                    }
                }
            }
        },
        include: { wallets: true }
    });

    const walletId = user.wallets[0].id;
    console.log(`1. Created User & Wallet (${walletId}) with Opening Balance 1000`);

    // 2. Create GIVE Due (Lent 200) -> Should be EXPENSE
    // We treat this as an API call would
    console.log('2. Creating GIVE (Lent 200)...');

    // Simulate what the controller does:
    // a) Create Due
    // b) Create Transaction
    // c) Recalculate Ledger

    // We'll just hit the endpoint logic via a fetch or simulate the DB calls directly to match controller?
    // Let's copy the logic from controller to test the *concept* since we can't easily import controller req/res objects without mocking.

    const amount = 200;
    const date = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.dueTransaction.create({
            data: {
                userId: user.id,
                type: 'GIVE',
                personName: 'Borrower Bob',
                amount,
                reason: 'Loan',
                walletId,
                status: 'PENDING',
                dueDate: date
            }
        });

        await tx.transaction.create({
            data: {
                walletId,
                amount,
                type: 'EXPENSE',
                date,
                category: 'Lent Money',
                description: 'Loan (Borrower Bob)'
            }
        });
    });

    // Trigger Ledger Recalc (as controller does)
    const { recalculateMonth, cascadeRecalculation } = require('./src/core/ledger');
    const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    await recalculateMonth(walletId, monthDate);

    // Check Balance: Should be 1000 - 200 = 800
    const balAfterGive = await prisma.monthlyBalance.findUnique({
        where: { walletId_month: { walletId, month: monthDate } }
    });

    console.log(`   Balance after GIVE: ${balAfterGive?.closingBalance}`);
    if (Number(balAfterGive?.closingBalance) !== 800) throw new Error('Balance mismatch after GIVE');

    // 3. Settle Due (Get 200 back) -> Should be INCOME
    console.log('3. Settling Due (Received 200)...');
    const due = await prisma.dueTransaction.findFirst({ where: { userId: user.id } });

    await prisma.$transaction(async (tx) => {
        await tx.dueTransaction.update({
            where: { id: due!.id },
            data: { status: 'SETTLED', settledAt: new Date() }
        });

        await tx.transaction.create({
            data: {
                walletId,
                amount,
                type: 'INCOME',
                date: new Date(), // Settle date
                category: 'Debt Repayment Received',
                description: 'Settlement'
            }
        });
    });

    await recalculateMonth(walletId, monthDate);

    // Check Balance: Should be 800 + 200 = 1000
    const balAfterSettle = await prisma.monthlyBalance.findUnique({
        where: { walletId_month: { walletId, month: monthDate } }
    });

    console.log(`   Balance after SETTLE: ${balAfterSettle?.closingBalance}`);
    if (Number(balAfterSettle?.closingBalance) !== 1000) throw new Error('Balance mismatch after SETTLE');

    console.log('--- TEST PASSED ---');
}

testDueLogic()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
