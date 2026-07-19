// apps/web/src/components/study-materials/manager.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, Video, Link2, Loader2, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Material {
  id: string;
  title: string;
  file_type: string; // PDF, DOC, VIDEO, LINK
  file_url: string;
  visibility: string; // CLASS, ALL_STUDENTS, TEACHERS
  class?: { name: string };
  subject?: { name: string };
  created_at: string;
}

export function StudyMaterialsManager() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [fileUrl, setFileUrl] = useState(''); // Used if type is LINK
  const [file, setFile] = useState<File | null>(null);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [visibility, setVisibility] = useState('CLASS');
  const [isUploading, setIsUploading] = useState(false);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, clsRes, subRes] = await Promise.all([
        api.get('/study-materials'),
        api.get('/academic/classes'),
        api.get('/academic/subjects')
      ]);
      setMaterials(matRes.data);
      setClasses(clsRes.data);
      setSubjects(subRes.data);
    } catch (error) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setTitle(''); setDescription(''); setFileType('PDF'); setFileUrl(''); setFile(null);
    setClassId(''); setSubjectId(''); setVisibility('CLASS');
  };

  const handleUpload = async () => {
    if (!title || (fileType === 'LINK' ? !fileUrl : !file)) {
      toast.error('Please fill in all required fields and attach a file/link.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file_type', fileType);
      formData.append('visibility', visibility);
      if (classId) formData.append('class_id', classId);
      if (subjectId) formData.append('subject_id', subjectId);
      
      if (fileType === 'LINK') {
        formData.append('file_url', fileUrl);
      } else if (file) {
        formData.append('file', file);
      }

      // Calls Phase 6.6 Backend Endpoint (MinIO upload handled by backend)
      await api.post('/study-materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Material uploaded and published successfully!');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload material');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await api.delete(`/study-materials/${id}`);
      toast.success('Material deleted');
      fetchData();
    } catch (error) { toast.error('Failed to delete material'); }
  };

  const getFileIcon = (type: string) => {
    if (type === 'VIDEO') return <Video className="h-4 w-4 text-purple-500" />;
    if (type === 'LINK') return <Link2 className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-red-500" />;
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Uploaded Resources</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" /> Upload Material
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject / Class</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">No materials uploaded yet.</TableCell></TableRow>
                ) : (
                  materials.map(mat => (
                    <TableRow key={mat.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {getFileIcon(mat.file_type)} {mat.title}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {mat.subject?.name || 'General'} {mat.class && `• ${mat.class.name}`}
                      </TableCell>
                      <TableCell><Badge variant="outline">{mat.file_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{mat.visibility.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => window.open(mat.file_url, '_blank')} title="View/Download">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(mat.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
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

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Study Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Grade 8 Math Notes - Term 1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief summary of the material" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Resource Type *</Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF Document</SelectItem>
                    <SelectItem value="DOC">Word Document</SelectItem>
                    <SelectItem value="VIDEO">Video Link/File</SelectItem>
                    <SelectItem value="LINK">External URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibility *</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS">Specific Class Only</SelectItem>
                    <SelectItem value="ALL_STUDENTS">All Students</SelectItem>
                    <SelectItem value="TEACHERS">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Linked Class (Optional)</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Any class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Linked Subject (Optional)</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Input Area */}
            {fileType === 'LINK' ? (
              <div>
                <Label>External URL *</Label>
                <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
            ) : (
              <div>
                <Label>Upload File *</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <p className="text-sm font-medium text-blue-600">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to browse or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">Max size: 50MB</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.mp4,.mkv"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={isUploading} className="bg-blue-600 hover:bg-blue-700">
              {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              Publish Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}