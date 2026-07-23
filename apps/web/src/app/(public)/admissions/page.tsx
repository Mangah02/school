// apps/web/src/app/(public)/admissions/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GraduationCap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// Zod Schema for Admissions
const admissionSchema = z.object({
  student_first_name: z.string().min(2),
  student_last_name: z.string().min(2),
  student_dob: z.string().min(1, 'Date of birth is required'),
  student_gender: z.enum(['M', 'F']),
  applying_grade: z.string().min(1, 'Please select a grade'),
  
  parent_first_name: z.string().min(2),
  parent_last_name: z.string().min(2),
  parent_phone: z.string().regex(/^(?:\+?254|0)?7\d{8}$/, 'Invalid Kenyan phone number'),
  parent_email: z.string().email('Invalid email address'),
  parent_relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
  
  previous_school: z.string().optional(),
  medical_conditions: z.string().optional(),
});

type AdmissionForm = z.infer<typeof admissionSchema>;

export default function AdmissionsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AdmissionForm>({
    resolver: zodResolver(admissionSchema),
  });

    const onSubmit = async (data: AdmissionForm) => {
    const schoolId = process.env.NEXT_PUBLIC_DEFAULT_SCHOOL_ID;
    
    // ✅ Safety check to prevent sending undefined
    if (!schoolId) {
      console.error('NEXT_PUBLIC_DEFAULT_SCHOOL_ID is not set in .env.local');
      toast.error('Configuration error: School ID is missing. Please contact support.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/public/admissions/apply', {
        school_id: schoolId,
        ...data
      });
      setIsSuccess(true);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      console.error('Admission submission error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-2xl text-center">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Received!</h1>
        <p className="text-gray-600 text-lg mb-8">
          Thank you for your interest in our school. Our admissions office has received your application and will contact you at the provided phone number or email within 3-5 business days.
        </p>
        <Button onClick={() => window.location.href = '/'}>Return to Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Admissions Application</h1>
        <p className="text-gray-600 text-lg">Begin your child's journey with us. Please fill out the form below accurately.</p>
      </div>

      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gray-50 border-b rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl"><GraduationCap className="h-6 w-6 text-blue-600" /> Prospective Student Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Student Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input {...register('student_first_name')} placeholder="John" />{errors.student_first_name && <p className="text-red-500 text-xs mt-1">{errors.student_first_name.message}</p>}</div>
                <div><Label>Last Name *</Label><Input {...register('student_last_name')} placeholder="Doe" />{errors.student_last_name && <p className="text-red-500 text-xs mt-1">{errors.student_last_name.message}</p>}</div>
                <div><Label>Date of Birth *</Label><Input type="date" {...register('student_dob')} />{errors.student_dob && <p className="text-red-500 text-xs mt-1">{errors.student_dob.message}</p>}</div>
                <div>
                  <Label>Gender *</Label>
                  <Select onValueChange={(val) => setValue('student_gender', val as any)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Applying for Grade *</Label>
                  <Select onValueChange={(val) => setValue('applying_grade', val)}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRE-PRIMARY 1">Pre-Primary 1</SelectItem>
                      <SelectItem value="GRADE 1">Grade 1</SelectItem>
                      <SelectItem value="GRADE 7">Grade 7 (Junior Secondary)</SelectItem>
                      <SelectItem value="GRADE 8">Grade 8</SelectItem>
                      <SelectItem value="FORM 1">Form 1 (Senior Secondary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Parent Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Parent / Guardian Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input {...register('parent_first_name')} /></div>
                <div><Label>Last Name *</Label><Input {...register('parent_last_name')} /></div>
                <div>
                  <Label>Relationship *</Label>
                  <Select onValueChange={(val) => setValue('parent_relationship', val as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FATHER">Father</SelectItem>
                      <SelectItem value="MOTHER">Mother</SelectItem>
                      <SelectItem value="GUARDIAN">Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Phone Number (MPESA) *</Label><Input {...register('parent_phone')} placeholder="0712345678" />{errors.parent_phone && <p className="text-red-500 text-xs mt-1">{errors.parent_phone.message}</p>}</div>
                <div className="md:col-span-2"><Label>Email Address *</Label><Input type="email" {...register('parent_email')} placeholder="parent@email.com" />{errors.parent_email && <p className="text-red-500 text-xs mt-1">{errors.parent_email.message}</p>}</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Additional Information</h3>
              <div><Label>Previous School (If applicable)</Label><Input {...register('previous_school')} placeholder="e.g. St. Mary's Primary" /></div>
              <div>
                <Label>Medical Conditions / Allergies (Confidential)</Label>
                <Textarea {...register('medical_conditions')} placeholder="Please list any chronic conditions, severe allergies, or medications the school nurse should be aware of." />
                <p className="text-xs text-gray-400 mt-1">* This data is encrypted and handled in strict compliance with KDPA 2019.</p>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                Submit Application
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}