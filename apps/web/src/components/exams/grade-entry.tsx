// apps/web/src/components/exams/grade-entry.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Student { id: string; first_name: string; last_name: string; admission_number: string; }
interface Exam { id: string; name: string; }
interface Subject { id: string; name: string; }

export function GradeEntry() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/exams'),
      api.get('/academic/subjects'),
      api.get('/academic/classes')
    ]).then(([exRes, subRes, clsRes]) => {
      setExams(exRes.data);
      setSubjects(subRes.data);
      setClasses(clsRes.data);
    }).catch(() => toast.error('Failed to load prerequisites'));
  }, []);

  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return; }
    setLoading(true);
    api.get(`/students?class_id=${selectedClassId}`)
      .then(res => {
        setStudents(res.data);
        const initialMarks: Record<string, string> = {};
        res.data.forEach((s: Student) => initialMarks[s.id] = '');
        setMarks(initialMarks);
      })
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleSaveGrades = async () => {
    if (!selectedExamId || !selectedSubjectId || !selectedClassId) {
      toast.error('Please select an exam, class, and subject.');
      return;
    }

    const payload = {
      exam_id: selectedExamId,
      subject_id: selectedSubjectId,
      class_id: selectedClassId,
      results: Object.entries(marks)
        .filter(([_, mark]) => mark !== '' && !isNaN(Number(mark)))
        .map(([student_id, marks_obtained]) => ({ student_id, marks_obtained: parseFloat(marks_obtained) }))
    };

    if (payload.results.length === 0) {
      toast.error('Please enter marks for at least one student.');
      return;
    }

    setIsSaving(true);
    try {
      // Calls Phase 6.1 Backend Endpoint
      await api.post('/exams/grades/bulk', payload);
      toast.success(`Grades saved for ${payload.results.length} students.`);
    } catch (error) {
      toast.error('Failed to save grades');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Context for Grade Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Exam</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Enter Marks</CardTitle>
          <Button onClick={handleSaveGrades} disabled={isSaving || !selectedExamId || !selectedSubjectId} className="bg-green-600 hover:bg-green-700">
            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Grades
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : students.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Select a class to load students.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-32 text-right">Marks (0-100)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                    <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        className="w-24 ml-auto text-right"
                        value={marks[student.id] || ''}
                        onChange={e => setMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}