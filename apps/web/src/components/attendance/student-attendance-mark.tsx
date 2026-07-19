// apps/web/src/components/attendance/student-attendance-mark.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, Save, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { QrScannerDialog } from './qr-scanner-dialog';

interface Student { id: string; first_name: string; last_name: string; admission_number: string; }
interface AttendanceRecord { student_id: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; }

export function StudentAttendanceMark() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. Fetch Classes
  useEffect(() => {
    api.get('/academic/classes').then(res => setClasses(res.data)).catch(() => toast.error('Failed to load classes'));
  }, []);

  // 2. Fetch Students when Stream changes
  useEffect(() => {
    if (!selectedStreamId) return;
    setLoading(true);
    api.get(`/students?stream_id=${selectedStreamId}`)
      .then(res => {
        setStudents(res.data);
        // Initialize all as unmarked
        const initialRecords: Record<string, any> = {};
        res.data.forEach((s: Student) => initialRecords[s.id] = 'UNMARKED');
        setRecords(initialRecords);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [selectedStreamId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const updateStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedStreamId) return;
    setIsSaving(true);
    
    // Filter out unmarked students
    const payload = {
      date: new Date().toISOString().split('T')[0],
      stream_id: selectedStreamId,
      records: Object.entries(records)
        .filter(([_, status]) => status !== 'UNMARKED')
        .map(([student_id, status]) => ({ student_id, status }))
    };

    if (payload.records.length === 0) {
      toast.error('Please mark at least one student.');
      setIsSaving(false);
      return;
    }

    try {
      // This request will be intercepted by our OfflineSyncProvider if the network is down!
      await api.post('/attendance/bulk', payload);
      toast.success(`Attendance saved for ${payload.records.length} students.`);
    } catch (error) {
      toast.error('Failed to save attendance. It has been queued for offline sync.');
    } finally {
      setIsSaving(false);
    }
  };

  // Callback when QR scanner successfully scans a student
  const handleQrScanSuccess = (admissionNumber: string) => {
    const student = students.find(s => s.admission_number === admissionNumber);
    if (student) {
      updateStatus(student.id, 'PRESENT');
      toast.success(`Marked ${student.first_name} ${student.last_name} as PRESENT via QR.`);
    } else {
      toast.error(`Student with Admission No. ${admissionNumber} not found in this class.`);
    }
  };

  const presentCount = Object.values(records).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(records).filter(s => s === 'ABSENT').length;

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
              {selectedClass?.streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={() => setIsScannerOpen(true)} disabled={!selectedStreamId}>
            <Camera className="mr-2 h-4 w-4" /> Scan QR
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Mark Attendance</CardTitle>
            <p className="text-sm text-gray-500">Today: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Present: {presentCount}</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="mr-1 h-3 w-3" /> Absent: {absentCount}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : !selectedStreamId ? (
            <p className="text-center text-gray-500 py-10">Select a class and stream to begin.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => {
                    const status = records[student.id];
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button 
                              size="sm" 
                              variant={status === 'PRESENT' ? 'default' : 'outline'} 
                              className={status === 'PRESENT' ? 'bg-green-600 hover:bg-green-700' : ''}
                              onClick={() => updateStatus(student.id, 'PRESENT')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant={status === 'LATE' ? 'default' : 'outline'} 
                              className={status === 'LATE' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                              onClick={() => updateStatus(student.id, 'LATE')}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant={status === 'ABSENT' ? 'default' : 'outline'} 
                              className={status === 'ABSENT' ? 'bg-red-600 hover:bg-red-700' : ''}
                              onClick={() => updateStatus(student.id, 'ABSENT')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmitAttendance} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                  {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  Submit Attendance
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <QrScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleQrScanSuccess} 
      />
    </>
  );
}