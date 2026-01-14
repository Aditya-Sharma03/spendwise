import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { WalletCard } from '../components/WalletCard';
import { TransactionList } from '../components/TransactionList';
import { Button } from '../components/Button';
import { Plus } from 'lucide-react';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { MonthYearPicker } from '../components/MonthYearPicker';
import { SpendingPieChart } from '../components/SpendingPieChart';
import { IncomeVsExpenseChart } from '../components/IncomeVsExpenseChart';

export const Dashboard = () => {
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Month Filter State: Default to current month object
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchData = async () => {
        try {
            // Format YYYY-MM for API
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const monthParam = `${year}-${month}`;

            const [walletsRes, txRes] = await Promise.all([
                api.get('/wallets'),
                api.get(`/transactions?month=${monthParam}`)
            ]);
            setWallets(walletsRes.data);
            setTransactions(txRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]); // Refetch when month changes

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-gray-400">Welcome back! Here's your financial overview.</p>
                </div>

                <div className="flex gap-4 items-center">
                    <MonthYearPicker
                        selectedDate={selectedDate}
                        onChange={setSelectedDate}
                    />

                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Plus className="w-5 h-5" />
                        Add Transaction
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-32 bg-slate-800 rounded-xl animate-pulse"></div>
                    <div className="h-32 bg-slate-800 rounded-xl animate-pulse"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wallets.map((w) => (
                        <WalletCard
                            key={w.id}
                            name={w.name}
                            type={w.type}
                            balance={w.currentBalance}
                        />
                    ))}

                    {/* Total Net Worth Card (Computed) */}
                    <div className="p-6 rounded-xl bg-slate-800 border border-slate-700 flex flex-col justify-center">
                        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Net Worth</h3>
                        <p className="text-3xl font-bold text-white mt-1">
                            ₹{wallets.reduce((acc, w) => acc + w.currentBalance, 0).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Charts Section */}
                    {transactions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <IncomeVsExpenseChart transactions={transactions} />
                            <SpendingPieChart transactions={transactions} />
                        </div>
                    )}

                    <TransactionList transactions={transactions} />
                </div>

                <div className="space-y-6">
                    {/* Right Sidebar could hold Quick Actions or Budget Summary */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-500/30">
                        <h3 className="text-blue-400 font-bold mb-2">Monthly Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Income</span>
                                <span className="text-green-400 font-medium">
                                    +₹{transactions.filter(t => t.type === 'INCOME').reduce((acc: number, t: any) => acc + t.amount, 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Expenses</span>
                                <span className="text-red-400 font-medium">
                                    -₹{transactions.filter(t => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + t.amount, 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
                                <span className="text-gray-300">Net</span>
                                <span className="text-white">
                                    ₹{(
                                        transactions.filter(t => t.type === 'INCOME').reduce((acc: number, t: any) => acc + t.amount, 0) -
                                        transactions.filter(t => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + t.amount, 0)
                                    ).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                wallets={wallets}
                onSuccess={fetchData}
            />
        </div>
    );
};
