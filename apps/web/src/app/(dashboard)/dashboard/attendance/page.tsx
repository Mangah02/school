// apps/web/src/app/(dashboard)/dashboard/attendance/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, Briefcase } from 'lucide-react';
import { StudentAttendanceMark } from '@/components/attendance/student-attendance-mark';
import { StaffAttendanceView } from '@/components/attendance/staff-attendance-view';

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <UserCheck className="h-8 w-8 text-blue-600" /> Attendance Management
        </h1>
        <p className="text-gray-500 mt-1">Mark daily attendance, scan QR codes, and track staff clock-ins.</p>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="students" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <UserCheck className="mr-2 h-4 w-4" /> Student Attendance
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Briefcase className="mr-2 h-4 w-4" /> Staff Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <StudentAttendanceMark />
        </TabsContent>
        
        <TabsContent value="staff">
          <StaffAttendanceView />
        </TabsContent>
      </Tabs>
    </div>
  );
}