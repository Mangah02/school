// apps/web/src/app/(dashboard)/dashboard/parent-portal/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, CalendarCheck, DollarSign, Bell } from 'lucide-react';
import { ChildSwitcher } from '@/components/parent-portal/child-switcher';
import { useParentContextStore } from '@/store/parentContextStore';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ChildPortalData {
  attendance_summary: { present: number; absent: number; late: number; total_days: number };
  academic_summary: { current_average: number; position: number; total_students: number };
  finance_summary: { total_invoiced: number; paid: number; balance: number; next_due_date: string };
}

export default function ParentPortalPage() {
  const { selectedChildId, getSelectedChild } = useParentContextStore();
  const [data, setData] = useState<ChildPortalData | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedChild = getSelectedChild();

  useEffect(() => {
    if (!selectedChildId) return;
    
    const fetchPortalData = async () => {
      setLoading(true);
      try {
        // Strictly scoped by OwnershipGuard on the backend
        const res = await api.get(`/student/${selectedChildId}/parent-portal-data`);
        setData(res.data);
      } catch (error) {
        toast.error('Failed to load portal data');
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [selectedChildId]);

  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Header & Child Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" /> Parent Portal
          </h1>
          <p className="text-gray-500 mt-1">Monitor your child's academic progress, attendance, and fee statements.</p>
        </div>
        <ChildSwitcher />
      </div>

      {!selectedChildId || loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : !data ? (
        <Card className="p-10 text-center"><p className="text-gray-500">No data available for {selectedChild?.first_name}.</p></Card>
      ) : (
        <>
          {/* KPI Cards for Selected Child */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-t-4 border-t-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-green-600" /> Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {data.attendance_summary.total_days > 0 
                    ? ((data.attendance_summary.present / data.attendance_summary.total_days) * 100).toFixed(1) 
                    : 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.attendance_summary.present} Present / {data.attendance_summary.absent} Absent
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" /> Academic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{data.academic_summary.current_average}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Position: {data.academic_summary.position} out of {data.academic_summary.total_students}
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" /> Fee Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(data.finance_summary.balance)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Next Due: {data.finance_summary.next_due_date ? new Date(data.finance_summary.next_due_date).toLocaleDateString() : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="statements" className="space-y-4">
            <TabsList className="bg-white border p-1">
              <TabsTrigger value="statements">Fee Statements</TabsTrigger>
              <TabsTrigger value="reports">Report Cards</TabsTrigger>
              <TabsTrigger value="notifications">School Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="statements" className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Outstanding Invoices for {selectedChild?.first_name}</h3>
              <p className="text-sm text-gray-600 mb-4">Total Invoiced: <strong>{formatCurrency(data.finance_summary.total_invoiced)}</strong> | Paid: <strong className="text-green-600">{formatCurrency(data.finance_summary.paid)}</strong></p>
              {/* Re-using the Parent Invoices component from 12.7, but scoped to the selected child */}
              <p className="text-xs text-gray-400 italic">* Use the "My Invoices" tab in the main Finance menu to pay via MPESA.</p>
            </TabsContent>

            <TabsContent value="reports" className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Academic Reports</h3>
              <p className="text-sm text-gray-600">Download past term report cards for {selectedChild?.first_name}.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold">PDF</div>
                    <div>
                      <p className="font-medium text-sm">Term 1 Report Card</p>
                      <p className="text-xs text-gray-500">Released: May 2026</p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Bell className="h-5 w-5" /> Recent Notifications</h3>
              <div className="space-y-3">
                <div className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                  <p className="font-medium text-sm">PTA Meeting Scheduled</p>
                  <p className="text-xs text-gray-600">Dear Parent, the Term 1 PTA meeting will be held on Friday...</p>
                </div>
                <div className="p-3 border-l-4 border-green-500 bg-green-50 rounded">
                  <p className="font-medium text-sm">Fee Payment Received</p>
                  <p className="text-xs text-gray-600">We have received KES 15,000 via MPESA for {selectedChild?.first_name}.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}