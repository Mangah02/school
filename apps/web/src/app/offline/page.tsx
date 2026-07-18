// apps/web/src/app/offline/page.tsx
import { WifiOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-200">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <WifiOff className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You are offline</h1>
        <p className="text-gray-500 mb-8">
          It seems you have lost your internet connection. Some features of SMIS may not be available until you are back online.
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Reconnecting
          </button>
          <Link href="/dashboard" className="w-full block text-center bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition">
            Go to Dashboard (Cached)
          </Link>
        </div>
      </div>
    </div>
  );
}