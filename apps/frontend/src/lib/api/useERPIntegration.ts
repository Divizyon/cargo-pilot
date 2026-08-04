import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import type { CreateItemRequest } from './itemMappers';
import {
  erpPendingMatchSchema,
  erpRemoteUserSchema,
  erpRoleConflictLogSchema,
  erpSettingsApiSchema,
  erpShipmentOrderSchema,
  erpSyncOptionsSchema,
  erpSyncRunSchema,
  erpSyncSummarySchema,
  erpUnassignedDataItemSchema,
  erpUserMappingSchema,
  syncLogDtoSchema,
  type ErpShipmentOrderFilters,
  type ErpSyncInterval,
} from '@/lib/types/erp';
import type { ErpConnectionFormValues } from '@/features/platform/erp/schemas/erpConnectionSchema';

const ERP_BASE = '/api/v1/integrations';
const ERP_SETTINGS_BASE = '/api/v1/erp-settings';

const PROVIDER_TYPE_TO_INT: Record<string, number> = { Logo: 0, Netsis: 1 };

interface ApiError {
  detail?: string;
  title?: string;
}

const SYNC_FREQUENCY_TO_INT: Record<string, number> = {
  FourHours: 0,
  Daily: 1,
};

const SYNC_FREQUENCY_FROM_INT: Record<number, ErpSyncInterval> = {
  0: 'FourHours',
  1: 'Daily',
};

// Raw API schema for pending-item-mappings (covers both status=0 and status=1)
const pendingItemMappingApiSchema = erpPendingMatchSchema.extend({
  status: z.number().int().optional(),
  cargoPilotItemId: z.string().nullable().optional(),
  cargoPilotItemName: z.string().nullable().optional(),
  cargoPilotItemSku: z.string().nullable().optional(),
});

export type ErpPendingMappingItem = z.infer<typeof pendingItemMappingApiSchema>;

const pendingItemMappingListResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(pendingItemMappingApiSchema),
});

const erpPendingMappingsPageResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    items: z.array(pendingItemMappingApiSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

// Raw API sync settings schema
// syncFrequency: nullable int, syncStatus: int (0=Idle,1=Running), lastSyncAt (not lastSyncedAt)
const erpSyncSettingsApiSchema = z.object({
  integrationId: z.string().uuid().optional(),
  syncFrequency: z.number().int().nullable(),
  syncStatus: z.number().int(),
  nextScheduledSyncAt: z.string().datetime({ offset: true }).nullable(),
  lastSyncAt: z.string().datetime({ offset: true }).nullable(),
});

const erpSyncSettingsApiResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: erpSyncSettingsApiSchema,
});

const erpSyncOptionsResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: erpSyncOptionsSchema,
});

const erpSyncSummaryResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: erpSyncSummarySchema,
});

const erpShipmentOrdersResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(erpShipmentOrderSchema),
});

const erpSyncHistoryResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(erpSyncRunSchema),
});

const syncLogsPageResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    items: z.array(syncLogDtoSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

const testConnectionResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({ isSuccess: z.boolean(), message: z.string().nullable().optional() }),
});

const erpSettingsApiResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: erpSettingsApiSchema,
});

