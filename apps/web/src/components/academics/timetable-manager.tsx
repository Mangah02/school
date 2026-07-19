// apps/web/src/components/academics/timetable-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CalendarDays, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ClassOpt { id: string; name: string; streams: { id: string; name: string }[]; }
interface Subject { id: string; name: string; code: string; }
interface Teacher { id: string; first_name: string; last_name: string; }

interface TimetableSlot {
  id?: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_id?: string;
  teacher_id?: string;
  subject?: Subject;
  teacher?: Teacher;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '13:00', end: '14:00' }, // Post-lunch
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
];

export function TimetableManager() {
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [formTeacher, setFormTeacher] = useState('');

  // 1. Fetch initial data
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [clsRes, subRes, tchRes] = await Promise.all([
          api.get('/academic/classes'),
          api.get('/academic/subjects'),
          api.get('/staff?role=teacher') // Assuming backend filters by role
        ]);
        setClasses(clsRes.data);
        setSubjects(subRes.data);
        setTeachers(tchRes.data);
      } catch (error) { toast.error('Failed to load timetable prerequisites'); }
    };
    fetchBaseData();
  }, []);

  // 2. Fetch Timetable when Class/Stream changes
  useEffect(() => {
    if (!selectedStreamId) {
      setTimetable([]);
      return;
    }

    const fetchTimetable = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/academic/timetables?stream_id=${selectedStreamId}`);
        
        // Map backend data to our grid structure
        const grid: TimetableSlot[] = [];
        for (const day of DAYS) {
          for (const slot of TIME_SLOTS) {
            const existing = res.data.find((t: any) => t.day === day && t.start_time === slot.start);
            grid.push({
              id: existing?.id,
              day,
              start_time: slot.start,
              end_time: slot.end,
              subject_id: existing?.subject_id,
              teacher_id: existing?.teacher_id,
              subject: existing?.subject,
              teacher: existing?.teacher,
            });
          }
        }
        setTimetable(grid);
      } catch (error) { toast.error('Failed to load timetable'); } finally { setLoading(false); }
    };

    fetchTimetable();
  }, [selectedStreamId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleCellClick = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setFormSubject(slot.subject_id || '');
    setFormTeacher(slot.teacher_id || '');
    setIsDialogOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!editingSlot) return;
    
    try {
      const payload = {
        stream_id: selectedStreamId,
        day: editingSlot.day,
        start_time: editingSlot.start_time,
        end_time: editingSlot.end_time,
        subject_id: formSubject || null,
        teacher_id: formTeacher || null,
      };

      if (editingSlot.id) {
        await api.put(`/academic/timetables/${editingSlot.id}`, payload);
      } else {
        await api.post('/academic/timetables', payload);
      }
      
      toast.success('Timetable updated');
      setIsDialogOpen(false);
      
      // Refresh grid
      const res = await api.get(`/academic/timetables?stream_id=${selectedStreamId}`);
      // (In a real app, you'd re-run the mapping logic here, or just trigger a re-fetch)
      window.location.reload(); // Simple reload for grid refresh
    } catch (error) { toast.error('Failed to save slot'); }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Label>Select Class</Label>
          <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedStreamId(''); }}>
            <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label>Select Stream</Label>
          <Select value={selectedStreamId} onValueChange={setSelectedStreamId} disabled={!selectedClassId}>
            <SelectTrigger><SelectValue placeholder="Choose stream..." /></SelectTrigger>
            <SelectContent>
              {selectedClass?.streams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedStreamId ? (
        <Card className="p-10 text-center text-gray-500">
          <CalendarDays className="mx-auto h-10 w-10 mb-2 text-gray-400" />
          <p>Please select a Class and Stream to view or edit the timetable.</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
      ) : (
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
                {TIME_SLOTS.map((time) => (
                  <tr key={time.start} className="border-b last:border-0">
                    <td className="p-3 font-mono text-xs text-gray-500 bg-gray-50/50 align-top">
                      {time.start} - <br/> {time.end}
                    </td>
                    {DAYS.map(day => {
                      const slot = timetable.find(t => t.day === day && t.start_time === time.start);
                      const hasData = slot?.subject;
                      return (
                        <td 
                          key={day} 
                          className={`p-2 text-center align-top cursor-pointer hover:bg-blue-50 transition h-24 border-l ${hasData ? 'bg-blue-50/30' : 'bg-white'}`}
                          onClick={() => slot && handleCellClick(slot)}
                        >
                          {hasData ? (
                            <div>
                              <p className="font-bold text-blue-800 text-xs">{slot.subject?.code || slot.subject?.name}</p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {slot.teacher?.first_name} {slot.teacher?.last_name?.[0]}.
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">+ Assign</span>
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
      )}

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Lesson: {editingSlot?.day} ({editingSlot?.start_time} - {editingSlot?.end_time})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subject</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select value={formTeacher} onValueChange={setFormTeacher}>
                <SelectTrigger><SelectValue placeholder="Select teacher..." /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSlot} className="bg-blue-600 hover:bg-blue-700">
              <Save className="mr-2 h-4 w-4" /> Save Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}