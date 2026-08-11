import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError, type AxiosError } from 'axios';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import { getApiErrorMessage, type ApiErrorResponse } from './apiError';
import { ErpSyncStatus } from '@/lib/types/erp';
import { summarizeDrops } from '@/lib/config/erpDropReasons';
import {
  erpSettingsApiSchema,
  erpSyncSummarySchema,
  syncLogDtoSchema,
  type ErpSyncInterval,
  type ErpSyncSummary,
} from '@/lib/types/erp';
import type { ErpConnectionFormValues } from '@/features/platform/erp/schemas/erpConnectionSchema';

const ERP_BASE = '/api/v1/integrations';
const ERP_SETTINGS_BASE = '/api/v1/erp-settings';

/** Backend sözleşmesi: CargoPilot.Domain/Enums/ErpProviderType → Logo = 1, Netsis = 2 */
export const PROVIDER_TYPE_TO_INT = { Logo: 1, Netsis: 2 } as const;

export type ErpProviderName = keyof typeof PROVIDER_TYPE_TO_INT;

export const PROVIDER_TYPE_FROM_INT: Record<number, ErpProviderName> = {
  [PROVIDER_TYPE_TO_INT.Logo]: 'Logo',
  [PROVIDER_TYPE_TO_INT.Netsis]: 'Netsis',
};

export const SYNC_FREQUENCY_TO_INT: Record<string, number> = {
  FourHours: 0,
  Daily: 1,
};

const SYNC_FREQUENCY_FROM_INT: Record<number, ErpSyncInterval> = {
  0: 'FourHours',
  1: 'Daily',
};

/** Backend sözleşmesi: ErpSyncStatus → Idle = 0, Running = 1, Failed = 2 */
const SYNC_STATUS_FROM_INT: Record<number, ErpSyncStatus> = {
  0: ErpSyncStatus.Idle,
  1: ErpSyncStatus.Running,
  2: ErpSyncStatus.Failed,
};

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

const erpSyncSummaryResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: erpSyncSummarySchema,
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
  data: z.object({
    isSuccess: z.boolean(),
    message: z.string().nullable().optional(),
    /** Bağlantı kurulsa da dikkat gerektiren durum (ör. hesabın yazma yetkisi olması). */
    warning: z.string().nullable().optional(),
  }),
});

const erpSettingsApiResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: erpSettingsApiSchema,
});

/**
 * 404 "ayar yok" anlamına gelir ve hata değildir (ilk kurulumda form boş açılır).
 * Diğer HTTP ve parse hatalari yutulmaz; cagiran bilesen isError dalini render eder.
 */
export function useERPSettings() {
  return useQuery({
    queryKey: ['erp', 'settings'] as const,
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get<unknown>(ERP_SETTINGS_BASE);
        return erpSettingsApiResponseSchema.parse(data).data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });
}

/** Kaydetme ve test uçları aynı bağlantı gövdesini kullanır; şifre yalnızca girildiyse gönderilir. */
function buildErpSettingsBody(values: ErpConnectionFormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {
    providerType: PROVIDER_TYPE_TO_INT[values.systemType],
    companyCode: values.companyCode,
    username: values.username,
    serverAddress: values.serverAddress,
    trustServerCertificate: values.trustServerCertificate,
  };
  if (values.password) {
    body.password = values.password;
  }
  return body;
}

export function useSaveERPSettings() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorResponse>, ErpConnectionFormValues>({
    mutationFn: (values) => {
      return axiosInstance.put(ERP_SETTINGS_BASE, buildErpSettingsBody(values)).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-settings'] });
      queryClient.refetchQueries({ queryKey: ['erp', 'connection'] });
      toast.success('ERP bağlantı ayarları kaydedildi', { position: 'bottom-right' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Bağlantı ayarları kaydedilemedi'), {
        position: 'bottom-right',
      });
    },
  });
}

export function useTestERPSettings() {
  return useMutation<
    { success: boolean; message?: string | null; warning?: string | null },
    AxiosError<ApiErrorResponse>,
    ErpConnectionFormValues
  >({
    mutationFn: async (values) => {
      const { data } = await axiosInstance.post<unknown>(
        `${ERP_SETTINGS_BASE}/test-connection`,
        buildErpSettingsBody(values),
      );
      const parsed = testConnectionResponseSchema.parse(data);
      return {
        success: parsed.data.isSuccess,
        message: parsed.data.message,
        warning: parsed.data.warning,
      };
    },
  });
}

const integrationItemSchema = z.object({
  id: z.string().uuid(),
  systemName: z.string(),
  apiEndpoint: z.string(),
});

const integrationsListResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(integrationItemSchema),
});

export function useERPConnection() {
  return useQuery({
    queryKey: ['erp', 'connection'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(ERP_BASE);
      const parsed = integrationsListResponseSchema.parse(data);
      return parsed.data[0] ?? null;
    },
    retry: false,
  });
}

/**
 * Kaynak toplamından başlayan tam muhasebe cümlesi:
 * "ERP'de X satır bulundu — Y eklendi, U güncellendi, Z filtrelendi, K atlandı".
 * "Filtrelendi" kullanıcının kendi seçtiği filtreleri, "atlandı" hata ve kaynak
 * elemelerini anlatır; ikisi bilerek ayrı sayılır.
 */
