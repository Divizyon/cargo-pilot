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
  isGlobalLoading: boolean;
  notifications: Notification[];
  selectedSnapshotPlanId: string | null;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setSelectedSnapshotPlanId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  isSidebarOpen: true,
  isGlobalLoading: false,
  notifications: [],
  selectedSnapshotPlanId: null,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [...s.notifications, { id: crypto.randomUUID(), ...notification }],
    })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  clearNotifications: () => set({ notifications: [] }),
  setSelectedSnapshotPlanId: (selectedSnapshotPlanId) => set({ selectedSnapshotPlanId }),
}));
