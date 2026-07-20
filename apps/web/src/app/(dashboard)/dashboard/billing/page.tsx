// apps/web/src/app/(dashboard)/dashboard/billing/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, AlertTriangle } from 'lucide-react';
import { SchoolSubscriptions } from '@/components/billing/school-subscriptions';
import { SaasPaymentReconciliation } from '@/components/billing/saas-payment-reconciliation';

export default function BillingAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-600" /> SaaS Billing & Subscriptions
        </h1>
        <p className="text-gray-500 mt-1">Manage school subscription tiers, grace periods, and reconcile SaaS payment webhooks.</p>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Building2 className="mr-2 h-4 w-4" /> School Subscriptions
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <AlertTriangle className="mr-2 h-4 w-4" /> SaaS Payment Reconciliation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions"><SchoolSubscriptions /></TabsContent>
        <TabsContent value="reconciliation"><SaasPaymentReconciliation /></TabsContent>
      </Tabs>
    </div>
  );
}