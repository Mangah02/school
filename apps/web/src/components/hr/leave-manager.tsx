// apps/web/src/components/hr/leave-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, XCircle, Loader2, CalendarOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface LeaveRequest {
  id: string;
  staff: { first_name: string; last_name: string; employee_id: string };
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

export function LeaveManager() {
  const { user } = useAuthStore();
  const isHrRole = ['super_admin', 'school_admin', 'hr_officer'].includes(user?.role || '');
  
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ leave_type: 'ANNUAL', start_date: '', end_date: '', reason: '' });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const endpoint = isHrRole ? '/hr/leave/all' : '/hr/leave/my-requests';
      const res = await api.get(endpoint);
      setRequests(res.data);
    } catch (error) { toast.error('Failed to load leave requests'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleRequest = async () => {
    try {
      await api.post('/hr/leave/request', formData);
      toast.success('Leave request submitted');
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to submit request'); }
  };

  const handleProcess = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post('/hr/leave/process', { leave_id: id, action });
      toast.success(`Leave ${action.toLowerCase()}d`);
      fetchRequests();
    } catch (error) { toast.error('Failed to process leave'); }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    if (status === 'REJECTED') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Leave Requests</h2>
        <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Request Leave</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {isHrRole && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-6">No leave requests found.</TableCell></TableRow>
                ) : (
                  requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.staff.first_name} {req.staff.last_name}</TableCell>
                      <TableCell><Badge variant="outline">{req.leave_type}</Badge></TableCell>
                      <TableCell>{new Date(req.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(req.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[150px] truncate">{req.reason}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      {isHrRole && (
                        <TableCell className="text-right space-x-2">
                          {req.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => handleProcess(req.id, 'APPROVE')}>
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => handleProcess(req.id, 'REJECT')}>
                                <XCircle className="mr-1 h-3 w-3" /> Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarOff className="h-5 w-5" /> Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Leave Type</Label>
              <Select value={formData.leave_type} onValueChange={val => setFormData({...formData, leave_type: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                  <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
            </div>
            <div><Label>Reason</Label><Input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Brief reason for leave" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequest} className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}