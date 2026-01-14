
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-center gap-3 z-50 animate-bounce">
            <WifiOff className="w-5 h-5" />
            <span className="font-bold">You are currently offline. Changes will not be saved.</span>
        </div>
    );
};
