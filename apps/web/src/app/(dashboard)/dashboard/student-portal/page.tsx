// apps/web/src/app/(dashboard)/dashboard/student-portal/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, CalendarCheck, BookOpen, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { StudentTimetable } from '@/components/student-portal/student-timetable';
import { StudentGrades } from '@/components/student-portal/student-grades';
import { StudentLibrary } from '@/components/student-portal/student-library';
import { toast } from 'sonner';
import api from '@/lib/api';

interface StudentStats {
  attendance_rate: number;
  current_average: number;
  class_position: number;
  total_students_in_class: number;
  books_due: number;
}

export default function StudentPortalPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Backend maps user.id to student_id and enforces OwnershipGuard
        const res = await api.get('/students/my-portal-stats'); 
        setStats(res.data);
      } catch (error) {
        toast.error('Failed to load your portal data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-blue-600" /> My Student Portal
        </h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.email?.split('@')[0]}. Here is your academic overview.</p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-green-600" /> My Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{stats.attendance_rate}%</p>
              <p className="text-xs text-gray-500 mt-1">Overall attendance rate</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-600" /> Current Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{stats.current_average}%</p>
              <p className="text-xs text-gray-500 mt-1">Across all subjects</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" /> Class Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{stats.class_position}<span className="text-lg text-gray-500">/{stats.total_students_in_class}</span></p>
              <p className="text-xs text-gray-500 mt-1">Out of {stats.total_students_in_class} students</p>
            </CardContent>
          </Card>

          <Card className={`border-t-4 ${stats.books_due > 0 ? 'border-t-red-500' : 'border-t-gray-300'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <BookOpen className={`h-4 w-4 ${stats.books_due > 0 ? 'text-red-600' : 'text-gray-600'}`} /> Library Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats.books_due > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.books_due}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.books_due > 0 ? 'Books currently borrowed' : 'No books currently borrowed'}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Detailed Tabs */}
      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="timetable" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Clock className="mr-2 h-4 w-4" /> My Timetable
          </TabsTrigger>
          <TabsTrigger value="grades" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <GraduationCap className="mr-2 h-4 w-4" /> My Grades
          </TabsTrigger>
          <TabsTrigger value="library" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <BookOpen className="mr-2 h-4 w-4" /> Library Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timetable"><StudentTimetable /></TabsContent>
        <TabsContent value="grades"><StudentGrades /></TabsContent>
        <TabsContent value="library"><StudentLibrary /></TabsContent>
      </Tabs>
    </div>
  );
}