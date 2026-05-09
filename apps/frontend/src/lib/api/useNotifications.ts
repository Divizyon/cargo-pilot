import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { z } from 'zod';

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

// ─── Mock data (geçici — BE-NTF-01-6 hazır olduğunda API'ye bağlanacak) ──────

const now = new Date();
const mins = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();
const hours = (n: number) => new Date(now.getTime() - n * 3_600_000).toISOString();
const days = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf-00000001-0000-0000-0000-000000000001',
    type: NotificationType.ERP_SYNC_ERROR,
    severity: 'Error',
    title: 'ERP senkronizasyonu başarısız',
    description:
      'SAP bağlantısı kurulamadı. Bağlantı zaman aşımına uğradı (30s). Entegrasyon ayarlarınızı kontrol edin.',
    actionUrl: '/settings/erp?highlight=erp-card-sap-001',
    isRead: false,
    readAt: null,
    createdAt: mins(3),
  },
  {
    id: 'ntf-00000002-0000-0000-0000-000000000002',
    type: NotificationType.REPORT_READY,
    severity: 'Success',
    title: 'Raporunuz hazır',
    description: 'Mayıs 2026 aylık yükleme raporu başarıyla oluşturuldu. İndirmek için tıklayın.',
    actionUrl: '/reports',
    isRead: false,
    readAt: null,
    createdAt: mins(12),
  },
  {
    id: 'ntf-00000003-0000-0000-0000-000000000003',
    type: NotificationType.OPTIMIZATION_COMPLETE,
    severity: 'Success',
    title: 'Plan optimizasyonu tamamlandı',
    description: "PLN-2026-008 planı optimize edildi. Doluluk oranı %72'den %89'a yükseltildi.",
    actionUrl: '/planning/a1b2c3d4-0008-0000-0000-000000000008',
    isRead: false,
    readAt: null,
    createdAt: mins(34),
  },
  {
    id: 'ntf-00000004-0000-0000-0000-000000000004',
    type: NotificationType.USAGE_LIMIT_WARNING,
    severity: 'Warning',
    title: "Kullanım kotası %80'e ulaştı",
    description:
      'Bu ay 400/500 plan oluşturuldu. Limitinize yaklaşıyorsunuz. Planınızı yükseltmeyi düşünün.',
    actionUrl: null,
    isRead: false,
    readAt: null,
    createdAt: hours(1),
  },
  {
    id: 'ntf-00000005-0000-0000-0000-000000000005',
    type: NotificationType.REPORT_ERROR,
    severity: 'Error',
    title: 'Rapor oluşturulamadı',
    description:
      'Q1 2026 dönemsel raporu oluşturulurken hata meydana geldi. Lütfen daha sonra tekrar deneyin.',
    actionUrl: null,
    isRead: false,
    readAt: null,
    createdAt: hours(2),
  },
  {
    id: 'ntf-00000006-0000-0000-0000-000000000006',
    type: NotificationType.PAYMENT_SUCCESS,
    severity: 'Success',
    title: 'Ödeme başarılı',
    description: 'Pro plan için Mayıs 2026 ödemesi alındı. Teşekkür ederiz.',
    actionUrl: null,
    isRead: true,
    readAt: hours(5),
    createdAt: hours(6),
  },
  {
    id: 'ntf-00000007-0000-0000-0000-000000000007',
    type: NotificationType.OPTIMIZATION_FAILED,
    severity: 'Error',
    title: 'Plan optimizasyonu başarısız',
    description:
      'PLN-2026-007 planı optimize edilirken hata oluştu. Ürün kısıtları çakışıyor olabilir.',
    actionUrl: '/planning/a1b2c3d4-0007-0000-0000-000000000007',
    isRead: true,
    readAt: days(1),
    createdAt: days(1),
  },
  {
    id: 'ntf-00000008-0000-0000-0000-000000000008',
    type: NotificationType.TRIAL_EXPIRING,
    severity: 'Warning',
    title: 'Deneme süreniz 5 gün içinde sona eriyor',
    description: 'Kesintisiz erişim için planınızı yükseltin. Şu ana kadar 42 plan oluşturdunuz.',
    actionUrl: null,
    isRead: true,
    readAt: days(2),
    createdAt: days(2),
  },
  {
    id: 'ntf-00000009-0000-0000-0000-000000000009',
    type: NotificationType.PLAN_UPGRADED,
    severity: 'Info',
    title: 'Planınız yükseltildi',
    description: "Starter'dan Pro'ya geçiş tamamlandı. Tüm özellikler aktif.",
    actionUrl: null,
    isRead: true,
    readAt: days(3),
    createdAt: days(3),
  },
  {
    id: 'ntf-00000010-0000-0000-0000-000000000010',
    type: NotificationType.USAGE_LIMIT_REACHED,
    severity: 'Error',
    title: 'Kullanım kotasına ulaşıldı',
    description:
      'Bu ayki 500 plan limitinize ulaştınız. Yeni plan oluşturmak için planınızı yükseltin.',
    actionUrl: null,
    isRead: true,
    readAt: days(5),
    createdAt: days(5),
  },
];

const MOCK_PAGE_SIZE = 20;

let mockStore = [...MOCK_NOTIFICATIONS];

function applyMockFilters(items: Notification[], filters?: NotificationFilters): Notification[] {
  let result = [...items];
  if (filters?.isRead !== undefined) result = result.filter((n) => n.isRead === filters.isRead);
  if (filters?.severity) result = result.filter((n) => n.severity === filters.severity);
  if (filters?.search && filters.search.length >= 2) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (n) => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
    );
  }
  return result;
}

// ─── List hook ────────────────────────────────────────────────────────────────

export function useNotifications(filters?: NotificationFilters) {
  return useInfiniteQuery({
    queryKey: ['notifications', filters] as const,
    queryFn: async ({ pageParam }): Promise<NotificationsPage> => {
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      const filtered = applyMockFilters(mockStore, filters);
      const pageItems = filtered.slice(offset, offset + MOCK_PAGE_SIZE);
      const nextCursor =
        offset + MOCK_PAGE_SIZE < filtered.length ? String(offset + MOCK_PAGE_SIZE) : null;
      return {
        items: pageItems,
        nextCursor,
        totalUnread: mockStore.filter((n) => !n.isRead).length,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor != null ? Number(lastPage.nextCursor) : undefined,
    staleTime: 30_000,
  });
}

// ─── Unread count hook ────────────────────────────────────────────────────────

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'] as const,
    queryFn: async (): Promise<number> => mockStore.filter((n) => !n.isRead).length,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // TODO: PATCH /api/v1/notifications/{id}/read  (BE-NTF-01-7)
      mockStore = mockStore.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      );
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
      // TODO: PATCH /api/v1/notifications/read-all  (BE-NTF-01-7)
      const now = new Date().toISOString();
      mockStore = mockStore.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? now }));
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
      // TODO: DELETE /api/v1/notifications/{id}  (BE-NTF-01-7)
      mockStore = mockStore.filter((n) => n.id !== id);
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
