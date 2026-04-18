import { create } from 'zustand';
import { USER_ROLES, type AuthSession, type UserRole } from '@/lib/types';

interface AuthState {
  token: string | null;
  role: UserRole | null;
}

interface AuthActions {
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  hydrateSession: (payload: unknown) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState = {
  token: null,
  role: null,
} satisfies AuthState;

const isUserRole = (value: unknown): value is UserRole => {
  return Object.values(USER_ROLES).includes(value as UserRole);
};

const isAuthSessionPayload = (payload: unknown): payload is AuthSession => {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const maybeSession = payload as Record<string, unknown>;
  return (
    typeof maybeSession.token === 'string' &&
    maybeSession.token.length > 0 &&
    isUserRole(maybeSession.role)
  );
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setSession: ({ token, role }) => set({ token, role }),
  clearSession: () => set(initialState),
  hydrateSession: (payload) => {
    if (isAuthSessionPayload(payload)) {
      set({ token: payload.token, role: payload.role });
      return;
    }
    set(initialState);
  },
}));
