// apps/web/src/components/analytics/ai-usage-dashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Cpu, AlertTriangle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface QuotaData {
  monthly_cap_kes: number;
  current_spend_kes: number;
  remaining_kes: number;
  is_degraded: boolean; // True if forced to Ollama
}

export function AiUsageDashboard() {
  const [data, setData] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ai/quota')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load AI quota'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!data) return null;

  const usagePercent = (data.current_spend_kes / data.monthly_cap_kes) * 100;
  const formatCurrency = (amt: number) => `KES ${amt.toLocaleString()}`;

  // Determine color/status based on usage
  let progressColor = "bg-green-500";
  let statusMessage = "AI usage is well within limits.";
  let StatusIcon = CheckCircle2;
  let statusColor = "text-green-700 bg-green-50 border-green-200";

  if (data.is_degraded) {
    progressColor = "bg-red-500";
    statusMessage = "Monthly cap exceeded. AI requests are being routed to the local offline model (Ollama).";
    StatusIcon = AlertTriangle;
    statusColor = "text-red-700 bg-red-50 border-red-200";
  } else if (usagePercent >= 80) {
    progressColor = "bg-yellow-500";
    statusMessage = "Approaching monthly limit. An 80% alert has been sent to the School Admin.";
    StatusIcon = AlertTriangle;
    statusColor = "text-yellow-700 bg-yellow-50 border-yellow-200";
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Status Banner */}
      <Card className={`border ${statusColor}`}>
        <CardContent className="pt-6 flex items-center gap-4">
          <StatusIcon className={`h-10 w-10 ${statusColor.split(' ')[0]}`} />
          <div>
            <h3 className="text-lg font-bold">AI Governance Status</h3>
            <p className="text-sm">{statusMessage}</p>
          </div>
        </CardContent>
      </Card>

      {/* Quota Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" /> Monthly AI Budget (Cloud Providers)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Consumption</span>
              <span className="text-sm font-medium">{usagePercent.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercent} className={`h-4 ${progressColor}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Monthly Cap</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.monthly_cap_kes)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Spent So Far</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(data.current_spend_kes)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Remaining</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(Math.max(0, data.remaining_kes))}</p>
            </div>
          </div>

          {/* Routing Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-sm">Active AI Provider</p>
                <p className="text-xs text-gray-500">Current routing destination for AI requests</p>
              </div>
            </div>
            <Badge variant={data.is_degraded ? 'destructive' : 'default'} className="text-sm px-3 py-1">
              {data.is_degraded ? 'Local Ollama (Degraded)' : 'Anthropic Claude (Cloud)'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}