import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Transaction {
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category?: string;
    source?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#FF6B6B'];

export const SpendingPieChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    // Aggregate expenses by category
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const categoryTotals: Record<string, number> = {};

    expenses.forEach(t => {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    const data = Object.keys(categoryTotals).map(cat => ({
        name: cat,
        value: categoryTotals[cat]
    })).sort((a, b) => b.value - a.value); // Sort desc

    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                No expenses to display
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => `₹${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
