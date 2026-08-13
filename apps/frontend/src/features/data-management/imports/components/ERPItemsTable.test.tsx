import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { DraftItem, DraftItemsParams } from '@/lib/api/useDraftItems';
import type { EditableRow } from './BulkImportDialog';

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  erpSettings: vi.fn(),
  triggerSync: vi.fn(),
  bulkReject: vi.fn(),
  reinstate: vi.fn(),
  draftItemsState: {
    isLoading: false,
    isEmpty: false,
    error: null as unknown,
    /** Sayfalama gibi yalnızca çok kayıtta çizilen yüzeyleri test etmek için. */
    extraPending: [] as DraftItem[],
  },
}));

vi.mock('@/lib/api/useERPIntegration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/useERPIntegration')>();
  return {
    ...actual,
    useERPConnection: () => ({ data: mocks.connection() }),
    useERPSettings: () => ({ data: mocks.erpSettings() }),
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
      if (mocks.draftItemsState.error) {
        return {
          data: undefined,
          isLoading: false,
          isFetching: false,
          isError: true,
          error: mocks.draftItemsState.error,
          refetch: vi.fn(),
        };
      }
      if (mocks.draftItemsState.isLoading) {
        return { data: undefined, isLoading: true, isFetching: true };
      }
      // Backend sözleşmesi: 'Reddedilenler' filtresi tam retleri de reddedilen güncellemeleri de döner.
      const matchesStatus = (item: DraftItem) =>
        params.status === DRAFT_REJECTED
          ? item.status === DRAFT_REJECTED || item.status === DRAFT_UPDATE_DISMISSED
          : item.status === params.status;
      const inStatus = mocks.draftItemsState.isEmpty
        ? []
        : [...draftItems, ...mocks.draftItemsState.extraPending].filter(matchesStatus);

      // Arama ve tip filtresi sunucuda uygulanir; istemcide filtrelemek yalnizca acik
      // sayfayi kapsardi. Sahte uc bu sozlesmeyi taklit eder.
      const term = params.search?.toLowerCase() ?? '';
      const matching = inStatus
        .filter(
          (item) =>
            !term ||
            item.name.toLowerCase().includes(term) ||
            (item.sku ?? '').toLowerCase().includes(term) ||
            (item.erpId ?? '').toLowerCase().includes(term) ||
            (item.barcode ?? '').toLowerCase().includes(term),
        )
        .filter((item) => !params.categories?.length || params.categories.includes(item.category));

      // Sayfalama sunucu tarafindadir: istek yalnizca o sayfanin kayitlarini doner.
      // Dilimleme olmadan sayfa disi kayitlarin da elde oldugu sanilir ve sayfalar
      // arasi secim hatalari testten kacar.
      const start = (params.page - 1) * params.pageSize;
      const items = matching.slice(start, start + params.pageSize);
      return {
        data: {
          items,
          totalCount: matching.length,
          page: params.page,
          pageSize: params.pageSize,
          // Secenekler kategori filtresinden once cikarilir; filtre kendini daraltmaz.
          availableCategories: Array.from(new Set(inStatus.map((item) => item.category))),
        },
        isLoading: false,
        isFetching: false,
      };
    },
    useBulkRejectDraftItems: () => ({ mutate: mocks.bulkReject, isPending: false }),
    useReinstateDraftItems: () => ({ mutate: mocks.reinstate, isPending: false }),
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

function renderTable(node: ReactNode = <ERPItemsTable />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}
const {
  DRAFT_PENDING,
  DRAFT_APPROVED,
  DRAFT_REJECTED,
  DRAFT_UPDATE_PENDING,
  DRAFT_UPDATE_DISMISSED,
} = await import('@/lib/api/useDraftItems');

function makeDraft(overrides: Partial<DraftItem> & Pick<DraftItem, 'id' | 'name'>): DraftItem {
  return {
    status: DRAFT_PENDING,
    erpId: 'STK-0001',
    sku: 'SKU-0001',
    barcode: null,
    // ERP çekimi productType alanına sabit "General" yazar; tip grup kodundan çözülen
    // kategoriden okunur. Varsayılan category 0 (Package) '?' kovasına düşer.
    productType: 'General',
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
    missingFields: [],
    ...overrides,
  };
}

