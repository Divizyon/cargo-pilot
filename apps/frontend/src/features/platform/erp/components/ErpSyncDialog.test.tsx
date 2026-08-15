import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));

vi.mock('@/lib/api/axiosInstance', () => ({
  axiosInstance: { get: mocks.get, post: vi.fn(), put: mocks.put },
}));

const { ErpSyncDialog } = await import('./ErpSyncDialog');

const INTEGRATION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

/**
 * Backend ErpSyncStatus: 0 = Idle, 1 = Running, 2 = Failed
 * Backend SyncFrequency: 0 = Every4Hours, 1 = Daily, null = otomatik çekim kapalı
 */
function mockSyncSettings(
  syncFrequency: number | null = 1,
  syncStatus = 0,
  extra: { nextScheduledSyncAt?: string | null; lastSyncAt?: string | null } = {},
) {
  mocks.get.mockResolvedValue({
    data: {
      isSuccess: true,
      data: {
        integrationId: INTEGRATION_ID,
        syncFrequency,
        syncStatus,
        nextScheduledSyncAt: extra.nextScheduledSyncAt ?? null,
        lastSyncAt: extra.lastSyncAt ?? null,
      },
    },
  });
}

function renderDialog(onSyncNow = vi.fn(), onOpenChange = vi.fn(), isSyncing = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <ErpSyncDialog
      open
      onOpenChange={onOpenChange}
      integrationId={INTEGRATION_ID}
      onSyncNow={onSyncNow}
      isSyncing={isSyncing}
    />,
    { wrapper },
  );
  return { onSyncNow, onOpenChange };
}

describe('ErpSyncDialog senkronizasyon aksiyonu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Şimdi senkronize et çalışmayı başlatır ve diyaloğu kapatır', async () => {
    mockSyncSettings();
    const user = userEvent.setup();
    const { onSyncNow, onOpenChange } = renderDialog();

    await user.click(await screen.findByRole('button', { name: /şimdi senkronize et/i }));

    expect(onSyncNow).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('senkronizasyon sürerken buton devre dışı kalır', async () => {
    mockSyncSettings();
    renderDialog(vi.fn(), vi.fn(), true);

    // Aynı anda ikinci çekim backend'de zaten 409 döner; buton da izin vermemeli.
    const button = await screen.findByRole('button', { name: /senkronize/i });
    expect(button).toBeDisabled();
  });

  it('son senkronizasyon başarısızsa uyarı gösterir', async () => {
    mockSyncSettings(1, 2);
    renderDialog();

    expect(await screen.findByText(/Son senkronizasyon başarısız oldu/)).toBeInTheDocument();
  });
});

describe('ErpSyncDialog otomatik senkronizasyon anahtarı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('anahtar kapatılınca zamanlayıcı boş sıklıkla durdurulur', async () => {
    mockSyncSettings(1);
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('switch', { name: 'Otomatik senkronizasyon' }));

    // Backend SyncFrequency null iken zamanlayıcı bu entegrasyonu hiç tetiklemez;
    // 0 gönderilseydi 4 saatlik sıklık kaydedilirdi.
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put.mock.calls[0][1]).toEqual({ syncFrequency: null });
  });

  it('anahtar açılınca günlük sıklıkla başlar', async () => {
    mockSyncSettings(null);
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('switch', { name: 'Otomatik senkronizasyon' }));

    // Kullanıcıya sorulmadan bir sıklık gerekiyor; günlük en az sürprizli olan.
    expect(mocks.put.mock.calls[0][1]).toEqual({ syncFrequency: 1 });
  });

  it('anahtar kapalıyken sıklık seçenekleri gizlenir', async () => {
    mockSyncSettings(null);
    renderDialog();

    const toggle = await screen.findByRole('switch', { name: 'Otomatik senkronizasyon' });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Günlük' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '4 saatte bir' })).not.toBeInTheDocument();
  });

  it('anahtar açıkken kayıtlı sıklık işaretli gelir ve değiştirilebilir', async () => {
    mockSyncSettings(1);
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    const user = userEvent.setup();
    renderDialog();

    expect(await screen.findByRole('switch', { name: 'Otomatik senkronizasyon' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Günlük' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: '4 saatte bir' }));

    expect(mocks.put.mock.calls[0][1]).toEqual({ syncFrequency: 0 });
  });
});
