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

export const erpSyncSummarySchema = z.object({
  syncLogId: z.string().uuid().optional(),
  added: z.number().int().min(0),
  updated: z.number().int().min(0),
  /** Hata nedeniyle yazılamayan satır sayısı. */
  skipped: z.number().int().min(0),
  errorCount: z.number().int().min(0).default(0),
  rowErrors: z.array(syncRowErrorSchema).default([]),
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
});
