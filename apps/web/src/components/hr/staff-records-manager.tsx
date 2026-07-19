// apps/web/src/components/hr/staff-records-manager.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Edit, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Staff {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  email: string;
  tsc_number?: string;
  employment_type: string;
  basic_salary: number;
  user: { role: { name: string } };
}

interface StaffProfile extends Staff {
  national_id: string; // Decrypted by backend
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  bank_account?: string;
}

export function StaffRecordsManager() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<StaffProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', gender: 'M', phone: '', email: '',
    national_id: '', tsc_number: '', kra_pin: '', nssf_number: '', nhif_number: '', bank_account: '',
    basic_salary: '', employment_type: 'PERMANENT', date_joined: '', user_id: ''
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/staff');
      setStaff(res.data);
    } catch (error) { toast.error('Failed to load staff records'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/hr/staff', {
        ...formData,
        basic_salary: parseFloat(formData.basic_salary),
        date_of_birth: '1990-01-01' // Placeholder - should be in form
      });
      toast.success('Staff record created successfully');
      setIsDialogOpen(false);
      fetchStaff();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create staff record'); }
  };

  const viewProfile = async (staffId: string) => {
    setProfileLoading(true);
    setIsProfileOpen(true);
    try {
      // Backend decrypts PII on-the-fly for authorized HR users
      const res = await api.get(`/hr/staff/${staffId}`);
      setSelectedProfile(res.data);
    } catch (error) { toast.error('Failed to load staff profile'); } finally { setProfileLoading(false); }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Staff Directory</h2>
        <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>TSC No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">No staff records found.</TableCell></TableRow>
                ) : (
                  staff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">{s.employee_id}</TableCell>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell><Badge variant="outline">{s.user.role.name}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{s.tsc_number || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{s.employment_type}</Badge></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => viewProfile(s.id)} title="View Full Profile (Decrypted)">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register New Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
              <div><Label>Last Name</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>National ID (Encrypted)</Label><Input value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} /></div>
              <div><Label>TSC Number (Teachers only)</Label><Input value={formData.tsc_number} onChange={e => setFormData({...formData, tsc_number: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>KRA PIN (Encrypted)</Label><Input value={formData.kra_pin} onChange={e => setFormData({...formData, kra_pin: e.target.value})} /></div>
              <div><Label>Basic Salary (KES)</Label><Input type="number" value={formData.basic_salary} onChange={e => setFormData({...formData, basic_salary: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type</Label>
                <Select value={formData.employment_type} onValueChange={val => setFormData({...formData, employment_type: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERMANENT">Permanent</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="PART_TIME">Part-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date Joined</Label><Input type="date" value={formData.date_joined} onChange={e => setFormData({...formData, date_joined: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">Register Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Viewer (Decrypted PII) */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-green-600" /> Staff Profile (Decrypted)</DialogTitle>
          </DialogHeader>
          {profileLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : selectedProfile ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Employee ID:</span><p className="font-mono font-bold">{selectedProfile.employee_id}</p></div>
                <div><span className="text-gray-500">Name:</span><p className="font-medium">{selectedProfile.first_name} {selectedProfile.last_name}</p></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase">Encrypted Fields (Decrypted)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">National ID:</span><p className="font-mono">{selectedProfile.national_id}</p></div>
                  <div><span className="text-gray-500">KRA PIN:</span><p className="font-mono">{selectedProfile.kra_pin || '—'}</p></div>
                  <div><span className="text-gray-500">NSSF:</span><p className="font-mono">{selectedProfile.nssf_number || '—'}</p></div>
                  <div><span className="text-gray-500">NHIF:</span><p className="font-mono">{selectedProfile.nhif_number || '—'}</p></div>
                  <div><span className="text-gray-500">Bank A/C:</span><p className="font-mono">{selectedProfile.bank_account || '—'}</p></div>
                  <div><span className="text-gray-500">TSC No:</span><p className="font-mono">{selectedProfile.tsc_number || '—'}</p></div>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Basic Salary:</span><p className="font-bold">KES {selectedProfile.basic_salary.toLocaleString()}</p></div>
                  <div><span className="text-gray-500">Type:</span><p>{selectedProfile.employment_type}</p></div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}