import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import api from '../services/api';

interface AddDueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    wallets: any[];
}

export const AddDueModal: React.FC<AddDueModalProps> = ({ isOpen, onClose, onSuccess, wallets }) => {
    const [type, setType] = useState<'GIVE' | 'TAKE'>('GIVE');
    const [personName, setPersonName] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [walletId, setWalletId] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setPersonName('');
            setAmount('');
            setReason('');

            // Auto-select 'Bank' wallet default to ensure balance is updated
            if (wallets && wallets.length > 0) {
                const defaultWallet = wallets.find(w => w.name.toLowerCase().includes('bank')) || wallets[0];
                setWalletId(defaultWallet.id);
            } else {
                setWalletId('');
            }
        }
    }, [isOpen, wallets]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/due', {
                type,
                personName,
                amount,
                reason,
                date,
                walletId: walletId || undefined // Send undefined if empty string
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Give / Take Money</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type Toggle */}
                    <div className="flex gap-2 p-1 bg-slate-900 rounded-lg">
                        <button
                            type="button"
                            className={`flex-1 py-3 rounded-md font-bold transition-colors flex items-center justify-center gap-2 ${type === 'GIVE' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setType('GIVE')}
                        >
                            <ArrowUpRight className="w-5 h-5" />
                            GIVE (Lent)
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-3 rounded-md font-bold transition-colors flex items-center justify-center gap-2 ${type === 'TAKE' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setType('TAKE')}
                        >
                            <ArrowDownLeft className="w-5 h-5" />
                            TAKE (Borrowed)
                        </button>
                    </div>

                    <Input
                        label="Person Name"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        required
                        placeholder="Who is this with?"
                    />

                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        placeholder="0.00"
                    />

                    <Input
                        label="Reason / Description"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        placeholder="e.g. Dinner split, Emergency loan"
                    />



                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />

                    <Button
                        type="submit"
                        className={`w-full ${type === 'GIVE' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : `Record ${type}`}
                    </Button>
                </form>
            </div>
        </div>
    );
};
