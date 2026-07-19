// apps/web/src/components/exams/report-card-generator.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ReportCardGenerator() {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);

  // Mocked data for dropdowns (in production, fetch from /exams and /classes)
  const exams = [{ id: '1', name: 'Term 1 Final Exams' }];
  const classes = [{ id: '1', name: 'Grade 7' }];

  const handleGenerate = async () => {
    if (!selectedExamId || !selectedClassId) {
      toast.error('Please select an exam and a class.');
      return;
    }

    setIsGenerating(true);
    try {
      // Calls Phase 6.2 Backend Endpoint (Triggers BullMQ Puppeteer Job)
      const res = await api.post('/reports/generate', {
        exam_id: selectedExamId,
        class_id: selectedClassId
      });
      
      toast.success(res.data.message || 'Report card generation started in background.');
      
      // Simulate fetching the completed reports (In prod, you'd poll or use WebSockets)
      setTimeout(() => {
        setGeneratedReports([
          { id: '1', student_name: 'John Doe', file_url: '/mock-reports/john_doe.pdf' },
          { id: '2', student_name: 'Jane Smith', file_url: '/mock-reports/jane_smith.pdf' },
        ]);
        setIsGenerating(false);
      }, 2000);

    } catch (error) {
      toast.error('Failed to trigger report generation.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Report Cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Exam</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700">
            {isGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate PDF Report Cards
          </Button>
          <p className="text-xs text-gray-500">This runs in the background. You will see the files appear below once ready.</p>
        </CardContent>
      </Card>

      {generatedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedReports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">{report.student_name}</p>
                      <p className="text-xs text-gray-500">Term 1 Report Card</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" title="View"><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Download"><Download className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}