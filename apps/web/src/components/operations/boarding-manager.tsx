// apps/web/src/components/operations/boarding-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BedDouble, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function BoardingManager() {
  const [dormitoryId, setDormitoryId] = useState('');
  const [session, setSession] = useState('EVENING');
  const [recordsText, setRecordsText] = useState(''); // Format: studentId:STATUS,studentId:STATUS
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRollCall = async () => {
    if (!dormitoryId) { toast.error('Select a dormitory'); return; }
    
    // Parse simple text format for bulk entry
    const records = recordsText.split('\n').filter(Boolean).map(line => {
      const [student_id, status] = line.split(':').map(s => s.trim());
      return { student_id, status: status || 'PRESENT' };
    });

    if (records.length === 0) { toast.error('Enter at least one record'); return; }

    setIsSubmitting(true);
    try {
      const res = await api.post('/boarding/roll-call', { dormitory_id: dormitoryId, session, records });
      toast.success(`Roll call saved. ${res.data.records_marked} students marked.`);
      setRecordsText('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save roll call');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><ClipboardCheck className="h-5 w-5 text-blue-600" /> Mark Dormitory Roll Call</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Dormitory</Label>
            <Input value={dormitoryId} onChange={e => setDormitoryId(e.target.value)} placeholder="Dormitory UUID" />
          </div>
          <div>
            <Label>Session</Label>
            <Select value={session} onValueChange={setSession}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MORNING">Morning</SelectItem>
                <SelectItem value="EVENING">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Attendance Records (One per line: `student_uuid:STATUS`)</Label>
          <Textarea 
            className="min-h-[200px] font-mono text-sm"
            value={recordsText} 
            onChange={e => setRecordsText(e.target.value)} 
            placeholder={`uuid-123:PRESENT\nuuid-456:ABSENT\nuuid-789:SICK`}
          />
          <p className="text-xs text-gray-500 mt-1">Statuses: PRESENT, ABSENT, SICK, PERMISSION</p>
        </div>

        <Button onClick={handleRollCall} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <BedDouble className="mr-2 h-4 w-4" />}
          Save Roll Call
        </Button>
      </CardContent>
    </Card>
  );
}