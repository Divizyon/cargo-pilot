import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import * as XLSX from 'xlsx';
import {
  buildItemImportTemplateWorkbook,
  buildItemsWorkbook,
} from '@/lib/utils/export/export-utils';
import {
  ITEM_SHEET_HEADER,
  LEGACY_ITEM_SHEET_HEADER,
  LOAD_GROUPS,
} from '@/lib/config/item-import-columns';
import {
  ALLOWED_ROTATIONS,
  ITEM_CATEGORY,
  PALLET_HEIGHT_CM,
  type CreateItemRequest,
} from '@/lib/api/itemMappers';
import {
  validateRow,
  xlsxToRows,
  type EditableRow,
} from '@/features/data-management/imports/utils/itemImportRow';
import type { Item } from '@/lib/types/item';

const mocks = vi.hoisted(() => ({
  updateDraft: vi.fn(),
  approveBulk: vi.fn(),
  bulkCreate: vi.fn(),
  fetchAllItems: vi.fn(),
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
    fetchAllItems: () => mocks.fetchAllItems(),
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
    stackGroup: 'Genel',
    incompatibleGroups: ['Tehlikeli Madde'],
    isStackable: false,
    maxStackCount: '1',
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    notes: '',
    missingFields: [],
    barcode: null,
    ...overrides,
  };
}

function renderDialog(
  rows: EditableRow[],
  onOpenChange = vi.fn(),
  mode: 'import' | 'update' = 'import',
) {
  const draftItemIds = Object.fromEntries(rows.map((r) => [r._id, `draft-${r._id}`]));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(
    <BulkImportDialog
      open
      onOpenChange={onOpenChange}
      initialRows={rows}
      draftItemIds={draftItemIds}
      mode={mode}
    />,
    { wrapper },
  );
  return { onOpenChange, draftItemIds };
}

/** Taslak akışı olmadan render eder; onay `bulk-create` isteğini üretir. */
function renderCreateDialog(rows: EditableRow[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<BulkImportDialog open onOpenChange={vi.fn()} initialRows={rows} />, { wrapper });
}

function firstCreatedItem(): CreateItemRequest {
  const [variables] = mocks.bulkCreate.mock.calls[0] as [{ items: CreateItemRequest[] }];
  return variables.items[0];
}

describe('BulkImportDialog — kısmi aktarım (ERP-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllItems.mockResolvedValue([]);
    mocks.updateDraft.mockResolvedValue({});
    mocks.approveBulk.mockResolvedValue({ approved: 2, skipped: 0, skippedItems: [] });
  });

  it('ızgarada düzenlenmeyen ERP barkodunu taslak güncellemesinde korur', async () => {
    const user = userEvent.setup();
    renderDialog([makeRow('a', { barcode: '8690000000001' })]);

    await user.click(screen.getByRole('button', { name: /aktar/i }));

    expect(mocks.updateDraft).toHaveBeenCalledTimes(1);
    expect(mocks.updateDraft.mock.calls[0][0]).toMatchObject({
      payload: { barcode: '8690000000001' },
    });
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

    await user.click(screen.getByRole('button', { name: '2 Ürünü Aktar' }));

    expect(
      await screen.findByText('SKU-b: Bu SKU ile kayıtlı bir ürün zaten mevcut.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 satır hata nedeniyle bekliyor.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Urun b')).toBeInTheDocument();
  });

  it('tüm satırlar aktarıldığında diyalog kapanır', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog([makeRow('a'), makeRow('b')]);

    await user.click(screen.getByRole('button', { name: '2 Ürünü Aktar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('BulkImportDialog — sütun bazlı toplu doldurma (ERP-33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllItems.mockResolvedValue([]);
    mocks.updateDraft.mockResolvedValue({});
    mocks.approveBulk.mockResolvedValue({ approved: 50, skipped: 0, skippedItems: [] });
  });

  it('50 satırın yük grubu tek işlemle dolar ve onay butonu aktifleşir', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 50 }, (_, i) =>
      makeRow(String(i), { stackGroup: '', incompatibleGroups: [] }),
    );
    renderDialog(rows);

    expect(screen.getByRole('button', { name: 'Geçerli satırları aktar (0)' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Yük Grubu sütununu toplu doldur' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Genel' }));
    await user.click(screen.getByRole('button', { name: 'Uygula' }));

    const confirm = await screen.findByRole('button', { name: '50 Ürünü Aktar' });
    expect(confirm).toBeEnabled();
    // 50 satırlık grid varsayılan 5 sn sınırına yakın çiziliyor; ölçüm değil davranış testi.
  }, 15000);

  it('onay olmadan dolu satırın üzerine yazmaz, onaylanınca yazar', async () => {
    const user = userEvent.setup();
    renderDialog([
      makeRow('a', { stackGroup: 'Kimya', incompatibleGroups: ['Gıda', 'Elektronik', 'Tekstil'] }),
      makeRow('b', { stackGroup: '', incompatibleGroups: [] }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Yük Grubu sütununu toplu doldur' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Gıda' }));
    await user.click(screen.getByRole('button', { name: 'Uygula' }));

    expect(screen.getByRole('combobox', { name: 'Urun a — Yük Grubu: Kimya' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: /Yük Grubu: Gıda$/ })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Yük Grubu sütununu toplu doldur' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Gıda' }));
    await user.click(screen.getByRole('checkbox', { name: 'Dolu satırların üzerine yaz' }));
    await user.click(screen.getByRole('button', { name: 'Uygula' }));

    expect(
      screen.queryByRole('combobox', { name: 'Urun a — Yük Grubu: Kimya' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: /Yük Grubu: Gıda$/ })).toHaveLength(2);
  });

  it('yük grubu toplu doldurmada yalnızca son işaretlenen grup uygulanır', async () => {
    const user = userEvent.setup();
    renderDialog([makeRow('a', { stackGroup: '', incompatibleGroups: [] })]);

    await user.click(screen.getByRole('button', { name: 'Yük Grubu sütununu toplu doldur' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Kimya' }));
    await user.click(screen.getByRole('checkbox', { name: 'Tekstil' }));
    await user.click(screen.getByRole('button', { name: 'Uygula' }));

    expect(
      screen.getByRole('combobox', { name: 'Urun a — Yük Grubu: Tekstil' }),
    ).toBeInTheDocument();
  });
});

// ─── Şablon simetrisi (ERP-19) ────────────────────────────────────────────────

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Kimyasal Bidon',
    sku: 'SKU-RT-1',
    productType: 'varil',
    width: 40,
    height: 60,
    length: 40,
    weight: 18,
    isStackable: true,
    maxStackCount: 3,
    maxWeightOnTop: 54,
    fragility: 9,
    allowRotateX: false,
    allowRotateY: true,
    allowRotateZ: false,
    allowFaceBottom: true,
    allowFaceTop: true,
    allowFaceFront: true,
    allowFaceBack: true,
    allowFaceLeft: true,
    allowFaceRight: true,
    specialNotes: 'Dik taşınır',
    stackGroup: 'Kimya',
    constraintIds: [2, 9],
    incompatibleGroups: ['Gıda'],
    erpProviderName: null,
    ...overrides,
  };
}

