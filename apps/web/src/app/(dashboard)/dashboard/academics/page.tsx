// apps/web/src/app/(dashboard)/dashboard/academics/page.tsx
'use client';

import { AcademicYearManager } from '@/components/academics/academic-year-manager';
import { ClassesStreamsManager } from '@/components/academics/classes-streams-manager';
import { SubjectsManager } from '@/components/academics/subjects-manager';
import { TimetableManager } from '@/components/academics/timetable-manager';
import { EnrollmentManager } from '@/components/academics/enrollment-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Academics</h1>
        <p className="text-gray-500 mt-1">Manage classes, subjects, timetables, and enrollments.</p>
      </div>

      <Tabs defaultValue="years" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="classes">Classes & Streams</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
        </TabsList>

        <TabsContent value="years">
          <AcademicYearManager />
        </TabsContent>
        <TabsContent value="classes">
          <ClassesStreamsManager />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsManager />
        </TabsContent>
        <TabsContent value="timetable">
          <TimetableManager />
        </TabsContent>
        <TabsContent value="enrollment">
          <EnrollmentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}