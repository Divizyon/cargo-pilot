import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
