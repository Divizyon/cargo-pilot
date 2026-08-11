import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { EditableRow } from './BulkImportDialog';

const mocks = vi.hoisted(() => ({
  updateDraft: vi.fn(),
  approveBulk: vi.fn(),
  bulkCreate: vi.fn(),
}));

vi.mock('@/lib/api/useDraftItems', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/useDraftItems')>();
  return {
    ...actual,
    useUpdateDraftItem: () => ({ mutateAsync: mocks.updateDraft, isPending: false }),
    useBulkApproveDraftItems: () => ({ mutateAsync: mocks.approveBulk, isPending: false }),
  };
});

vi.mock('@/lib/api/useItems', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/useItems')>();
  return {
    ...actual,
    fetchAllItems: () => Promise.resolve([]),
    useBulkCreateItems: () => ({ mutate: mocks.bulkCreate, isPending: false }),
  };
});

const { BulkImportDialog } = await import('./BulkImportDialog');

function makeRow(id: string, overrides: Partial<EditableRow> = {}): EditableRow {
  return {
    _id: id,
    sku: `SKU-${id}`,
    name: `Urun ${id}`,
    tip: 'koli',
    width: '40',
    height: '30',
    length: '50',
    weight: '8',
    fragility: '0',
    constraintIds: [],
    incompatibleGroups: ['Genel'],
    isStackable: false,
    maxStackCount: '1',
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    notes: '',
    missingFields: [],
    ...overrides,
  };
}

function renderDialog(rows: EditableRow[], onOpenChange = vi.fn()) {
  const draftItemIds = Object.fromEntries(rows.map((r) => [r._id, `draft-${r._id}`]));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <BulkImportDialog
      open
      onOpenChange={onOpenChange}
      initialRows={rows}
      draftItemIds={draftItemIds}
    />,
    { wrapper },
  );
  return { onOpenChange, draftItemIds };
}

describe('BulkImportDialog — kısmi aktarım (ERP-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateDraft.mockResolvedValue({});
    mocks.approveBulk.mockResolvedValue({ approved: 2, skipped: 0, skippedItems: [] });
  });

  it('hatalı satır varken yalnızca geçerli satırları aktarır, hatalı satır diyalogda kalır', async () => {
    const user = userEvent.setup();
    const rows = [
      makeRow('a'),
      makeRow('b'),
      makeRow('c', { width: '0', missingFields: ['width'] }),
    ];
    const { onOpenChange } = renderDialog(rows);

    const confirm = screen.getByRole('button', { name: 'Geçerli satırları aktar (2)' });
    expect(confirm).toBeEnabled();

    await user.click(confirm);

    expect(mocks.updateDraft).toHaveBeenCalledTimes(2);
    expect(mocks.approveBulk).toHaveBeenCalledTimes(1);
    expect(mocks.approveBulk).toHaveBeenCalledWith(['draft-a', 'draft-b']);

    expect(await screen.findByText('1 satır hata nedeniyle bekliyor.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Urun c')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Urun a')).not.toBeInTheDocument();
  });

  it('backendin atladığı satırlar nedeniyle birlikte diyalogda kalır', async () => {
    const user = userEvent.setup();
    mocks.approveBulk.mockResolvedValue({
      approved: 1,
      skipped: 1,
      skippedItems: [
        { id: 'draft-b', sku: 'SKU-b', reason: 'Bu SKU ile kayıtlı bir ürün zaten mevcut.' },
      ],
    });
    renderDialog([makeRow('a'), makeRow('b')]);

    await user.click(screen.getByRole('button', { name: '2 Ürünü Onayla' }));

    expect(
      await screen.findByText('SKU-b: Bu SKU ile kayıtlı bir ürün zaten mevcut.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 satır hata nedeniyle bekliyor.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Urun b')).toBeInTheDocument();
  });

  it('tüm satırlar aktarıldığında diyalog kapanır', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog([makeRow('a'), makeRow('b')]);

    await user.click(screen.getByRole('button', { name: '2 Ürünü Onayla' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
