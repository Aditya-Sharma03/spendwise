const axios = require('axios');

const API_URL = 'http://localhost:4000';

async function test() {
    try {
        console.log("1. Registering User...");
        const email = `test_${Date.now()}@example.com`;
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password: 'password123'
        });
        console.log("Registered:", email);

        console.log("2. Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email,
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log("Got Token");

        const headers = { Authorization: `Bearer ${token}` };

        console.log("3. Fetching Wallets...");
        const walletsRes = await axios.get(`${API_URL}/wallets`, { headers });
        const wallets = walletsRes.data;
        console.log("Wallets:", wallets.length);
        const cashWallet = wallets.find(w => w.type === 'CASH');

        console.log("4. Adding Income (Jan)...");
        await axios.post(`${API_URL}/transactions/income`, {
            walletId: cashWallet.id,
            amount: 1000,
            date: '2025-01-01',
            source: 'Salary'
        }, { headers });
        console.log("Income Added");

        console.log("5. Adding Expense (Jan)...");
        await axios.post(`${API_URL}/transactions/expense`, {
            walletId: cashWallet.id,
            amount: 200,
            date: '2025-01-15',
            category: 'Food'
        }, { headers });
        console.log("Expense Added");

        console.log("6. Verifying Ledger (Jan)...");
        const ledgerJan = await axios.get(`${API_URL}/wallets/${cashWallet.id}/monthly/2025-01`, { headers });
        console.log("Jan Ledger:", ledgerJan.data);

        if (ledgerJan.data.closingBalance !== 800) throw new Error("Jan Closing Balance Incorrect");

        console.log("7. Verifying Ledger (Feb - Rollover)...");
        // Trigger a read for Feb, which should auto-create based on Jan closing
        const ledgerFeb = await axios.get(`${API_URL}/wallets/${cashWallet.id}/monthly/2025-02`, { headers }); // This triggers getOrCreate
        // However, getOrCreate only looks back 1 month.
        // Wait, my current getOrCreate logic finds prev month closing.
        // So fetching 2025-02 should see 2025-01 closing (800) and set it as opening.

        console.log("Feb Ledger:", ledgerFeb.data);
        if (ledgerFeb.data.openingBalance !== 800) throw new Error("Feb Opening Balance Incorrect (Rollover Failed)");

        console.log("SUCCESS! All checks passed.");

    } catch (e) {
        console.error("TEST FAILED:", e.response ? e.response.data : e.message);
    }
}

test();
