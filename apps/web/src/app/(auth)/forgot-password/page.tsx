// apps/web/src/app/(auth)/forgot-password/page.tsx
'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { Mail, Loader2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('OTP sent to your email.');
      setStep('otp');
    } catch (err) { setMessage('Failed to send OTP.'); } finally { setIsLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => window.location.href = '/login', 2000);
    } catch (err) { setMessage('Invalid OTP or password.'); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
        {message && <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-4">{message}</div>}
        
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full p-2 border rounded-lg" required />
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center">
              {isLoading ? <Loader2 className="animate-spin" /> : <><Mail className="mr-2 h-4 w-4" /> Send OTP</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="w-full p-2 border rounded-lg" required />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="w-full p-2 border rounded-lg" required />
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-2 rounded-lg flex items-center justify-center">
              {isLoading ? <Loader2 className="animate-spin" /> : <><KeyRound className="mr-2 h-4 w-4" /> Reset Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}