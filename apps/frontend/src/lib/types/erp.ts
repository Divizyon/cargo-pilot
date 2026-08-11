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

export const erpSyncSummarySchema = z.object({
  syncLogId: z.string().uuid().optional(),
  added: z.number().int().min(0),
  updated: z.number().int().min(0),
  skipped: z.number().int().min(0),
  syncedAt: z.string().datetime({ offset: true }).optional(),
});

export const SyncLogStatus = { Running: 0, Success: 1, PartialFailure: 2, Failed: 3 } as const;
export type SyncLogStatusValue = (typeof SyncLogStatus)[keyof typeof SyncLogStatus];

export const syncLogDtoSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  status: z.number().int() as z.ZodType<SyncLogStatusValue>,
  syncedRecordCount: z.number().int().min(0),
  errorMessage: z.string().nullable(),
});

// ─── ERP Settings (connection credentials) ────────────────────────────────────

export const erpSettingsApiSchema = z.object({
  id: z.string().uuid(),
  providerType: z.number().int(), // ErpProviderType: 1=Logo, 2=Netsis
  companyCode: z.string(),
  username: z.string(),
  serverAddress: z.string(),
  hasPassword: z.boolean(),
});
