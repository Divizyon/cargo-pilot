import { describe, it, expect } from 'vitest';
import {
  PROVIDER_TYPE_FROM_INT,
  PROVIDER_TYPE_TO_INT,
  SYNC_FREQUENCY_TO_INT,
  buildSyncToastMessage,
} from './useERPIntegration';
import { SyncLogStatus } from '@/lib/types/erp';

/**
 * Bu dosya frontend enum eşlemelerini backend enum sayılarına kilitler.
 * Kaynaklar:
 *  - CargoPilot.Domain/Enums/ErpProviderType.cs → Logo = 1, Netsis = 2
 *  - CargoPilot.Domain/Enums/SyncFrequency.cs   → Every4Hours = 0, Daily = 1
 *  - CargoPilot.Domain/Enums/SyncLogStatus.cs   → Running = 0, Success = 1,
 *    PartialFailure = 2, Failed = 3
 */

describe('PROVIDER_TYPE_TO_INT', () => {
  it('backend ErpProviderType değerleriyle eşleşir', () => {
    expect(PROVIDER_TYPE_TO_INT).toEqual({ Logo: 1, Netsis: 2 });
  });

  it('yalnızca Logo ve Netsis sağlayıcılarını tanır', () => {
    expect(Object.keys(PROVIDER_TYPE_TO_INT).sort()).toEqual(['Logo', 'Netsis']);
  });

  it('sağlayıcılara benzersiz sayı atar', () => {
    const values = Object.values(PROVIDER_TYPE_TO_INT);
    expect(new Set(values).size).toBe(values.length);
  });

  it('kaydet → GET dönüşü round-trip aynı sağlayıcıyı verir', () => {
    for (const name of Object.keys(PROVIDER_TYPE_TO_INT) as Array<
      keyof typeof PROVIDER_TYPE_TO_INT
    >) {
      expect(PROVIDER_TYPE_FROM_INT[PROVIDER_TYPE_TO_INT[name]]).toBe(name);
    }
  });

  it('tanımsız sağlayıcı sayısı için undefined döner', () => {
    expect(PROVIDER_TYPE_FROM_INT[0]).toBeUndefined();
  });
});

describe('SYNC_FREQUENCY_TO_INT', () => {
  it('backend SyncFrequency değerleriyle eşleşir', () => {
    // Every4Hours = 0, Daily = 1
    expect(SYNC_FREQUENCY_TO_INT).toEqual({ FourHours: 0, Daily: 1 });
  });

  it('bilinmeyen sıklık için undefined döner', () => {
    expect(SYNC_FREQUENCY_TO_INT['Weekly']).toBeUndefined();
  });
});

describe('SyncLogStatus', () => {
  it('backend SyncLogStatus sırasıyla birebir aynıdır', () => {
    expect(SyncLogStatus).toEqual({
      Running: 0,
      Success: 1,
      PartialFailure: 2,
      Failed: 3,
    });
  });
});

describe('buildSyncToastMessage', () => {
  it('hata yoksa yalnızca eklenen ve güncellenen sayısını yazar', () => {
    expect(
      buildSyncToastMessage({ added: 12, updated: 3, skipped: 0, errorCount: 0, rowErrors: [] }),
    ).toBe('Senkronizasyon tamamlandı — 12 eklendi, 3 güncellendi');
  });

  it('atlanan satır varsa nedenini belirterek sayıyı gösterir', () => {
    expect(
      buildSyncToastMessage({
        added: 2,
        updated: 1,
        skipped: 1,
        errorCount: 1,
        rowErrors: [{ erpId: 'ERP-2', sku: 'SKU-2', reason: 'satir bozuk' }],
      }),
    ).toBe('Senkronizasyon tamamlandı — 2 eklendi, 1 güncellendi, 1 satır hata nedeniyle atlandı');
  });
});
