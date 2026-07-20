// apps/web/src/components/billing/saas-payment-reconciliation.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface StuckSaasPayment {
  id: string;
  school: { name: string; kms_code: string };
  amount: number;
  payment_method: string; // STRIPE, MPESA_PAYBILL
  external_ref: string; // Stripe ID or MPESA TransID
  created_at: string;
}

export function SaasPaymentReconciliation() {
  const [payments, setPayments] = useState<StuckSaasPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<StuckSaasPayment | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/saas-reconciliation/pending');
      setPayments(res.data);
    } catch (error) { toast.error('Failed to load SaaS reconciliation queue'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleManualConfirm = async () => {
    if (!selectedPayment) return;
    
    // Validate MPESA receipt format if it's an MPESA payment
    if (selectedPayment.payment_method === 'MPESA_PAYBILL' && !receiptNumber.match(/^[A-Z0-9]{10}$/)) {
      toast.error('Invalid Safaricom Receipt Format. Must be 10 alphanumeric characters.');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post('/billing/saas-reconciliation/confirm', {
        payment_id: selectedPayment.id,
        manual_receipt: receiptNumber.toUpperCase() || selectedPayment.external_ref
      });
      toast.success('SaaS payment confirmed. School subscription activated.');
      setIsConfirmOpen(false);
      fetchPending();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to confirm payment');
    } finally { setIsProcessing(false); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" /> Stuck SaaS Payments
          </CardTitle>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {payments.length} Pending Webhooks
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>External Ref</TableHead>
                  <TableHead>Initiated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-green-600 py-6 font-medium">All clear! No stuck SaaS payments.</TableCell></TableRow>
                ) : (
                  payments.map(p => (
                    <TableRow key={p.id} className="bg-orange-50/30">
                      <TableCell className="font-medium">{p.school.name} <span className="text-xs text-gray-500">({p.school.kms_code})</span></TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.payment_method === 'STRIPE' ? 'Stripe' : 'MPESA Paybill'}</Badge>
                      </TableCell>
                      <TableCell className="font-bold">KES {p.amount.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{p.external_ref}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(p.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => { setSelectedPayment(p); setIsConfirmOpen(true); }}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Confirm
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
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-green-600" /> Confirm SaaS Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Verify the payment for <strong>{selectedPayment?.school.name}</strong>. 
              {selectedPayment?.payment_method === 'MPESA_PAYBILL' && ' Enter the 10-character Safaricom receipt number from the parent\'s SMS.'}
            </p>
            {selectedPayment?.payment_method === 'MPESA_PAYBILL' && (
              <div>
                <Label>Safaricom Receipt Number (10 chars)</Label>
                <Input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} placeholder="e.g. QFG3456789" maxLength={10} className="uppercase" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleManualConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Confirm & Activate School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}