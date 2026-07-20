// apps/web/src/app/(dashboard)/dashboard/operations/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Bus, BedDouble, Package, HeartPulse } from 'lucide-react';
import { LibraryManager } from '@/components/operations/library-manager';
import { TransportManager } from '@/components/operations/transport-manager';
import { BoardingManager } from '@/components/operations/boarding-manager';
import { InventoryManager } from '@/components/operations/inventory-manager';
import { HealthManager } from '@/components/operations/health-manager';

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-8 w-8 text-blue-600" /> School Operations
        </h1>
        <p className="text-gray-500 mt-1">Manage library, transport, boarding, inventory, and health services.</p>
      </div>

      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="bg-white border p-1 flex flex-wrap">
          <TabsTrigger value="library" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <BookOpen className="mr-2 h-4 w-4" /> Library
          </TabsTrigger>
          <TabsTrigger value="transport" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Bus className="mr-2 h-4 w-4" /> Transport
          </TabsTrigger>
          <TabsTrigger value="boarding" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <BedDouble className="mr-2 h-4 w-4" /> Boarding
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Package className="mr-2 h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <HeartPulse className="mr-2 h-4 w-4" /> Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library"><LibraryManager /></TabsContent>
        <TabsContent value="transport"><TransportManager /></TabsContent>
        <TabsContent value="boarding"><BoardingManager /></TabsContent>
        <TabsContent value="inventory"><InventoryManager /></TabsContent>
        <TabsContent value="health"><HealthManager /></TabsContent>
      </Tabs>
    </div>
  );
}