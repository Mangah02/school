// apps/web/src/components/student-portal/student-library.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface BookLoan {
  id: string;
  book: { title: string; author: string; barcode: string };
  borrow_date: string;
  due_date: string;
  status: string;
  fine_amount: number;
}

export function StudentLibrary() {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/library/my-loans')
      .then(res => setLoans(res.data))
      .catch(() => toast.error('Failed to load library status'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-600" /> My Borrowed Books</CardTitle>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <p className="text-center text-gray-500 py-6">You don't have any borrowed books.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Borrowed On</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map(loan => {
                const isOverdue = new Date(loan.due_date) < new Date() && loan.status !== 'RETURNED';
                return (
                  <TableRow key={loan.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                    <TableCell className="font-medium">{loan.book.title}</TableCell>
                    <TableCell>{loan.book.author}</TableCell>
                    <TableCell>{new Date(loan.borrow_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(loan.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={isOverdue ? 'destructive' : loan.status === 'RETURNED' ? 'secondary' : 'default'}>
                        {isOverdue ? 'OVERDUE' : loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={loan.fine_amount > 0 ? 'text-red-600 font-bold' : ''}>
                      {loan.fine_amount > 0 ? `KES ${loan.fine_amount}` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}