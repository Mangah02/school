// apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, AlertTriangle, Cpu } from 'lucide-react';
import { SchoolPerformance } from '@/components/analytics/school-performance';
import { FinancialAnomalies } from '@/components/analytics/financial-anomalies';
import { AiUsageDashboard } from '@/components/analytics/ai-usage-dashboard';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-600" /> Analytics & Intelligence
        </h1>
        <p className="text-gray-500 mt-1">Cross-module KPIs, financial anomaly detection, and AI cost governance.</p>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="performance" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <BarChart3 className="mr-2 h-4 w-4" /> School Performance
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <AlertTriangle className="mr-2 h-4 w-4" /> Financial Anomalies
          </TabsTrigger>
          <TabsTrigger value="ai-usage" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Cpu className="mr-2 h-4 w-4" /> AI Usage & Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance"><SchoolPerformance /></TabsContent>
        <TabsContent value="anomalies"><FinancialAnomalies /></TabsContent>
        <TabsContent value="ai-usage"><AiUsageDashboard /></TabsContent>
      </Tabs>
    </div>
  );
}