const draftItems: DraftItem[] = [
  // Kategorisi ERP grup kodundan çözülen kayıtlar; sütun category'yi basar.
  makeDraft({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Palet Kasa 60x40',
    sku: 'PLT-6040',
    productType: 'palet',
    category: 1,
  }),
  makeDraft({
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Karton Koli 30x20',
    sku: 'KOL-3020',
    productType: 'koli',
    category: 2,
  }),
  // productType hâlâ ERP placeholder'ı ama grup kodu Drum çözülmüş: tip kategoriden gelir.
  makeDraft({
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Sac Vida Ficisi',
    sku: 'VRL-0001',
    productType: 'General',
    category: 3,
  }),
  makeDraft({
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Aktarilmis Urun',
    sku: 'APP-0001',
    status: DRAFT_APPROVED,
  }),
  makeDraft({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Olcusuz Urun',
    sku: 'EKS-0001',
    width: 0,
    weight: 0,
    missingFields: ['width', 'weight'],
  }),
  makeDraft({
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Reddedilmis Urun',
    sku: 'RED-0001',
    status: DRAFT_REJECTED,
  }),
  makeDraft({
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Guncellemesi Reddedilmis Urun',
    sku: 'RED-0002',
    status: DRAFT_UPDATE_DISMISSED,
  }),
  makeDraft({
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Guncellenecek Urun A',
    sku: 'GNC-0001',
    status: DRAFT_UPDATE_PENDING,
  }),
  makeDraft({
    id: '88888888-8888-4888-8888-888888888888',
    name: 'Guncellenecek Urun B',
    sku: 'GNC-0002',
    status: DRAFT_UPDATE_PENDING,
  }),
];

