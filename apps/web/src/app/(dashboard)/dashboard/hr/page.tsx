// apps/web/src/app/(dashboard)/dashboard/hr/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CalendarOff, DollarSign } from 'lucide-react';
import { StaffRecordsManager } from '@/components/hr/staff-records-manager';
import { LeaveManager } from '@/components/hr/leave-manager';
import { PayrollProcessor } from '@/components/hr/payroll-processor';

export default function HrPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" /> Human Resources & Payroll
        </h1>
        <p className="text-gray-500 mt-1">Manage staff records, process leave requests, and run monthly payroll.</p>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="staff" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Users className="mr-2 h-4 w-4" /> Staff Records
          </TabsTrigger>
          <TabsTrigger value="leave" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <CalendarOff className="mr-2 h-4 w-4" /> Leave Management
          </TabsTrigger>
          <TabsTrigger value="payroll" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <DollarSign className="mr-2 h-4 w-4" /> Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff"><StaffRecordsManager /></TabsContent>
        <TabsContent value="leave"><LeaveManager /></TabsContent>
        <TabsContent value="payroll"><PayrollProcessor /></TabsContent>
      </Tabs>
    </div>
  );
}