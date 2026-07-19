// apps/web/src/components/finance/reconciliation-workbench.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface StuckPayment {
  id: string;
  amount: number;
  phone_number: string;
  created_at: string;
  invoice: { student: { first_name: string, last_name: string } };
}

export function ReconciliationWorkbench() {
  const [payments, setPayments] = useState<StuckPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<StuckPayment | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [justification, setJustification] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/reconciliation/pending');
      setPayments(res.data);
    } catch (error) { toast.error('Failed to load reconciliation queue'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleManualConfirm = async () => {
    if (!receiptNumber.match(/^[A-Z0-9]{10}$/)) {
      toast.error('Invalid Safaricom Receipt Format. Must be 10 alphanumeric characters (e.g., QFG3456789).');
      return;
    }
    setIsProcessing(true);
    try {
      await api.post('/finance/reconciliation/confirm', {
        payment_id: selectedPayment?.id,
        mpesa_receipt: receiptNumber.toUpperCase(),
        justification
      });
      toast.success('Payment manually confirmed and journals posted.');
      setIsConfirmOpen(false);
      fetchPending();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to confirm payment');
    } finally { setIsProcessing(false); }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject and cancel this payment record?')) return;
    try {
      await api.post('/finance/reconciliation/reject', { payment_id: id, reason: 'Rejected via Workbench' });
      toast.success('Payment rejected.');
      fetchPending();
    } catch (error) { toast.error('Failed to reject payment'); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" /> Reconciliation Workbench
          </CardTitle>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {payments.length} Stuck Payments
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Initiated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-green-600 py-6 font-medium">All clear! No stuck payments.</TableCell></TableRow>
                ) : (
                  payments.map(p => (
                    <TableRow key={p.id} className="bg-orange-50/30">
                      <TableCell className="font-medium">{p.invoice.student.first_name} {p.invoice.student.last_name}</TableCell>
                      <TableCell className="font-mono text-sm">{p.phone_number}</TableCell>
                      <TableCell className="font-bold">KES {p.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(p.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => { setSelectedPayment(p); setIsConfirmOpen(true); }}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => handleReject(p.id)}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
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

      {/* Manual Confirm Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Confirm MPESA Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">Verify the payment via the parent's SMS and enter the Safaricom receipt details below.</p>
            <div>
              <Label>Safaricom Receipt Number (10 chars)</Label>
              <Input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} placeholder="e.g. QFG3456789" maxLength={10} className="uppercase" />
            </div>
            <div>
              <Label>Justification / SMS Sender</Label>
              <Input value={justification} onChange={e => setJustification(e.target.value)} placeholder="Confirmed via parent SMS" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleManualConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Confirm & Post Journals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}