// apps/web/src/app/(public)/news/page.tsx
import { PublicNewsFeed } from '@/components/public/public-news-feed';

export default function NewsPage() {
  const schoolId = process.env.NEXT_PUBLIC_DEFAULT_SCHOOL_ID || 'demo-school-id';
  
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">News & Announcements</h1>
      <p className="text-gray-600 mb-10">Stay informed about school events, policy updates, and important notices.</p>
      <PublicNewsFeed schoolId={schoolId} />
    </div>
  );
}