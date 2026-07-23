// apps/web/src/components/operations/library-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, ArrowRightLeft, Loader2, Plus, Library } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Book {
  id: string;
  title: string;
  author: string;
  barcode: string;
  category: string;
  total_copies: number;
  available_copies: number;
}

export function LibraryManager() {
  // Catalog State
  const [books, setBooks] = useState<Book[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', isbn: '', barcode: '', category: 'General', total_copies: '1' });
  const [isSavingBook, setIsSavingBook] = useState(false);

  // Circulation State
  const [action, setAction] = useState<'BORROW' | 'RETURN'>('BORROW');
  const [bookIdentifier, setBookIdentifier] = useState('');
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [loanId, setLoanId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fetchBooks = async () => {
    setIsCatalogLoading(true);
    try {
      const res = await api.get('/library/books');
      setBooks(res.data);
    } catch (error) {
      toast.error('Failed to load library catalog');
    } finally {
      setIsCatalogLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author) {
      toast.error('Title and Author are required');
      return;
    }
    setIsSavingBook(true);
    try {
      await api.post('/library/books', {
        ...newBook,
        total_copies: parseInt(newBook.total_copies, 10) || 1
      });
      toast.success('Book added to catalog successfully');
      setIsAddBookOpen(false);
      setNewBook({ title: '', author: '', isbn: '', barcode: '', category: 'General', total_copies: '1' });
      fetchBooks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add book');
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleCirculationSubmit = async () => {
    setIsProcessing(true);
    setResult(null);
    try {
      if (action === 'BORROW') {
        const res = await api.post('/library/borrow', { 
          book_id: bookIdentifier, 
          student_id: studentIdentifier, 
          due_days: 14 
        });
        setResult(res.data);
        toast.success('Book borrowed successfully');
        setBookIdentifier('');
        setStudentIdentifier('');
        fetchBooks(); // Refresh catalog to show updated available copies
      } else {
        const res = await api.post(`/library/return/${loanId}`);
        setResult(res.data);
        toast.success(res.data.fine_amount > 0 ? `Book returned. Fine: KES ${res.data.fine_amount}` : 'Book returned');
        setLoanId('');
        fetchBooks(); // Refresh catalog
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Transaction failed';
      toast.error(errorMsg);
      console.error('Circulation error:', error.response?.data);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Tabs defaultValue="catalog" className="space-y-6">
      <TabsList className="bg-white border p-1">
        <TabsTrigger value="catalog" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <Library className="mr-2 h-4 w-4" /> Book Catalog
        </TabsTrigger>
        <TabsTrigger value="circulation" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <ArrowRightLeft className="mr-2 h-4 w-4" /> Circulation (Borrow/Return)
        </TabsTrigger>
      </TabsList>

      {/* TAB 1: BOOK CATALOG */}
      <TabsContent value="catalog">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><Library className="h-5 w-5 text-blue-600" /> Library Inventory</CardTitle>
            <Button onClick={() => setIsAddBookOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add New Book</Button>
          </CardHeader>
          <CardContent>
            {isCatalogLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Barcode / ISBN</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Total Copies</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">No books in catalog. Click "Add New Book" to start.</TableCell></TableRow>
                  ) : (
                    books.map(book => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell className="font-mono text-xs">{book.barcode || book.isbn || 'N/A'}</TableCell>
                        <TableCell>{book.category}</TableCell>
                        <TableCell className="text-center">{book.total_copies}</TableCell>
                        <TableCell className="text-center font-bold text-green-700">{book.available_copies}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 2: CIRCULATION */}
      <TabsContent value="circulation">
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
                  <div>
                    <Label>Book Barcode, ISBN, or ID</Label>
                    <Input 
                      value={bookIdentifier} 
                      onChange={e => setBookIdentifier(e.target.value)} 
                      placeholder="e.g., 978-3-16-148410-0 or LIB-123" 
                    />
                  </div>
                  <div>
                    <Label>Student Admission No or ID</Label>
                    <Input 
                      value={studentIdentifier} 
                      onChange={e => setStudentIdentifier(e.target.value)} 
                      placeholder="e.g., SCH/2024/0001" 
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label>Loan ID</Label>
                  <Input 
                    value={loanId} 
                    onChange={e => setLoanId(e.target.value)} 
                    placeholder="Enter Loan UUID" 
                  />
                </div>
              )}

              <Button onClick={handleCirculationSubmit} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700">
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
                  <p className="font-medium text-green-700">{result.message}</p>
                  {result.fine_amount > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 font-bold">Overdue Fine: KES {result.fine_amount}</p>
                      <p className="text-xs text-red-600">Calculated at KES 50 per day overdue.</p>
                    </div>
                  )}
                  {result.loan && (
                    <div className="text-sm text-gray-600 mt-2">
                      <p><strong>Student:</strong> {result.loan.student.first_name} {result.loan.student.last_name}</p>
                      <p><strong>Book:</strong> {result.loan.book.title}</p>
                      <p><strong>Due Date:</strong> {new Date(result.loan.due_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Process a borrow or return transaction to see the result here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ADD BOOK DIALOG */}
      <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Book to Catalog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Title *</Label><Input value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} /></div>
              <div><Label>Author *</Label><Input value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>ISBN</Label><Input value={newBook.isbn} onChange={e => setNewBook({...newBook, isbn: e.target.value})} /></div>
              <div><Label>Barcode</Label><Input value={newBook.barcode} onChange={e => setNewBook({...newBook, barcode: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category</Label><Input value={newBook.category} onChange={e => setNewBook({...newBook, category: e.target.value})} /></div>
              <div><Label>Total Copies</Label><Input type="number" min="1" value={newBook.total_copies} onChange={e => setNewBook({...newBook, total_copies: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBookOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBook} disabled={isSavingBook} className="bg-blue-600 hover:bg-blue-700">
              {isSavingBook ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              Save Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}