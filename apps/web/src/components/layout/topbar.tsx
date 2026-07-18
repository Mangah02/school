// apps/web/src/components/layout/topbar.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User } from 'lucide-react';
import api from '@/lib/api';
import { GlobalSearch } from './global-search'; // <-- Import here
import { NotificationBell } from './notification-bell';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
      {/* LEFT: Global Search */}
      <div className="flex items-center">
        <GlobalSearch />
      </div>
      
      {/* RIGHT: Notifications & Profile */}
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="h-9 w-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
            <User className="h-5 w-5" />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition">
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}