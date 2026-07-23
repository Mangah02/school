// apps/web/src/app/(dashboard)/dashboard/library/page.tsx
'use client';

import { LibraryManager } from '@/components/operations/library-manager';
import { BookOpen } from 'lucide-react';

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-600" /> Library Management
        </h1>
        <p className="text-gray-500 mt-1">Manage book borrowing, returns, and circulation.</p>
      </div>
      
      <LibraryManager />
    </div>
  );
}