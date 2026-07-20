// apps/web/src/components/operations/inventory-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, FileCheck, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function InventoryManager() {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Step 1: Requisition
  const [reqItemId, setReqItemId] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqJustification, setReqJustification] = useState('');
  
  // Step 2: PO Approval
  const [reqIdToApprove, setReqIdToApprove] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [unitCost, setUnitCost] = useState('');

  // Step 3: GRN (Receive)
  const [poId, setPoId] = useState('');
  const [poItemId, setPoItemId] = useState('');
  const [receivedQty, setReceivedQty] = useState('');

  const handleAction = async (action: 'req' | 'po' | 'grn') => {
    setIsProcessing(true);
    try {
      if (action === 'req') {
        await api.post('/inventory/requisitions', { item_id: reqItemId, quantity: parseInt(reqQty), justification: reqJustification });
        toast.success('Requisition submitted for approval');
        setStep(2);
      } else if (action === 'po') {
        const res = await api.post(`/inventory/requisitions/${reqIdToApprove}/approve`, { supplier_id: supplierId, unit_cost: parseFloat(unitCost) });
        toast.success(`PO Created: ${res.data.purchase_order_id}`);
        setStep(3);
      } else {
        await api.post(`/inventory/purchase-orders/${poId}/receive`, { items: [{ po_item_id: poItemId, received_qty: parseInt(receivedQty) }] });
        toast.success('Inventory updated via GRN');
        setStep(1);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-4">
        <Button variant={step === 1 ? 'default' : 'outline'} onClick={() => setStep(1)}>1. Requisition</Button>
        <Button variant={step === 2 ? 'default' : 'outline'} onClick={() => setStep(2)}>2. Approve & Create PO</Button>
        <Button variant={step === 3 ? 'default' : 'outline'} onClick={() => setStep(3)}>3. Receive (GRN)</Button>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6 space-y-4">
          {step === 1 && (
            <>
              <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" /> Create Requisition</CardTitle>
              <div><Label>Item ID</Label><Input value={reqItemId} onChange={e => setReqItemId(e.target.value)} /></div>
              <div><Label>Quantity</Label><Input type="number" value={reqQty} onChange={e => setReqQty(e.target.value)} /></div>
              <div><Label>Justification</Label><Input value={reqJustification} onChange={e => setReqJustification(e.target.value)} /></div>
              <Button onClick={() => handleAction('req')} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null} Submit Requisition
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <CardTitle className="text-lg flex items-center gap-2"><FileCheck className="h-5 w-5" /> Approve & Issue PO</CardTitle>
              <div><Label>Requisition ID to Approve</Label><Input value={reqIdToApprove} onChange={e => setReqIdToApprove(e.target.value)} /></div>
              <div><Label>Supplier ID</Label><Input value={supplierId} onChange={e => setSupplierId(e.target.value)} /></div>
              <div><Label>Unit Cost (KES)</Label><Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} /></div>
              <Button onClick={() => handleAction('po')} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null} Approve & Create PO
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5" /> Goods Received Note (GRN)</CardTitle>
              <div><Label>Purchase Order ID</Label><Input value={poId} onChange={e => setPoId(e.target.value)} /></div>
              <div><Label>PO Item ID</Label><Input value={poItemId} onChange={e => setPoItemId(e.target.value)} /></div>
              <div><Label>Received Quantity</Label><Input type="number" value={receivedQty} onChange={e => setReceivedQty(e.target.value)} /></div>
              <Button onClick={() => handleAction('grn')} disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700">
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null} Confirm Receipt & Update Stock
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}