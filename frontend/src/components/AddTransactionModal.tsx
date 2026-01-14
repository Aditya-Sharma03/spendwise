import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import api from '../services/api';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    wallets: any[];
}

const INCOME_SOURCES = [
    "Salary",
    "Business / Freelance",
    "Investments / Rent",
    "Gift / Shagun",
    "Refund / Cashback",
    "Other"
];

const EXPENSE_CATEGORIES = [
    "Food & Groceries",
    "Rent / EMI / Bills",
    "Travel / Fuel",
    "Shopping & Entertainment",
    "Investment / SIP",
    "Other"
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSuccess, wallets }) => {
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [amount, setAmount] = useState('');
    const [walletId, setWalletId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Selection from Dropdown
    const [selectedCategory, setSelectedCategory] = useState('');
    // Custom input if Other is selected
    const [customCategory, setCustomCategory] = useState('');

    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Final value to send
        const finalCategory = selectedCategory === 'Other' && customCategory.trim()
            ? customCategory
            : selectedCategory;

        try {
            const payload = {
                walletId,
                amount,
                date,
                notes,
                // Dynamic field key based on type
                [type === 'INCOME' ? 'source' : 'category']: finalCategory
            };

            if (type === 'INCOME') {
                await api.post('/transactions/income', payload);
            } else {
                await api.post('/transactions/expense', payload);
            }
            onSuccess();
            onClose();
            // Reset form
            setAmount('');
            setSelectedCategory('');
            setCustomCategory('');
            setNotes('');
        } catch (err) {
            console.error(err);
            alert('Failed to add transaction');
        } finally {
            setLoading(false);
        }
    };

    const options = type === 'INCOME' ? INCOME_SOURCES : EXPENSE_CATEGORIES;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Add Transaction</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex gap-2 p-1 bg-slate-900 rounded-lg">
                        <button
                            type="button"
                            className={`flex-1 py-2 rounded-md font-medium transition-colors ${type === 'INCOME' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => { setType('INCOME'); setSelectedCategory(''); setCustomCategory(''); }}
                        >
                            Income
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 rounded-md font-medium transition-colors ${type === 'EXPENSE' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => { setType('EXPENSE'); setSelectedCategory(''); setCustomCategory(''); }}
                        >
                            Expense
                        </button>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Wallet</label>
                        <select
                            value={walletId}
                            onChange={(e) => setWalletId(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select Wallet</option>
                            {wallets.map(w => (
                                <option key={w.id} value={w.id}>{w.name} (₹{w.currentBalance})</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />

                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />

                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                            {type === 'INCOME' ? 'Source' : 'Category'}
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select {type === 'INCOME' ? 'Source' : 'Category'}</option>
                            {options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {selectedCategory === 'Other' && (
                        <Input
                            label="Specify (Optional)"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter specific details..."
                        />
                    )}

                    <Input
                        label="Notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <Button type="submit" className={`w-full ${type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`} disabled={loading}>
                        {loading ? 'Adding...' : 'Add Transaction'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
