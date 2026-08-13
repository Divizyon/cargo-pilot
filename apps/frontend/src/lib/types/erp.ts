import { z } from 'zod';

export const ErpSyncInterval = {
  FourHours: 'FourHours',
  Daily: 'Daily',
} as const;

export type ErpSyncInterval = (typeof ErpSyncInterval)[keyof typeof ErpSyncInterval];

/** Backend sözleşmesi: CargoPilot.Domain/Enums/ErpSyncStatus → Idle = 0, Running = 1, Failed = 2 */
export const ErpSyncStatus = {
  Idle: 'Idle',
  Running: 'Running',
  Failed: 'Failed',
} as const;

export type ErpSyncStatus = (typeof ErpSyncStatus)[keyof typeof ErpSyncStatus];

/** Backend sözleşmesi: CargoPilot.Application/Common/Erp/SyncRowError */
export const syncRowErrorSchema = z.object({
  erpId: z.string(),
  sku: z.string().nullable().optional(),
  reason: z.string(),
});

export type SyncRowError = z.infer<typeof syncRowErrorSchema>;

/**
 * Backend sözleşmesi: CargoPilot.Application/Common/Erp/ErpDropReason.
 * Eksik ölçü bir eleme nedeni değildir; o satırlar 'eksik alan' işaretiyle taslağa düşer.
 */
export const ErpDropReason = {
  SalesLocked: 'SalesLocked',
  CategoryFiltered: 'CategoryFiltered',
  WarehouseFiltered: 'WarehouseFiltered',
  RowLimitExceeded: 'RowLimitExceeded',
  DuplicateErpId: 'DuplicateErpId',
} as const;

export type ErpDropReason = (typeof ErpDropReason)[keyof typeof ErpDropReason];

/** Neden bazlı eleme kırılımı; bilinmeyen neden anahtarları da korunur. */
export const droppedByReasonSchema = z.record(z.string(), z.number().int().min(0));

export type DroppedByReason = z.infer<typeof droppedByReasonSchema>;

export const erpSyncSummarySchema = z.object({
  syncLogId: z.string().uuid().optional(),
  added: z.number().int().min(0),
  updated: z.number().int().min(0),
  /** ERP verisi değişmediği için taslağa hiç dokunulmayan satır sayısı. */
  unchanged: z.number().int().min(0).default(0),
  /** Hata nedeniyle yazılamayan satır sayısı. */
  skipped: z.number().int().min(0),
  errorCount: z.number().int().min(0).default(0),
  /** Eksik alan işaretiyle taslağa yazılan satır sayısı. */
  missingFieldCount: z.number().int().min(0).default(0),
  rowErrors: z.array(syncRowErrorSchema).default([]),
  /** ERP kaynağında eleme öncesi bulunan satır sayısı. */
  sourceTotal: z.number().int().min(0).default(0),
  droppedByReason: droppedByReasonSchema.default({}),
  /** Mutabakat farkı: sourceTotal − (yazılan + atlanan + elenen). Negatif olabilir. */
  unaccounted: z.number().int().default(0),
  syncedAt: z.string().datetime({ offset: true }).optional(),
});

export type ErpSyncSummary = z.infer<typeof erpSyncSummarySchema>;

export const SyncLogStatus = { Running: 0, Success: 1, PartialFailure: 2, Failed: 3 } as const;
export type SyncLogStatusValue = (typeof SyncLogStatus)[keyof typeof SyncLogStatus];

export const syncLogDtoSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  status: z.number().int() as z.ZodType<SyncLogStatusValue>,
  syncedRecordCount: z.number().int().min(0),
  errorMessage: z.string().nullable(),
  rowErrors: z.array(syncRowErrorSchema).default([]),
  /** ERP kaynağında eleme öncesi bulunan satır sayısı. */
  sourceTotal: z.number().int().min(0).default(0),
  /** Kaynaktan uygulamaya çekilen satır sayısı. */
  fetchedCount: z.number().int().min(0).default(0),
  droppedByReason: droppedByReasonSchema.default({}),
  /** ERP verisi değişmediği için taslağa hiç dokunulmayan satır sayısı. */
  unchanged: z.number().int().min(0).default(0),
  /** Mutabakat farkı; sıfırdan farklıysa kaynak satırların bir kısmı sayaca düşmemiştir. */
  unaccounted: z.number().int().default(0),
});

export type SyncLogDto = z.infer<typeof syncLogDtoSchema>;

// ─── ERP Settings (connection credentials) ────────────────────────────────────

export const erpSettingsApiSchema = z.object({
  id: z.string().uuid(),
  providerType: z.number().int(), // ErpProviderType: 1=Logo, 2=Netsis
  companyCode: z.string(),
  username: z.string(),
  serverAddress: z.string(),
  hasPassword: z.boolean(),
  /** false ise ERP sunucusunun TLS sertifikası doğrulanır. Eski kayıtlarda alan gelmeyebilir. */
  trustServerCertificate: z.boolean().default(true),
  /**
   * Son bağlantı testinin sonucu. Backend bu alanı yalnızca test edilen yapılandırma
   * kayıtlı ayarlarla aynıysa doldurur; null = güncel bir test yok.
   */
  lastTestSucceeded: z.boolean().nullable().default(null),
  lastTestedAt: z.string().nullable().default(null),
});

export type ErpSettings = z.infer<typeof erpSettingsApiSchema>;
