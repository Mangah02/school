// apps/web/src/components/academics/enrollment-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface UnenrolledStudent { id: string; first_name: string; last_name: string; admission_number: string; }
interface ClassOpt { id: string; name: string; streams: { id: string; name: string }[]; }

export function EnrollmentManager() {
  const [students, setStudents] = useState<UnenrolledStudent[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Selections
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students who don't have an active enrollment for the current term
      const [stuRes, clsRes] = await Promise.all([
        api.get('/student?unenrolled=true'), 
        api.get('/academic/classes')
      ]);
      setStudents(stuRes.data);
      setClasses(clsRes.data);
    } catch (error) { toast.error('Failed to load enrollment data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleEnroll = async () => {
    if (!selectedStudentId || !selectedStreamId) {
      toast.error('Please select a student and a stream.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Calls Phase 5.6 Backend Enrollment Endpoint
      await api.post('/academic/enrollments', {
        student_id: selectedStudentId,
        stream_id: selectedStreamId
      });
      toast.success('Student enrolled successfully!');
      setSelectedStudentId('');
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Enrollment failed');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Enrollment Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-600" /> Enroll Student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger><SelectValue placeholder="Choose unenrolled student..." /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select Class</Label>
            <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedStreamId(''); }}>
              <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select Stream</Label>
            <Select value={selectedStreamId} onValueChange={setSelectedStreamId} disabled={!selectedClassId}>
              <SelectTrigger><SelectValue placeholder="Choose stream..." /></SelectTrigger>
              <SelectContent>
                {selectedClass?.streams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleEnroll} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 mt-4">
            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
            Confirm Enrollment
          </Button>
        </CardContent>
      </Card>

      {/* Unenrolled Students List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Pending Enrollments ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">All students are enrolled! 🎉</TableCell></TableRow>
                ) : (
                  students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.admission_number}</TableCell>
                      <TableCell>{s.first_name} {s.last_name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedStudentId(s.id)}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}