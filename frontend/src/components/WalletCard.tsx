import React from 'react';
import { Wallet as WalletIcon } from 'lucide-react';

interface WalletCardProps {
    name: string;
    balance: number;
    type: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({ name, balance, type }) => {
    const isBank = type === 'BANK';

    return (
        <div className={`p-6 rounded-xl shadow-lg border border-slate-700 ${isBank ? 'bg-gradient-to-br from-indigo-900 to-slate-900' : 'bg-gradient-to-br from-emerald-900 to-slate-900'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{name}</h3>
                    <p className="text-2xl font-bold text-white mt-1">₹{Number(balance).toFixed(2)}</p>
                </div>
                <div className={`p-3 rounded-lg ${isBank ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <WalletIcon className="w-6 h-6" />
                </div>
            </div>

            {/* Mini Actions or Stats could go here */}
        </div>
    );
};
