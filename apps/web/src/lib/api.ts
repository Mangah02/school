// apps/web/src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true, // CRITICAL: Sends the httpOnly Refresh Token cookie automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🚀 FRONTEND API BASE URL IS:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

// Request Interceptor: Attach the 5h Access Token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 Unauthorized (Auto-Refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only try to refresh if it's NOT a login or refresh request
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        // Call backend refresh endpoint. The httpOnly cookie is sent automatically.
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/refresh`, 
          {}, 
          { withCredentials: true }
        );
        
        // Backend returns { success: true, data: { accessToken: "..." } }
        const newAccessToken = res.data.data?.accessToken; 
        
        if (!newAccessToken) {
          throw new Error('No access token received from refresh endpoint');
        }

        useAuthStore.getState().setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (cookie expired/invalid/missing) -> Force logout
        console.error('Token refresh failed, logging out:', refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // If it was a login request that failed, just reject it normally so the UI can show the error
    return Promise.reject(error);
  }
);

export default api;