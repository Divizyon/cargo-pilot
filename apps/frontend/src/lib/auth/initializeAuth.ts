import axios from 'axios';
import { API_BASE_URL } from '@/lib/config/env';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface RefreshApiResponse {
  isSuccess: boolean;
  data: {
    accessToken: string;
    accessTokenExpiresAt: string;
  };
}

export async function initializeAuth(): Promise<void> {
  try {
    const { data } = await axios.post<RefreshApiResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      {},
      { withCredentials: true },
    );
    if (data.isSuccess && data.data?.accessToken) {
      const { user } = useAuthStore.getState();
      if (user) {
        useAuthStore.getState().setAuth(user, data.data.accessToken);
      } else {
        useAuthStore.getState().setAccessToken(data.data.accessToken);
      }
    }
  } catch {
    useAuthStore.getState().clearAuth();
  } finally {
    useAuthStore.getState().setInitialized();
  }
}
