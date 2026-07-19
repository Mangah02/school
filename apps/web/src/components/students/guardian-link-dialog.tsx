// apps/web/src/components/students/guardian-link-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, Link2 } from 'lucide-react';
import api from '@/lib/api';
import { Student } from '@/app/(dashboard)/dashboard/students/page';
import { toast } from 'sonner';

interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  relationship: string;
}

interface Props {
  student: Student;
  onClose: () => void;
  onSuccess: () => void;
}

export function GuardianLinkDialog({ student, onClose, onSuccess }: Props) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // New Guardian Form State
  const [newGuardian, setNewGuardian] = useState({ first_name: '', last_name: '', phone: '', relationship: 'FATHER' });

  useEffect(() => {
    // Fetch existing guardians in the school to link
    const fetchGuardians = async () => {
      try {
        const res = await api.get('/guardians');
        setGuardians(res.data);
      } catch (error) { console.error(error); }
    };
    fetchGuardians();
  }, []);

  const handleLinkExisting = async () => {
    if (!selectedGuardianId) return;
    setIsLoading(true);
    try {
      // Calls Phase 5.4 Backend Endpoint
      await api.post(`/students/${student.id}/guardians`, { 
        guardian_id: selectedGuardianId,
        is_primary: false 
      });
      onSuccess();
      onClose();
    } catch (error) {
         toast.error('Failed to link guardian. They may already be linked.'); 
        } finally { setIsLoading(false); }
  };

  const handleCreateAndLink = async () => {
    setIsLoading(true);
    try {
      // 1. Create Guardian
      const res = await api.post('/guardians', newGuardian);
      const newId = res.data.id;
      
      // 2. Link to Student
      await api.post(`/students/${student.id}/guardians`, { 
        guardian_id: newId,
        is_primary: true 
      });
      
      onSuccess();
      onClose();
    } catch (error) { 
        toast.error('Failed to create or link guardian.');

    } finally { setIsLoading(false); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" /> Link Guardian to {student.first_name} {student.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Option 1: Link Existing */}
          <div className="space-y-2 border-b pb-4">
            <Label className="text-base font-semibold">Link Existing Guardian</Label>
            <Select onValueChange={setSelectedGuardianId}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select a guardian..." />
              </SelectTrigger>
              <SelectContent>
                {guardians.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.first_name} {g.last_name} ({g.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleLinkExisting} 
              disabled={!selectedGuardianId || isLoading} 
              className="w-full mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
              Link Selected Guardian
            </Button>
          </div>

          {/* Option 2: Create New */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Or Register New Guardian</Label>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(!isCreating)}>
                {isCreating ? 'Cancel' : <><UserPlus className="mr-1 h-3 w-3" /> New</>}
              </Button>
            </div>
            
            {isCreating && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="First Name" value={newGuardian.first_name} onChange={e => setNewGuardian({...newGuardian, first_name: e.target.value})} />
                  <Input placeholder="Last Name" value={newGuardian.last_name} onChange={e => setNewGuardian({...newGuardian, last_name: e.target.value})} />
                </div>
                <Input placeholder="Phone Number (e.g., 0712345678)" value={newGuardian.phone} onChange={e => setNewGuardian({...newGuardian, phone: e.target.value})} />
                <Select value={newGuardian.relationship} onValueChange={val => setNewGuardian({...newGuardian, relationship: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FATHER">Father</SelectItem>
                    <SelectItem value="MOTHER">Mother</SelectItem>
                    <SelectItem value="GUARDIAN">Guardian</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateAndLink} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700">
                  {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Register & Link as Primary
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}