// apps/web/src/components/student-portal/student-grades.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ExamResult {
  id: string;
  exam: { name: string; term: { name: string } };
  subject: { name: string; code: string };
  marks_obtained: number;
  max_marks: number;
  grade: string;
}

export function StudentGrades() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exams/results/my-results')
      .then(res => setResults(res.data))
      .catch(() => toast.error('Failed to load grades'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No exam results available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(res => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.exam.name}</TableCell>
                    <TableCell>{res.subject.name} ({res.subject.code})</TableCell>
                    <TableCell>{res.marks_obtained} / {res.max_marks}</TableCell>
                    <TableCell>
                      <Badge variant={res.marks_obtained >= 50 ? 'default' : 'destructive'}>
                        {res.grade || (res.marks_obtained >= 50 ? 'PASS' : 'FAIL')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Download Report Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold">PDF</div>
                <div>
                  <p className="font-medium text-sm">Term 1 Report Card</p>
                  <p className="text-xs text-gray-500">Released: May 2026</p>
                </div>
              </div>
              <Button size="icon" variant="ghost"><Download className="h-4 w-4" /></Button>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}