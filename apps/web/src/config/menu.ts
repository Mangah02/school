// apps/web/src/config/menu.ts
import { LayoutDashboard, Users, GraduationCap, CreditCard, BookOpen, Bus, Settings } from 'lucide-react';

export interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles: string[]; // Which roles can see this
}

export const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student'] },
  { name: 'Students', href: '/dashboard/students', icon: Users, roles: ['super_admin', 'school_admin', 'teacher'] },
  { name: 'Academics', href: '/dashboard/academics', icon: GraduationCap, roles: ['super_admin', 'school_admin', 'teacher'] },
  { name: 'Finance', href: '/dashboard/finance', icon: CreditCard, roles: ['super_admin', 'school_admin', 'finance_officer', 'parent'] },
  { name: 'Library', href: '/dashboard/library', icon: BookOpen, roles: ['super_admin', 'school_admin', 'librarian', 'student'] },
  { name: 'Transport', href: '/dashboard/transport', icon: Bus, roles: ['super_admin', 'school_admin', 'transport_officer', 'parent'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['super_admin', 'school_admin'] },
];