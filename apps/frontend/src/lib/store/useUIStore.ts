import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UIStore {
  theme: Theme;
  isSidebarOpen: boolean;
  notifications: string[];
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  addNotification: (message: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  isSidebarOpen: true,
  notifications: [],
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  addNotification: (message) => set((s) => ({ notifications: [...s.notifications, message] })),
  clearNotifications: () => set({ notifications: [] }),
}));