function firstSheet(wb: XLSX.WorkBook): XLSX.WorkSheet {
  return wb.Sheets[wb.SheetNames[0]];
}

/** Diske yazmadan çalışabilmek için workbook bellekte parse edilir. */
function reparse(wb: XLSX.WorkBook): EditableRow[] {
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const reopened = XLSX.read(buffer, { type: 'array' });
  return xlsxToRows(firstSheet(reopened));
}

describe('Ürün şablonu ↔ ayrıştırıcı simetrisi (ERP-19)', () => {
  it('resmi şablonun örnek satırı hatasız ayrıştırılır, Yük Grubu zorunlu hatasına düşmez', () => {
    const rows = reparse(buildItemImportTemplateWorkbook());

    expect(rows).toHaveLength(1);
    expect(rows[0].stackGroup).toBe('Genel');
    expect(rows[0].incompatibleGroups).toEqual(['Tehlikeli Madde']);
    expect(validateRow(rows[0])).toEqual({});
  });

  it('dışa aktarım → içe aktarımda kırılganlık, kısıt ve yük grubu kaybolmaz', () => {
    const item = makeItem();
    const rows = reparse(buildItemsWorkbook([item], new Date('2026-01-01T00:00:00Z')));

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.sku).toBe(item.sku);
    expect(row.name).toBe(item.name);
    expect(row.tip).toBe('varil');
    expect(row.width).toBe('40');
    expect(row.height).toBe('60');
    expect(row.length).toBe('40');
    expect(row.weight).toBe('18');
    expect(row.constraintIds).toEqual([2, 9]);
    expect(row.fragility).toBe('9');
    // Hücrenin ilk grubu stackGroup olur; uyumsuz gruplar ondan türetilir.
    expect(row.stackGroup).toBe('Kimya');
    expect(row.incompatibleGroups).toEqual(['Gıda', 'Elektronik', 'Tekstil']);
    expect(row.isStackable).toBe(true);
    expect(row.maxStackCount).toBe('3');
    expect(row.allowRotateX).toBe(false);
    expect(row.allowRotateY).toBe(true);
    expect(row.allowRotateZ).toBe(false);
    expect(row.notes).toBe('Dik taşınır');
    expect(validateRow(row)).toEqual({});
  });

  it('kısıt listesi boş olan üründe kırılganlık derecesi korunur', () => {
    const rows = reparse(
      buildItemsWorkbook(
        [makeItem({ fragility: 3, constraintIds: [] })],
        new Date('2026-01-01T00:00:00Z'),
      ),
    );

    expect(rows[0].constraintIds).toEqual([3]);
    expect(rows[0].fragility).toBe('3');
  });

  it('ürün formundaki her yük grubu round-trip sonunda korunur', () => {
    const items = LOAD_GROUPS.map((group, i) =>
      makeItem({
        id: `2222222${i}-1111-4111-8111-111111111111`,
        sku: `SKU-GRUP-${i}`,
        stackGroup: group,
        incompatibleGroups: [],
      }),
    );

    const rows = reparse(buildItemsWorkbook(items, new Date('2026-01-01T00:00:00Z')));

    expect(rows.map((r) => r.stackGroup)).toEqual([...LOAD_GROUPS]);
    expect(rows.every((r) => r.incompatibleGroups.length > 0)).toBe(true);
  });

  it('kısıt hücresine kod yerine ekranda görünen etiket yazılabilir', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['SKU', 'Ürün Adı', ITEM_SHEET_HEADER.constraints, ITEM_SHEET_HEADER.loadGroups],
      ['SKU-ETIKET', 'Etiketli Ürün', 'Yakıcı, Sıvı İçerir, Kuru Tut', 'Kimya'],
    ]);

    const rows = xlsxToRows(ws);

    expect(rows[0].constraintIds).toEqual([4, 2, 8]);
    expect(rows[0].fragility).toBe('8');
  });

  it('eski başlıkların her sürümüyle doldurulmuş dosya da okunur', () => {
    for (const legacyConstraintHeader of LEGACY_ITEM_SHEET_HEADER.constraints) {
      const ws = XLSX.utils.aoa_to_sheet([
        [
          'SKU',
          'Ürün Adı',
          legacyConstraintHeader,
          LEGACY_ITEM_SHEET_HEADER.loadGroups[0],
          LEGACY_ITEM_SHEET_HEADER.maxStackCount[0],
        ],
        ['SKU-ESKI', 'Eski Şablon Ürünü', '2', 'Gıda', '4'],
      ]);

      const rows = xlsxToRows(ws);

      expect(rows[0].constraintIds).toEqual([2]);
      expect(rows[0].fragility).toBe('2');
      expect(rows[0].stackGroup).toBe('Gıda');
      expect(rows[0].incompatibleGroups).toEqual(['Kimya', 'Tehlikeli Madde']);
      expect(rows[0].maxStackCount).toBe('4');
    }
  });
});

