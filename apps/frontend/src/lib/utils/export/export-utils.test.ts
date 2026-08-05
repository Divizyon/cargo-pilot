import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';

const mockJsonToSheet = vi.fn((data) => ({ data }));
const mockAoaToSheet = vi.fn((data) => ({ data }));
const mockBookNew = vi.fn(() => ({}));
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mockJsonToSheet,
    aoa_to_sheet: mockAoaToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
  },
  writeFile: mockWriteFile,
}));

const { exportPlanToExcel } = await import('@/lib/utils/export/export-utils');

describe('exportPlanToExcel', () => {
  const mockItem: Item = {
    id: 'item-1',
    name: 'Test Item',
    sku: 'SKU-001',
    width: 10,
    height: 20,
    length: 30,
    weight: 5,
    isStackable: true,
    maxStackCount: 5,
  };

  const mockPlacement: PlacementWithDimensions = {
    itemId: 'item-1',
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    orientationIndex: 0,
    layer: 1,
    isViolation: false,
    width: 10,
    height: 20,
    depth: 30,
  };

  const mockViolationPlacement: PlacementWithDimensions = {
    ...mockPlacement,
    itemId: 'item-2',
    isViolation: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create correct row data from placements', () => {
    const placements = [mockPlacement];
    const items = [mockItem];

    exportPlanToExcel('plan-123', placements, items);

    const jsonToSheetCall = mockJsonToSheet.mock.calls[0][0];
    expect(jsonToSheetCall).toEqual([
      {
        'Ürün Adı': 'Test Item',
        SKU: 'SKU-001',
        'Genişlik (cm)': 10,
        'Yükseklik (cm)': 20,
        'Derinlik (cm)': 30,
        'Konum X': 0,
        'Konum Y': 0,
        'Konum Z': 0,
        'Kural İhlali': 'Uygun',
      },
    ]);
  });

  it('should mark violation placements as İhlal', () => {
    const placements = [mockViolationPlacement];
    const items = [{ ...mockItem, id: 'item-2' }];

    exportPlanToExcel('plan-123', placements, items);

    const jsonToSheetCall = mockJsonToSheet.mock.calls[0][0];
    expect(jsonToSheetCall[0]['Kural İhlali']).toBe('İhlal');
  });

  it('should default missing item name and SKU to dash', () => {
    const placements = [mockPlacement];
    const items: Item[] = [];

    exportPlanToExcel('plan-123', placements, items);

    const jsonToSheetCall = mockJsonToSheet.mock.calls[0][0];
    expect(jsonToSheetCall[0]['Ürün Adı']).toBe('-');
    expect(jsonToSheetCall[0]['SKU']).toBe('-');
  });

  it('should call writeFile with correct filename pattern', () => {
    const placements = [mockPlacement];
    const items = [mockItem];
    const planId = 'plan-1234567890ab';

    exportPlanToExcel(planId, placements, items);

    expect(mockWriteFile).toHaveBeenCalledWith(expect.any(Object), 'CargoPilot_Plan_plan-123.xlsx');
  });

  it('should call book_append_sheet with correct sheet name', () => {
    const placements = [mockPlacement];
    const items = [mockItem];

    exportPlanToExcel('plan-123', placements, items);

    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'Yükleme Planı',
    );
  });
});
