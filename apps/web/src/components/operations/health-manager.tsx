// apps/web/src/components/operations/health-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HeartPulse, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function HealthManager() {
  const [studentId, setStudentId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientContext, setPatientContext] = useState<any>(null);

  const handleLogVisit = async () => {
    if (!studentId || !symptoms || !treatment) {
      toast.error('Student ID, Symptoms, and Treatment are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/health/visits', { student_id: studentId, symptoms, diagnosis, treatment });
      setPatientContext(res.data.patient_context); // Backend decrypts and returns this
      toast.success('Clinic visit logged successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to log visit. Check KDPA consent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><HeartPulse className="h-5 w-5 text-red-600" /> Log Clinic Visit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Student ID</Label>
            <Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Enter Student UUID" />
          </div>
          <div><Label>Symptoms</Label><Textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="e.g. High fever, coughing" /></div>
          <div><Label>Diagnosis (Optional)</Label><Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>
          <div><Label>Treatment / Action Taken</Label><Textarea value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="e.g. Paracetamol administered, sent home" /></div>
          
          <Button onClick={handleLogVisit} disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700">
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <HeartPulse className="mr-2 h-4 w-4" />}
            Log Visit & Decrypt Context
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-green-600" /> Patient Context (Decrypted)</CardTitle>
        </CardHeader>
        <CardContent>
          {patientContext ? (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase">AES-256 Decrypted Medical History</p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800">Allergies:</p>
                <p className="text-red-700">{patientContext.allergies || 'None recorded'}</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-800">Chronic Conditions:</p>
                <p className="text-yellow-700">{patientContext.chronic_conditions || 'None recorded'}</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-800">Current Medications:</p>
                <p className="text-blue-700">{patientContext.current_medications || 'None recorded'}</p>
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">* Access to this data is strictly audit-logged and requires active KDPA consent.</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Log a visit to view the student's decrypted medical context here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}