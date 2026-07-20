// apps/web/src/components/analytics/financial-anomalies.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface AnomalyData {
  current_month_waivers: number;
  historical_3mo_average: number;
  deviation_percent: number;
  anomaly_detected: boolean;
}

export function FinancialAnomalies() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/anomalies/finance')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load anomaly data'))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Status Banner */}
      <Card className={data.anomaly_detected ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
        <CardContent className="pt-6 flex items-center gap-4">
          {data.anomaly_detected ? (
            <>
              <AlertTriangle className="h-12 w-12 text-red-600 animate-pulse" />
              <div>
                <h3 className="text-xl font-bold text-red-800">Financial Anomaly Detected</h3>
                <p className="text-red-700">Fee waivers have spiked significantly above the historical average. Immediate DPO review is required.</p>
              </div>
            </>
          ) : (
            <>
              <ShieldCheck className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-green-800">Financials Normal</h3>
                <p className="text-green-700">Fee waivers are within the expected historical variance. No anomalies detected.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Current Month Waivers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.current_month_waivers)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">3-Month Historical Avg</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.historical_3mo_average)}</p>
          </CardContent>
        </Card>

        <Card className={data.deviation_percent > 50 ? 'border-orange-300' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Variance / Deviation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${data.deviation_percent > 50 ? 'text-red-600' : 'text-gray-900'}`}>
              {data.deviation_percent > 0 ? '+' : ''}{data.deviation_percent.toFixed(1)}%
            </p>
            {data.deviation_percent > 50 && (
              <Badge variant="destructive" className="mt-2">Exceeds 50% Threshold</Badge>
            )}
          </CardContent>
        </Card>
      </div>
      
      <p className="text-xs text-center text-gray-400">
        * Anomaly detection triggers when current month waivers exceed the 3-month rolling average by more than 50%.
      </p>
    </div>
  );
}