// apps/web/src/app/(dashboard)/dashboard/study-materials/page.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import { BookOpen, Upload } from 'lucide-react';
import { StudyMaterialsManager } from '@/components/study-materials/manager';
import { StudyMaterialsViewer } from '@/components/study-materials/viewer';

export default function StudyMaterialsPage() {
  const { user } = useAuthStore();
  
  // Roles that can upload and manage materials
  const canManage = ['super_admin', 'school_admin', 'teacher'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          {canManage ? <Upload className="h-8 w-8 text-blue-600" /> : <BookOpen className="h-8 w-8 text-blue-600" />}
          Study Materials
        </h1>
        <p className="text-gray-500 mt-1">
          {canManage 
            ? 'Upload, publish, and manage learning resources for your classes.' 
            : 'Browse and download study materials provided by your teachers.'}
        </p>
      </div>

      {canManage ? <StudyMaterialsManager /> : <StudyMaterialsViewer />}
    </div>
  );
}