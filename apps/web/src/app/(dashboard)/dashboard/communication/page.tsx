// apps/web/src/app/(dashboard)/dashboard/communication/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, History } from 'lucide-react';
import { ComposeMessage } from '@/components/communication/compose-message';
import { MessageLogs } from '@/components/communication/message-logs';

export default function CommunicationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-blue-600" /> Communication Center
        </h1>
        <p className="text-gray-500 mt-1">Send SMS, Emails, and WhatsApp messages to parents, students, and staff.</p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="bg-white border p-1">
          <TabsTrigger value="compose" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <Mail className="mr-2 h-4 w-4" /> Compose Message
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <History className="mr-2 h-4 w-4" /> Delivery Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose"><ComposeMessage /></TabsContent>
        <TabsContent value="logs"><MessageLogs /></TabsContent>
      </Tabs>
    </div>
  );
}