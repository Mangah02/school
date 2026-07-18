// apps/web/src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Layout Components
import Sidebar from '@/components/layout/sidebar';
import TopBar from '@/components/layout/topbar';
import { KdpaGate } from '@/components/layout/kdpa-gate';

// Providers
import { SocketProvider } from '@/providers/socket-provider';
import { OfflineSyncProvider } from '@/providers/offline-sync-provider'; // <-- THIS IMPORT WAS MISSING

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Basic server-side check for auth
  const cookieStore = await cookies();
  const hasRefreshToken = cookieStore.has('refresh_token'); 

  if (!hasRefreshToken) {
    redirect('/login');
  }

  return (
    <SocketProvider>
      <OfflineSyncProvider> {/* <-- Wrapped here */}
        <KdpaGate>
          <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50">
                {children}
              </main>
            </div>
          </div>
        </KdpaGate>
      </OfflineSyncProvider>
    </SocketProvider>
  );
}