// apps/web/src/components/students/student-table.tsx
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Link2 } from 'lucide-react';
import Link from 'next/link';
import { Student } from '@/app/(dashboard)/dashboard/students/page';
import { GuardianLinkDialog } from './guardian-link-dialog';
import { useState } from 'react';

interface StudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onRefresh: () => void;
}

export function StudentTable({ students, onEdit, onRefresh }: StudentTableProps) {
  const [linkDialogStudent, setLinkDialogStudent] = useState<Student | null>(null);

  return (
    <>
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">Admission No.</TableHead>
              <TableHead className="font-semibold">Full Name</TableHead>
              <TableHead className="font-semibold">Class / Stream</TableHead>
              <TableHead className="font-semibold">Gender</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  No students found. Click "Admit New Student" to begin.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm font-medium text-blue-600">{student.admission_number}</TableCell>
                  <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                  <TableCell>
                    {student.stream ? (
                      <span>{student.stream.class.name} - {student.stream.name}</span>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{student.gender}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/students/${student.id}`} className="flex items-center cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(student)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLinkDialogStudent(student)}>
                          <Link2 className="mr-2 h-4 w-4" /> Link Guardian
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Guardian Linkage Dialog */}
      {linkDialogStudent && (
        <GuardianLinkDialog 
          student={linkDialogStudent} 
          onClose={() => setLinkDialogStudent(null)} 
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}