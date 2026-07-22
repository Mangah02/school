// apps/web/src/components/layout/kdpa-gate.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function KdpaGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null); // null = loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      if (!user) return;
      try {
        // Calls Phase 10.8 / Phase 4.14 Backend Endpoint
        const res = await api.get('/compliance/consent/status');
        setHasAccepted(res.data.has_accepted_kdpa);
      } catch (error: any) {
        // ✅ FAIL OPEN: If the endpoint doesn't exist yet (404), assume accepted so dev isn't blocked
        if (error.response?.status === 404) {
          console.warn('KDPA consent endpoint not ready. Bypassing gate for development.');
          setHasAccepted(true);
        } else {
          console.error('Failed to check KDPA status', error);
          setHasAccepted(false);
        }
      }
    };
    checkConsent();
  }, [user]);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/compliance/consent/acknowledge', { category: 'KDPA_PRIVACY_NOTICE' });
      setHasAccepted(true);
    } catch (error: any) {
      // ✅ FAIL OPEN: If the endpoint doesn't exist yet, force acceptance anyway
      if (error.response?.status === 404) {
        console.warn('KDPA acknowledge endpoint not ready. Bypassing for development.');
        setHasAccepted(true);
      } else {
        console.error('Failed to acknowledge KDPA', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking consent
  if (hasAccepted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If accepted (or bypassed), render the normal app
  if (hasAccepted) {
    return <>{children}</>;
  }

  // If NOT accepted, render the mandatory gate overlay
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center border-t-4 border-blue-600">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Data Protection Notice</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          In compliance with the <strong>Kenya Data Protection Act (KDPA) 2019</strong>, we require your explicit consent to process personal data within the School Management Information System. 
          <br /><br />
          By clicking "I Accept", you acknowledge that you have read and understood our Data Processing Agreement, including how student, staff, and financial data is encrypted, stored, and protected.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left text-xs text-gray-500 max-h-32 overflow-y-auto border">
          <p className="font-semibold text-gray-700 mb-1">Summary of Data Practices:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>PII (National IDs, KRA PINs) is AES-256 encrypted at rest.</li>
            <li>Medical and Biometric data requires explicit, revocable consent.</li>
            <li>You retain the Right to Access and Right to be Forgotten (DSAR).</li>
          </ul>
        </div>

        <Button 
          onClick={handleAccept} 
          disabled={isSubmitting} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl"
        >
          {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
          I Accept & Proceed
        </Button>
      </div>
    </div>
  );
}