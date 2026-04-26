// src/lib/api/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useAuthStore, type AuthUser, type UserRole } from '@/lib/store/useAuthStore';
import type { LoginFormValues } from '@/features/platform/schemas/loginSchema';
import type { RegisterFormValues } from '@/features/platform/schemas/registerSchema';

// baseURL = http://104.247.163.42:8081, so full paths needed
const AUTH_ENDPOINTS = {
  login:    '/api/v1/auth/login',
  register: '/api/v1/auth/register',
} as const;

// --- Login types (Result<T> wrapper) ---

interface BackendError {
  type: number;
  code: string;
  description: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

interface LoginData {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

interface LoginApiResponse {
  isSuccess: boolean;
  message: string;
  data: LoginData;
  error?: BackendError;
}

interface LoginErrorBody {
  isSuccess: false;
  error?: BackendError;
}

// --- Register types (ProblemDetails on 400/409) ---

interface RegisterErrorBody {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
}

// --- Error extractors ---

function extractLoginError(error: AxiosError<LoginErrorBody>, fallback: string): string {
  const be = error.response?.data?.error;
  if (!be) return fallback;
  if (be.validationErrors && be.validationErrors.length > 0) {
    return be.validationErrors[0].message;
  }
  return be.description || fallback;
}

function extractRegisterError(error: AxiosError<RegisterErrorBody>, fallback: string): string {
  if (error.response?.status === 409) return 'Bu e-posta adresi zaten kayıtlı.';
  return error.response?.data?.detail || fallback;
}

// --- Hooks ---

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<LoginApiResponse, AxiosError<LoginErrorBody>, LoginFormValues>({
    mutationFn: (data) =>
      axiosInstance.post<LoginApiResponse>(AUTH_ENDPOINTS.login, data).then((r) => r.data),
    onSuccess: (res) => {
      const user: AuthUser = {
        id:       res.data.userId,
        email:    res.data.email,
        fullName: res.data.fullName,
        role:     res.data.role as UserRole,
      };
      setAuth(user, res.data.accessToken);
      navigate('/dashboard', { replace: true });
    },
    onError: (error) => {
      const message = extractLoginError(error, 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
      toast.error(message, { position: 'bottom-right' });
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation<void, AxiosError<RegisterErrorBody>, RegisterFormValues>({
    mutationFn: (data) => {
      const payload = {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
      };
      return axiosInstance.post<void>(AUTH_ENDPOINTS.register, payload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Hesabınız oluşturuldu. Giriş yapabilirsiniz.', { position: 'bottom-right' });
      navigate('/auth/login', { replace: true });
    },
    onError: (error) => {
      const message = extractRegisterError(error, 'Kayıt başarısız. Lütfen tekrar deneyin.');
      toast.error(message, { position: 'bottom-right' });
    },
  });
}
