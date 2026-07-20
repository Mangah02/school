// apps/web/src/components/operations/transport-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus, AlertTriangle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function TransportManager() {
  const [routeId, setRouteId] = useState('');
  const [delayMinutes, setDelayMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleDelayBroadcast = async () => {
    if (!routeId || !delayMinutes || !reason) {
      toast.error('Please fill in all delay details.');
      return;
    }
    setIsSending(true);
    try {
      const res = await api.post(`/transport/routes/${routeId}/delay`, {
        delay_minutes: parseInt(delayMinutes),
        reason
      });
      toast.success(`Delay alert sent to ${res.data.notifications_sent} parents!`);
      setDelayMinutes('');
      setReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to broadcast delay');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-orange-700">
          <AlertTriangle className="h-5 w-5" /> Broadcast Bus Delay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">Trigger an immediate SMS alert to all primary guardians of students assigned to this route.</p>
        
        <div>
          <Label>Select Route</Label>
          <Input value={routeId} onChange={e => setRouteId(e.target.value)} placeholder="Enter Route UUID" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Delay (Minutes)</Label>
            <Input type="number" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)} placeholder="e.g. 30" />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Heavy traffic on Mombasa Rd" />
          </div>
        </div>

        <Button onClick={handleDelayBroadcast} disabled={isSending} className="w-full bg-orange-600 hover:bg-orange-700">
          {isSending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
          Send SMS Alerts via BullMQ
        </Button>
      </CardContent>
    </Card>
  );
}