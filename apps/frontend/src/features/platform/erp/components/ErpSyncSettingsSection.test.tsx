import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api/axiosInstance', () => ({
  axiosInstance: { get: mocks.get, put: mocks.put, post: mocks.post },
}));

const { ErpSyncSettingsSection } = await import('./ErpSyncSettingsSection');

const SETTINGS_URL = '/api/v1/erp-settings';
const INTEGRATION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const SAVED_SETTINGS = {
  id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  providerType: 2,
  companyCode: 'DIVIZYON',
  username: 'cargopilot_ro',
  serverAddress: '10.0.0.5',
  hasPassword: true,
  trustServerCertificate: true,
  dimensionUnit: 0,
  weightUnit: 0,
  lastTestSucceeded: true,
  lastTestedAt: '2026-08-14T12:00:00Z',
};

/**
 * Backend SyncFrequency: 0 = Every4Hours, 1 = Daily, null = otomatik senkronizasyon kapalı
 */
function mockConnected(
  settingsOverrides: Partial<typeof SAVED_SETTINGS> = {},
  syncFrequency: number | null = null,
) {
  mocks.get.mockImplementation((url: string) => {
    if (url === SETTINGS_URL) {
      return Promise.resolve({
        data: { isSuccess: true, data: { ...SAVED_SETTINGS, ...settingsOverrides } },
      });
    }
    if (url.endsWith('/sync-settings')) {
      return Promise.resolve({
        data: {
          isSuccess: true,
          data: {
            integrationId: INTEGRATION_ID,
            syncFrequency,
            syncStatus: 0,
            nextScheduledSyncAt: null,
            lastSyncAt: null,
          },
        },
      });
    }
    return Promise.resolve({
      data: {
        isSuccess: true,
        data: [{ id: INTEGRATION_ID, systemName: 'Netsis', apiEndpoint: '10.0.0.5' }],
      },
    });
  });
}

/** Kayıtlı ayar yok (404) ve entegrasyon listesi boş. */
function mockDisconnected() {
  mocks.get.mockImplementation((url: string) => {
    if (url === SETTINGS_URL) {
      return Promise.reject({ isAxiosError: true, response: { status: 404 } });
    }
    return Promise.resolve({ data: { isSuccess: true, data: [] } });
  });
}

/**
 * Entegrasyon kimliği gelince sıklık sorgusu etkinleşiyor, anahtar bir an iskelete
 * dönüp yeniden mount oluyor. Elde tutulan düğüm referansı bu noktada kopuyor;
 * anahtar her seferinde yeniden sorgulanır.
 */
function autoSyncSwitch() {
  return screen.getByRole('switch', { name: 'Otomatik senkronizasyon' });
}

function renderSection(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('ErpSyncSettingsSection birimler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kayıtlı birimler seçili gelir', async () => {
    mockConnected({ dimensionUnit: 1, weightUnit: 1 });

    renderSection(<ErpSyncSettingsSection />);

    const dimension = await screen.findByRole('combobox', { name: 'ERP ölçü birimi' });
    await waitFor(() => expect(dimension).toHaveTextContent('Milimetre (mm)'));
    expect(screen.getByRole('combobox', { name: 'ERP ağırlık birimi' })).toHaveTextContent(
      'Ton (ton)',
    );
  });

  it('bağlantı yokken kontroller devre dışı kalır ve nedeni yazar', async () => {
    mockDisconnected();

    renderSection(<ErpSyncSettingsSection />);

    // Alanı gizlemek "bu ayar nerede" sorusunu doğuruyordu; görünür ama kapalı durur.
    expect(
      await screen.findByText('Bu ayarlar ERP bağlantısı kurulduktan sonra kullanılabilir.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'ERP ölçü birimi' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Otomatik senkronizasyon' })).toBeDisabled();
  });

  it('birim değişince kayıtlı bağlantı alanları olduğu gibi geri gönderilir', async () => {
    mockConnected();
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: SAVED_SETTINGS } });
    const user = userEvent.setup();

    renderSection(<ErpSyncSettingsSection />);

    const dimension = await screen.findByRole('combobox', { name: 'ERP ölçü birimi' });
    await waitFor(() => expect(dimension).toBeEnabled());
    await user.click(dimension);
    await user.click(await screen.findByRole('option', { name: 'Milimetre (mm)' }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    const [url, body] = mocks.put.mock.calls[0];
    expect(url).toBe(SETTINGS_URL);
    // Eksik gönderilen alan sunucuda varsayılana düşer; sunucu adresi ve sertifika
    // tercihi birim değişikliğiyle birlikte sessizce sıfırlanmamalı.
    expect(body).toMatchObject({
      companyCode: 'DIVIZYON',
      serverAddress: '10.0.0.5',
      trustServerCertificate: true,
      dimensionUnit: 1,
      weightUnit: 0,
    });
    // Şifre gönderilmez; sunucu kayıtlı olanı korur.
    expect(body).not.toHaveProperty('password');
  });
});

describe('ErpSyncSettingsSection otomatik senkronizasyon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('anahtar kapalıyken sıklık seçenekleri gizlenir', async () => {
    mockConnected({}, null);

    renderSection(<ErpSyncSettingsSection />);

    await waitFor(() => expect(autoSyncSwitch()).toBeEnabled());
    expect(autoSyncSwitch()).not.toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Günlük' })).not.toBeInTheDocument();
  });

  it('anahtar açılınca günlük sıklıkla başlar', async () => {
    mockConnected({}, null);
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    const user = userEvent.setup();

    renderSection(<ErpSyncSettingsSection />);

    await waitFor(() => expect(autoSyncSwitch()).toBeEnabled());
    await user.click(autoSyncSwitch());

    // Kullanıcıya sorulmadan bir sıklık gerekiyor; günlük en az sürprizli olan.
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put.mock.calls[0][1]).toEqual({ syncFrequency: 1 });
  });

  it('anahtar kapatılınca zamanlayıcı boş sıklıkla durdurulur', async () => {
    mockConnected({}, 1);
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    const user = userEvent.setup();

    renderSection(<ErpSyncSettingsSection />);

    await waitFor(() => expect(autoSyncSwitch()).toBeChecked());
    await user.click(autoSyncSwitch());

    // Backend SyncFrequency null iken zamanlayıcı bu entegrasyonu hiç tetiklemez;
    // 0 gönderilseydi 4 saatlik sıklık kaydedilirdi.
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put.mock.calls[0][1]).toEqual({ syncFrequency: null });
  });
});
