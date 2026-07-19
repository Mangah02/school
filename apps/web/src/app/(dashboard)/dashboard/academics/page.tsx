// apps/web/src/app/(dashboard)/dashboard/academics/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, BookOpen, Users, CalendarDays } from 'lucide-react'; // Added CalendarDays
import { ClassesStreamsManager } from '@/components/academics/classes-streams-manager';
import { SubjectsManager } from '@/components/academics/subjects-manager';
import { EnrollmentManager } from '@/components/academics/enrollment-manager';
import { TimetableManager } from '@/components/academics/timetable-manager'; // Import new component

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-blue-600" /> Academic Management
        </h1>
        <p className="text-gray-500 mt-1">Configure classes, subjects, timetables, and manage student enrollments.</p>
      </div>

      <Tabs defaultValue="classes" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="classes" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <GraduationCap className="mr-2 h-4 w-4" /> Classes & Streams
          </TabsTrigger>
          <TabsTrigger value="subjects" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <BookOpen className="mr-2 h-4 w-4" /> Subjects
          </TabsTrigger>
          {/* NEW TIMETABLE TAB */}
          <TabsTrigger value="timetable" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <CalendarDays className="mr-2 h-4 w-4" /> Timetable
          </TabsTrigger>
          <TabsTrigger value="enrollment" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Users className="mr-2 h-4 w-4" /> Student Enrollment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes"><ClassesStreamsManager /></TabsContent>
        <TabsContent value="subjects"><SubjectsManager /></TabsContent>
        
        {/* NEW TIMETABLE CONTENT */}
        <TabsContent value="timetable"><TimetableManager /></TabsContent>
        
        <TabsContent value="enrollment"><EnrollmentManager /></TabsContent>
      </Tabs>
    </div>
  );
}