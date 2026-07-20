// apps/web/src/components/communication/message-logs.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface MessageLog {
  id: string;
  channel: string;
  recipient_contact: string;
  body: string;
  status: string; // PENDING, SENT, FAILED, FALLBACK_TRIGGERED
  retry_count: number;
  error_message?: string;
  created_at: string;
}

export function MessageLogs() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterChannel !== 'ALL') params.append('channel', filterChannel);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      
      const res = await api.get(`/communication/logs?${params.toString()}`);
      setLogs(res.data);
    } catch (error) { toast.error('Failed to load message logs'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [filterChannel, filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" /> Sent</Badge>;
      case 'FAILED': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
      case 'FALLBACK_TRIGGERED': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100"><AlertTriangle className="mr-1 h-3 w-3" /> Fallback</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getChannelBadge = (channel: string) => {
    if (channel === 'SMS') return <Badge variant="outline" className="text-purple-700 border-purple-300">SMS</Badge>;
    if (channel === 'EMAIL') return <Badge variant="outline" className="text-blue-700 border-blue-300">Email</Badge>;
    return <Badge variant="outline" className="text-green-700 border-green-300">WhatsApp</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Delivery History & Logs</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label>Filter by Channel</Label>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Channels</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="FALLBACK_TRIGGERED">Fallback Triggered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message Preview</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">No message logs found.</TableCell></TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log.id} className={log.status === 'FAILED' ? 'bg-red-50/50' : ''}>
                    <TableCell className="text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>{getChannelBadge(log.channel)}</TableCell>
                    <TableCell className="font-mono text-sm">{log.recipient_contact}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm text-gray-600" title={log.body}>
                      {log.body}
                    </TableCell>
                    <TableCell className="text-center">
                      {log.retry_count > 0 ? <Badge variant="secondary">{log.retry_count}</Badge> : '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
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