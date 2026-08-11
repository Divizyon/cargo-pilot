import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DraftItem, DraftItemsParams } from '@/lib/api/useDraftItems';
import type { EditableRow } from './BulkImportDialog';

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  triggerSync: vi.fn(),
  bulkReject: vi.fn(),
  draftItemsState: { isLoading: false, isEmpty: false },
}));

vi.mock('@/lib/api/useERPIntegration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/useERPIntegration')>();
  return {
    ...actual,
    useERPConnection: () => ({ data: mocks.connection() }),
    useTriggerERPSync: () => ({ mutate: mocks.triggerSync, isPending: false }),
  };
});

vi.mock('@/lib/api/useDraftItems', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/useDraftItems')>();
  return {
    ...actual,
    useDraftItems: (params: DraftItemsParams, options?: { enabled?: boolean }) => {
      if (options?.enabled === false) {
        return { data: undefined, isLoading: false, isFetching: false };
      }
      if (mocks.draftItemsState.isLoading) {
        return { data: undefined, isLoading: true, isFetching: true };
      }
      const items = mocks.draftItemsState.isEmpty
        ? []
        : draftItems.filter((i) => i.status === params.status);
      return {
        data: { items, totalCount: items.length, page: params.page, pageSize: params.pageSize },
        isLoading: false,
        isFetching: false,
      };
    },
    useBulkRejectDraftItems: () => ({ mutate: mocks.bulkReject, isPending: false }),
  };
});

interface BulkImportDialogStubProps {
  open: boolean;
  initialRows: EditableRow[];
  draftItemIds: Record<string, string>;
}

vi.mock('./BulkImportDialog', () => ({
  BulkImportDialog: ({ open, initialRows, draftItemIds }: BulkImportDialogStubProps) =>
    open ? (
      <div data-testid="bulk-import-dialog">
        <span data-testid="dialog-row-names">{initialRows.map((r) => r.name).join('|')}</span>
        <span data-testid="dialog-draft-ids">{Object.values(draftItemIds).join('|')}</span>
      </div>
    ) : null,
}));

const { ERPItemsTable } = await import('./ERPItemsTable');
const { DRAFT_PENDING, DRAFT_APPROVED } = await import('@/lib/api/useDraftItems');

function makeDraft(overrides: Partial<DraftItem> & Pick<DraftItem, 'id' | 'name'>): DraftItem {
  return {
    status: DRAFT_PENDING,
    erpId: 'STK-0001',
    sku: 'SKU-0001',
    barcode: null,
    productType: 'Koli',
    category: 0,
    width: 60,
    height: 40,
    length: 80,
    weight: 12.5,
    fragilityType: 0,
    isStackable: true,
    maxStackCount: 3,
    maxWeightOnTop: 100,
    allowedRotations: 0,
    constraintIds: [],
    createdAtUtc: '2026-02-14T08:00:00Z',
    ...overrides,
  };
}

const draftItems: DraftItem[] = [
  makeDraft({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Palet Kasa 60x40',
    sku: 'PLT-6040',
  }),
  makeDraft({
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Karton Koli 30x20',
    sku: 'KOL-3020',
  }),
  makeDraft({
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Aktarilmis Urun',
    sku: 'APP-0001',
    status: DRAFT_APPROVED,
  }),
];

describe('ERPItemsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.draftItemsState.isLoading = false;
    mocks.draftItemsState.isEmpty = false;
    mocks.connection.mockReturnValue({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      systemName: 'Netsis',
      apiEndpoint: 'http://erp.local',
    });
  });

  it('bekleyen taslak ürünleri listeler', () => {
    render(<ERPItemsTable />);

    expect(screen.getByText('Palet Kasa 60x40')).toBeInTheDocument();
    expect(screen.getByText('KOL-3020')).toBeInTheDocument();
    expect(screen.queryByText('Aktarilmis Urun')).not.toBeInTheDocument();
  });

  it('seçilen taslak aktarım diyaloğuna taşınır', async () => {
    const user = userEvent.setup();
    render(<ERPItemsTable />);

    expect(screen.queryByTestId('bulk-import-dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Palet Kasa 60x40 satırını seç' }));
    await user.click(screen.getByRole('button', { name: /Ürünlere Aktar/ }));

    const dialog = await screen.findByTestId('bulk-import-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('dialog-row-names')).toHaveTextContent('Palet Kasa 60x40');
    expect(screen.getByTestId('dialog-draft-ids')).toHaveTextContent(
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('seçim yapılmadan sync tetiklenir, aktarım diyaloğu açılmaz', async () => {
    const user = userEvent.setup();
    render(<ERPItemsTable />);

    await user.click(screen.getByRole('button', { name: /ERP ile Sync/ }));

    expect(mocks.triggerSync).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('bulk-import-dialog')).not.toBeInTheDocument();
  });

  it('yükleme sırasında satır yerine iskelet gösterir', () => {
    mocks.draftItemsState.isLoading = true;
    render(<ERPItemsTable />);

    expect(screen.queryByText('Palet Kasa 60x40')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Tümünü seç' })).not.toBeInTheDocument();
  });

  it('ERP bağlantısı yoksa boş durum mesajı gösterir', () => {
    mocks.connection.mockReturnValue(null);
    mocks.draftItemsState.isEmpty = true;

    render(<ERPItemsTable />);

    expect(screen.getByText('ERP bağlantısı yapılandırılmamış.')).toBeInTheDocument();
  });
});
