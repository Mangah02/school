// apps/web/src/components/cbt/proctoring-dashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Eye, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';
import api from '@/lib/api';

interface ActiveSession {
  id: string;
  student: { first_name: string; last_name: string; admission_number: string };
  exam_title: string;
  progress_percent: number;
  answered_count: number;
  total_questions: number;
  warnings: number; // Tab switches, etc.
  status: string;
}

export function ProctoringDashboard() {
  const { socket } = useSocket();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Mocked list of active exams for the dropdown
  const activeExams = [
    { id: 'exam-1', title: 'Grade 8 Math Term 1 Final' },
    { id: 'exam-2', title: 'Grade 7 English CAT 2' }
  ];

  // 1. Fetch initial active sessions
  useEffect(() => {
    if (!selectedExamId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/cbt/proctoring?exam_id=${selectedExamId}`)
      .then(res => setSessions(res.data))
      .catch(() => toast.error('Failed to load proctoring data'))
      .finally(() => setLoading(false));
  }, [selectedExamId]);

  // 2. Listen for real-time proctoring events via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleProctoringEvent = (data: any) => {
      setSessions(prev => prev.map(s => 
        s.id === data.session_id 
          ? { ...s, warnings: s.warnings + 1 } 
          : s
      ));
      // Optional: Play a sound or show a global toast for severe violations
      if (data.event_type === 'TAB_SWITCH') {
         toast.warning(`Warning: Student ${data.student_name} switched tabs!`);
      }
    };

    socket.on('cbt:proctoring_event', handleProctoringEvent);

    return () => {
      socket.off('cbt:proctoring_event', handleProctoringEvent);
    };
  }, [socket]);

  const handleForceSubmit = async (sessionId: string) => {
    try {
      await api.post(`/cbt/sessions/${sessionId}/force-submit`);
      toast.success('Student session forcefully terminated.');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      toast.error('Failed to terminate session.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> Live Proctoring Dashboard</CardTitle>
          <select 
            className="border rounded-md p-2 text-sm"
            onChange={(e) => setSelectedExamId(e.target.value)}
            value={selectedExamId || ''}
          >
            <option value="">Select an active exam to monitor...</option>
            {activeExams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
          </select>
        </CardHeader>
        <CardContent>
          {!selectedExamId ? (
            <p className="text-center text-gray-500 py-10">Select an exam from the dropdown to begin monitoring.</p>
          ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                  <TableHead className="text-center">AI Warnings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">No active sessions for this exam.</TableCell></TableRow>
                ) : (
                  sessions.map(session => (
                    <TableRow key={session.id} className={session.warnings > 2 ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{session.student.first_name} {session.student.last_name}</TableCell>
                      <TableCell className="font-mono text-sm">{session.student.admission_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={session.progress_percent} className="h-2" />
                          <span className="text-xs text-gray-500">{session.answered_count}/{session.total_questions}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {session.warnings > 0 ? (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertTriangle className="mr-1 h-3 w-3" /> {session.warnings}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Clean</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-100 hover:text-red-700"
                          onClick={() => handleForceSubmit(session.id)}
                          title="Force Submit & Terminate Session"
                        >
                          Terminate
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