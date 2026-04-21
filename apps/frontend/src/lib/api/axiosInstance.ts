import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config/env';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      try {
        const { data } = await axios.post<{ accessToken: string }>(
          '/auth/refresh',
          {},
          { baseURL: API_BASE_URL, withCredentials: true },
        );
        useAuthStore.getState().setAccessToken(data.accessToken);
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(config);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }
    }

    if (error.code === 'ECONNABORTED') {
      toast.error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.', {
        position: 'bottom-right',
      });
      return Promise.reject(error);
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      toast.error('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.', {
        position: 'bottom-right',
      });
      return Promise.reject(error);
    }

    if (error.response.status >= 500) {
      toast.error('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.', {
        position: 'bottom-right',
      });
    }

    return Promise.reject(error);
  },
);

export { axiosInstance };
