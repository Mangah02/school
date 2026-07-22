// apps/web/src/app/(dashboard)/dashboard/students/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Loader2 } from 'lucide-react';
import { StudentTable } from '@/components/students/student-table';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import api from '@/lib/api';

export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  status: string;
  stream?: {
    id: string;
    name: string;
    class: { name: string };
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student'); // Calls Phase 5.3 Backend
      setStudents(res.data);
    } catch (error) {
      console.error('Failed to fetch students', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" /> Student Management
          </h1>
          <p className="text-gray-500 mt-1">Manage admissions, profiles, and guardian linkages.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Admit New Student
        </Button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <StudentTable students={students} onEdit={handleEdit} onRefresh={fetchStudents} />
      )}

      {/* Admission / Edit Form Dialog */}
      <StudentFormDialog 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        student={editingStudent}
        onSuccess={() => {
          setIsFormOpen(false);
          fetchStudents();
        }}
      />
    </div>
  );
}