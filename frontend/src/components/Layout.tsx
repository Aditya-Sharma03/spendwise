import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, PieChart, Wallet, Menu, X, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Parse email to get a name
    const userName = user?.user?.email?.split('@')[0] || 'User';

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col md:flex-row">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-800 border-r border-slate-700 h-screen sticky top-0">
                <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">SpendWise</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-700 text-gray-400 hover:text-white'}`}>
                        <PieChart className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link to="/give-take" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/give-take' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-700 text-gray-400 hover:text-white'}`}>
                        <ArrowRight className="w-5 h-5" />
                        <span className="font-medium">Give & Take</span>
                    </Link>
                    {/* Future links: Budget, Reports, Settings */}
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold">
                            {userName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-blue-500" />
                    <span className="font-bold text-lg">SpendWise</span>
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-slate-800 border-b border-slate-700 z-30 p-4 space-y-2 shadow-xl">
                    <Link to="/" className={`block px-4 py-3 rounded-lg font-medium ${location.pathname === '/' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400'}`} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                    <Link to="/give-take" className={`block px-4 py-3 rounded-lg font-medium ${location.pathname === '/give-take' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400'}`} onClick={() => setMobileMenuOpen(false)}>Give & Take</Link>
                    <button onClick={logout} className="block w-full text-left px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 font-medium">Logout</button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
