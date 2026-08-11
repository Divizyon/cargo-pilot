import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AxiosError, AxiosHeaders } from 'axios';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/axiosInstance', () => ({ axiosInstance: { get: mocks.get } }));

const { ERPSyncHistory } = await import('./ERPSyncHistory');

const INTEGRATION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const integrationsResponse = {
  data: {
    isSuccess: true,
    data: [{ id: INTEGRATION_ID, systemName: 'Netsis', apiEndpoint: 'http://erp.local' }],
  },
};

function httpError(status: number): AxiosError {
  return new AxiosError('istek başarısız', 'ERR_BAD_REQUEST', undefined, null, {
    status,
    statusText: '',
    data: { isSuccess: false, error: { code: 'NotFound', description: 'Uç bulunamadı.' } },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });
}

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function mockSyncLogs(result: { ok: true; payload: unknown } | { ok: false; error: unknown }) {
  mocks.get.mockImplementation((url: string) => {
    if (url.includes('sync-logs')) {
      return result.ok ? Promise.resolve({ data: result.payload }) : Promise.reject(result.error);
    }
    return Promise.resolve(integrationsResponse);
  });
}

describe('ERPSyncHistory hata durumu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404 dönen uçta boş-durum yerine hata kutusu gösterir', async () => {
    mockSyncLogs({ ok: false, error: httpError(404) });

    renderWithQueryClient(<ERPSyncHistory />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senkronizasyon geçmişi yüklenemedi',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Uç bulunamadı.');
    expect(screen.queryByText('Henüz senkronizasyon geçmişi yok.')).not.toBeInTheDocument();
  });

  it('500 dönen uçta hata kutusu gösterir', async () => {
    mockSyncLogs({ ok: false, error: httpError(500) });

    renderWithQueryClient(<ERPSyncHistory />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senkronizasyon geçmişi yüklenemedi',
    );
    expect(screen.queryByText('Henüz senkronizasyon geçmişi yok.')).not.toBeInTheDocument();
  });

  it('kontrata uymayan yanıtta (parse hatası) hata kutusu gösterir', async () => {
    mockSyncLogs({ ok: true, payload: { isSuccess: true, data: { items: 'beklenmeyen' } } });

    renderWithQueryClient(<ERPSyncHistory />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senkronizasyon geçmişi yüklenemedi',
    );
    expect(screen.queryByText('Henüz senkronizasyon geçmişi yok.')).not.toBeInTheDocument();
  });

  it('kısmi başarıda satır hatalarını açılır detayda gösterir', async () => {
    mockSyncLogs({
      ok: true,
      payload: {
        isSuccess: true,
        data: {
          items: [
            {
              id: 'b1d0c6e8-3f5b-4b2a-9c11-6f3d2e7a4b90',
              startedAt: '2026-02-14T08:00:00Z',
              completedAt: '2026-02-14T08:01:12Z',
              status: 2,
              syncedRecordCount: 2,
              errorMessage: '3 satırdan 1 tanesi işlenemedi; diğer satırlar kaydedildi.',
              rowErrors: [{ erpId: 'ERP-2', sku: 'SKU-2', reason: 'satir bozuk' }],
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        },
      },
    });

    renderWithQueryClient(<ERPSyncHistory />);

    expect(await screen.findByText('Kısmi Hata')).toBeInTheDocument();
    expect(screen.queryByText('satir bozuk')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '1 hatalı satır' }));

    expect(screen.getByText('ERP-2')).toBeInTheDocument();
    expect(screen.getByText('satir bozuk')).toBeInTheDocument();
  });

  it('kaynak toplamını ve neden bazlı eleme kırılımını gösterir', async () => {
    mockSyncLogs({
      ok: true,
      payload: {
        isSuccess: true,
        data: {
          items: [
            {
              id: 'b1d0c6e8-3f5b-4b2a-9c11-6f3d2e7a4b90',
              startedAt: '2026-02-14T08:00:00Z',
              completedAt: '2026-02-14T08:01:12Z',
              status: 1,
              syncedRecordCount: 8,
              errorMessage: null,
              rowErrors: [],
              sourceTotal: 260,
              fetchedCount: 10,
              droppedByReason: { WarehouseFiltered: 210, SalesLocked: 40, RowLimitExceeded: 2 },
              unaccounted: 0,
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        },
      },
    });

    renderWithQueryClient(<ERPSyncHistory />);

    expect(await screen.findByText('260')).toBeInTheDocument();
    expect(screen.queryByText('Depo filtresi:')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Eleme ayrıntısı' }));

    expect(screen.getByText('Depo filtresi:')).toBeInTheDocument();
    expect(screen.getByText('Satış kilitli:')).toBeInTheDocument();
    expect(screen.getByText('Satır limiti aşıldı:')).toBeInTheDocument();
    // Kullanıcının kendi filtresi bilgi, diğer elemeler sorun dilinde raporlanır.
    expect(screen.getByText('filtrelendi')).toBeInTheDocument();
    expect(screen.getAllByText('atlandı')).toHaveLength(2);
  });

  it('mutabakat farkı varsa kaynak satır hücresinde uyarı rozeti gösterir', async () => {
    mockSyncLogs({
      ok: true,
      payload: {
        isSuccess: true,
        data: {
          items: [
            {
              id: 'b1d0c6e8-3f5b-4b2a-9c11-6f3d2e7a4b90',
              startedAt: '2026-02-14T08:00:00Z',
              completedAt: '2026-02-14T08:01:12Z',
              status: 1,
              syncedRecordCount: 3,
              errorMessage: null,
              rowErrors: [],
              sourceTotal: 10,
              fetchedCount: 10,
              droppedByReason: {},
              unaccounted: 7,
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        },
      },
    });

    renderWithQueryClient(<ERPSyncHistory />);

    const badge = await screen.findByText('±7');
    expect(badge).toHaveAttribute(
      'title',
      'Kaynak toplamı ile sayaçlar arasında 7 satırlık fark var; bu satırlar hiçbir sayaca düşmedi.',
    );
  });

  it('başarılı boş listede boş-durum metni gösterir', async () => {
    mockSyncLogs({
      ok: true,
      payload: { isSuccess: true, data: { items: [], totalCount: 0, page: 1, pageSize: 20 } },
    });

    renderWithQueryClient(<ERPSyncHistory />);

    expect(await screen.findByText('Henüz senkronizasyon geçmişi yok.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
