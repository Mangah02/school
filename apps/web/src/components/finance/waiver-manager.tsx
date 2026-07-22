// apps/web/src/components/finance/waiver-manager.tsx
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
import { Scale, Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Waiver {
  id: string;
  waiver_amount: number;
  waiver_percent: number;
  status: string;
  required_approver: string;
  justification: string;
  invoice: { student: { first_name: string, last_name: string }, total_amount: number };
}

interface Props { isFinanceRole: boolean; }

export function WaiverManager({ isFinanceRole }: Props) {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  
  // Request Form
  const [invoiceId, setInvoiceId] = useState('');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [boardResolutionUrl, setBoardResolutionUrl] = useState('');

  const fetchWaivers = async () => {
    setLoading(true);
    try {
      const endpoint = isFinanceRole ? '/finance/waivers/pending' : '/finance/waivers/my-requests';
      const res = await api.get(endpoint);
      setWaivers(res.data);
    } catch (error) { toast.error('Failed to load waivers'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchWaivers(); }, []);

  const handleRequest = async () => {
    try {
      await api.post('/finance/waivers/request', {
        invoice_id: invoiceId,
        waiver_amount: parseFloat(waiverAmount),
        justification,
        board_resolution_url: boardResolutionUrl || undefined
      });
      toast.success('Waiver request submitted for approval.');
      setIsRequestOpen(false);
      fetchWaivers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleProcess = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post('/finance/waivers/process', { waiver_id: id, action });
      toast.success(`Waiver ${action.toLowerCase()}d successfully.`);
      fetchWaivers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action.toLowerCase()} waiver`);
    }
  };

  const getApproverBadge = (approver: string) => {
    if (approver === 'board') return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Board</Badge>;
    if (approver === 'school_admin') return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Principal</Badge>;
    return <Badge variant="outline">Finance</Badge>;
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Fee Waivers</h2>
        {!isFinanceRole && (
          <Button onClick={() => setIsRequestOpen(true)}><Plus className="mr-2 h-4 w-4" /> Request Waiver</Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Waiver Amount</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Required Approver</TableHead>
                  <TableHead>Justification</TableHead>
                  <TableHead>Status</TableHead>
                  {isFinanceRole && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {waivers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-6">No waiver requests found.</TableCell></TableRow>
                ) : (
                  waivers.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.invoice.student.first_name} {w.invoice.student.last_name}</TableCell>
                      <TableCell className="font-bold text-green-700">KES {w.waiver_amount.toLocaleString()}</TableCell>
                      <TableCell>{w.waiver_percent.toFixed(1)}%</TableCell>
                      <TableCell>{getApproverBadge(w.required_approver)}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">{w.justification}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'APPROVED' ? 'default' : w.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      {isFinanceRole && (
                        <TableCell className="text-right space-x-2">
                          {w.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => handleProcess(w.id, 'APPROVE')}>
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => handleProcess(w.id, 'REJECT')}>
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

      {/* Request Waiver Dialog */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-blue-600" /> Request Fee Waiver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Invoice ID</Label>
              <Input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Enter Invoice UUID" />
            </div>
            <div>
              <Label>Waiver Amount (KES)</Label>
              <Input type="number" value={waiverAmount} onChange={e => setWaiverAmount(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">* &gt; 25% requires Principal approval. &gt; 50% requires Board approval.</p>
            </div>
            <div>
              <Label>Justification</Label>
              <Input value={justification} onChange={e => setJustification(e.target.value)} placeholder="Reason for waiver request" />
            </div>
            <div>
              <Label>Board Resolution Document (Required if &gt; 50%)</Label>
              <Input type="url" value={boardResolutionUrl} onChange={e => setBoardResolutionUrl(e.target.value)} placeholder="https://minio.../resolution.pdf" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleRequest} className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}