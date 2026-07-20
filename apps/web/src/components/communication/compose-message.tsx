// apps/web/src/components/communication/compose-message.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageSquare, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ComposeMessage() {
  const [channel, setChannel] = useState<'SMS' | 'EMAIL' | 'WHATSAPP'>('SMS');
  const [recipientType, setRecipientType] = useState<'ALL_PARENTS' | 'CLASS' | 'INDIVIDUAL'>('ALL_PARENTS');
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    api.get('/academic/classes').then(res => setClasses(res.data)).catch(() => {});
  }, []);

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1; // Standard SMS billing logic

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message body cannot be empty.');
      return;
    }
    if (channel === 'EMAIL' && !subject.trim()) {
      toast.error('Email subject is required.');
      return;
    }
    if (recipientType === 'CLASS' && !selectedClassId) {
      toast.error('Please select a class.');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        recipient_type: recipientType,
        class_id: recipientType === 'CLASS' ? selectedClassId : undefined,
        recipient_ids: recipientType === 'INDIVIDUAL' ? recipientIds : undefined,
        message,
        subject: channel === 'EMAIL' ? subject : undefined,
      };

      if (channel === 'SMS') {
        await api.post('/communication/sms', payload);
      } else if (channel === 'EMAIL') {
        await api.post('/communication/email', payload);
      } else {
        await api.post('/communication/whatsapp', payload);
      }

      toast.success(`Message queued for delivery via ${channel}!`);
      setMessage('');
      setSubject('');
      setRecipientIds([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to queue ${channel} message.`);
    } finally {
      setIsSending(false);
    }
  };

  const getChannelIcon = () => {
    if (channel === 'EMAIL') return <Mail className="h-5 w-5 text-blue-600" />;
    if (channel === 'WHATSAPP') return <MessageSquare className="h-5 w-5 text-green-600" />;
    return <Phone className="h-5 w-5 text-purple-600" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Configuration & Recipients */}
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle className="text-lg">Recipients & Channel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Delivery Channel</Label>
            <Select value={channel} onValueChange={(val: any) => setChannel(val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS (Africa's Talking)</SelectItem>
                <SelectItem value="EMAIL">Email (SMTP)</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp (Meta Cloud)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Audience</Label>
            <Select value={recipientType} onValueChange={(val: any) => setRecipientType(val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_PARENTS">All Parents / Guardians</SelectItem>
                <SelectItem value="CLASS">Specific Class</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual (Manual Selection)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientType === 'CLASS' && (
            <div>
              <Label>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {recipientType === 'INDIVIDUAL' && (
            <div>
              <Label>Recipient IDs (Comma Separated)</Label>
              <Input 
                placeholder="e.g. uuid-1, uuid-2" 
                onChange={e => setRecipientIds(e.target.value.split(',').map(id => id.trim()).filter(Boolean))} 
              />
              <p className="text-xs text-gray-500 mt-1">Paste Guardian or Staff UUIDs.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Composition */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getChannelIcon()} Compose Message
          </CardTitle>
          {channel === 'SMS' && (
            <Badge variant={charCount > 160 ? 'destructive' : 'outline'}>
              {charCount} chars ({smsSegments} segment{smsSegments > 1 ? 's' : ''})
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {channel === 'EMAIL' && (
            <div>
              <Label>Email Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Urgent: School Closure Notice" />
            </div>
          )}

          <div>
            <Label>Message Body</Label>
            <Textarea 
              className="min-h-[250px] resize-none"
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder={channel === 'EMAIL' ? 'Dear Parent/Guardian,\n\n...' : 'Type your SMS or WhatsApp message here...'}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSend} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 px-8">
              {isSending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              Queue for Delivery
            </Button>
          </div>
          
          <p className="text-xs text-gray-400 text-center">
            Messages are processed asynchronously via BullMQ. {channel === 'SMS' && 'Failed SMS will automatically fallback to Email after 3 retries.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}