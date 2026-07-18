// apps/web/src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Users, GraduationCap, DollarSign, TrendingUp, BookOpen, Bus, AlertCircle, Skeleton } from 'lucide-react';

interface DashboardData {
  total_students: number;
  total_staff: number;
  attendance_today: number;
  finance: {
    total_invoiced: number;
    total_collected: number;
    outstanding_balance: number;
    collection_rate_percent: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Calls the Phase 8.8 Analytics Endpoint
        const res = await api.get('/analytics/dashboard');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  // Format currency helper
  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, here is what is happening at your school today.</p>
      </div>

      {/* ========================================== */}
      {/* ROLE: SCHOOL ADMIN / SUPER ADMIN / TEACHER */}
      {/* ========================================== */}
      {(user?.role === 'school_admin' || user?.role === 'super_admin' || user?.role === 'teacher') && data && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            title="Total Students" 
            value={data.total_students} 
            icon={Users} 
            trend="Active enrollments" 
          />
          <KpiCard 
            title="Today's Attendance" 
            value={`${data.attendance_today} / ${data.total_students}`} 
            icon={GraduationCap} 
            trend={`${((data.attendance_today / data.total_students) * 100).toFixed(1)}% present`} 
            trendColor="text-green-600"
          />
          <KpiCard 
            title="Fee Collection Rate" 
            value={`${data.finance.collection_rate_percent}%`} 
            icon={TrendingUp} 
            trend={`${formatCurrency(data.finance.total_collected)} collected`} 
            trendColor="text-green-600"
          />
          <KpiCard 
            title="Outstanding Balance" 
            value={formatCurrency(data.finance.outstanding_balance)} 
            icon={DollarSign} 
            trend="Total unpaid fees" 
            trendColor="text-red-600"
          />
        </div>
      )}

      {/* ========================================== */}
      {/* ROLE: PARENT                               */}
      {/* ========================================== */}
      {user?.role === 'parent' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Children Enrolled" value={2} icon={Users} trend="Active this term" />
          <KpiCard title="Next Fee Due" value="KES 15,000" icon={DollarSign} trend="Due: 10th May 2026" trendColor="text-red-600" />
          <KpiCard title="Recent Notifications" value={4} icon={AlertCircle} trend="2 unread messages" />
        </div>
      )}

      {/* ========================================== */}
      {/* ROLE: STUDENT                              */}
      {/* ========================================== */}
      {user?.role === 'student' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Current Average" value="84%" icon={GraduationCap} trend="Term 1 Performance" trendColor="text-green-600" />
          <KpiCard title="Attendance Rate" value="96%" icon={Users} trend="Excellent standing" />
          <KpiCard title="Library Books" value={1} icon={BookOpen} trend="1 book due in 3 days" trendColor="text-red-600" />
        </div>
      )}

      {/* ========================================== */}
      {/* ROLE: TRANSPORT / BOARDING OFFICER         */}
      {/* ========================================== */}
      {(user?.role === 'transport_officer' || user?.role === 'boarding_master') && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Active Routes" value={12} icon={Bus} trend="All buses operational" />
          <KpiCard title="Boarding Capacity" value="85%" icon={Users} trend="15 beds available" />
          <KpiCard title="Pending Approvals" value={3} icon={AlertCircle} trend="Leave requests" trendColor="text-red-600" />
        </div>
      )}
    </div>
  );
}