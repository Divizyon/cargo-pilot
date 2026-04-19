import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  variant: NotificationVariant;
  message: string;
}

interface UIStore {
  theme: Theme;
  isSidebarOpen: boolean;
  notifications: Notification[];
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  isSidebarOpen: true,
  notifications: [],
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [...s.notifications, { id: crypto.randomUUID(), ...notification }],
    })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  clearNotifications: () => set({ notifications: [] }),
}));
