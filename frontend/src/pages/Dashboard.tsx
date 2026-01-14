import { useEffect, useState } from 'react';
import api from '../services/api';
import { WalletCard } from '../components/WalletCard';
import { TransactionList } from '../components/TransactionList';
import { Button } from '../components/Button';
import { Plus, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { MonthYearPicker } from '../components/MonthYearPicker';
import { SpendingPieChart } from '../components/SpendingPieChart';
import { IncomeVsExpenseChart } from '../components/IncomeVsExpenseChart';

export const Dashboard = () => {
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);
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

            const [walletsRes, txRes, insightsRes] = await Promise.all([
                api.get('/wallets'),
                api.get(`/transactions?month=${monthParam}`),
                api.get('/insights/burn-rate')
            ]);
            setWallets(walletsRes.data);
            setTransactions(txRes.data);
            setInsights(insightsRes.data);
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            // Don't crash, just let it be empty
        } finally {
            setLoading(false);
        }
    };

    const safeWallets = Array.isArray(wallets) ? wallets : [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    useEffect(() => {
        fetchData();
    }, [selectedDate]); // Refetch when month changes

    const getHealthIcon = (runway: number) => {
        if (runway < 1) return <AlertTriangle className="w-8 h-8 text-red-500" />;
        if (runway < 3) return <TrendingDown className="w-8 h-8 text-yellow-500" />;
        return <CheckCircle className="w-8 h-8 text-green-500" />;
    };

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
                    {safeWallets.map((w) => (
                        <WalletCard
                            key={w.id}
                            name={w.name}
                            type={w.type}
                            balance={w.currentBalance}
                        />
                    ))}

                    {/* Total Net Worth Card */}
                    <div className="p-6 rounded-xl bg-slate-800 border border-slate-700 flex flex-col justify-center">
                        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Net Worth</h3>
                        <p className="text-3xl font-bold text-white mt-1">
                            ₹{safeWallets.reduce((acc, w) => acc + (Number(w.currentBalance) || 0), 0).toFixed(2)}
                        </p>
                    </div>

                    {/* Insights / Burn Rate Card */}
                    {insights && (
                        <div className="p-6 rounded-xl bg-slate-900 border border-slate-700 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                {getHealthIcon(insights.runway)}
                            </div>
                            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Financial Health</h3>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-white">{insights.runway > 100 ? '99+' : insights.runway} Months</span>
                                <span className="text-sm text-gray-500 mb-1">Runway</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Burn Rate: <span className="text-red-400">₹{insights.monthlyBurnRate}</span> / mo
                            </p>
                            <p className={`text-xs mt-2 font-medium ${insights.runway < 3 ? 'text-red-400' : 'text-green-400'}`}>
                                {insights.message}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Charts Section */}
                    {safeTransactions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <IncomeVsExpenseChart transactions={safeTransactions} />
                            <SpendingPieChart transactions={safeTransactions} />
                        </div>
                    )}

                    <TransactionList transactions={safeTransactions} />
                </div>

                <div className="space-y-6">
                    {/* Right Sidebar could hold Quick Actions or Budget Summary */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-500/30">
                        <h3 className="text-blue-400 font-bold mb-2">Monthly Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Income</span>
                                <span className="text-green-400 font-medium">
                                    +₹{safeTransactions.filter((t: any) => t.type === 'INCOME').reduce((acc: number, t: any) => acc + Number(t.amount), 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Expenses</span>
                                <span className="text-red-400 font-medium">
                                    -₹{safeTransactions.filter((t: any) => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + Number(t.amount), 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
                                <span className="text-gray-300">Net</span>
                                <span className="text-white">
                                    ₹{(
                                        safeTransactions.filter((t: any) => t.type === 'INCOME').reduce((acc: number, t: any) => acc + Number(t.amount), 0) -
                                        safeTransactions.filter((t: any) => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
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
                wallets={safeWallets}
                onSuccess={fetchData}
            />
        </div>
    );
};
