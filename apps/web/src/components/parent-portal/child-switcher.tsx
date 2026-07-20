// apps/web/src/components/parent-portal/child-switcher.tsx
'use client';

import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2 } from 'lucide-react';
import { useParentContextStore } from '@/store/parentContextStore';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ChildSwitcher() {
  const { children, selectedChildId, setChildren, setSelectedChildId } = useParentContextStore();

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        // Backend endpoint protected by OwnershipGuard, returns only this parent's linked kids
        const res = await api.get('/guardians/my-children'); 
        setChildren(res.data);
      } catch (error) {
        toast.error('Failed to load your children.');
      }
    };
    fetchChildren();
  }, [setChildren]);

  if (children.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading children...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
      <Users className="h-5 w-5 text-blue-600" />
      <span className="text-sm font-medium text-blue-800 hidden md:inline">Viewing:</span>
      <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
        <SelectTrigger className="w-[220px] bg-white border-blue-300 focus:ring-blue-500">
          <SelectValue placeholder="Select a child" />
        </SelectTrigger>
        <SelectContent>
          {children.map(child => (
            <SelectItem key={child.id} value={child.id}>
              {child.first_name} {child.last_name} ({child.admission_number})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}