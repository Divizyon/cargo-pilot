import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QueryClient } from '@tanstack/react-query';

export const USER_ROLES = {
  Admin: 'admin',
  Manager: 'manager',
  Viewer: 'viewer',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

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
  role: UserRole | null;
  lastActivityAt: number | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
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
      role: null,
      lastActivityAt: null,
      setAuth: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          role: user.role,
          lastActivityAt: Date.now(),
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
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
