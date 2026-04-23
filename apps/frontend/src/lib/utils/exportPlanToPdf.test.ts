import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PdfExportData } from '@/lib/utils/exportPlanToPdf';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';

const mockToBlob = vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
const mockPdf = vi.fn(() => ({
  toBlob: mockToBlob,
}));

vi.mock('@react-pdf/renderer', () => ({
  pdf: mockPdf,
}));

vi.mock('@/features/planning/components/PlanPdfDocument', () => ({
  PlanPdfDocument: () => null,
}));

const { exportPlanToPdf } = await import('@/lib/utils/exportPlanToPdf');

describe('exportPlanToPdf', () => {
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
    rotation: 0,
    layer: 1,
    isViolation: false,
    width: 10,
    height: 20,
    depth: 30,
  };

  const mockData: PdfExportData = {
    planId: 'plan-1234567890ab',
    placements: [mockPlacement],
    items: [mockItem],
    vehicle: {
      id: 'vehicle-1',
      name: 'Vehicle 1',
      width: 200,
      height: 200,
      length: 500,
      payload: 5000,
    },
    snapshotDataUrl: 'data:image/png;base64,abc123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('should call pdf with React element', async () => {
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    if (typeof document === 'undefined') {
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockLink),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      });
    } else {
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') return mockLink as HTMLAnchorElement;
        return originalCreateElement(tag);
      });
    }

    await exportPlanToPdf(mockData);

    expect(mockPdf).toHaveBeenCalledOnce();
    const element = mockPdf.mock.calls[0][0];
    expect(element).toBeDefined();
  });

  it('should call toBlob and revoke object URL', async () => {
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    if (typeof document === 'undefined') {
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockLink),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      });
    } else {
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') return mockLink as HTMLAnchorElement;
        return originalCreateElement(tag);
      });
    }

    await exportPlanToPdf(mockData);

    expect(mockToBlob).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should use correct filename format with first 8 chars of plan ID', async () => {
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    if (typeof document === 'undefined') {
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockLink),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      });
    } else {
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'a') return mockLink as HTMLAnchorElement;
        return originalCreateElement(tag);
      });
    }

    const dataWithLongId: PdfExportData = {
      ...mockData,
      planId: 'plan-1234567890ab',
    };

    await exportPlanToPdf(dataWithLongId);

    expect(mockLink.download).toBe('CargoPilot_Plan_plan-123.pdf');
  });
});
