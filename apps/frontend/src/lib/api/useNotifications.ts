import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';

// ─── Domain constants ─────────────────────────────────────────────────────────

export const NotificationType = {
  ERP_SYNC_ERROR: 'ERP_SYNC_ERROR',
  REPORT_READY: 'REPORT_READY',
  REPORT_ERROR: 'REPORT_ERROR',
  OPTIMIZATION_COMPLETE: 'OPTIMIZATION_COMPLETE',
  OPTIMIZATION_FAILED: 'OPTIMIZATION_FAILED',
  TRIAL_EXPIRING: 'TRIAL_EXPIRING',
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  PLAN_UPGRADED: 'PLAN_UPGRADED',
  PLAN_DOWNGRADED: 'PLAN_DOWNGRADED',
  USAGE_LIMIT_WARNING: 'USAGE_LIMIT_WARNING',
  USAGE_LIMIT_REACHED: 'USAGE_LIMIT_REACHED',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationSeverity = {
  Info: 'Info',
  Success: 'Success',
  Warning: 'Warning',
  Error: 'Error',
} as const;

export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

// ─── Schema & types ───────────────────────────────────────────────────────────

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  severity: z.enum(['Info', 'Success', 'Warning', 'Error']),
  title: z.string(),
  description: z.string(),
  actionUrl: z.string().nullable(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

export interface NotificationFilters {
  severity?: NotificationSeverity;
  isRead?: boolean;
  search?: string;
}

export interface NotificationsPage {
  items: Notification[];
  nextCursor: string | null;
  totalUnread: number;
}

// ─── API response schemas ─────────────────────────────────────────────────────

const notificationsResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    items: z.array(notificationSchema),
    nextCursor: z.string().nullable(),
    totalUnread: z.number(),
  }),
});

const unreadCountResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.number(),
});

const boolResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.boolean(),
});

// ─── List hook ────────────────────────────────────────────────────────────────

export function useNotifications(filters?: NotificationFilters) {
  return useInfiniteQuery({
    queryKey: ['notifications', filters] as const,
    queryFn: async ({ pageParam }): Promise<NotificationsPage> => {
      const params: Record<string, string> = {};
      if (pageParam) params['cursor'] = pageParam as string;
      if (filters?.severity) params['severity'] = filters.severity;
      if (filters?.isRead !== undefined) params['isRead'] = String(filters.isRead);
      if (filters?.search && filters.search.length >= 2) params['search'] = filters.search;

      const { data: raw } = await axiosInstance.get('/api/v1/notifications', { params });
      const parsed = notificationsResponseSchema.parse(raw);

      return {
        items: parsed.data.items,
        nextCursor: parsed.data.nextCursor,
        totalUnread: parsed.data.totalUnread,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

// ─── Unread count hook ────────────────────────────────────────────────────────

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'] as const,
    queryFn: async (): Promise<number> => {
      const { data: raw } = await axiosInstance.get('/api/v1/notifications/unread-count');
      const parsed = unreadCountResponseSchema.parse(raw);
      return parsed.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: raw } = await axiosInstance.patch(`/api/v1/notifications/${id}`);
      boolResponseSchema.parse(raw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// ─── Mark all as read ─────────────────────────────────────────────────────────

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data: raw } = await axiosInstance.patch('/api/v1/notifications/read-all');
      boolResponseSchema.parse(raw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// ─── Delete single ────────────────────────────────────────────────────────────

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: raw } = await axiosInstance.delete(`/api/v1/notifications/${id}`);
      boolResponseSchema.parse(raw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// ─── Bulk delete ──────────────────────────────────────────────────────────────

export function useBulkDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      const { data: raw } = await axiosInstance.delete('/api/v1/notifications/bulk', {
        data: { ids },
      });
      boolResponseSchema.parse(raw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// ─── Cache updater helper (used by optimistic updates) ───────────────────────

export function updateNotificationInCache(
  data: InfiniteData<NotificationsPage>,
  updater: (n: Notification) => Notification,
): InfiniteData<NotificationsPage> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map(updater),
    })),
  };
}