export function useERPSettings() {
  return useQuery({
    queryKey: ['erp', 'settings'] as const,
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get<unknown>(ERP_SETTINGS_BASE);
        const parsed = erpSettingsApiResponseSchema.parse(data);
        return parsed.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export function useSaveERPSettings() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, ErpConnectionFormValues>({
    mutationFn: (values) => {
      const body: Record<string, unknown> = {
        providerType: PROVIDER_TYPE_TO_INT[values.systemType] ?? 0,
        companyCode: values.companyCode,
        username: values.username,
        serverAddress: values.serverAddress,
      };
      if (values.password) {
        body.password = values.password;
      }
      return axiosInstance.put(ERP_SETTINGS_BASE, body).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-settings'] });
      queryClient.refetchQueries({ queryKey: ['erp', 'connection'] });
      toast.success('ERP bağlantı ayarları kaydedildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Bağlantı ayarları kaydedilemedi', { position: 'bottom-right' });
    },
  });
}

export function useTestERPSettings() {
  return useMutation<
    { success: boolean; message?: string | null },
    AxiosError<ApiError>,
    ErpConnectionFormValues
  >({
    mutationFn: async (values) => {
      const body: Record<string, unknown> = {
        providerType: PROVIDER_TYPE_TO_INT[values.systemType] ?? 0,
        companyCode: values.companyCode,
        username: values.username,
        serverAddress: values.serverAddress,
      };
      if (values.password) {
        body.password = values.password;
      }
      const { data } = await axiosInstance.post<unknown>(
        `${ERP_SETTINGS_BASE}/test-connection`,
        body,
      );
      const parsed = testConnectionResponseSchema.parse(data);
      return { success: parsed.data.isSuccess, message: parsed.data.message };
    },
  });
}

const integrationItemSchema = z.object({
  id: z.string().uuid(),
  systemName: z.string(),
  apiEndpoint: z.string(),
});

export type ErpIntegration = z.infer<typeof integrationItemSchema>;

const integrationsListResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(integrationItemSchema),
});

export function useERPConnection() {
  return useQuery({
    queryKey: ['erp', 'connection'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(ERP_BASE);
      const parsed = integrationsListResponseSchema.safeParse(data);
      if (!parsed.success || parsed.data.data.length === 0) return null;
      return parsed.data.data[0];
    },
    retry: false,
  });
}

export function useSaveERPConnection() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, ErpConnectionFormValues & { id?: string }>({
    mutationFn: ({ id, ...values }) => {
      if (id) {
        return axiosInstance.put(`${ERP_BASE}/${id}`, values).then((r) => r.data);
      }
      return axiosInstance.post(ERP_BASE, values).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'connection'] });
      toast.success('ERP bağlantı ayarları kaydedildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Bağlantı ayarları kaydedilemedi', { position: 'bottom-right' });
    },
  });
}

export function useTestERPConnection() {
  return useMutation<
    { success: boolean; message?: string | null },
    AxiosError<ApiError>,
    ErpConnectionFormValues
  >({
    mutationFn: async (values) => {
      const { data } = await axiosInstance.post<unknown>(`${ERP_BASE}/test-connection`, values);
      const parsed = testConnectionResponseSchema.parse(data);
      return { success: parsed.data.isSuccess, message: parsed.data.message };
    },
  });
}

export function useERPPendingMatches(integrationId?: string) {
  return useQuery({
    queryKey: ['erp', 'pending-matches', integrationId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `${ERP_BASE}/${integrationId}/pending-item-mappings`,
        { params: { status: 0, page: 1, pageSize: 100 } },
      );
      const parsed = pendingItemMappingListResponseSchema.parse(data);
      return parsed.data;
    },
    enabled: Boolean(integrationId),
  });
}

export function useERPSavedMatches(integrationId?: string) {
  return useQuery({
    queryKey: ['erp', 'saved-matches', integrationId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `${ERP_BASE}/${integrationId}/pending-item-mappings`,
        { params: { status: 1, page: 1, pageSize: 100 } },
      );
      const parsed = pendingItemMappingListResponseSchema.parse(data);
      return parsed.data.map((item) => ({
        id: item.id,
        erpProductId: item.erpProductId,
        erpProductName: item.erpProductName,
        erpSku: item.erpSku,
        cargoItemId: item.cargoPilotItemId ?? '',
        cargoItemName: item.cargoPilotItemName ?? '',
        cargoItemSku: item.cargoPilotItemSku ?? '',
      }));
    },
    enabled: Boolean(integrationId),
  });
}

export function useConfirmERPMatch() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiError>,
    { integrationId: string; mappingId: string; cargoPilotItemId: string }
  >({
    mutationFn: ({ integrationId, mappingId, cargoPilotItemId }) =>
      axiosInstance
        .put(`${ERP_BASE}/${integrationId}/pending-item-mappings/${mappingId}`, {
          cargoPilotItemId,
        })
        .then((r) => r.data),
    onSuccess: (_data, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-matches', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'saved-matches', integrationId] });
      toast.success('Eşleştirme kaydedildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Eşleştirme kaydedilemedi', { position: 'bottom-right' });
    },
  });
}

