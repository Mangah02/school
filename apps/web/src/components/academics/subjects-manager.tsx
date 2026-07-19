// apps/web/src/components/academics/subjects-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Subject { id: string; name: string; code: string; is_cbc: boolean; }

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/subjects');
      setSubjects(res.data);
    } catch (error) { toast.error('Failed to load subjects'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const handleSave = async () => {
    try {
      if (editingSub) {
        await api.put(`/academic/subjects/${editingSub.id}`, formData);
        toast.success('Subject updated');
      } else {
        await api.post('/academic/subjects', formData);
        toast.success('Subject created');
      }
      setIsDialogOpen(false);
      fetchSubjects();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to save subject'); }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Subjects</h2>
        <Button onClick={() => { setEditingSub(null); setFormData({name: '', code: ''}); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Curriculum</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell className="font-mono text-sm">{sub.code}</TableCell>
                    <TableCell>{sub.is_cbc ? 'CBC' : '8-4-4'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingSub(sub); setFormData({name: sub.name, code: sub.code}); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSub ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Subject Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><Label>Subject Code (e.g., MAT101)</Label><Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}