export function buildSyncToastMessage(summary: ErpSyncSummary): string {
  const { filtered, dropped } = summarizeDrops(summary.droppedByReason);
  const parts = [`${summary.added} eklendi`, `${summary.updated} güncellendi`];
  if (filtered > 0) parts.push(`${filtered} filtrelendi`);

  const skippedTotal = summary.skipped + dropped;
  if (skippedTotal > 0) parts.push(`${skippedTotal} atlandı`);

  const prefix =
    summary.sourceTotal > 0
      ? `ERP'de ${summary.sourceTotal} satır bulundu`
      : 'Senkronizasyon tamamlandı';

  let message = `${prefix} — ${parts.join(', ')}`;
  if (summary.missingFieldCount > 0) {
    message += `. ${summary.missingFieldCount} satırda eksik alan var, tamamlanmadan aktarılamaz.`;
  }
  if (summary.unaccounted !== 0) {
    message += `. ${Math.abs(summary.unaccounted)} satır hiçbir sayaca düşmedi (mutabakat farkı).`;
  }
  return message;
}

export function useTriggerERPSync() {
  const queryClient = useQueryClient();
  return useMutation<
    ErpSyncSummary,
    AxiosError<ApiErrorResponse>,
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
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-logs'] });
      const message = buildSyncToastMessage(summary);
      // Filtre kaynaklı eleme kullanıcının kendi seçimidir; uyarı sayılmaz.
      const needsAttention =
        summary.skipped > 0 ||
        summary.missingFieldCount > 0 ||
        summary.unaccounted !== 0 ||
        summarizeDrops(summary.droppedByReason).dropped > 0;
      if (needsAttention) {
        toast.warning(message, { position: 'bottom-right', duration: 8000 });
        return;
      }
      toast.success(message, { position: 'bottom-right', duration: 6000 });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Senkronizasyon başarısız'), {
        position: 'bottom-right',
      });
    },
  });
}

export interface ErpSyncSettings {
  syncInterval: ErpSyncInterval;
  syncStatus: ErpSyncStatus;
  nextScheduledSyncAt: string | null;
  lastSyncedAt: string | null;
}

function syncSettingsQueryKey(integrationId: string | undefined) {
  return ['erp', 'sync-settings', integrationId] as const;
}

export function useERPSyncSettings(integrationId: string | undefined) {
  return useQuery({
    queryKey: syncSettingsQueryKey(integrationId),
    queryFn: async (): Promise<ErpSyncSettings> => {
      const { data } = await axiosInstance.get<unknown>(
        `${ERP_BASE}/${integrationId}/sync-settings`,
      );
      const parsed = erpSyncSettingsApiResponseSchema.parse(data);
      const syncStatus = SYNC_STATUS_FROM_INT[parsed.data.syncStatus];
      if (!syncStatus) {
        throw new Error(`Bilinmeyen ERP senkronizasyon durumu: ${parsed.data.syncStatus}`);
      }
      return {
        syncInterval:
          (parsed.data.syncFrequency !== null
            ? SYNC_FREQUENCY_FROM_INT[parsed.data.syncFrequency]
            : undefined) ?? ('Daily' as ErpSyncInterval),
        syncStatus,
        nextScheduledSyncAt: parsed.data.nextScheduledSyncAt,
        lastSyncedAt: parsed.data.lastSyncAt,
      };
    },
    enabled: Boolean(integrationId),
    // Poll every 5 s while a sync is running so status updates promptly
    refetchInterval: (query) => (query.state.data?.syncStatus === 'Running' ? 5000 : false),
  });
}

/**
 * Sıklık seçimi sunucu verisinden okunur; yerel kopya tutulmaz. Optimistic update
 * seçimi anında cache'e yazar, istek başarısızsa önceki değer geri alınır.
 */
export function useSaveERPSyncSettings() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    { integrationId: string; syncInterval: ErpSyncInterval },
    { previous: ErpSyncSettings | undefined }
  >({
    mutationFn: ({ integrationId, syncInterval }) =>
      axiosInstance
        .put(`${ERP_BASE}/${integrationId}/sync-settings`, {
          syncFrequency: SYNC_FREQUENCY_TO_INT[syncInterval] ?? 0,
        })
        .then((r) => r.data),
    onMutate: async ({ integrationId, syncInterval }) => {
      const queryKey = syncSettingsQueryKey(integrationId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ErpSyncSettings>(queryKey);
      if (previous) {
        queryClient.setQueryData<ErpSyncSettings>(queryKey, { ...previous, syncInterval });
      }
      return { previous };
    },
    onSuccess: (_data, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: syncSettingsQueryKey(integrationId) });
      toast.success('Senkronizasyon sıklığı kaydedildi', { position: 'bottom-right' });
    },
    onError: (error, { integrationId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(syncSettingsQueryKey(integrationId), context.previous);
      }
      toast.error(getApiErrorMessage(error, 'Sıklık kaydedilemedi'), { position: 'bottom-right' });
    },
  });
}

export function useRunERPSyncNow() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorResponse>, string>({
    mutationFn: (integrationId) =>
      axiosInstance.post(`${ERP_BASE}/${integrationId}/sync/run-now`).then((r) => r.data),
    onSuccess: (_data, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-settings', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['erp', 'sync-logs', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      toast.success('Senkronizasyon tamamlandı. Sonuç geçmiş sekmesinde görünür.', {
        position: 'bottom-right',
      });
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        toast.error('Senkronizasyon zaten devam ediyor.', { position: 'bottom-right' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Senkronizasyon başlatılamadı'), {
        position: 'bottom-right',
      });
    },
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
      return syncLogsPageResponseSchema.parse(data).data;
    },
    enabled: Boolean(integrationId),
    retry: false,
  });
}
