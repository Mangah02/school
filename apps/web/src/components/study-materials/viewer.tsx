// apps/web/src/components/study-materials/viewer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Video, Link2, Download, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Material {
  id: string;
  title: string;
  description?: string;
  file_type: string;
  file_url: string;
  subject?: { name: string };
  created_at: string;
}

export function StudyMaterialsViewer() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [matRes, subRes] = await Promise.all([
          api.get('/study-materials/student-view'), // Backend filters by student's class/visibility
          api.get('/academic/subjects')
        ]);
        setMaterials(matRes.data);
        setSubjects(subRes.data);
      } catch (error) { toast.error('Failed to load materials'); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filteredMaterials = materials.filter(mat => {
    const matchesSearch = mat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          mat.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'ALL' || mat.subject?.name === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const getFileIcon = (type: string) => {
    if (type === 'VIDEO') return <Video className="h-8 w-8 text-purple-500" />;
    if (type === 'LINK') return <Link2 className="h-8 w-8 text-blue-500" />;
    return <FileText className="h-8 w-8 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search materials..." 
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filteredMaterials.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">No study materials found matching your criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(mat => (
            <Card key={mat.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  {getFileIcon(mat.file_type)}
                  <Badge variant="outline" className="text-xs">{mat.file_type}</Badge>
                </div>
                <CardTitle className="text-lg mt-3 line-clamp-2">{mat.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {mat.subject && (
                  <p className="text-sm text-blue-600 font-medium mb-2">{mat.subject.name}</p>
                )}
                <p className="text-sm text-gray-500 line-clamp-3 flex-1">{mat.description || 'No description provided.'}</p>
                
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(mat.created_at).toLocaleDateString()}
                  </span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => window.open(mat.file_url, '_blank')}>
                    <Download className="mr-2 h-3 w-3" /> View / Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}