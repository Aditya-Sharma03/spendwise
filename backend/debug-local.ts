
import prisma from './src/utils/prisma';
import { getOrCreateMonthlyBalance } from './src/core/ledger';

async function main() {
    console.log('--- DEBUG START ---');
    try {
        console.log('1. Fetching first user...');
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found.');
            return;
        }
        console.log('User:', user.id);

        console.log('2. Fetching wallets...');
        const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });
        console.log(`Found ${wallets.length} wallets.`);

        if (wallets.length > 0) {
            const w = wallets[0];
            console.log(`3. Testing getOrCreateMonthlyBalance for wallet ${w.id}...`);
            const ledger = await getOrCreateMonthlyBalance(w.id, new Date());
            console.log('Ledger result:', ledger);
        }

        console.log('--- DEBUG SUCCESS ---');
    } catch (e) {
        console.error('--- DEBUG FAILED ---');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
