import { z } from 'zod';

export const ErpSystemType = {
  Logo: 'Logo',
  Netsis: 'Netsis',
} as const;

export const ErpSyncInterval = {
  FourHours: 'FourHours',
  Daily: 'Daily',
} as const;

export type ErpSyncInterval = (typeof ErpSyncInterval)[keyof typeof ErpSyncInterval];

export const ErpSyncStatus = {
  Idle: 'Idle',
  Running: 'Running',
} as const;

export type ErpSyncStatus = (typeof ErpSyncStatus)[keyof typeof ErpSyncStatus];

export type ErpSystemType = (typeof ErpSystemType)[keyof typeof ErpSystemType];

export const erpConnectionSchema = z.object({
  id: z.string().uuid().optional(),
  systemType: z.enum(['Logo', 'Netsis']),
  companyCode: z.string().min(1),
  username: z.string().min(1),
  serverAddress: z.string().min(1),
  isConnected: z.boolean().optional(),
  lastTestedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export type ErpConnection = z.infer<typeof erpConnectionSchema>;

export const erpSyncSettingsSchema = z.object({
  syncInterval: z.enum(['FourHours', 'Daily']),
  syncStatus: z.enum(['Idle', 'Running']),
  nextScheduledSyncAt: z.string().datetime({ offset: true }).nullable(),
  lastSyncedAt: z.string().datetime({ offset: true }).nullable(),
});

export type ErpSyncSettings = z.infer<typeof erpSyncSettingsSchema>;

export const erpPendingMatchSchema = z.object({
  id: z.string().uuid(),
  erpProductId: z.string(),
  erpProductName: z.string(),
  erpSku: z.string().nullable(),
  erpWeight: z.number().nullable(),
  erpWidth: z.number().nullable(),
  erpHeight: z.number().nullable(),
  erpLength: z.number().nullable(),
  hasConstraintData: z.boolean().optional(),
});

export type ErpPendingMatch = z.infer<typeof erpPendingMatchSchema>;

export const erpSavedMatchSchema = z.object({
  id: z.string(),
  erpProductId: z.string(),
  erpProductName: z.string(),
  erpSku: z.string().nullable(),
  cargoItemId: z.string(),
  cargoItemName: z.string(),
  cargoItemSku: z.string(),
});

export type ErpSavedMatch = z.infer<typeof erpSavedMatchSchema>;

export const erpSyncSummarySchema = z.object({
  added: z.number().int().min(0),
  updated: z.number().int().min(0),
  skipped: z.number().int().min(0),
  syncedAt: z.string().datetime({ offset: true }),
});

export type ErpSyncSummary = z.infer<typeof erpSyncSummarySchema>;

export const erpSyncFiltersSchema = z.object({
  categoryId: z.string().nullable().optional(),
  warehouseId: z.string().nullable().optional(),
});

export type ErpSyncFilters = z.infer<typeof erpSyncFiltersSchema>;

export const erpFilterOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type ErpFilterOption = z.infer<typeof erpFilterOptionSchema>;

export const erpSyncOptionsSchema = z.object({
  categories: z.array(erpFilterOptionSchema),
  warehouses: z.array(erpFilterOptionSchema),
});

export type ErpSyncOptions = z.infer<typeof erpSyncOptionsSchema>;

export const ErpShipmentStatus = {
  Pending: 'Pending',
  Imported: 'Imported',
  Cancelled: 'Cancelled',
} as const;

export type ErpShipmentStatus = (typeof ErpShipmentStatus)[keyof typeof ErpShipmentStatus];

export const erpShipmentOrderItemSchema = z.object({
  erpProductId: z.string(),
  erpProductName: z.string(),
  erpSku: z.string().nullable(),
  quantity: z.number().int().min(1),
  unitWeight: z.number().nullable(),
});

export type ErpShipmentOrderItem = z.infer<typeof erpShipmentOrderItemSchema>;

export const erpShipmentOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  deliveryAddress: z.string().nullable(),
  status: z.enum(['Pending', 'Imported', 'Cancelled']),
  erpCreatedAt: z.string().datetime({ offset: true }).nullable(),
  importedAt: z.string().datetime({ offset: true }).nullable(),
  items: z.array(erpShipmentOrderItemSchema),
});

export type ErpShipmentOrder = z.infer<typeof erpShipmentOrderSchema>;

export const erpShipmentOrderFiltersSchema = z.object({
  status: z.enum(['Pending', 'Imported', 'Cancelled']).nullable().optional(),
});

export type ErpShipmentOrderFilters = z.infer<typeof erpShipmentOrderFiltersSchema>;

export const ErpSyncLogStatus = {
  Success: 'Success',
  Error: 'Error',
  Warning: 'Warning',
} as const;

export type ErpSyncLogStatus = (typeof ErpSyncLogStatus)[keyof typeof ErpSyncLogStatus];

export const ErpSyncEntityType = {
  Product: 'Product',
  ShipmentOrder: 'ShipmentOrder',
} as const;

export type ErpSyncEntityType = (typeof ErpSyncEntityType)[keyof typeof ErpSyncEntityType];

export const erpSyncLogEntrySchema = z.object({
  id: z.string(),
  entityType: z.enum(['Product', 'ShipmentOrder']),
  entityId: z.string(),
  entityName: z.string(),
  status: z.enum(['Success', 'Error', 'Warning']),
  errorReason: z.string().nullable(),
  occurredAt: z.string().datetime({ offset: true }),
});

export type ErpSyncLogEntry = z.infer<typeof erpSyncLogEntrySchema>;

export const erpSyncRunSchema = z.object({
  id: z.string(),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  status: z.enum(['Idle', 'Running', 'Completed', 'Failed']),
  totalCount: z.number().int().min(0),
  successCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  entries: z.array(erpSyncLogEntrySchema),
});

export type ErpSyncRun = z.infer<typeof erpSyncRunSchema>;

// ─── User Mapping ──────────────────────────────────────────────────────────────

export const erpRemoteUserSchema = z.object({
  erpUserId: z.string(),
  erpUserName: z.string(),
  erpUserEmail: z.string().nullable(),
  erpRole: z.string().nullable().optional(),
});

export type ErpRemoteUser = z.infer<typeof erpRemoteUserSchema>;

export const erpUserMappingSchema = z.object({
  id: z.string(),
  erpUserId: z.string(),
  erpUserName: z.string(),
  erpUserEmail: z.string().nullable(),
  erpRole: z.string().nullable().optional(),
  cargoUserId: z.string(),
  cargoUserName: z.string(),
  cargoUserEmail: z.string().nullable(),
  cargoUserRole: z.string().nullable().optional(),
  hasRoleConflict: z.boolean().optional(),
  isInvalid: z.boolean().optional(),
});

export type ErpUserMapping = z.infer<typeof erpUserMappingSchema>;

export const erpRoleConflictLogSchema = z.object({
  id: z.string(),
  adminName: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  erpUserName: z.string(),
  erpRole: z.string(),
  cargoUserName: z.string(),
  cargoUserRole: z.string(),
});

export type ErpRoleConflictLog = z.infer<typeof erpRoleConflictLogSchema>;

export const erpUnassignedDataItemSchema = z.object({
  id: z.string(),
  entityType: z.enum(['Product', 'ShipmentOrder']),
  entityId: z.string(),
  entityName: z.string(),
  erpUserId: z.string(),
  erpUserName: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
});

export type ErpUnassignedDataItem = z.infer<typeof erpUnassignedDataItemSchema>;
