// apps/web/src/app/(dashboard)/dashboard/students/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Phone, Mail, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface StudentProfile {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  status: string;
  stream: { name: string, class: { name: string } };
  guardians: {
    guardian: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      email?: string;
      relationship: string;
      is_primary: boolean;
    }
  }[];
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/student/${id}`);
        setStudent(res.data);
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!student) return <div className="text-center py-20 text-red-500">Student not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => router.push('/dashboard/students')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
      </Button>

      {/* Profile Header Card */}
      <Card className="overflow-hidden border-t-4 border-t-blue-600">
        <CardHeader className="bg-gray-50 flex flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl">{student.first_name} {student.last_name}</CardTitle>
            <p className="text-gray-500 font-mono">Admission No: {student.admission_number}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{student.status}</Badge>
              <Badge variant="outline">{student.gender}</Badge>
              <Badge variant="secondary">{student.stream?.class.name} - {student.stream?.name}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 pt-6">
          <div><span className="text-sm text-gray-500">Date of Birth:</span> <p className="font-medium">{new Date(student.date_of_birth).toDateString()}</p></div>
          <div><span className="text-sm text-gray-500">Curriculum:</span> <p className="font-medium">CBC (Competency Based)</p></div>
        </CardContent>
      </Card>

      {/* Linked Guardians Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Linked Guardians & Parents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {student.guardians.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No guardians linked yet. Go back to the list to link a guardian.</p>
          ) : (
            student.guardians.map(({ guardian }) => (
              <div key={guardian.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {guardian.first_name} {guardian.last_name}
                      {guardian.is_primary && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Primary Contact</Badge>}
                    </p>
                    <p className="text-sm text-gray-500">{guardian.relationship}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="flex items-center gap-1 justify-end"><Phone className="h-3 w-3" /> {guardian.phone}</p>
                  {guardian.email && <p className="flex items-center gap-1 justify-end text-gray-500"><Mail className="h-3 w-3" /> {guardian.email}</p>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}