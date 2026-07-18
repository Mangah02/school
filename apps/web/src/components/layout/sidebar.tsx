// apps/web/src/components/layout/sidebar.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import { menuItems } from '@/config/menu';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { School } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuthStore();
  const pathname = usePathname();

  // Filter menu items based on user role
  const allowedMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-lg">
      <div className="p-5 border-b border-slate-700 flex items-center gap-3">
        <School className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-xl font-bold">SMIS</h1>
          <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}