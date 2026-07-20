// apps/web/src/components/student-portal/student-timetable.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface TimetableSlot {
  day: string;
  start_time: string;
  end_time: string;
  subject: { name: string; code: string };
  teacher: { first_name: string; last_name: string };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function StudentTimetable() {
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/academic/timetables/my-schedule') // Backend scopes to student's stream
      .then(res => setTimetable(res.data))
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;

  return (
    <Card className="overflow-x-auto">
      <CardContent className="p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-left font-semibold text-gray-600 w-24">Time</th>
              {DAYS.map(day => <th key={day} className="p-3 text-center font-semibold text-gray-600">{day}</th>)}
            </tr>
          </thead>
          <tbody>
            {/* Generate time slots dynamically or use hardcoded school hours */}
            {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'].map((time) => (
              <tr key={time} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs text-gray-500 bg-gray-50/50 align-top">
                  {time} - {String(parseInt(time) + 1).padStart(2, '0')}:00
                </td>
                {DAYS.map(day => {
                  const slot = timetable.find(t => t.day === day && t.start_time === time);
                  return (
                    <td key={day} className={`p-2 text-center align-top h-20 border-l ${slot ? 'bg-blue-50/30' : 'bg-white'}`}>
                      {slot ? (
                        <div>
                          <p className="font-bold text-blue-800 text-xs">{slot.subject.code}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{slot.subject.name}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {slot.teacher.first_name} {slot.teacher.last_name?.[0]}.
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}