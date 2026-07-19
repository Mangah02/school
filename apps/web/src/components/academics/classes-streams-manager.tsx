// apps/web/src/components/academics/classes-streams-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Stream { id: string; name: string; capacity: number; }
interface ClassItem { id: string; name: string; level: number; streams: Stream[]; }

export function ClassesStreamsManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formData, setFormData] = useState({ name: '', level: '', streams: '' });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/classes');
      setClasses(res.data);
    } catch (error) { toast.error('Failed to load classes'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleOpenDialog = (cls?: ClassItem) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({ 
        name: cls.name, 
        level: cls.level.toString(), 
        streams: cls.streams.map(s => s.name).join(', ') 
      });
    } else {
      setEditingClass(null);
      setFormData({ name: '', level: '', streams: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        level: parseInt(formData.level),
        streams: formData.streams.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name, capacity: 40 }))
      };

      if (editingClass) {
        await api.put(`/academic/classes/${editingClass.id}`, payload);
        toast.success('Class updated successfully');
      } else {
        await api.post('/academic/classes', payload);
        toast.success('Class created successfully');
      }
      setIsDialogOpen(false);
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save class');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Classes & Streams</h2>
        <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" /> Add Class</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Streams</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.level}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {cls.streams.map(s => (
                          <span key={s.id} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">
                            {s.name} (Cap: {s.capacity})
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cls)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Class Name (e.g., Grade 7)</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <Label>Level (e.g., 7)</Label>
              <Input type="number" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} />
            </div>
            <div>
              <Label>Streams (Comma separated, e.g., North, South, East)</Label>
              <Input value={formData.streams} onChange={e => setFormData({...formData, streams: e.target.value})} placeholder="North, South" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}