export function useUpdateERPMatch() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiError>,
    { integrationId: string; mappingId: string; cargoPilotItemId: string }
  >({
    mutationFn: ({ integrationId, mappingId, cargoPilotItemId }) =>
      axiosInstance
        .put(`${ERP_BASE}/${integrationId}/pending-item-mappings/${mappingId}`, {
          cargoPilotItemId,
        })
        .then((r) => r.data),
    onSuccess: (_data, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'saved-matches', integrationId] });
      toast.success('Eşleştirme güncellendi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Eşleştirme güncellenemedi', { position: 'bottom-right' });
    },
  });
}

export function useDeleteERPMatch() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, { integrationId: string; mappingId: string }>({
    mutationFn: ({ integrationId, mappingId }) =>
      axiosInstance
        .delete(`${ERP_BASE}/${integrationId}/pending-item-mappings/${mappingId}`)
        .then(() => undefined),
    onSuccess: (_data, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'saved-matches', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-matches', integrationId] });
      toast.success('Eşleştirme silindi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Eşleştirme silinemedi', { position: 'bottom-right' });
    },
  });
}

export function useERPSyncOptions() {
  return useQuery({
    queryKey: ['erp', 'sync-options'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${ERP_BASE}/sync-options`);
      const parsed = erpSyncOptionsResponseSchema.safeParse(data);
      return parsed.success ? parsed.data.data : { categories: [], warehouses: [] };
    },
    retry: false,
  });
}

export function useTriggerERPSync() {
  const queryClient = useQueryClient();
  return useMutation<
    { added: number; updated: number; skipped: number; syncedAt?: string; syncLogId?: string },
    AxiosError<ApiError>,
    { integrationId: string; categoryFilter?: string | null; warehouseFilter?: string | null }
  >({
    mutationFn: async ({ integrationId, categoryFilter, warehouseFilter }) => {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('categoryFilter', categoryFilter);
      if (warehouseFilter) params.set('warehouseFilter', warehouseFilter);
      const qs = params.toString();
      const { data } = await axiosInstance.post<unknown>(
        `${ERP_BASE}/${integrationId}/items/sync${qs ? `?${qs}` : ''}`,
      );
      const parsed = erpSyncSummaryResponseSchema.parse(data);
      return parsed.data;
    },
    onSuccess: (summary, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-matches', integrationId] });
      toast.success(
        `Senkronizasyon tamamlandı — ${summary.added} eklendi, ${summary.updated} güncellendi, ${summary.skipped} atlandı`,
        { position: 'bottom-right', duration: 6000 },
      );
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Senkronizasyon başarısız', { position: 'bottom-right' });
    },
  });
}

export function useERPSyncSettings(integrationId: string | undefined) {
  return useQuery({
    queryKey: ['erp', 'sync-settings', integrationId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `${ERP_BASE}/${integrationId}/sync-settings`,
      );
      const parsed = erpSyncSettingsApiResponseSchema.parse(data);
      return {
        syncInterval:
          (parsed.data.syncFrequency !== null
            ? SYNC_FREQUENCY_FROM_INT[parsed.data.syncFrequency]
            : undefined) ?? ('Daily' as ErpSyncInterval),
        syncStatus: parsed.data.syncStatus === 1 ? 'Running' : 'Idle',
        nextScheduledSyncAt: parsed.data.nextScheduledSyncAt,
        lastSyncedAt: parsed.data.lastSyncAt,
      };
    },
    enabled: Boolean(integrationId),
    // Poll every 5 s while a sync is running so status updates promptly
    refetchInterval: (query) => (query.state.data?.syncStatus === 'Running' ? 5000 : false),
  });
}

export function useSaveERPSyncSettings() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiError>,
    { integrationId: string; syncInterval: ErpSyncInterval }
  >({
    mutationFn: ({ integrationId, syncInterval }) =>
      axiosInstance
        .put(`${ERP_BASE}/${integrationId}/sync-settings`, {
          syncFrequency: SYNC_FREQUENCY_TO_INT[syncInterval] ?? 0,
        })
        .then((r) => r.data),
    onSuccess: (_data, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-settings', integrationId] });
      toast.success('Senkronizasyon sıklığı kaydedildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Sıklık kaydedilemedi', { position: 'bottom-right' });
    },
  });
}

export function useRunERPSyncNow() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, string>({
    mutationFn: (integrationId) =>
      axiosInstance.post(`${ERP_BASE}/${integrationId}/sync/run-now`).then((r) => r.data),
    onSuccess: (_data, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-settings', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-matches'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'shipment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 409) {
        toast.error('Senkronizasyon zaten devam ediyor.', { position: 'bottom-right' });
        return;
      }
      toast.error(detail ?? 'Senkronizasyon başlatılamadı', { position: 'bottom-right' });
    },
  });
}

export function useERPSyncHistory() {
  return useQuery({
    queryKey: ['erp', 'sync-history'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${ERP_BASE}/sync-history`);
      const parsed = erpSyncHistoryResponseSchema.safeParse(data);
      return parsed.success ? parsed.data.data : [];
    },
    retry: false,
  });
}

