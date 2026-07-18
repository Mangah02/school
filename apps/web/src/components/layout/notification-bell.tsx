// apps/web/src/components/layout/notification-bell.tsx
'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSocket } from '@/providers/socket-provider';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function NotificationBell() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch initial notifications via REST
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=10');
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n: Notification) => !n.is_read).length);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };
    fetchNotifications();
  }, []);

  // 2. Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif: Notification) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Optional: Trigger browser native notification
      if (Notification.permission === 'granted') {
        new Notification(newNotif.title, { body: newNotif.message });
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-blue-600 font-medium">{unreadCount} New</span>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <ul>
              {notifications.map((notif, index) => (
                <li 
                  key={notif.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-medium ${!notif.is_read ? 'text-blue-900' : 'text-gray-800'}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                  {index < notifications.length - 1 && <Separator className="mt-3" />}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}