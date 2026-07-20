// apps/web/src/components/billing/school-subscriptions.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings, Loader2, Crown, ShieldCheck, Ban } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface SchoolSubscription {
  id: string;
  school: { id: string; name: string; kms_code: string };
  plan_tier: string; // BASIC, STANDARD, PREMIUM, ENTERPRISE
  status: string; // ACTIVE, GRACE_PERIOD, SUSPENDED
  current_period_end: string;
  grace_period_ends_at: string | null;
}

export function SchoolSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Action Dialog State
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SchoolSubscription | null>(null);
  const [newTier, setNewTier] = useState('');
  const [graceDays, setGraceDays] = useState('14');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/subscriptions/all'); // Super Admin endpoint
      setSubscriptions(res.data);
    } catch (error) { toast.error('Failed to load subscriptions'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSubscriptions(); }, []);

  const openActionDialog = (sub: SchoolSubscription) => {
    setSelectedSub(sub);
    setNewTier(sub.plan_tier);
    setIsActionOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    try {
      await api.post(`/billing/subscriptions/${selectedSub.id}/admin-update`, {
        new_tier: newTier,
        extend_grace_days: parseInt(graceDays) || 0
      });
      toast.success(`Subscription for ${selectedSub.school.name} updated successfully.`);
      setIsActionOpen(false);
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update subscription');
    } finally { setIsProcessing(false); }
  };

  const handleForceSuspend = async (id: string) => {
    if (!confirm('Are you sure you want to FORCE SUSPEND this school? They will lose access immediately.')) return;
    try {
      await api.post(`/billing/subscriptions/${id}/force-suspend`);
      toast.success('School forcefully suspended.');
      fetchSubscriptions();
    } catch (error) { toast.error('Failed to suspend school'); }
  };

  const getTierBadge = (tier: string) => {
    const tiers: Record<string, string> = {
      BASIC: 'bg-gray-100 text-gray-800 border-gray-300',
      STANDARD: 'bg-blue-100 text-blue-800 border-blue-300',
      PREMIUM: 'bg-purple-100 text-purple-800 border-purple-300',
      ENTERPRISE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return <Badge className={tiers[tier] || 'bg-gray-100'}><Crown className="mr-1 h-3 w-3" /> {tier}</Badge>;
  };

  const getStatusBadge = (status: string, graceEnds: string | null) => {
    if (status === 'ACTIVE') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><ShieldCheck className="mr-1 h-3 w-3" /> Active</Badge>;
    if (status === 'GRACE_PERIOD') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Grace (Ends {graceEnds ? new Date(graceEnds).toLocaleDateString() : 'N/A'})</Badge>;
    return <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" /> Suspended</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All School Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>KMS Code</TableHead>
                  <TableHead>Current Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Ends</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map(sub => (
                  <TableRow key={sub.id} className={sub.status === 'SUSPENDED' ? 'bg-red-50/50' : ''}>
                    <TableCell className="font-medium">{sub.school.name}</TableCell>
                    <TableCell className="font-mono text-sm">{sub.school.kms_code}</TableCell>
                    <TableCell>{getTierBadge(sub.plan_tier)}</TableCell>
                    <TableCell>{getStatusBadge(sub.status, sub.grace_period_ends_at)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(sub.current_period_end).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openActionDialog(sub)}>
                        <Settings className="mr-1 h-3 w-3" /> Manage
                      </Button>
                      {sub.status !== 'SUSPENDED' && (
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => handleForceSuspend(sub.id)}>
                          <Ban className="mr-1 h-3 w-3" /> Suspend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manage Subscription Dialog */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription: {selectedSub?.school.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Change Plan Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Basic (KES 2,000/mo)</SelectItem>
                  <SelectItem value="STANDARD">Standard (KES 5,000/mo)</SelectItem>
                  <SelectItem value="PREMIUM">Premium (KES 10,000/mo)</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise (Custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Extend Grace Period (Days)</Label>
              <Input type="number" value={graceDays} onChange={e => setGraceDays(e.target.value)} placeholder="e.g. 14" />
              <p className="text-xs text-gray-500 mt-1">Adds days to their grace period before auto-suspension.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSubscription} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}