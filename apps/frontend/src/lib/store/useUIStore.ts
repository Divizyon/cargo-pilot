import { create } from 'zustand';
import type { Notification, NotificationType, UITheme } from '@/lib/types';

interface NotificationInput {
  message: string;
  type: NotificationType;
  duration?: number;
}

interface UIState {
  theme: UITheme;
  sidebarOpen: boolean;
  notifications: Notification[];
}

interface UIActions {
  setTheme: (theme: UITheme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (input: NotificationInput) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

type UIStore = UIState & UIActions;

const initialState = {
  theme: 'system',
  sidebarOpen: true,
  notifications: [],
} satisfies UIState;

const notificationTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const clearNotificationTimeout = (id: string): void => {
  const timeout = notificationTimeouts.get(id);
  if (timeout) {
    clearTimeout(timeout);
    notificationTimeouts.delete(id);
  }
};

export const useUIStore = create<UIStore>((set) => ({
  ...initialState,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addNotification: ({ message, type, duration }) => {
    const id = crypto.randomUUID();
    const notification: Notification = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    if (typeof duration === 'number' && duration > 0) {
      const timeoutId = setTimeout(() => {
        useUIStore.getState().removeNotification(id);
      }, duration);
      notificationTimeouts.set(id, timeoutId);
    }

    return id;
  },
  removeNotification: (id) => {
    clearNotificationTimeout(id);
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    }));
  },
  clearNotifications: () => {
    for (const id of notificationTimeouts.keys()) {
      clearNotificationTimeout(id);
    }
    set({ notifications: [] });
  },
}));

