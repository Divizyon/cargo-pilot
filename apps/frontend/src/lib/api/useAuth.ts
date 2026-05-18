// src/lib/api/useAuth.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useAuthStore, type AuthUser, type UserRole } from '@/lib/store/useAuthStore';
import type { LoginFormValues } from '@/features/platform/schemas/loginSchema';
import type { RegisterFormValues } from '@/features/platform/schemas/registerSchema';

const AUTH_ENDPOINTS = {
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  register: '/api/v1/auth/register',
  refresh: '/api/v1/auth/refresh',
  forgotPassword: '/api/v1/auth/request-password-reset',
  resetPassword: '/api/v1/auth/reset-password',
  revokeAllSessions: '/api/v1/auth/revoke-all-sessions',
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
  mustChangePassword: boolean;
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
        role: (res.data.role?.toLowerCase() ?? 'operator') as UserRole,
      };
      setAuth(user, res.data.accessToken);
      if (res.data.mustChangePassword) {
        navigate('/auth/force-change-password', { replace: true });
      } else {
        const redirectTo = sessionStorage.getItem('redirect_after_login') ?? '/dashboard';
        sessionStorage.removeItem('redirect_after_login');
        navigate(redirectTo, { replace: true });
      }
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

// --- Profile types ---

interface ProfileData {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  companyName: string;
  tourCompleted: boolean;
}

interface ProfileApiResponse {
  isSuccess: boolean;
  message: string;
  data: ProfileData;
  error?: BackendError;
}

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<ProfileData>({
    queryKey: ['profile', userId],
    queryFn: () =>
      axiosInstance.get<ProfileApiResponse>('/api/v1/me/profile').then((r) => {
        const data = r.data.data;
        const isDefaultCompany =
          typeof data.companyName === 'string' &&
          data.companyName.startsWith('Personal - ') &&
          data.companyName.includes('@');
        return { ...data, companyName: isDefaultCompany ? '' : data.companyName };
      }),
    enabled: isAuthenticated && !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  companyName?: string | null;
}

interface UpdateProfileResponse {
  isSuccess: boolean;
  message: string;
  data: ProfileData;
  error?: BackendError;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation<UpdateProfileResponse, AxiosError, UpdateProfilePayload>({
    mutationFn: (payload) =>
      axiosInstance.put<UpdateProfileResponse>('/api/v1/me/profile', payload).then((r) => r.data),
    onSuccess: (res) => {
      if (res.isSuccess && res.data) {
        updateUser({ fullName: res.data.fullName });
        queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      }
      toast.success('Profil bilgileriniz başarıyla güncellendi.', {
        position: 'bottom-right',
        duration: 3000,
      });
    },
    onError: (error) => {
      const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
      if (code === 'ME_COMPANY_UPDATE_FORBIDDEN') {
        toast.error('Firma adını yalnızca şirket yöneticisi güncelleyebilir.', {
          position: 'bottom-right',
        });
      } else {
        toast.error('Profil güncellenirken bir hata oluştu. Lütfen tekrar deneyin.', {
          position: 'bottom-right',
        });
      }
    },
  });
}

interface RequestEmailChangePayload {
  newEmail: string;
}

export function useRequestEmailChange() {
  return useMutation<void, AxiosError, RequestEmailChangePayload>({
    mutationFn: (payload) =>
      axiosInstance.post('/api/v1/me/request-email-change', payload).then((r) => r.data),
  });
}

export function useTourCompleted() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation<void, AxiosError, { tourCompleted: boolean }>({
    mutationFn: (payload) =>
      axiosInstance.patch('/api/v1/me/tour-completed', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useConfirmEmailChange(token: string | null) {
  return useQuery({
    queryKey: ['confirm-email-change', token],
    queryFn: () =>
      axiosInstance
        .get('/api/v1/me/confirm-email-change', { params: { token } })
        .then((r) => r.data),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });
}

// --- Change password (profile sayfası) ---

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  isSuccess: boolean;
  message: string;
  data: boolean;
  error?: BackendError;
}

export function useChangePassword() {
  return useMutation<ChangePasswordResponse, AxiosError, ChangePasswordPayload>({
    mutationFn: (payload) =>
      axiosInstance.post('/api/v1/me/change-password', payload).then((r) => r.data),
  });
}

// --- Revoke all sessions (AC3: "Bu giriş benim değil" akışı) ---

interface RevokeAllSessionsPayload {
  token: string;
}

export function useRevokeAllSessions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, RevokeAllSessionsPayload>({
    mutationFn: ({ token }) =>
      axiosInstance.post<void>(AUTH_ENDPOINTS.revokeAllSessions, { token }).then((r) => r.data),
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      queryClient.clear();
      navigate('/auth/reset-password', { replace: true });
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
