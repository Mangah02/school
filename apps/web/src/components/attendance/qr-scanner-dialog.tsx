// apps/web/src/components/attendance/qr-scanner-dialog.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, CameraOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (admissionNumber: string) => void;
}

export function QrScannerDialog({ isOpen, onClose, onScanSuccess }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError('');
    setIsScanning(true);
    
    // Clean up any existing instance
    if (scannerRef.current) {
      try { await scannerRef.current.clear(); } catch (e) {}
    }

    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        (decodedText) => {
          // Successfully scanned
          onScanSuccess(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage) => {
          // Scan error (ignore, it happens every frame until a QR is found)
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      setError('Unable to access camera. Please ensure permissions are granted and you are using HTTPS.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setIsScanning(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Student ID QR Code</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center justify-center min-h-[300px] bg-black rounded-lg overflow-hidden relative">
          {error ? (
            <div className="text-center text-white p-4">
              <CameraOff className="mx-auto h-10 w-10 mb-2 text-red-400" />
              <p className="text-sm">{error}</p>
            </div>
          ) : isScanning ? (
            <div id="qr-reader" className="w-full"></div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          )}
        </div>
        <p className="text-xs text-center text-gray-500 mt-2">
          Point the camera at the student's ID card or digital QR code.
        </p>
      </DialogContent>
    </Dialog>
  );
}