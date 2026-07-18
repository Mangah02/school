// apps/web/src/lib/offline-queue.ts
interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data: any;
  timestamp: number; // Used for Last-Write-Wins
}

const QUEUE_KEY = 'smis_offline_queue';

export const offlineQueue = {
  add: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => {
    const queue = offlineQueue.getAll();
    queue.push({
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  getAll: (): QueuedRequest[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  clear: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  // Flush queue when online. Sorts by timestamp to ensure chronological LWW execution.
  flush: async (axiosInstance: any) => {
    const queue = offlineQueue.getAll();
    if (queue.length === 0) return;

    // Sort oldest to newest for LWW
    queue.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`[Offline Sync] Flushing ${queue.length} queued requests...`);
    
    for (const req of queue) {
      try {
        await axiosInstance({
          url: req.url,
          method: req.method,
          data: req.data,
          headers: { 'X-Sync-Request': 'true' } // Backend can use this to handle conflict resolution
        });
      } catch (error) {
        console.error(`[Offline Sync] Failed to flush request ${req.url}`, error);
        // If it fails again, we leave it in the queue for the next retry
        return; 
      }
    }
    
    // If all succeeded, clear the queue
    offlineQueue.clear();
  }
};