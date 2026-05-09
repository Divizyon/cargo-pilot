import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config/env';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

interface RefreshApiResponse {
  isSuccess: boolean;
  data: { accessToken: string; accessTokenExpiresAt: string };
}

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_PASSTHROUGH_URLS = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/request-password-reset',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/revoke-all-sessions',
];

axiosInstance.interceptors.request.use((config) => {
  const { accessToken, updateActivity } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    const { companyId } = useAuthStore.getState().user ?? {};
    if (companyId) {
      config.headers['X-Company-Id'] = companyId;
    }
    const isPassthrough = AUTH_PASSTHROUGH_URLS.some((u) => config.url?.includes(u));
    if (!isPassthrough) {
      updateActivity();
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    const isAuthEndpoint = AUTH_PASSTHROUGH_URLS.some((u) => config?.url?.includes(u));

    if (error.response?.status === 401 && config && !config._retry && !isAuthEndpoint) {
      config._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(config);
          })
          .catch((err: unknown) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post<RefreshApiResponse>(
          '/api/v1/auth/refresh',
          {},
          { baseURL: API_BASE_URL, withCredentials: true },
        );
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        processQueue(null, data.data.accessToken);
        config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return axiosInstance(config);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        sessionStorage.setItem('logout_reason', 'token_expired');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
