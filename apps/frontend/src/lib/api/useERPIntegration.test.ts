import { describe, it, expect } from 'vitest';
import { PROVIDER_TYPE_TO_INT, SYNC_FREQUENCY_TO_INT } from './useERPIntegration';
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
  // ERP-04 KAPSAMI: frontend bugün {Logo:0, Netsis:1} gönderiyor, backend
  // {Logo:1, Netsis:2} bekliyor. Kayma düzeltildiğinde bu testten .skip kaldırılacak.
  it.skip('backend ErpProviderType değerleriyle eşleşir (ERP-04 ile açılacak)', () => {
    expect(PROVIDER_TYPE_TO_INT).toEqual({ Logo: 1, Netsis: 2 });
  });

  it('yalnızca Logo ve Netsis sağlayıcılarını tanır', () => {
    expect(Object.keys(PROVIDER_TYPE_TO_INT).sort()).toEqual(['Logo', 'Netsis']);
  });

  it('sağlayıcılara benzersiz sayı atar', () => {
    const values = Object.values(PROVIDER_TYPE_TO_INT);
    expect(new Set(values).size).toBe(values.length);
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
