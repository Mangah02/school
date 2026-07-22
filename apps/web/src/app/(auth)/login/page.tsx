// apps/web/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Pre-filled for immediate testing
  const [email, setEmail] = useState('admin@smis.local');
  const [password, setPassword] = useState('Password123!');

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    console.log('🚀 Sending POST to /auth/login with:', { email, password });

    try {
      const res = await api.post('/auth/login', { email, password }); 
      console.log('✅ Login successful:', res.data);
      
      setSession(res.data.data.user, res.data.data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('❌ Login failed:', err);
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">SMIS Portal</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 border border-red-200">
            {error}
          </div>
        )}

        {/* NO FORM TAG. This guarantees no native browser submission can ever happen. */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>

          {/* type="button" ensures this never acts as a submit trigger */}
          <button 
            type="button" 
            onClick={handleLogin}
            disabled={isLoading} 
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}