// ─── Ürün formu kuralları (onay grid) ─────────────────────────────────────────

describe('BulkImportDialog — ürün formu kuralları', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllItems.mockResolvedValue([]);
  });

  it('varil satırı ürün formuyla aynı kategoriyi, çapı ve derinliği gönderir', async () => {
    const user = userEvent.setup();
    renderCreateDialog([makeRow('a', { tip: 'varil', width: '40', length: '55' })]);

    await user.click(await screen.findByRole('button', { name: '1 Ürün Ekle' }));

    const item = firstCreatedItem();
    expect(item.category).toBe(ITEM_CATEGORY.Drum);
    expect(item.diameter).toBe(40);
    expect(item.length).toBe(40);
    expect(item.allowedRotations).toBe(ALLOWED_ROTATIONS.NoVertical);
  });

  it('palet ürünü dışa aktarım → içe aktarım → kayıt döngüsünde aynı yükseklikte kalır', async () => {
    const user = userEvent.setup();
    const height = 100 + PALLET_HEIGHT_CM;
    const rows = reparse(
      buildItemsWorkbook(
        [
          makeItem({
            productType: 'palet',
            height,
            constraintIds: [],
            fragility: 0,
            allowRotateX: true,
          }),
        ],
        new Date('2026-01-01T00:00:00Z'),
      ),
    );

    // Gridde yalnızca ürün yüksekliği düzenlenir; palet tabanı kayıtta eklenir.
    expect(rows[0].height).toBe('100');

    renderCreateDialog(rows);
    await user.click(await screen.findByRole('button', { name: '1 Ürün Ekle' }));

    const item = firstCreatedItem();
    expect(item.height).toBe(height);
    expect(item.category).toBe(ITEM_CATEGORY.Pallet);
    expect(item.allowedRotations).toBe(ALLOWED_ROTATIONS.PitchOnly);
  });

  it('yük kısıtı seçilince Z ekseni kilitlenir', async () => {
    const user = userEvent.setup();
    renderCreateDialog([makeRow('a')]);

    expect(screen.getByRole('checkbox', { name: 'Urun a — Z ekseni' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Urun a — Yük Kısıtları: Normal' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Kırılgan' }));

    const rotateZ = screen.getByRole('checkbox', { name: 'Urun a — Z ekseni' });
    expect(rotateZ).toBeDisabled();
    expect(rotateZ).toHaveAttribute('aria-checked', 'false');
  });
});

