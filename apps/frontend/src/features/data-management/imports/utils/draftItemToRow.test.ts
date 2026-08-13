import { describe, it, expect } from 'vitest';
import { draftItemToRow } from './draftItemToRow';
import { ALLOWED_ROTATIONS, ITEM_CATEGORY, PALLET_HEIGHT_CM } from '@/lib/api/itemMappers';
import type { DraftItem } from '@/lib/api/useDraftItems';

function makeDraft(overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    erpId: 'STK-0001',
    status: 0,
    sku: 'SKU-0001',
    barcode: null,
    name: 'Test Ürün',
    productType: 'koli',
    category: ITEM_CATEGORY.Box,
    width: 60,
    height: 40,
    length: 80,
    weight: 12.5,
    fragilityType: 0,
    isStackable: true,
    maxStackCount: 3,
    maxWeightOnTop: 100,
    allowedRotations: ALLOWED_ROTATIONS.All,
    constraintIds: [],
    createdAtUtc: '2026-02-14T08:00:00Z',
    ...overrides,
  };
}

describe('draftItemToRow', () => {
  const categoryCases: Array<[number, string]> = [
    [ITEM_CATEGORY.Package, 'varil'],
    [ITEM_CATEGORY.Pallet, 'palet'],
    [ITEM_CATEGORY.Box, 'koli'],
    [ITEM_CATEGORY.Drum, 'varil'],
  ];

  it.each(categoryCases)('kategori %i → %s', (category, expected) => {
    expect(draftItemToRow(makeDraft({ category })).tip).toBe(expected);
  });

  // ERP çekimi productType'a 'General' gibi placeholder yazar; tip yalnızca kategoriden okunur.
  const placeholderTypeCases: Array<[string | null]> = [['General'], ['STANDARD'], [null]];

  it.each(placeholderTypeCases)('ERP tipi %s olsa da tip kategoriden okunur', (productType) => {
    expect(draftItemToRow(makeDraft({ productType, category: ITEM_CATEGORY.Box })).tip).toBe('koli');
  });

  const rotationCases: Array<[number, boolean, boolean, boolean]> = [
    [ALLOWED_ROTATIONS.All, true, true, true],
    [ALLOWED_ROTATIONS.NoVertical, false, true, false],
    [ALLOWED_ROTATIONS.AllLocked, false, false, false],
    [ALLOWED_ROTATIONS.NoYaw, true, false, true],
    [ALLOWED_ROTATIONS.PitchOnly, true, false, false],
    [ALLOWED_ROTATIONS.RollOnly, false, false, true],
  ];

  it.each(rotationCases)('rotasyon %i → X:%s Y:%s Z:%s', (allowedRotations, x, y, z) => {
    const row = draftItemToRow(makeDraft({ allowedRotations }));
    expect([row.allowRotateX, row.allowRotateY, row.allowRotateZ]).toEqual([x, y, z]);
  });

  it('ölçü, ağırlık ve not alanlarını satır modeline taşır', () => {
    const row = draftItemToRow(
      makeDraft({ sku: null, maxStackCount: 0, specialNotes: 'kırılgan', constraintIds: [2, 5] }),
    );

    expect(row.sku).toBe('');
    expect(row.maxStackCount).toBe('1');
    expect(row.notes).toBe('kırılgan');
    expect(row.constraintIds).toEqual([2, 5]);
    expect([row.width, row.height, row.length, row.weight]).toEqual(['60', '40', '80', '12.5']);
  });

  it('ERP eksik alan işaretlerini satır modeline taşır', () => {
    const row = draftItemToRow(makeDraft({ width: 0, missingFields: ['width'] }));

    expect(row.missingFields).toEqual(['width']);
  });

  it('eksik alan bilgisi yoksa boş liste taşır', () => {
    expect(draftItemToRow(makeDraft({})).missingFields).toEqual([]);
  });

  it('palet üründe kayıttaki palet tabanı yükseklikten düşülür', () => {
    const row = draftItemToRow(
      makeDraft({ productType: 'palet', category: ITEM_CATEGORY.Pallet, height: 154 }),
    );

    expect(row.height).toBe(String(154 - PALLET_HEIGHT_CM));
  });

  it('taslağın yük grubunu tek seçime çevirir, uyumsuz grupları türetir', () => {
    const row = draftItemToRow(makeDraft({ stackGroup: 'Kimya' }));

    expect(row.stackGroup).toBe('Kimya');
    expect(row.incompatibleGroups).toEqual(['Gıda', 'Elektronik', 'Tekstil']);
  });

  it('stackGroup yoksa eski taslaklardaki ilk seçim yük grubu sayılır', () => {
    const row = draftItemToRow(makeDraft({ incompatibleGroups: ['Gıda', 'Kimya'] }));

    expect(row.stackGroup).toBe('Gıda');
    expect(row.incompatibleGroups).toEqual(['Kimya', 'Tehlikeli Madde']);
  });

  it('yük grubu seçilmemiş taslakta boş liste taşır', () => {
    const row = draftItemToRow(makeDraft({}));

    expect(row.stackGroup).toBe('');
    expect(row.incompatibleGroups).toEqual([]);
  });
});
