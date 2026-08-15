import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from './axiosInstance';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginApiResponse {
  isSuccess: boolean;
  message?: string;
  data?: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
    companyId: string;
    accessToken: string;
    accessTokenExpiresAt: string;
    mustChangePassword: boolean;
  };
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (values: LoginRequest) => {
      const { data } = await axiosInstance.post<LoginApiResponse>('/api/v1/auth/login', values, {
        withCredentials: true,
      });
      if (!data.isSuccess || !data.data) {
        throw new Error(data.message ?? 'Giriş başarısız');
      }
      return data.data;
    },
    onSuccess: (data) => {
      login(data.accessToken, data.companyId);
    },
  });
}
