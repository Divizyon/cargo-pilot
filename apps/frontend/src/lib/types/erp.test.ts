import { describe, it, expect } from 'vitest';
import {
  SyncLogStatus,
  erpSettingsApiSchema,
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

  it('trustServerCertificate gelmezse varsayılan true olur', () => {
    const parsed = erpSettingsApiSchema.parse(validSettings);
    expect(parsed.trustServerCertificate).toBe(true);
  });

  it('trustServerCertificate false gelirse korunur', () => {
    const parsed = erpSettingsApiSchema.parse({ ...validSettings, trustServerCertificate: false });
    expect(parsed.trustServerCertificate).toBe(false);
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

  it('kısmi başarıda satır hatalarını ayrıştırır', () => {
    const parsed = syncLogDtoSchema.parse({
      ...validLog,
      status: SyncLogStatus.PartialFailure,
      errorMessage: '3 satırdan 1 tanesi işlenemedi; diğer satırlar kaydedildi.',
      rowErrors: [{ erpId: 'ERP-2', sku: 'SKU-2', reason: 'satir bozuk' }],
    });
    expect(parsed.status).toBe(SyncLogStatus.PartialFailure);
    expect(parsed.rowErrors).toHaveLength(1);
    expect(parsed.rowErrors[0].erpId).toBe('ERP-2');
  });

  it('rowErrors gönderilmezse boş listeye düşer', () => {
    expect(syncLogDtoSchema.parse(validLog).rowErrors).toEqual([]);
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

  it('kısmi başarıda hata sayısını ve satır hatalarını taşır', () => {
    const parsed = erpSyncSummarySchema.parse({
      added: 2,
      updated: 0,
      skipped: 1,
      errorCount: 1,
      rowErrors: [{ erpId: 'ERP-2', sku: null, reason: 'satir bozuk' }],
    });
    expect(parsed.errorCount).toBe(1);
    expect(parsed.rowErrors[0].sku).toBeNull();
  });

  it('errorCount/rowErrors gönderilmezse varsayılana düşer', () => {
    const parsed = erpSyncSummarySchema.parse({ added: 0, updated: 0, skipped: 0 });
    expect(parsed.errorCount).toBe(0);
    expect(parsed.missingFieldCount).toBe(0);
    expect(parsed.rowErrors).toEqual([]);
  });

  it('eksik alanlı satır sayısını taşır', () => {
    const parsed = erpSyncSummarySchema.parse({
      added: 5,
      updated: 0,
      skipped: 0,
      missingFieldCount: 2,
    });
    expect(parsed.missingFieldCount).toBe(2);
  });
});
