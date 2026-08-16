import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL, API_TIMEOUT_MS } from '@/lib/config/env';
import { useAuthStore } from '@/lib/store/useAuthStore';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend auth istiyor (401 tespit edildi) — token yalnızca bellekte tutulur, üretimdeki
// refresh-token/redirect akışı yok: token süresi dolunca kullanıcı tekrar giriş yapar.
axiosInstance.interceptors.request.use((config) => {
  const { accessToken, companyId } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    if (companyId) config.headers['X-Company-Id'] = companyId;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        toast.error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.', {
          position: 'bottom-right',
        });
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        toast.error('Bağlantı kurulamadı. Backend adresini kontrol edin.', {
          position: 'bottom-right',
        });
      } else if (error.response.status >= 500) {
        toast.error('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.', {
          position: 'bottom-right',
        });
      }
    }
    return Promise.reject(error);
  },
);

export { axiosInstance };
