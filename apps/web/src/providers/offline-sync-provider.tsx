// apps/web/src/providers/offline-sync-provider.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { offlineQueue } from '@/lib/offline-queue';
import { useAuthStore } from '@/store/authStore';

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Intercept failed requests due to network errors
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response && error.request) {
          // No response received = Network error / Offline
          const { url, method, data } = error.config;
          if (method !== 'get') { // Only queue mutations (POST, PUT, PATCH)
            console.warn(`[Offline] Queuing ${method.toUpperCase()} ${url}`);
            offlineQueue.add({ url, method, data: JSON.parse(data || '{}') });
          }
        }
        return Promise.reject(error);
      }
    );

    // 2. Listen for network restoration
    const handleOnline = () => {
      console.log('[Network] Connection restored. Flushing queue...');
      offlineQueue.flush(api);
    };

    window.addEventListener('online', handleOnline);

    // 3. Flush on initial load if already online
    if (navigator.onLine) {
      offlineQueue.flush(api);
    }

    return () => {
      api.interceptors.response.eject(interceptor);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated]);

  return <>{children}</>;
}