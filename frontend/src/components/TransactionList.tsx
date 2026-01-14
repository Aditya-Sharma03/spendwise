import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface Transaction {
    id: string;
    amount: number;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    source?: string;
    category?: string;
    notes?: string;
    wallet: { name: string };
}

export const TransactionList: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">Recent Transactions</h3>
            </div>
            <div className="divide-y divide-slate-700">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No transactions yet</div>
                ) : (
                    transactions.map((t) => (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {t.type === 'INCOME' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{t.source || t.category}</p>
                                    <p className="text-sm text-gray-400">{format(new Date(t.date), 'MMM d, yyyy')} • {t.wallet.name}</p>
                                </div>
                            </div>
                            <span className={`font-bold ${t.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                                {t.type === 'INCOME' ? '+' : '-'}₹{t.amount.toFixed(2)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
