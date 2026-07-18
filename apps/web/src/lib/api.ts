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
    
    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Call backend refresh endpoint. The httpOnly cookie is sent automatically.
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {}, { withCredentials: true });
        const newAccessToken = res.data.access_token;
        
        useAuthStore.getState().setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (cookie expired/invalid) -> Force logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;