import { describe, it, expect } from 'vitest';
import { DROP_REASON_LABEL, dropReasonLabel, summarizeDrops } from './erpDropReasons';
import { ErpDropReason } from '@/lib/types/erp';

describe('erpDropReasons sözlüğü', () => {
  it('backend ErpDropReason anahtarlarının tamamını karşılar', () => {
    expect(Object.keys(DROP_REASON_LABEL).sort()).toEqual(Object.values(ErpDropReason).sort());
  });

  it('bilinmeyen nedeni ham anahtarıyla gösterir', () => {
    expect(dropReasonLabel('YeniNeden')).toBe('YeniNeden');
  });
});

describe('summarizeDrops', () => {
  it('filtre kaynaklı ve diğer elemeleri ayrı toplar', () => {
    const result = summarizeDrops({
      [ErpDropReason.CategoryFiltered]: 5,
      [ErpDropReason.WarehouseFiltered]: 10,
      [ErpDropReason.SalesLocked]: 4,
      [ErpDropReason.DuplicateErpId]: 1,
    });

    expect(result.filtered).toBe(15);
    expect(result.dropped).toBe(5);
  });

  it('sıfır sayılı nedenleri gizler ve kalanı büyükten küçüğe sıralar', () => {
    const result = summarizeDrops({
      [ErpDropReason.CategoryFiltered]: 0,
      [ErpDropReason.SalesLocked]: 2,
      [ErpDropReason.WarehouseFiltered]: 9,
    });

    expect(result.rows.map((r) => r.reason)).toEqual([
      ErpDropReason.WarehouseFiltered,
      ErpDropReason.SalesLocked,
    ]);
    expect(result.rows[0]).toMatchObject({ label: 'Depo filtresi', count: 9, isFilter: true });
    expect(result.rows[1].isFilter).toBe(false);
  });

  it('eleme yoksa sıfır döner', () => {
    expect(summarizeDrops({})).toEqual({ filtered: 0, dropped: 0, rows: [] });
  });
});
