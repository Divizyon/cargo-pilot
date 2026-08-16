import { create } from 'zustand';

interface AuthStore {
  accessToken: string | null;
  companyId: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, companyId: string | undefined) => void;
  logout: () => void;
}

// Bağımsız test aracı — token yalnızca bellekte tutulur (sayfa yenilenince tekrar giriş
// gerekir), üretim uygulamasındaki refresh-token/cookie akışı kasıtlı olarak yok.
export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  companyId: null,
  isAuthenticated: false,
  login: (accessToken, companyId) =>
    set({ accessToken, companyId: companyId ?? null, isAuthenticated: true }),
  logout: () => set({ accessToken: null, companyId: null, isAuthenticated: false }),
}));
