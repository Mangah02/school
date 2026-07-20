// apps/web/src/components/operations/library-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function LibraryManager() {
  const [action, setAction] = useState<'BORROW' | 'RETURN'>('BORROW');
  const [bookId, setBookId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    setIsProcessing(true);
    setResult(null);
    try {
      if (action === 'BORROW') {
        const res = await api.post('/library/borrow', { book_id: bookId, student_id: studentId, due_days: 14 });
        setResult(res.data);
        toast.success('Book borrowed successfully');
      } else {
        const res = await api.post(`/library/return/${loanId}`);
        setResult(res.data);
        toast.success(res.data.fine_amount > 0 ? `Book returned. Fine: KES ${res.data.fine_amount}` : 'Book returned');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><ArrowRightLeft className="h-5 w-5 text-blue-600" /> Book Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={action === 'BORROW' ? 'default' : 'outline'} onClick={() => setAction('BORROW')}>Borrow</Button>
            <Button variant={action === 'RETURN' ? 'default' : 'outline'} onClick={() => setAction('RETURN')}>Return</Button>
          </div>

          {action === 'BORROW' ? (
            <>
              <div><Label>Book ID / Barcode</Label><Input value={bookId} onChange={e => setBookId(e.target.value)} placeholder="Scan or enter Book UUID" /></div>
              <div><Label>Student ID / Admission No</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Scan or enter Student UUID" /></div>
            </>
          ) : (
            <div><Label>Loan ID</Label><Input value={loanId} onChange={e => setLoanId(e.target.value)} placeholder="Enter Loan UUID" /></div>
          )}

          <Button onClick={handleSubmit} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700">
            {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <BookOpen className="mr-2 h-4 w-4" />}
            Process {action}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Transaction Result</CardTitle></CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-3">
              <p className="font-medium">{result.message}</p>
              {result.fine_amount > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-bold">Overdue Fine: KES {result.fine_amount}</p>
                  <p className="text-xs text-red-600">Calculated at KES 50 per day overdue.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Process a borrow or return transaction to see the result here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}