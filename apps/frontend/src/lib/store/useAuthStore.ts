import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Backend `UserType` enum'unun karşılığı. Değerler backend'in gönderdiği
 * adların küçük harfli hâlidir; başka bir sözlük kullanılırsa rol kontrolleri
 * sessizce hep başarısız olur.
 */
export const USER_ROLES = {
  SuperAdmin: 'superadmin',
  CompanyAdmin: 'companyadmin',
  CompanyWorker: 'companyworker',
  Individual: 'individual',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

const ROLE_VALUES = new Set<string>(Object.values(USER_ROLES));

/** Backend'den gelen rol adını güvenle çözer; tanınmayan değer için null döner. */
export function parseUserRole(raw: string | null | undefined): UserRole | null {
  const normalized = raw?.trim().toLowerCase() ?? '';
  return ROLE_VALUES.has(normalized) ? (normalized as UserRole) : null;
}

/** Şirket yönetimi yetkisi olan roller. */
export function isCompanyAdminRole(role: UserRole | null | undefined): boolean {
  return role === USER_ROLES.SuperAdmin || role === USER_ROLES.CompanyAdmin;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  companyId?: string;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  role: UserRole | null;
  lastActivityAt: number | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setInitialized: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  clearAuth: () => void;
  updateActivity: () => void;
  logout: (queryClient: QueryClient) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true,
      role: null,
      lastActivityAt: null,
      setAuth: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isInitializing: false,
          role: user.role,
          lastActivityAt: Date.now(),
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setInitialized: () => set({ isInitializing: false }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isInitializing: false,
          role: null,
          lastActivityAt: null,
        }),
      updateActivity: () => set({ lastActivityAt: Date.now() }),
      logout: (queryClient) => {
        get().clearAuth();
        queryClient.clear();
        window.location.href = '/auth/login';
      },
    }),
    {
      name: 'cargo-pilot-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Yalnızca user ve role persist edilir — accessToken asla storage'a yazılmaz
      partialize: (state) => ({ user: state.user, role: state.role }),
    },
  ),
);
