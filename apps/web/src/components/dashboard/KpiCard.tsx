// apps/web/src/components/dashboard/KpiCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendColor?: 'text-green-600' | 'text-red-600' | 'text-gray-600';
}

export function KpiCard({ title, value, icon: Icon, trend, trendColor = 'text-gray-600' }: KpiCardProps) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className="h-5 w-5 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trendColor}`}>{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}