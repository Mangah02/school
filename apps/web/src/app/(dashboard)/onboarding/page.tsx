// apps/web/src/app/(dashboard)/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const STEPS = [
  'School Details', 'Academic Year', 'Classes', 'Subjects', 
  'Admin Account', 'Fee Structure', 'Review & Submit'
];

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '', kmsCode: '', 
    academicYear: '', term: '',
    classes: '', subjects: '',
    adminEmail: '', adminPassword: '',
    tuitionFee: ''
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Call Phase 5.2 Backend Endpoint
      await api.post('/schools/onboard', formData);
      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-xl border-0">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">School Onboarding</CardTitle>
            <span className="text-sm text-gray-500 font-medium">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}></div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 min-h-[300px]">
          {/* Step Content */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. School Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>School Name</Label><Input value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)} placeholder="e.g. St. Mary's High School" /></div>
                <div><Label>KMS Code</Label><Input value={formData.kmsCode} onChange={e => updateField('kmsCode', e.target.value)} placeholder="e.g. SCH-001" /></div>
              </div>
            </div>
          )}
          
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Academic Setup</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Current Academic Year</Label><Input value={formData.academicYear} onChange={e => updateField('academicYear', e.target.value)} placeholder="e.g. 2026" /></div>
                <div><Label>Current Term</Label><Input value={formData.term} onChange={e => updateField('term', e.target.value)} placeholder="e.g. Term 1" /></div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Classes</h3>
              <Label>Enter Classes (Comma separated)</Label>
              <Input value={formData.classes} onChange={e => updateField('classes', e.target.value)} placeholder="e.g. Grade 7, Grade 8, Grade 9" />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">4. Core Subjects</h3>
              <Label>Enter Subjects (Comma separated)</Label>
              <Input value={formData.subjects} onChange={e => updateField('subjects', e.target.value)} placeholder="e.g. Mathematics, English, Kiswahili" />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">5. School Admin Account</h3>
              <div><Label>Admin Email</Label><Input type="email" value={formData.adminEmail} onChange={e => updateField('adminEmail', e.target.value)} placeholder="admin@school.com" /></div>
              <div><Label>Temporary Password</Label><Input type="password" value={formData.adminPassword} onChange={e => updateField('adminPassword', e.target.value)} /></div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">6. Basic Fee Structure</h3>
              <div><Label>Default Tuition Fee (KES)</Label><Input type="number" value={formData.tuitionFee} onChange={e => updateField('tuitionFee', e.target.value)} placeholder="e.g. 15000" /></div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2"><CheckCircle2 /> 7. Review & Submit</h3>
              <p className="text-gray-600">Please review the details before provisioning the school environment.</p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1 border">
                <p><strong>School:</strong> {formData.schoolName} ({formData.kmsCode})</p>
                <p><strong>Academic Year:</strong> {formData.academicYear} - {formData.term}</p>
                <p><strong>Classes:</strong> {formData.classes}</p>
                <p><strong>Admin:</strong> {formData.adminEmail}</p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Navigation Footer */}
        <div className="flex justify-between p-6 border-t bg-gray-50/50 rounded-b-lg">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={nextStep}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Provision School
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}