export interface SyncLogsParams {
  page: number;
  pageSize: number;
}

export function useERPSyncLogs(integrationId: string | undefined, params: SyncLogsParams) {
  return useQuery({
    queryKey: ['erp', 'sync-logs', integrationId, params] as const,
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('page', String(params.page));
      p.set('pageSize', String(params.pageSize));
      const { data } = await axiosInstance.get<unknown>(
        `${ERP_BASE}/${integrationId}/sync-logs?${p.toString()}`,
      );
      const parsed = syncLogsPageResponseSchema.safeParse(data);
      if (!parsed.success) return { items: [], totalCount: 0, page: 1, pageSize: params.pageSize };
      return parsed.data.data;
    },
    enabled: Boolean(integrationId),
    retry: false,
  });
}

export function useRetryERPSyncItem() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, { logEntryId: string }>({
    mutationFn: ({ logEntryId }) =>
      axiosInstance.post(`${ERP_BASE}/retry-sync`, { logEntryId }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-matches'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Kayıt yeniden senkronize edildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Yeniden senkronizasyon başarısız', { position: 'bottom-right' });
    },
  });
}

export function useERPShipmentOrders(
  integrationId: string | undefined,
  filters?: ErpShipmentOrderFilters,
) {
  return useQuery({
    queryKey: ['erp', 'shipment-orders', integrationId, filters] as const,
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.status) params.set('status', filters.status);
        const qs = params.toString();
        const { data } = await axiosInstance.get<unknown>(
          `${ERP_BASE}/${integrationId}/shipment-orders${qs ? `?${qs}` : ''}`,
        );
        const parsed = erpShipmentOrdersResponseSchema.safeParse(data);
        return parsed.success ? parsed.data.data : [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(integrationId),
    retry: false,
  });
}

// ─── User Mapping hooks ────────────────────────────────────────────────────────

const erpRemoteUsersResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(erpRemoteUserSchema),
});

const erpUserMappingsResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(erpUserMappingSchema),
});

const erpUnassignedDataResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(erpUnassignedDataItemSchema),
});

const erpRoleConflictLogResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(erpRoleConflictLogSchema),
});

