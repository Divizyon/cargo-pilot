// src/lib/api/useAuth.ts
import { useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { PublicClientApplication } from '@azure/msal-browser';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useAuthStore, type AuthUser, type UserRole } from '@/lib/store/useAuthStore';
import { GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID } from '@/lib/config/env';
import type { LoginFormValues } from '@/features/platform/schemas/loginSchema';
import type { RegisterFormValues } from '@/features/platform/schemas/registerSchema';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const AUTH_ENDPOINTS = {
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  register: '/api/v1/auth/register',
  refresh: '/api/v1/auth/refresh',
  forgotPassword: '/api/v1/auth/request-password-reset',
  resetPassword: '/api/v1/auth/reset-password',
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

/** Hesap kilitliyse true döner (AUTH_ACCOUNT_LOCKED kodu). */
export function isAccountLocked(error: AxiosError<LoginErrorBody>): boolean {
  if (error.response?.status !== 401) return false;
  return error.response?.data?.error?.code === 'AUTH_ACCOUNT_LOCKED';
}

/** Kilitli hesabın kalan süresini dakika cinsinden döner; description'dan parse edilir. */
export function getLockedMinutesRemaining(error: AxiosError<LoginErrorBody>): number {
  const description = error.response?.data?.error?.description ?? '';
  const match = description.match(/(\d+) dakika/);
  return match ? parseInt(match[1], 10) : 2;
}

/** AC5: 409 → e-posta zaten kullanılıyor; component inline banner gösterir. */
export function isEmailDuplicate(error: AxiosError<RegisterErrorBody>): boolean {
  return error.response?.status === 409;
}

/** 422 → daha önce kullanılmış şifre (backend spec). */
export function isPasswordReused(error: AxiosError<ResetPasswordErrorBody>): boolean {
  return error.response?.status === 422;
}

/** 401 → token geçersiz/süresi dolmuş; 400 → doğrulama hatası. */
export function isResetTokenInvalid(error: AxiosError<ResetPasswordErrorBody>): boolean {
  const status = error.response?.status ?? 0;
  return status === 401 || status === 400;
}

// --- Hooks ---

export function useLogout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError>({
    mutationFn: () =>
      axiosInstance
        .post<void>(AUTH_ENDPOINTS.logout, {}, { withCredentials: true })
        .then((r) => r.data),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate('/auth/login', { replace: true });
    },
  });
}

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
    mutationFn: ({ token, password }) =>
      axiosInstance
        .post<void>(AUTH_ENDPOINTS.resetPassword, { token, newPassword: password })
        .then((r) => r.data),
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

// --- OAuth hooks ---

export function useGoogleOAuth() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { mutate, isPending } = useMutation<LoginApiResponse, AxiosError, { idToken: string }>({
    mutationFn: ({ idToken }) =>
      axiosInstance
        .post<LoginApiResponse>('/api/v1/auth/google', { idToken }, { withCredentials: true })
        .then((r) => r.data),
    onSuccess: (res) => {
      if (!res.isSuccess || !res.data) return;
      const user: AuthUser = {
        id: res.data.userId,
        email: res.data.email,
        fullName: res.data.fullName,
        role: res.data.role as UserRole,
      };
      setAuth(user, res.data.accessToken);
      navigate('/dashboard', { replace: true });
    },
    onError: () => {
      toast.error('Google ile giriş başarısız. Lütfen tekrar deneyin.', {
        position: 'bottom-right',
      });
    },
  });

  const trigger = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) return;
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        mutate({ idToken: response.credential });
      },
      cancel_on_tap_outside: true,
    });
    window.google?.accounts.id.prompt();
  }, [mutate]);

  return { trigger, isPending };
}

export function useMicrosoftOAuth() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const msalRef = useRef<PublicClientApplication | null>(null);

  const { mutate, isPending } = useMutation<LoginApiResponse, AxiosError, { idToken: string }>({
    mutationFn: ({ idToken }) =>
      axiosInstance
        .post<LoginApiResponse>('/api/v1/auth/microsoft', { idToken }, { withCredentials: true })
        .then((r) => r.data),
    onSuccess: (res) => {
      if (!res.isSuccess || !res.data) return;
      const user: AuthUser = {
        id: res.data.userId,
        email: res.data.email,
        fullName: res.data.fullName,
        role: res.data.role as UserRole,
      };
      setAuth(user, res.data.accessToken);
      navigate('/dashboard', { replace: true });
    },
    onError: () => {
      toast.error('Microsoft ile giriş başarısız. Lütfen tekrar deneyin.', {
        position: 'bottom-right',
      });
    },
  });

  const trigger = useCallback(async () => {
    if (!MICROSOFT_CLIENT_ID) return;
    try {
      if (!msalRef.current) {
        msalRef.current = new PublicClientApplication({
          auth: {
            clientId: MICROSOFT_CLIENT_ID,
            authority: 'https://login.microsoftonline.com/common',
            redirectUri: window.location.origin,
          },
          cache: { cacheLocation: 'sessionStorage' },
        });
        await msalRef.current.initialize();
      }
      const response = await msalRef.current.loginPopup({
        scopes: ['openid', 'email', 'profile'],
      });
      if (response.idToken) {
        mutate({ idToken: response.idToken });
      }
    } catch {
      // Kullanıcı popup'ı kapattı veya izin vermedi
    }
  }, [mutate]);

  return { trigger, isPending };
}
