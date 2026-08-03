import axios from 'axios';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/config/env';
import { useAuthStore } from '@/lib/store/useAuthStore';

const refreshApiResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    accessToken: z.string(),
    accessTokenExpiresAt: z.string(),
  }),
});

export async function initializeAuth(): Promise<void> {
  try {
    const { data: raw } = await axios.post<unknown>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const parsed = refreshApiResponseSchema.safeParse(raw);
    if (!parsed.success) {
      useAuthStore.getState().clearAuth();
      return;
    }
    const data = parsed.data;
    if (data.isSuccess && data.data?.accessToken) {
      const { user } = useAuthStore.getState();
      if (user) {
        if (!user.role) {
          // Eski session format'ında role eksik olabilir; yeniden login zorunlu.
          useAuthStore.getState().clearAuth();
          return;
        }
        useAuthStore.getState().setAuth(user, data.data.accessToken);
      } else {
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        useAuthStore.getState().setInitialized();
      }
    } else {
      useAuthStore.getState().clearAuth();
    }
  } catch {
    useAuthStore.getState().clearAuth();
  }
}