export function useERPRemoteUsers() {
  return useQuery({
    queryKey: ['erp', 'remote-users'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${ERP_BASE}/erp-users`);
      const parsed = erpRemoteUsersResponseSchema.safeParse(data);
      return parsed.success ? parsed.data.data : [];
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useERPUserMappings() {
  return useQuery({
    queryKey: ['erp', 'user-mappings'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${ERP_BASE}/user-mappings`);
      const parsed = erpUserMappingsResponseSchema.safeParse(data);
      return parsed.success ? parsed.data.data : [];
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useCreateERPUserMapping() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiError>,
    { erpUserId: string; cargoUserId: string; hasRoleConflict?: boolean }
  >({
    mutationFn: (payload) =>
      axiosInstance.post(`${ERP_BASE}/user-mappings`, payload).then((r) => r.data),
    onSuccess: (_data, { hasRoleConflict }) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'user-mappings'] });
      if (hasRoleConflict) {
        queryClient.invalidateQueries({ queryKey: ['erp', 'role-conflict-log'] });
      }
      toast.success('Kullanıcı eşleştirmesi kaydedildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Eşleştirme kaydedilemedi', { position: 'bottom-right' });
    },
  });
}

export function useERPRoleConflictLog() {
  return useQuery({
    queryKey: ['erp', 'role-conflict-log'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${ERP_BASE}/role-conflict-log`);
      const parsed = erpRoleConflictLogResponseSchema.safeParse(data);
      return parsed.success ? parsed.data.data : [];
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useUpdateERPUserMapping() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, { mappingId: string; erpUserId: string }>({
    mutationFn: ({ mappingId, erpUserId }) =>
      axiosInstance
        .patch(`${ERP_BASE}/user-mappings/${mappingId}`, { erpUserId })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'user-mappings'] });
      toast.success('Eşleştirme güncellendi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Eşleştirme güncellenemedi', { position: 'bottom-right' });
    },
  });
}

export function useDeleteERPUserMapping() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, string>({
    mutationFn: (mappingId) =>
      axiosInstance.delete(`${ERP_BASE}/user-mappings/${mappingId}`).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'user-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'unassigned-data'] });
      toast.success('Eşleştirme silindi. Veriler atanmamış kayıtlara taşındı.', {
        position: 'bottom-right',
      });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Eşleştirme silinemedi', { position: 'bottom-right' });
    },
  });
}

export function useERPUnassignedData() {
  return useQuery({
    queryKey: ['erp', 'unassigned-data'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${ERP_BASE}/unassigned-data`);
      const parsed = erpUnassignedDataResponseSchema.safeParse(data);
      return parsed.success ? parsed.data.data : [];
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useAssignUnassignedData() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, { dataId: string; cargoUserId: string }>({
    mutationFn: ({ dataId, cargoUserId }) =>
      axiosInstance
        .post(`${ERP_BASE}/unassigned-data/${dataId}/assign`, { cargoUserId })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'unassigned-data'] });
      toast.success('Veri kullanıcıya atandı', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Atama başarısız', { position: 'bottom-right' });
    },
  });
}

// ─── ERP Items Page hooks ─────────────────────────────────────────────────────

export function useERPPendingMappingsPaginated(
  integrationId: string | undefined,
  params: { page: number; pageSize: number; status?: number },
) {
  return useQuery({
    queryKey: ['erp', 'pending-mappings-paged', integrationId, params] as const,
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('page', String(params.page));
      p.set('pageSize', String(params.pageSize));
      if (params.status !== undefined) p.set('status', String(params.status));
      const { data } = await axiosInstance.get<unknown>(
        `${ERP_BASE}/${integrationId}/pending-item-mappings?${p.toString()}`,
      );
      const parsed = erpPendingMappingsPageResponseSchema.parse(data);
      return parsed.data;
    },
    enabled: Boolean(integrationId),
  });
}

export function useApproveERPMappingWithNewItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      integrationId,
      mappingId,
      itemPayload,
    }: {
      integrationId: string;
      mappingId: string;
      itemPayload: CreateItemRequest;
    }) => {
      const createRes = await axiosInstance.post<{ isSuccess: boolean; data?: { id: string } }>(
        '/api/v1/items',
        itemPayload,
      );
      const newItemId = createRes.data.data?.id;
      if (!newItemId) throw new Error('Item ID alınamadı');
      await axiosInstance.put(`${ERP_BASE}/${integrationId}/pending-item-mappings/${mappingId}`, {
        cargoPilotItemId: newItemId,
      });
    },
    onSuccess: (_data, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-mappings-paged', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'pending-matches', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
