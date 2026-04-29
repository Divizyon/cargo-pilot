// src/lib/api/useAuth.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useAuthStore, type AuthUser, type UserRole } from '@/lib/store/useAuthStore';
import type { LoginFormValues } from '@/features/platform/schemas/loginSchema';
import type { RegisterFormValues } from '@/features/platform/schemas/registerSchema';

const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  refresh: '/api/auth/refresh',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
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
  accessTokenExpiresAt: string;
  // refreshToken is delivered as an HttpOnly Cookie by the server — not in the response body
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

// --- Forgot / Reset Password types ---

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  token: string;
  password: string;
}

interface ResetPasswordErrorBody {
  isSuccess?: false;
  error?: BackendError;
}

// --- Error extractors ---

/** AC3: 401'de her zaman generic mesaj. AC4: "not found" kodu varsa true döner. */
export function isLoginNotFound(error: AxiosError<LoginErrorBody>): boolean {
  if (error.response?.status !== 401) return false;
  const code = error.response?.data?.error?.code ?? '';
  return /not.?found|user.?not.?exist/i.test(code);
}

/** AC5: 409 → e-posta zaten kullanılıyor; component inline banner gösterir. */
export function isEmailDuplicate(error: AxiosError<RegisterErrorBody>): boolean {
  return error.response?.status === 409;
}

/** AC3 (reset): 400 ve backend'in parola geçmişi kodu varsa true döner. */
export function isPasswordReused(error: AxiosError<ResetPasswordErrorBody>): boolean {
  if (error.response?.status !== 400) return false;
  const code = error.response?.data?.error?.code ?? '';
  return /password.*reuse|previously.*used|password.*histor|PasswordHistory|PasswordPrevious/i.test(
    code,
  );
}

/** Sıfırlama token'ı geçersiz veya süresi dolmuşsa true döner (400 / 422). Parola geçmişi 400'ünü dışlar. */
export function isResetTokenInvalid(error: AxiosError<ResetPasswordErrorBody>): boolean {
  const status = error.response?.status ?? 0;
  if (status === 422) return true;
  if (status === 400) return !isPasswordReused(error);
  return false;
}

// --- Hooks ---

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<LoginApiResponse, AxiosError<LoginErrorBody>, LoginFormValues>({
    mutationFn: (data) =>
      axiosInstance
        .post<LoginApiResponse>(AUTH_ENDPOINTS.login, data, { withCredentials: true })
        .then((r) => r.data),
    onSuccess: (res) => {
      const user: AuthUser = {
        id: res.data.userId,
        email: res.data.email,
        fullName: res.data.fullName,
        role: res.data.role as UserRole,
      };
      setAuth(user, res.data.accessToken);
      navigate('/dashboard', { replace: true });
    },
    // onError: component handles it (AC3/AC4 ayrımı için)
  });
}

export function useForgotPassword() {
  return useMutation<void, AxiosError, ForgotPasswordPayload>({
    mutationFn: (data) =>
      axiosInstance.post<void>(AUTH_ENDPOINTS.forgotPassword, data).then((r) => r.data),
    // onError: component, AC3 gereği 4xx'i de başarı gibi gösterir
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ResetPasswordErrorBody>, ResetPasswordPayload>({
    mutationFn: (data) =>
      axiosInstance.post<void>(AUTH_ENDPOINTS.resetPassword, data).then((r) => r.data),
    onSuccess: () => {
      // AC4: yeni şifre sonrası mevcut oturumu ve cache'i temizle
      useAuthStore.getState().clearAuth();
      queryClient.clear();
      toast.success('Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.', {
        position: 'bottom-right',
      });
      navigate('/auth/login', { replace: true });
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation<void, AxiosError<RegisterErrorBody>, RegisterFormValues>({
    mutationFn: (data) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      };
      return axiosInstance.post<void>(AUTH_ENDPOINTS.register, payload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Hesabınız oluşturuldu. E-posta adresinize bir doğrulama maili gönderdik.', {
        position: 'bottom-right',
      });
      navigate('/auth/login', { replace: true });
    },
    onError: (error) => {
      if (error.response?.status === 409) return; // inline banner via RegisterForm
      const message = error.response?.data?.detail ?? 'Kayıt başarısız. Lütfen tekrar deneyin.';
      toast.error(message, { position: 'bottom-right' });
    },
  });
}
