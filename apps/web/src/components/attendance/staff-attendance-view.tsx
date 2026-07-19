// apps/web/src/components/attendance/staff-attendance-view.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface StaffAttendance {
  id: string;
  staff: { first_name: string; last_name: string; employee_id: string };
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string; // PRESENT, ABSENT, ON_LEAVE
}

export function StaffAttendanceView() {
  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Calls Phase 7.12 Backend Endpoint
      const res = await api.get(`/hr/staff-attendance?date=${filterDate}`);
      setRecords(res.data);
    } catch (error) {
      toast.error('Failed to load staff attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [filterDate]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-600" /> Staff Attendance Log</CardTitle>
        <Input 
          type="date" 
          value={filterDate} 
          onChange={e => setFilterDate(e.target.value)} 
          className="w-48"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">No records found for this date.</TableCell></TableRow>
              ) : (
                records.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-mono text-sm">{rec.staff.employee_id}</TableCell>
                    <TableCell className="font-medium">{rec.staff.first_name} {rec.staff.last_name}</TableCell>
                    <TableCell>{formatTime(rec.check_in)}</TableCell>
                    <TableCell>{formatTime(rec.check_out)}</TableCell>
                    <TableCell>
                      <Badge variant={rec.status === 'PRESENT' ? 'default' : rec.status === 'ABSENT' ? 'destructive' : 'secondary'}>
                        {rec.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}