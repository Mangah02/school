// apps/web/src/components/public/public-news-feed.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Calendar } from 'lucide-react';
import api from '@/lib/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  publish_date: string;
}

export function PublicNewsFeed({ schoolId, limit }: { schoolId: string; limit?: number }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calls Phase 10.5 Public Endpoint (No Auth Required)
    api.get(`/public/${schoolId}/announcements`)
      .then(res => {
        const data = res.data;
        setAnnouncements(limit ? data.slice(0, limit) : data);
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, [schoolId, limit]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[...Array(limit || 3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="p-10 text-center bg-white">
        <Megaphone className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500">No announcements at this time.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {announcements.map(ann => (
        <Card key={ann.id} className="bg-white hover:shadow-md transition-shadow flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">Announcement</Badge>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(ann.publish_date).toLocaleDateString()}
              </span>
            </div>
            <CardTitle className="text-lg mt-2 line-clamp-2">{ann.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-gray-600 line-clamp-4" dangerouslySetInnerHTML={{ __html: ann.content }} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}