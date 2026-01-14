import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthYearPickerProps {
    selectedDate: Date;
    onChange: (date: Date) => void;
}

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ selectedDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
    const containerRef = useRef<HTMLDivElement>(null);

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(viewYear, monthIndex, 1);
        onChange(newDate);
        setIsOpen(false);
    };

    const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => { setIsOpen(!isOpen); setViewYear(selectedDate.getFullYear()); }}
                className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-sm min-w-[160px] justify-between"
            >
                <span className="font-medium">{formattedDate}</span>
                <Calendar className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 w-64 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* Year Header */}
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => setViewYear(viewYear - 1)}
                            className="p-1 hover:bg-slate-700 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-bold text-white">{viewYear}</span>
                        <button
                            onClick={() => setViewYear(viewYear + 1)}
                            className="p-1 hover:bg-slate-700 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Month Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {months.map((month, index) => {
                            const isSelected = viewYear === selectedDate.getFullYear() && index === selectedDate.getMonth();
                            const isCurrentMonth = viewYear === new Date().getFullYear() && index === new Date().getMonth();

                            return (
                                <button
                                    key={month}
                                    onClick={() => handleMonthSelect(index)}
                                    className={`
                            py-2 rounded-lg text-sm font-medium transition-all
                            ${isSelected
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'text-gray-300 hover:bg-slate-700 hover:text-white'}
                            ${isCurrentMonth && !isSelected ? 'border border-blue-500/50 text-blue-400' : ''}
                        `}
                                >
                                    {month}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between">
                        <button
                            className="text-xs text-gray-400 hover:text-white"
                            onClick={() => {
                                const now = new Date();
                                onChange(now);
                                setIsOpen(false);
                            }}
                        >
                            This Month
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
