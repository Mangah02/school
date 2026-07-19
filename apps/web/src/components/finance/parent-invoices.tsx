// apps/web/src/components/finance/parent-invoices.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Invoice {
  id: string;
  total_amount: number;
  paid_amount: number;
  waived_amount: number;
  status: string;
  due_date: string;
  term: { name: string };
}

export function ParentInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // MPESA STK State
  const [isStkOpen, setIsStkOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stkStatus, setStkStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>('IDLE');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/invoices/my-invoices'); // OwnershipGuard filters this
      setInvoices(res.data);
    } catch (error) { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const openStkModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const outstanding = invoice.total_amount - invoice.paid_amount - invoice.waived_amount;
    setAmount(outstanding.toString());
    setStkStatus('IDLE');
    setIsStkOpen(true);
  };

  const initiateStkPush = async () => {
    if (!phoneNumber.match(/^(?:\+?254|0)?7\d{8}$/)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678).');
      return;
    }
    setIsProcessing(true);
    setStkStatus('PENDING');
    try {
      // Calls Phase 7.3 Backend (Triggers Daraja STK Push)
      await api.post('/finance/payments/mpesa-stk', {
        invoice_id: selectedInvoice?.id,
        phone_number: phoneNumber,
        amount: parseFloat(amount)
      });
      
      toast.info('STK Push sent! Please enter your MPESA PIN on your phone.');
      
      // Poll for status (Simplified for UI. In prod, this could be a WebSocket/Socket.io event)
      pollPaymentStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate STK Push.');
      setStkStatus('FAILED');
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async () => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/finance/payments/status?invoice_id=${selectedInvoice?.id}`);
        if (res.data.status === 'SUCCESS') {
          setStkStatus('SUCCESS');
          toast.success('Payment received successfully!');
          clearInterval(interval);
          setIsProcessing(false);
          fetchInvoices(); // Refresh table
        } else if (res.data.status === 'FAILED') {
          setStkStatus('FAILED');
          toast.error('Payment failed or cancelled.');
          clearInterval(interval);
          setIsProcessing(false);
        }
      } catch (e) {}
      if (attempts > 12) { // Stop polling after 1 minute
        clearInterval(interval);
        if (stkStatus === 'PENDING') setStkStatus('IDLE'); 
        setIsProcessing(false);
      }
    }, 5000); // Poll every 5 seconds
  };

  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Outstanding Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => {
                  const balance = inv.total_amount - inv.paid_amount - inv.waived_amount;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.term.name}</TableCell>
                      <TableCell>{formatCurrency(inv.total_amount)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(inv.paid_amount)}</TableCell>
                      <TableCell className="font-bold text-red-600">{formatCurrency(balance)}</TableCell>
                      <TableCell>{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'PAID' ? 'default' : inv.status === 'PARTIAL' ? 'secondary' : 'destructive'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {balance > 0 && (
                          <Button size="sm" onClick={() => openStkModal(inv)} className="bg-green-600 hover:bg-green-700">
                            <Smartphone className="mr-1 h-3 w-3" /> Pay via MPESA
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MPESA STK Push Modal */}
      <Dialog open={isStkOpen} onOpenChange={setIsStkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Smartphone className="h-5 w-5" /> Pay via MPESA (STK Push)
            </DialogTitle>
          </DialogHeader>
          
          {stkStatus === 'IDLE' || stkStatus === 'FAILED' ? (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p>Paying for: <strong>{selectedInvoice?.term.name}</strong></p>
                <p>Outstanding Balance: <strong className="text-red-600">{formatCurrency(parseFloat(amount || '0'))}</strong></p>
              </div>
              <div>
                <Label>MPESA Phone Number</Label>
                <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="0712345678" />
              </div>
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
          ) : stkStatus === 'PENDING' ? (
            <div className="py-10 text-center space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-green-600" />
              <p className="font-semibold text-lg">Waiting for MPESA...</p>
              <p className="text-sm text-gray-500">Please enter your MPESA PIN on your phone to complete the transaction.</p>
            </div>
          ) : (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="font-semibold text-lg text-green-700">Payment Successful!</p>
              <p className="text-sm text-gray-500">Your invoice has been updated.</p>
            </div>
          )}

          <DialogFooter>
            {stkStatus === 'IDLE' && (
              <Button onClick={initiateStkPush} disabled={isProcessing} className="w-full bg-green-600 hover:bg-green-700">
                {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                Initiate STK Push
              </Button>
            )}
            {(stkStatus === 'SUCCESS' || stkStatus === 'FAILED') && (
              <Button onClick={() => setIsStkOpen(false)} className="w-full">Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}