import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AxiosError, AxiosHeaders } from 'axios';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/axiosInstance', () => ({
  axiosInstance: { get: mocks.get, post: vi.fn(), put: vi.fn() },
}));

const { ERPSyncPanel } = await import('./ERPSyncPanel');

const INTEGRATION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const integrationsResponse = {
  data: {
    isSuccess: true,
    data: [{ id: INTEGRATION_ID, systemName: 'Netsis', apiEndpoint: 'http://erp.local' }],
  },
};

/** Backend ErpSyncStatus: 0 = Idle, 1 = Running, 2 = Failed */
function syncSettingsResponse(syncStatus: number) {
  return {
    data: {
      isSuccess: true,
      data: {
        integrationId: INTEGRATION_ID,
        syncFrequency: 1,
        syncStatus,
        nextScheduledSyncAt: null,
        lastSyncAt: null,
      },
    },
  };
}

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function mockSyncSettings(result: { ok: true; payload: unknown } | { ok: false; error: unknown }) {
  mocks.get.mockImplementation((url: string) => {
    if (url.includes('sync-settings')) {
      return result.ok ? Promise.resolve({ data: result.payload }) : Promise.reject(result.error);
    }
    return Promise.resolve(integrationsResponse);
  });
}

describe('ERPSyncPanel senkronizasyon durumu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Failed(2) durumunda başarısız uyarısı gösterir', async () => {
    mockSyncSettings({ ok: true, payload: syncSettingsResponse(2).data });

    renderWithQueryClient(<ERPSyncPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Son senkronizasyon başarısız oldu.',
    );
  });

  it('Idle(0) durumunda başarısız uyarısı göstermez', async () => {
    mockSyncSettings({ ok: true, payload: syncSettingsResponse(0).data });

    renderWithQueryClient(<ERPSyncPanel />);

    expect(await screen.findByText('Günlük')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ayarlar uç hatası verirse hata kutusu gösterir', async () => {
    mockSyncSettings({
      ok: false,
      error: new AxiosError('istek başarısız', 'ERR_BAD_RESPONSE', undefined, null, {
        status: 500,
        statusText: '',
        data: { isSuccess: false, error: { code: 'ServerError', description: 'Sunucu hatası.' } },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    });

    renderWithQueryClient(<ERPSyncPanel />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Senkronizasyon ayarları yüklenemedi');
    expect(alert).toHaveTextContent('Sunucu hatası.');
  });
});
