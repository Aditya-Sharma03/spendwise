
import prisma from './src/utils/prisma';
import { getOrCreateMonthlyBalance, recalculateMonth, cascadeRecalculation } from './src/core/ledger';
import { Prisma } from '@prisma/client';

async function main() {
    console.log('--- STARTING LEDGER TEST ---');

    console.log('1. Creating Test User...');
    const email = `test_ledger_${Date.now()}@example.com`;
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: 'dummy',
            wallets: {
                create: { name: 'Test Wallet', type: 'CASH' }
            }
        },
        include: { wallets: true }
    });
    const wallet = user.wallets[0];
    console.log(`   User created: ${user.id}, Wallet: ${wallet.id}`);

    // Month 1: 2024-01-01
    const month1 = new Date('2024-01-01');
    const month2 = new Date('2024-02-01');

    console.log('2. checking initial ledger for Jan 2024...');
    let ledgerJan = await getOrCreateMonthlyBalance(wallet.id, month1);
    console.log(`   Jan Open: ${ledgerJan.openingBalance}, Close: ${ledgerJan.closingBalance}`);

    console.log('3. Adding Income (+1000) in Jan 2024...');
    await prisma.transaction.create({
        data: {
            walletId: wallet.id,
            amount: 1000,
            type: 'INCOME',
            date: new Date('2024-01-15'), // mid-jan
        }
    });

    console.log('4. Recalculating Jan 2024...');
    ledgerJan = await recalculateMonth(wallet.id, month1);
    console.log(`   Jan Open: ${ledgerJan.openingBalance}, Close: ${ledgerJan.closingBalance}`);

    if (Number(ledgerJan.closingBalance) !== 1000) throw new Error('Jan closing balance mismatch!');

    console.log('5. Checking Feb 2024 (Should carry over 1000)...');
    let ledgerFeb = await getOrCreateMonthlyBalance(wallet.id, month2);
    console.log(`   Feb Open: ${ledgerFeb.openingBalance}, Close: ${ledgerFeb.closingBalance}`);

    if (Number(ledgerFeb.openingBalance) !== 1000) throw new Error('Feb opening balance mismatch!');

    console.log('6. Adding Backdated Expense (-200) in Jan 2024...');
    await prisma.transaction.create({
        data: {
            walletId: wallet.id,
            amount: 200,
            type: 'EXPENSE',
            date: new Date('2024-01-20'),
        }
    });

    console.log('7. Triggering Cascade Recalculation from Jan...');
    await cascadeRecalculation(wallet.id, month1);

    console.log('8. Verifying Results...');
    ledgerJan = await getOrCreateMonthlyBalance(wallet.id, month1);
    ledgerFeb = await getOrCreateMonthlyBalance(wallet.id, month2);

    console.log(`   Jan Final Close: ${ledgerJan.closingBalance} (Expected 800)`);
    console.log(`   Feb Final Open:  ${ledgerFeb.openingBalance} (Expected 800)`);

    if (Number(ledgerJan.closingBalance) !== 800) throw new Error('Jan final closing balance incorrect');
    if (Number(ledgerFeb.openingBalance) !== 800) throw new Error('Feb final opening balance incorrect');

    console.log('--- TEST PASSED SUCCESSFULLY ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
