// apps/web/src/app/(dashboard)/dashboard/finance/page.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import { CreditCard, Scale, AlertTriangle } from 'lucide-react';
import { ParentInvoices } from '@/components/finance/parent-invoices';
import { ReconciliationWorkbench } from '@/components/finance/reconciliation-workbench';
import { WaiverManager } from '@/components/finance/waiver-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FinancePage() {
  const { user } = useAuthStore();
  const isFinanceRole = ['super_admin', 'school_admin', 'finance_officer'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-blue-600" /> Finance & Billing
        </h1>
        <p className="text-gray-500 mt-1">
          {isFinanceRole ? 'Manage school finances, reconcile payments, and approve waivers.' : 'View invoices, pay fees via MPESA, and request waivers.'}
        </p>
      </div>

      <Tabs defaultValue={isFinanceRole ? "reconciliation" : "invoices"} className="space-y-6">
        <TabsList className="bg-white border p-1">
          {!isFinanceRole && (
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <CreditCard className="mr-2 h-4 w-4" /> My Invoices
            </TabsTrigger>
          )}
          {isFinanceRole && (
            <TabsTrigger value="reconciliation" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <AlertTriangle className="mr-2 h-4 w-4" /> Reconciliation
            </TabsTrigger>
          )}
          <TabsTrigger value="waivers" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Scale className="mr-2 h-4 w-4" /> Fee Waivers
          </TabsTrigger>
        </TabsList>

        {!isFinanceRole && <TabsContent value="invoices"><ParentInvoices /></TabsContent>}
        {isFinanceRole && <TabsContent value="reconciliation"><ReconciliationWorkbench /></TabsContent>}
        <TabsContent value="waivers"><WaiverManager isFinanceRole={isFinanceRole} /></TabsContent>
      </Tabs>
    </div>
  );
}