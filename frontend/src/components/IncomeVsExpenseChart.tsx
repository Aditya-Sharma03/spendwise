import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Transaction {
    amount: number;
    type: 'INCOME' | 'EXPENSE';
}

export const IncomeVsExpenseChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);

    const data = [
        { name: 'Income', amount: income },
        { name: 'Expense', amount: expense }
    ];

    return (
        <div className="h-[300px] w-full">
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">Cash Flow</h3>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val}`} />
                    <Tooltip
                        formatter={(value: any) => `₹${Number(value).toFixed(2)}`}
                        cursor={{ fill: '#334155', opacity: 0.2 }}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={50}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#22c55e' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
