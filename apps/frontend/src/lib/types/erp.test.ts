import { describe, it, expect } from 'vitest';
import {
  SyncLogStatus,
  erpPendingMatchSchema,
  erpSavedMatchSchema,
  erpSettingsApiSchema,
  erpSyncFiltersSchema,
  erpSyncSummarySchema,
  syncLogDtoSchema,
} from './erp';

// Örnek payload'lar backend DTO'larından türetilmiştir; şema sözleşmesini sabitler.

function omit<T extends object>(source: T, key: keyof T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...source };
  delete copy[key as string];
  return copy;
}

describe('erpSettingsApiSchema', () => {
  const validSettings = {
    id: '3f9a1c2e-8b47-4d31-9a0e-2c5d7f6b1e04',
    providerType: 2,
    companyCode: 'DIVIZYON',
    username: 'sa',
    serverAddress: '10.0.0.5\\NETSIS',
    hasPassword: true,
  };

  it('geçerli ERP ayar payload’unu ayrıştırır', () => {
    const parsed = erpSettingsApiSchema.parse(validSettings);
    expect(parsed.providerType).toBe(2);
    expect(parsed.hasPassword).toBe(true);
  });

  it('uuid olmayan id’yi reddeder', () => {
    const result = erpSettingsApiSchema.safeParse({ ...validSettings, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('providerType string gelirse reddeder (backend int gönderir)', () => {
    const result = erpSettingsApiSchema.safeParse({ ...validSettings, providerType: 'Netsis' });
    expect(result.success).toBe(false);
  });

  it('hasPassword eksikse reddeder', () => {
    const result = erpSettingsApiSchema.safeParse(omit(validSettings, 'hasPassword'));
    expect(result.success).toBe(false);
  });
});

describe('syncLogDtoSchema', () => {
  const validLog = {
    id: 'a1d0c6e8-3f5b-4b2a-9c11-6f3d2e7a4b90',
    startedAt: '2026-02-14T08:00:00Z',
    completedAt: '2026-02-14T08:01:12Z',
    status: SyncLogStatus.Success,
    syncedRecordCount: 42,
    errorMessage: null,
  };

  it('başarılı sync log kaydını ayrıştırır', () => {
    const parsed = syncLogDtoSchema.parse(validLog);
    expect(parsed.status).toBe(1);
    expect(parsed.completedAt).toBe('2026-02-14T08:01:12Z');
  });

  it('devam eden sync’te completedAt null olabilir', () => {
    const parsed = syncLogDtoSchema.parse({
      ...validLog,
      status: SyncLogStatus.Running,
      completedAt: null,
      syncedRecordCount: 0,
    });
    expect(parsed.completedAt).toBeNull();
  });

  it('negatif syncedRecordCount’u reddeder', () => {
    const result = syncLogDtoSchema.safeParse({ ...validLog, syncedRecordCount: -1 });
    expect(result.success).toBe(false);
  });

  it('errorMessage alanı eksikse reddeder (backend her zaman gönderir)', () => {
    const result = syncLogDtoSchema.safeParse(omit(validLog, 'errorMessage'));
    expect(result.success).toBe(false);
  });
});

describe('erpPendingMatchSchema', () => {
  const validMatch = {
    id: '9b7c4d1a-2e56-4f83-8a09-5d1c3b7e6f22',
    erpProductId: 'STK-000123',
    erpProductName: 'Palet Kasa 60x40',
    erpSku: 'PLT-6040',
    erpWeight: 12.5,
    erpWidth: 60,
    erpHeight: 40,
    erpLength: 80,
  };

  it('geçerli bekleyen eşleşmeyi ayrıştırır', () => {
    const parsed = erpPendingMatchSchema.parse(validMatch);
    expect(parsed.erpSku).toBe('PLT-6040');
  });

  it('ERP’de ölçü yoksa null değerleri kabul eder', () => {
    const parsed = erpPendingMatchSchema.parse({
      ...validMatch,
      erpSku: null,
      erpWeight: null,
      erpWidth: null,
      erpHeight: null,
      erpLength: null,
    });
    expect(parsed.erpWidth).toBeNull();
  });

  it('erpProductName eksikse reddeder', () => {
    const result = erpPendingMatchSchema.safeParse(omit(validMatch, 'erpProductName'));
    expect(result.success).toBe(false);
  });
});

describe('erpSavedMatchSchema', () => {
  const validSavedMatch = {
    id: 'c4e7f2a1-6b39-4d08-91ac-7e2f5b0d8c31',
    erpProductId: 'STK-000123',
    erpProductName: 'Palet Kasa 60x40',
    erpSku: 'PLT-6040',
    cargoItemId: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    cargoItemName: 'Palet Kasa',
    cargoItemSku: 'CP-PLT-01',
  };

  it('kaydedilmiş eşleşmeyi ayrıştırır', () => {
    const parsed = erpSavedMatchSchema.parse(validSavedMatch);
    expect(parsed.cargoItemSku).toBe('CP-PLT-01');
  });

  it('cargoItemId eksikse reddeder', () => {
    const result = erpSavedMatchSchema.safeParse(omit(validSavedMatch, 'cargoItemId'));
    expect(result.success).toBe(false);
  });
});

describe('erpSyncSummarySchema', () => {
  it('sync özetini opsiyonel alanlarla ayrıştırır', () => {
    const parsed = erpSyncSummarySchema.parse({
      syncLogId: 'd2b1a9c7-4e63-4a15-8f70-3c9e1d6b2a48',
      added: 12,
      updated: 3,
      skipped: 0,
      syncedAt: '2026-02-14T08:01:12Z',
    });
    expect(parsed.added).toBe(12);
    expect(parsed.syncLogId).toBeDefined();
  });

  it('opsiyonel alanlar olmadan da ayrıştırır', () => {
    const parsed = erpSyncSummarySchema.parse({ added: 0, updated: 0, skipped: 0 });
    expect(parsed.syncedAt).toBeUndefined();
  });

  it('ondalıklı added değerini reddeder', () => {
    const result = erpSyncSummarySchema.safeParse({ added: 1.5, updated: 0, skipped: 0 });
    expect(result.success).toBe(false);
  });
});

describe('erpSyncFiltersSchema', () => {
  it('filtre seçilmediğinde null değerleri kabul eder', () => {
    const parsed = erpSyncFiltersSchema.parse({ categoryId: null, warehouseId: null });
    expect(parsed.categoryId).toBeNull();
  });

  it('sayısal categoryId’yi reddeder (backend string gönderir)', () => {
    const result = erpSyncFiltersSchema.safeParse({ categoryId: 7 });
    expect(result.success).toBe(false);
  });
});