describe('ERPItemsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.draftItemsState.isLoading = false;
    mocks.draftItemsState.isEmpty = false;
    mocks.draftItemsState.error = null;
    mocks.draftItemsState.extraPending = [];
    mocks.connection.mockReturnValue({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      systemName: 'Netsis',
      apiEndpoint: 'http://erp.local',
    });
    mocks.erpSettings.mockReturnValue({
      id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
      providerType: 2,
      companyCode: 'NETSIS2024',
      username: 'erp_user',
      serverAddress: '192.168.1.10',
      hasPassword: true,
      trustServerCertificate: true,
    });
  });

  it('bekleyen taslak ürünleri listeler', () => {
    renderTable();

    expect(screen.getByText('Palet Kasa 60x40')).toBeInTheDocument();
    expect(screen.getByText('KOL-3020')).toBeInTheDocument();
    expect(screen.queryByText('Aktarilmis Urun')).not.toBeInTheDocument();
  });

  it('tip sütunu ERP productType alanını değil gerçek kategoriyi gösterir', () => {
    renderTable();

    // Kategorisi çözülen üç bekleyen kayıt: 1 (palet), 2 (koli) ve 3 (varil).
    expect(screen.getByText('Paletli Ürün')).toBeInTheDocument();
    expect(screen.getAllByText('Koli').length).toBeGreaterThan(0);
    // productType placeholder ('General') kalsa bile grup kodu çözüldüyse tip basılır.
    expect(screen.getByText('Varil')).toBeInTheDocument();
    expect(screen.queryByText('General')).not.toBeInTheDocument();
  });

  it('kategorisi çözülemeyen taslakta uydurma tip yerine soru işareti gösterir', () => {
    renderTable();

    const missingMarks = screen.getAllByText('?');
    expect(missingMarks.length).toBeGreaterThan(0);
    expect(missingMarks[0]).toHaveAttribute('title', 'ERP kaynağında bu alan yok');
  });

  it('eksik alanlı taslakta rozet gösterir ve 0 değerini ölçü gibi basmaz', () => {
    renderTable();

    expect(screen.getByText('Olcusuz Urun')).toBeInTheDocument();
    expect(screen.getByText('Eksik alan')).toBeInTheDocument();
    expect(screen.getAllByText('ERP’de eksik')).toHaveLength(2);
    expect(screen.queryByText('0.0 kg')).not.toBeInTheDocument();
    expect(screen.getAllByText('12.5 kg').length).toBeGreaterThan(0);
  });

  it('seçilen taslak aktarım diyaloğuna taşınır', async () => {
    const user = userEvent.setup();
    renderTable();

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

  /** Sayfa boyutunu aşan kayıt üretir; tümünü-seç açık sayfadan fazlasını kapsar. */
  function seedOffPagePending(count: number) {
    mocks.draftItemsState.extraPending = Array.from({ length: count }, (_, index) =>
      makeDraft({
        id: `aaaaaaaa-0000-4000-8000-${String(index).padStart(12, '0')}`,
        name: `Sayfa Disi Urun ${index}`,
        sku: `EXT-${index}`,
        category: 2,
      }),
    );
  }

  it('tümünü seç sonrası aktarım açık sayfayla sınırlı kalmaz', async () => {
    seedOffPagePending(20);
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('checkbox', { name: 'Tümünü seç' }));
    await user.click(screen.getByRole('button', { name: /Ürünlere Aktar/ }));

    const dialog = await screen.findByTestId('bulk-import-dialog');
    const names = within(dialog).getByTestId('dialog-row-names').textContent?.split('|') ?? [];
    // 4 hazır bekleyen + 20 ek kayıt; açık sayfa bunların yalnızca bir kısmını gösterir.
    expect(names).toHaveLength(24);
    expect(names).toContain('Sayfa Disi Urun 19');
  });

  it('arama sunucuda uygulanır; açık sayfada olmayan kayıt da bulunur', async () => {
    seedOffPagePending(150);
    const user = userEvent.setup();
    renderTable();

    // Ilk sayfada gorunmuyor: eleme istemcide olsaydi hic bulunamazdi.
    expect(screen.queryByText('Sayfa Disi Urun 149')).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('Ürün adı, SKU, ERP ID veya barkod ile ara...'),
      'Sayfa Disi Urun 149',
    );

    expect(await screen.findByText('Sayfa Disi Urun 149')).toBeInTheDocument();
  });

  it('tip filtresi sunucuya gider ve toplam sayaç filtreli sayıyı gösterir', async () => {
    seedOffPagePending(30);
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('button', { name: /filtrele/i }));
    // Secenekler sunucudan gelen kategori kumesinden kurulur; acik sayfaya bagli degil.
    await user.click(await screen.findByRole('checkbox', { name: 'Koli' }));

    // Ek kayitlarin tamami category=2 (Koli); hazir bekleyenlerin digerleri disarida kalir.
    await waitFor(() => expect(screen.queryByText('Palet Kasa 60x40')).not.toBeInTheDocument());
    expect(screen.getByText('Sayfa Disi Urun 0')).toBeInTheDocument();
  });

  it('başka sayfada seçilen satır aktarıma taşınır', async () => {
    seedOffPagePending(20);
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('checkbox', { name: 'Palet Kasa 60x40 satırını seç' }));
    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(screen.queryByText('Palet Kasa 60x40')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ürünlere Aktar/ }));

    const dialog = await screen.findByTestId('bulk-import-dialog');
    expect(within(dialog).getByTestId('dialog-row-names')).toHaveTextContent('Palet Kasa 60x40');
  });

  it('seçim yapılmadan sync tetiklenir, aktarım diyaloğu açılmaz', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('button', { name: /ERP'den Ürün Çek/ }));

    expect(mocks.triggerSync).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('bulk-import-dialog')).not.toBeInTheDocument();
  });

  it('yükleme sırasında satır yerine iskelet gösterir', () => {
    mocks.draftItemsState.isLoading = true;
    renderTable();

    expect(screen.queryByText('Palet Kasa 60x40')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Tümünü seç' })).not.toBeInTheDocument();
  });

  it('taslak sorgusu hata verdiğinde boş-durum yerine hata kutusu gösterir', () => {
    mocks.draftItemsState.error = {
      response: {
        status: 500,
        data: { isSuccess: false, error: { code: 'ServerError', description: 'Sunucu hatası.' } },
      },
    };

    renderTable();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Taslak ürünler yüklenemedi');
    expect(alert).toHaveTextContent('Sunucu hatası.');
    expect(screen.queryByText('Bekleyen ERP ürünü yok.')).not.toBeInTheDocument();
    expect(screen.queryByText('Palet Kasa 60x40')).not.toBeInTheDocument();
  });

  it('ERP bağlantısı yokken kurulum akışını ve bağlantı butonunu gösterir', () => {
    mocks.connection.mockReturnValue(null);
    mocks.erpSettings.mockReturnValue(null);
    mocks.draftItemsState.isEmpty = true;

    renderTable();

    expect(screen.getByText('Henüz ERP bağlantınız yok')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ERP Bağlantısı Kur' })).toHaveAttribute(
      'href',
      '/settings?tab=erp-baglanti',
    );
  });

  it('bağlantı varken bekleyen ürün yoksa çekim aksiyonu sunar', async () => {
    const user = userEvent.setup();
    mocks.draftItemsState.isEmpty = true;

    renderTable();

    expect(screen.getByText('Bekleyen ERP ürünü yok.')).toBeInTheDocument();
    const syncButtons = screen.getAllByRole('button', { name: /ERP'den Ürün Çek/ });
    expect(syncButtons).toHaveLength(2);

    await user.click(syncButtons[1]);
    expect(mocks.triggerSync).toHaveBeenCalledTimes(1);
  });

  it('ayar eksikken sync butonu sessizce başarısız olmaz, eksikleri diyalogla sorar', async () => {
    const user = userEvent.setup();
    mocks.connection.mockReturnValue(null);
    mocks.erpSettings.mockReturnValue(null);
    mocks.draftItemsState.isEmpty = true;

    renderTable();

    const syncButton = screen.getByRole('button', { name: /ERP'den Ürün Çek/ });
    expect(syncButton).toBeEnabled();

    await user.click(syncButton);

    expect(await screen.findByText('Çekim için ERP ayarları eksik')).toBeInTheDocument();
    expect(mocks.triggerSync).not.toHaveBeenCalled();
  });

  it('toplu ret teyit istemeden çalışmaz', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('checkbox', { name: 'Palet Kasa 60x40 satırını seç' }));
    await user.click(screen.getByRole('button', { name: /^Reddet/ }));

    expect(await screen.findByText('1 ürünü reddetmek üzeresiniz')).toBeInTheDocument();
    expect(mocks.bulkReject).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Vazgeç' }));

    expect(mocks.bulkReject).not.toHaveBeenCalled();
  });

  it('teyit onaylanınca seçili taslaklar reddedilir', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('checkbox', { name: 'Palet Kasa 60x40 satırını seç' }));
    await user.click(screen.getByRole('button', { name: /^Reddet/ }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }));

    expect(mocks.bulkReject).toHaveBeenCalledTimes(1);
    expect(mocks.bulkReject.mock.calls[0][0]).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('Reddedilenler sekmesi reddedilen kayıtları ve geri alma yolunu gösterir', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('button', { name: /Reddedilenler/ }));

    expect(screen.getByText('Reddedilmis Urun')).toBeInTheDocument();
    expect(screen.getByText('Guncellemesi Reddedilmis Urun')).toBeInTheDocument();
    expect(screen.queryByText('Palet Kasa 60x40')).not.toBeInTheDocument();

    const reinstateButtons = screen.getAllByRole('button', { name: 'Tekrar beklemeye al' });
    expect(reinstateButtons).toHaveLength(2);

    await user.click(reinstateButtons[0]);
    expect(mocks.reinstate).toHaveBeenCalledWith(['55555555-5555-4555-8555-555555555555']);
  });

  it('Güncellemeler sekmesinde tümünü seç yalnızca güncelleme kayıtlarını seçer', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('button', { name: /Güncellemeler/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Tümünü seç' }));
    await user.click(screen.getByRole('button', { name: /^Reddet/ }));

    // Bekleyenler sekmesinde 3 kayıt var; küme aktif sekmeye bağlıysa sayı 2 olur.
    expect(await screen.findByText('2 ürünü reddetmek üzeresiniz')).toBeInTheDocument();

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }));

    expect(mocks.bulkReject.mock.calls[0][0]).toEqual([
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',
    ]);
  });

  it('Güncellemeler sekmesinde toplu onay görünen güncelleme satırlarını taşır', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('button', { name: /Güncellemeler/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Tümünü seç' }));
    await user.click(screen.getByRole('button', { name: /^Onayla/ }));

    const dialog = await screen.findByTestId('bulk-import-dialog');
    expect(within(dialog).getByTestId('dialog-row-names')).toHaveTextContent(
      'Guncellenecek Urun A|Guncellenecek Urun B',
    );
  });

  it('sekme değiştiğinde seçim sıfırlanır', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('checkbox', { name: 'Palet Kasa 60x40 satırını seç' }));
    expect(screen.getByRole('button', { name: /^Reddet/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Güncellemeler/ }));

    expect(screen.getByRole('checkbox', { name: 'Tümünü seç' })).not.toBeChecked();
  });

  it('sayfalama okları dahil her buton erişilebilir bir ad taşır', () => {
    mocks.draftItemsState.extraPending = Array.from({ length: 30 }, (_, index) =>
      makeDraft({
        id: `99999999-9999-4999-8999-${String(index).padStart(12, '0')}`,
        name: `Sayfalama Urunu ${index}`,
      }),
    );
    renderTable();

    expect(screen.getByRole('button', { name: 'Önceki sayfa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeInTheDocument();

    for (const button of screen.getAllByRole('button')) {
      const accessibleName = button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '';
      expect(accessibleName, button.outerHTML).not.toBe('');
    }
  });
});
