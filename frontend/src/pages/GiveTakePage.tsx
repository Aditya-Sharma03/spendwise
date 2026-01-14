import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/Button';
import { AddDueModal } from '../components/AddDueModal';
import { Plus, CheckCircle, Clock, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const GiveTakePage = () => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [activeDues, setActiveDues] = useState<any[]>([]);
    const [historyDues, setHistoryDues] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [activeRes, historyRes, walletsRes] = await Promise.all([
                api.get('/due/active'),
                api.get('/due/history'),
                api.get('/wallets')
            ]);
            setActiveDues(activeRes.data);
            setHistoryDues(historyRes.data);
            setWallets(walletsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSettle = async (id: string) => {
        if (!window.confirm("Mark this record as SETTLED? This cannot be undone.")) return;
        try {
            await api.post(`/due/${id}/settle`);
            fetchData();
        } catch (err) {
            alert("Failed to settle record");
        }
    };

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Generate years (current year - 5 to current year)
    const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 5 + i).reverse();
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const renderList = (dues: any[], isHistory: boolean) => {
        // Filter History items by selected Month/Year
        let displayDues = dues;
        if (isHistory) {
            displayDues = dues.filter(d => {
                if (!d.settledAt) return false;
                const settleDate = new Date(d.settledAt);
                return settleDate.getMonth() === selectedMonth &&
                    settleDate.getFullYear() === selectedYear;
            });
        }

        if (displayDues.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p>No records found for this period.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayDues.map(d => (
                    <div key={d.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rotate-45 ${d.type === 'GIVE' ? 'bg-red-500/10' : 'bg-green-500/10'}`}></div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white">{d.personName}</h3>
                                <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded mt-2 ${d.type === 'GIVE' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {d.type === 'GIVE' ? 'YOU GAVE' : 'YOU TOOK'}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-bold ${d.type === 'GIVE' ? 'text-red-400' : 'text-green-400'}`}>
                                    ₹{Number(d.amount).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6 relative z-10">
                            <p className="text-gray-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {d.reason}
                            </p>
                            <p className="text-gray-500 text-xs flex items-center gap-2">
                                <Clock className="w-3 h-3" /> {format(new Date(d.createdAt), 'MMM d, yyyy')}
                            </p>
                            {d.wallet && (
                                <p className="text-gray-600 text-xs">
                                    Via: {d.wallet.name}
                                </p>
                            )}
                        </div>

                        {!isHistory && (
                            <Button
                                onClick={() => handleSettle(d.id)}
                                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Settled
                            </Button>
                        )}

                        {isHistory && (
                            <p className="text-green-500 text-sm flex items-center justify-center font-medium opacity-70">
                                <CheckCircle className="w-4 h-4 mr-2" /> Settled on {d.settledAt ? format(new Date(d.settledAt), 'MMM d, yyyy') : 'Unknown'}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Give & Take</h1>
                    <p className="text-gray-400">Track debts and loans.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    New Record
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between border-b border-slate-700 gap-4">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('ACTIVE')}
                        className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'ACTIVE' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        Active
                        {activeTab === 'ACTIVE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'HISTORY' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        History
                        {activeTab === 'HISTORY' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full"></div>}
                    </button>
                </div>

                {activeTab === 'HISTORY' && (
                    <div className="flex gap-2 pb-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-48 bg-slate-800 rounded-xl animate-pulse"></div>
                    <div className="h-48 bg-slate-800 rounded-xl animate-pulse"></div>
                </div>
            ) : (
                renderList(activeTab === 'ACTIVE' ? activeDues : historyDues, activeTab === 'HISTORY')
            )}

            <AddDueModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
                wallets={wallets}
            />
        </div>
    );
};