// ─── Güncelleme onayında mevcut-SKU kontrolü ──────────────────────────────────

describe('BulkImportDialog — ERP güncelleme onayında SKU çakışması', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateDraft.mockResolvedValue({});
    mocks.approveBulk.mockResolvedValue({ approved: 1, skipped: 0, skippedItems: [] });
  });

  it('güncellemede kendi SKU’su çakışma sayılmaz, başka kaydın SKU’su sayılır', async () => {
    const user = userEvent.setup();
    mocks.fetchAllItems.mockResolvedValue([
      makeItem({ id: '11111111-1111-4111-8111-111111111111', sku: 'SKU-a' }),
      makeItem({ id: '22222222-2222-4222-8222-222222222222', sku: 'SKU-b' }),
      makeItem({ id: '33333333-3333-4333-8333-333333333333', sku: 'SKU-baska' }),
    ]);

    renderDialog([makeRow('a'), makeRow('b')], vi.fn(), 'update');

    // Her iki satırın SKU'su üründe zaten kayıtlı; kendi kaydı çakışma sayılmaz.
    const confirm = await screen.findByRole('button', { name: '2 Ürünü Güncelle' });
    expect(confirm).toBeEnabled();
    expect(screen.getByDisplayValue('SKU-a')).not.toHaveAttribute('title', 'Bu SKU kullanılıyor');

    // SKU başka bir kaydınkine çevrilirse çakışma yeniden işaretlenir.
    const skuInput = screen.getByDisplayValue('SKU-b');
    await user.clear(skuInput);
    await user.type(skuInput, 'SKU-baska');

    expect(await screen.findByText('1 satırda hata var')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SKU-baska')).toHaveAttribute('title', 'Bu SKU kullanılıyor');
    expect(screen.getByRole('button', { name: 'Geçerli satırları aktar (1)' })).toBeEnabled();
  });

  it('aktarım modunda mevcut SKU çakışma olarak işaretlenir', async () => {
    mocks.fetchAllItems.mockResolvedValue([
      makeItem({ id: '11111111-1111-4111-8111-111111111111', sku: 'SKU-a' }),
    ]);

    renderDialog([makeRow('a')]);

    expect(await screen.findByText('1 satırda hata var')).toBeInTheDocument();
  });
});
