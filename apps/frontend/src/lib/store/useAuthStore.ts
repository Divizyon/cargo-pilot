import { create } from 'zustand';
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
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  logout: (queryClient: QueryClient) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  role: null,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, role: user.role }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false, role: null }),
  logout: (queryClient) => {
    get().clearAuth();
    queryClient.clear();
    window.location.href = '/auth/login';
  },
}));
