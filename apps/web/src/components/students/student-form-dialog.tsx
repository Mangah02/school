// apps/web/src/components/students/student-form-dialog.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Student } from '@/app/(dashboard)/dashboard/students/page';
import { toast } from 'sonner';

// Zod Schema for Admission
const studentSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  admission_number: z.string().min(3, 'Admission number is required'),
  date_of_birth: z.string().min(1, 'DOB is required'),
  gender: z.enum(['M', 'F', 'O'], { required_error: 'Gender is required' }),
  nationality: z.string().default('Kenyan'),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null; // null = Create mode
  onSuccess: () => void;
}

export function StudentFormDialog({ isOpen, onClose, student, onSuccess }: Props) {
  const isEditing = !!student;
  
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: '', last_name: '', admission_number: '', date_of_birth: '', gender: 'M', nationality: 'Kenyan'
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (student) {
        reset({
          first_name: student.first_name,
          last_name: student.last_name,
          admission_number: student.admission_number,
          date_of_birth: student.date_of_birth.split('T')[0],
          gender: student.gender as any,
          nationality: 'Kenyan' // Default fallback
        });
      } else {
        reset();
      }
    }
  }, [isOpen, student, reset]);

  const onSubmit = async (data: StudentFormValues) => {
    try {
      if (isEditing) {
        // ✅ Use singular '/student' and the student's ID
        await api.put(`/student/${student.id}`, data);
        toast.success('Student updated successfully');
      } else {
        // ✅ Use singular '/student' for creation
        await api.post('/student', data);
        toast.success('New student admitted successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Save student error:', error);
      toast.error(error.response?.data?.message || 'Failed to save student. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Student Details' : 'Admit New Student'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input {...register('first_name')} placeholder="John" />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input {...register('last_name')} placeholder="Doe" />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Admission Number</Label>
              <Input {...register('admission_number')} placeholder="ADM-001" />
              {errors.admission_number && <p className="text-xs text-red-500">{errors.admission_number.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" {...register('date_of_birth')} />
              {errors.date_of_birth && <p className="text-xs text-red-500">{errors.date_of_birth.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Gender</Label>
            <Select defaultValue={student?.gender || 'M'} onValueChange={(val) => setValue('gender', val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              {isEditing ? 'Save Changes' : 'Admit Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}