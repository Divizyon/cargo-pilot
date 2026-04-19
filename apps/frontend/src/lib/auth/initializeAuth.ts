import axios from 'axios';
import { API_BASE_URL } from '@/lib/config/env';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/useAuthStore';

interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

export async function initializeAuth(): Promise<void> {
  try {
    const { data } = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      {},
      { withCredentials: true },
    );
    useAuthStore.getState().setAuth(data.user, data.accessToken);
  } catch {
    // Oturum yoksa veya token süresi dolmuşsa sessizce geç
  }
}
