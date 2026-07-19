// apps/web/src/app/(dashboard)/dashboard/cbt/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, ShieldCheck } from 'lucide-react';
import { ProctoringDashboard } from '@/components/cbt/proctoring-dashboard';

export default function CbtPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Monitor className="h-8 w-8 text-blue-600" /> Computer Based Testing (CBT)
        </h1>
        <p className="text-gray-500 mt-1">Monitor active exam sessions and review AI proctoring logs.</p>
      </div>

      <Tabs defaultValue="proctoring" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="proctoring" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <ShieldCheck className="mr-2 h-4 w-4" /> Live Proctoring
          </TabsTrigger>
          {/* You can add a "Past Sessions" or "Exam Setup" tab here later */}
        </TabsList>

        <TabsContent value="proctoring">
          <ProctoringDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}