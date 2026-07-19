// apps/web/src/components/hr/payroll-processor.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Play, FileText, Download, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface PayrollRecord {
  id: string;
  staff: { first_name: string; last_name: string; employee_id: string };
  month: number;
  year: number;
  basic_pay: number;
  allowances: number;
  paye_deduction: number;
  nssf_deduction: number;
  nhif_deduction: number;
  net_pay: number;
  status: string;
}

export function PayrollProcessor() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payslipDialog, setPayslipDialog] = useState<PayrollRecord | null>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/payroll?month=${selectedMonth}&year=${selectedYear}`);
      setRecords(res.data);
    } catch (error) { toast.error('Failed to load payroll records'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPayroll(); }, [selectedMonth, selectedYear]);

  const handleProcessPayroll = async () => {
    if (!confirm(`Process payroll for ${selectedMonth}/${selectedYear}? This will calculate deductions and post journal entries.`)) return;
    setIsProcessing(true);
    try {
      const res = await api.post('/hr/payroll/process', { month: selectedMonth, year: selectedYear });
      toast.success(`Payroll processed! Transaction ID: ${res.data.transaction_id}`);
      fetchPayroll();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to process payroll'); } finally { setIsProcessing(false); }
  };

  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1">
            <Label>Month</Label>
            <Select value={selectedMonth.toString()} onValueChange={val => setSelectedMonth(parseInt(val))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m, i) => <SelectItem key={i} value={(i+1).toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Year</Label>
            <Select value={selectedYear.toString()} onValueChange={val => setSelectedYear(parseInt(val))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleProcessPayroll} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
            {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            Process Payroll
          </Button>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" /> {months[selectedMonth - 1]} {selectedYear} Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>PAYE</TableHead>
                  <TableHead>NSSF</TableHead>
                  <TableHead>NHIF</TableHead>
                  <TableHead className="font-bold">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Payslip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-6">No payroll records for this period. Click "Process Payroll" to generate.</TableCell></TableRow>
                ) : (
                  records.map(rec => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <p className="font-medium">{rec.staff.first_name} {rec.staff.last_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{rec.staff.employee_id}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(rec.basic_pay)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(rec.paye_deduction)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(rec.nssf_deduction)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(rec.nhif_deduction)}</TableCell>
                      <TableCell className="font-bold text-green-700">{formatCurrency(rec.net_pay)}</TableCell>
                      <TableCell>
                        <Badge variant={rec.status === 'PAID' ? 'default' : rec.status === 'POSTED' ? 'secondary' : 'outline'}>
                          {rec.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setPayslipDialog(rec)}>
                          <FileText className="mr-1 h-3 w-3" /> View
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

      {/* Payslip Viewer Dialog */}
      <Dialog open={!!payslipDialog} onOpenChange={() => setPayslipDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Payslip — {months[selectedMonth - 1]} {selectedYear}</DialogTitle></DialogHeader>
          {payslipDialog && (
            <div className="space-y-4 py-2">
              <div className="text-center border-b pb-4">
                <p className="font-bold text-lg">{payslipDialog.staff.first_name} {payslipDialog.staff.last_name}</p>
                <p className="text-sm text-gray-500 font-mono">{payslipDialog.staff.employee_id}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Basic Pay:</span><span className="font-medium">{formatCurrency(payslipDialog.basic_pay)}</span></div>
                <div className="flex justify-between"><span>Allowances:</span><span className="font-medium">{formatCurrency(payslipDialog.allowances)}</span></div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-red-600"><span>PAYE:</span><span>-{formatCurrency(payslipDialog.paye_deduction)}</span></div>
                  <div className="flex justify-between text-red-600"><span>NSSF:</span><span>-{formatCurrency(payslipDialog.nssf_deduction)}</span></div>
                  <div className="flex justify-between text-red-600"><span>NHIF/SHIF:</span><span>-{formatCurrency(payslipDialog.nhif_deduction)}</span></div>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg text-green-700">
                  <span>Net Pay:</span><span>{formatCurrency(payslipDialog.net_pay)}</span>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download PDF Payslip
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}