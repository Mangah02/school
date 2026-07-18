// apps/web/src/providers/socket-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to the backend Socket.io gateway
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      auth: {
        token: accessToken, // Pass JWT for backend authentication
      },
      transports: ['websocket', 'polling'], // Fallback to polling if WS is blocked
    });

    socketInstance.on('connect', () => {
      console.log('Socket.io connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket.io disconnected');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [accessToken, isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}