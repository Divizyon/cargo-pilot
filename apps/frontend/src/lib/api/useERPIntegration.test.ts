import { describe, it, expect } from 'vitest';
import {
  PROVIDER_TYPE_FROM_INT,
  PROVIDER_TYPE_TO_INT,
  SYNC_FREQUENCY_TO_INT,
  buildSyncToastMessage,
  utcDateTimeSchema,
} from './useERPIntegration';
import { ErpDropReason, SyncLogStatus, type ErpSyncSummary } from '@/lib/types/erp';

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
  const emptySummary = {
    added: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errorCount: 0,
    missingFieldCount: 0,
    rowErrors: [],
    sourceTotal: 0,
    droppedByReason: {},
    unaccounted: 0,
  } satisfies ErpSyncSummary;

  it('değişmeyen satırlar güncellenenlerden ayrı raporlanır', () => {
    expect(
      buildSyncToastMessage({ ...emptySummary, added: 0, updated: 1, unchanged: 26, sourceTotal: 27 }),
    ).toBe("ERP'de 27 satır bulundu — 0 eklendi, 1 güncellendi, 26 değişmedi");
  });

  it('değişmeyen satır yoksa cümlede o parça hiç geçmez', () => {
    expect(buildSyncToastMessage({ ...emptySummary, added: 5, updated: 0, sourceTotal: 5 })).not.toContain(
      'değişmedi',
    );
  });

  it('kaynak toplamı biliniyorsa cümleye ERP satır sayısıyla başlar', () => {
    expect(buildSyncToastMessage({ ...emptySummary, added: 12, updated: 3, sourceTotal: 15 })).toBe(
      "ERP'de 15 satır bulundu — 12 eklendi, 3 güncellendi",
    );
  });

  it('kaynak toplamı yoksa genel tamamlandı cümlesine düşer', () => {
    expect(buildSyncToastMessage({ ...emptySummary, added: 12, updated: 3 })).toBe(
      'ERP senkronizasyonu tamamlandı — 12 eklendi, 3 güncellendi',
    );
  });

  it('kullanıcı filtresiyle elenen satırları filtrelendi dilinde raporlar', () => {
    expect(
      buildSyncToastMessage({
        ...emptySummary,
        added: 2,
        updated: 1,
        sourceTotal: 220,
        droppedByReason: {
          [ErpDropReason.WarehouseFiltered]: 210,
          [ErpDropReason.CategoryFiltered]: 7,
        },
      }),
    ).toBe("ERP'de 220 satır bulundu — 2 eklendi, 1 güncellendi, 217 filtrelendi");
  });

  it('hata ve kaynak elemelerini tek atlandı sayısında toplar', () => {
    expect(
      buildSyncToastMessage({
        ...emptySummary,
        added: 2,
        updated: 1,
        skipped: 1,
        errorCount: 1,
        sourceTotal: 10,
        droppedByReason: {
          [ErpDropReason.SalesLocked]: 4,
          [ErpDropReason.CategoryFiltered]: 2,
        },
        rowErrors: [{ erpId: 'ERP-2', sku: 'SKU-2', reason: 'satir bozuk' }],
      }),
    ).toBe("ERP'de 10 satır bulundu — 2 eklendi, 1 güncellendi, 2 filtrelendi, 5 atlandı");
  });

  it('eksik alanlı satır varsa kullanıcıyı tamamlaması için uyarır', () => {
    expect(
      buildSyncToastMessage({ ...emptySummary, added: 5, sourceTotal: 5, missingFieldCount: 2 }),
    ).toBe(
      "ERP'de 5 satır bulundu — 5 eklendi, 0 güncellendi. 2 satırda eksik alan var, tamamlanmadan aktarılamaz.",
    );
  });

  it('mutabakat farkını ayrı cümlede bildirir', () => {
    expect(
      buildSyncToastMessage({ ...emptySummary, added: 5, sourceTotal: 8, unaccounted: 3 }),
    ).toBe(
      "ERP'de 8 satır bulundu — 5 eklendi, 0 güncellendi. 3 satır hiçbir sayaca düşmedi (mutabakat farkı).",
    );
  });
});

describe('utcDateTimeSchema', () => {
  it('bölge damgası olmayan backend zamanını UTC olarak işaretler', () => {
    expect(utcDateTimeSchema.parse('2026-08-11T22:16:40.0926193')).toBe(
      '2026-08-11T22:16:40.0926193Z',
    );
  });

  it('damgalı değerleri olduğu gibi bırakır', () => {
    expect(utcDateTimeSchema.parse('2026-08-11T22:16:40Z')).toBe('2026-08-11T22:16:40Z');
    expect(utcDateTimeSchema.parse('2026-08-11T22:16:40+03:00')).toBe('2026-08-11T22:16:40+03:00');
  });

  it('tarih olmayan değeri reddeder', () => {
    expect(utcDateTimeSchema.safeParse('dun').success).toBe(false);
  });
});
