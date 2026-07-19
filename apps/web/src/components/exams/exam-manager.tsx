// apps/web/src/components/exams/exam-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Exam { id: string; name: string; type: string; start_date: string; end_date: string; }

export function ExamManager() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'CAT', start_date: '', end_date: '' });

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch (error) { toast.error('Failed to load exams'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);

  const handleSave = async () => {
    try {
      await api.post('/exams', formData);
      toast.success('Exam created successfully');
      setIsDialogOpen(false);
      fetchExams();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create exam'); }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Scheduled Exams</h2>
        <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Schedule Exam</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-6">No exams scheduled yet.</TableCell></TableRow>
                ) : (
                  exams.map(exam => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>{exam.type}</TableCell>
                      <TableCell>{new Date(exam.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(exam.end_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule New Exam</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Exam Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. End of Term 1" /></div>
            <div><Label>Type</Label><Input value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="CAT, FINAL, CBC_ASSESSMENT" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}