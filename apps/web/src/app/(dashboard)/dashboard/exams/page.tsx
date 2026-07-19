// apps/web/src/app/(dashboard)/dashboard/exams/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, PenLine, FileText } from 'lucide-react';
import { ExamManager } from '@/components/exams/exam-manager';
import { GradeEntry } from '@/components/exams/grade-entry';
import { ReportCardGenerator } from '@/components/exams/report-card-generator';

export default function ExamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-blue-600" /> Exams & Assessments
        </h1>
        <p className="text-gray-500 mt-1">Manage exams, enter student grades, and generate report cards.</p>
      </div>

      <Tabs defaultValue="enter-grades" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="enter-grades" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <PenLine className="mr-2 h-4 w-4" /> Enter Grades
          </TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <ClipboardList className="mr-2 h-4 w-4" /> Manage Exams
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <FileText className="mr-2 h-4 w-4" /> Report Cards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enter-grades"><GradeEntry /></TabsContent>
        <TabsContent value="manage"><ExamManager /></TabsContent>
        <TabsContent value="reports"><ReportCardGenerator /></TabsContent>
      </Tabs>
    </div>
  );
}