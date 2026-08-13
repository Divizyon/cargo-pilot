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

/**
 * Backend UTC zamanları bölge damgası olmadan gönderiyor ("2026-08-11T22:16:40.09").
 * Damgayı zorunlu tutmak, ilk çekimden sonra panelin tamamen hata durumuna
 * düşmesine yol açıyordu; değer kabul edilip UTC olarak işaretlenir.
 */
export const utcDateTimeSchema = z
  .string()
  .datetime({ offset: true, local: true })
  .transform((value) => (/(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`));

// Raw API sync settings schema
// syncFrequency: nullable int, syncStatus: int (0=Idle,1=Running), lastSyncAt (not lastSyncedAt)
const erpSyncSettingsApiSchema = z.object({
  integrationId: z.string().uuid().optional(),
  syncFrequency: z.number().int().nullable(),
  syncStatus: z.number().int(),
  nextScheduledSyncAt: utcDateTimeSchema.nullable(),
  lastSyncAt: utcDateTimeSchema.nullable(),
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
    /** Entegrasyonun tamamındaki başarısız/kısmi kayıt sayısı; sayfa boyutundan bağımsızdır. */
    failedCount: z.number().int().min(0).default(0),
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
    dimensionUnit: values.dimensionUnit,
    weightUnit: values.weightUnit,
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

/**
 * Bağlantıyı kaldırır: kimlik bilgileri silinir, entegrasyon kaydı pasifleşir.
 * Senkronizasyon geçmişi sunucuda korunur.
 */
export function useDeleteERPSettings() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorResponse>, void>({
    mutationFn: () => axiosInstance.delete(ERP_SETTINGS_BASE).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp'] });
      toast.success('ERP bağlantısı kaldırıldı', { position: 'bottom-right' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'ERP bağlantısı kaldırılamadı'), {
        position: 'bottom-right',
      });
    },
  });
}

/**
 * Şifre boş bırakılırsa backend kayıtlı şifreyle test eder. Test sonucu sunucuda
 * saklandığı için başarılı/başarısız sonuç sonrası kayıtlı ayarlar tazelenir.
 */
export function useTestERPSettings() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; message?: string | null; warning?: string | null },
    AxiosError<ApiErrorResponse>,
    ErpConnectionFormValues
  >({
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['erp', 'settings'] });
    },
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
 * "ERP'de X satır bulundu — Y eklendi, U güncellendi, D değişmedi, Z filtrelendi, K atlandı".
 * "Değişmedi" ERP verisi bir öncekiyle aynı olduğu için dokunulmayan satırları,
 * "filtrelendi" kullanıcının kendi seçtiği filtreleri, "atlandı" ise hata ve kaynak
 * elemelerini anlatır; üçü bilerek ayrı sayılır.
 */
export function buildSyncToastMessage(summary: ErpSyncSummary): string {
  const { filtered, dropped } = summarizeDrops(summary.droppedByReason);
  const parts = [`${summary.added} eklendi`, `${summary.updated} güncellendi`];
  if (summary.unchanged > 0) parts.push(`${summary.unchanged} değişmedi`);
  if (filtered > 0) parts.push(`${filtered} filtrelendi`);

  const skippedTotal = summary.skipped + dropped;
  if (skippedTotal > 0) parts.push(`${skippedTotal} atlandı`);

  const prefix =
    summary.sourceTotal > 0
      ? `ERP'de ${summary.sourceTotal} satır bulundu`
      : 'ERP ürün çekimi tamamlandı';

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
      toast.error(getApiErrorMessage(error, "ERP'den ürün çekilemedi"), {
        position: 'bottom-right',
      });
    },
  });
}

export interface ErpSyncSettings {
  /** null = sunucuda sıklık kayıtlı değil; otomatik çekim çalışmaz. */
  syncInterval: ErpSyncInterval | null;
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
        // Sıklık yoksa varsayılan uydurulmaz: zamanlayıcı frekansı olmayan
        // entegrasyonu hiç tetiklemez, arayüz de seçili bir sıklık göstermemelidir.
        syncInterval:
          parsed.data.syncFrequency !== null
            ? (SYNC_FREQUENCY_FROM_INT[parsed.data.syncFrequency] ?? null)
            : null,
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
      toast.success('Otomatik çekim sıklığı kaydedildi', { position: 'bottom-right' });
    },
    onError: (error, { integrationId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(syncSettingsQueryKey(integrationId), context.previous);
      }
      toast.error(getApiErrorMessage(error, 'Sıklık kaydedilemedi'), { position: 'bottom-right' });
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
