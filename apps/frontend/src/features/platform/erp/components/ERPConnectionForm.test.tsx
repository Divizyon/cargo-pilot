import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api/axiosInstance', () => ({
  axiosInstance: { get: mocks.get, put: mocks.put, post: mocks.post },
}));

const { ERPConnectionForm } = await import('./ERPConnectionForm');

const SETTINGS_URL = '/api/v1/erp-settings';

/** Kayıtlı ayar yok (404) + entegrasyon listesi boş: form ilk kurulum halinde açılır. */
function mockEmptyState() {
  mocks.get.mockImplementation((url: string) => {
    if (url === SETTINGS_URL) {
      return Promise.reject({ isAxiosError: true, response: { status: 404 } });
    }
    return Promise.resolve({ data: { isSuccess: true, data: [] } });
  });
}

const SAVED_SETTINGS = {
  id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  providerType: 2,
  companyCode: 'NETSIS2024',
  username: 'erp_okuyucu',
  serverAddress: '10.0.0.5',
  hasPassword: true,
  trustServerCertificate: true,
  lastTestSucceeded: null as boolean | null,
  lastTestedAt: null as string | null,
};

function mockSavedSettings(overrides: Partial<typeof SAVED_SETTINGS> = {}) {
  mocks.get.mockImplementation((url: string) => {
    if (url === SETTINGS_URL) {
      return Promise.resolve({
        data: { isSuccess: true, data: { ...SAVED_SETTINGS, ...overrides } },
      });
    }
    return Promise.resolve({ data: { isSuccess: true, data: [] } });
  });
}

function mockTestConnection(isSuccess: boolean, message: string) {
  mocks.post.mockResolvedValue({ data: { isSuccess: true, data: { isSuccess, message } } });
}

function renderForm(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('ERPConnectionForm alan rehberliği', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("veritabanı alanını 'Şirket Kodu' yerine gerçek anlamıyla etiketler", async () => {
    mockEmptyState();

    renderForm(<ERPConnectionForm />);

    expect(await screen.findByLabelText('Veritabanı Adı')).toBeInTheDocument();
    expect(screen.queryByLabelText('Şirket Kodu')).not.toBeInTheDocument();
  });

  it('sunucu adresi alanında named instance ve port örneği gösterir', async () => {
    mockEmptyState();

    renderForm(<ERPConnectionForm />);

    const serverInput = await screen.findByLabelText('Sunucu Adresi');
    expect(serverInput).toHaveAttribute('placeholder', expect.stringContaining('\\'));
    expect(serverInput).toHaveAttribute('placeholder', expect.stringContaining(',1433'));
  });

  it('sistem seçimi Netsis olunca alan örnekleri Netsis metinlerine döner', async () => {
    mockEmptyState();
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    // Varsayılan Logo; örnekler Logo'ya göre gelir.
    expect(await screen.findByLabelText('Veritabanı Adı')).toHaveAttribute(
      'placeholder',
      'TIGERDB',
    );

    await user.click(screen.getByRole('combobox', { name: 'ERP Sistemi' }));
    await user.click(await screen.findByRole('option', { name: 'Netsis' }));

    expect(screen.getByLabelText('Veritabanı Adı')).toHaveAttribute('placeholder', 'NETSIS2024');
    expect(screen.getByText(/Netsis verilerinin tutulduğu SQL Server/)).toBeInTheDocument();
  });
});

describe('ERPConnectionForm bağlantı durumu ve test akışı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test edilmemiş kayıtlı ayar 'Bağlı' rozeti üretmez", async () => {
    mockSavedSettings();

    renderForm(<ERPConnectionForm />);

    expect(await screen.findByText('Kayıtlı (test edilmedi)')).toBeInTheDocument();
    expect(screen.queryByText('Bağlı')).not.toBeInTheDocument();
  });

  it('son test başarısızsa başarısız rozeti gösterir', async () => {
    mockSavedSettings({ lastTestSucceeded: false, lastTestedAt: '2026-08-11T10:30:00Z' });

    renderForm(<ERPConnectionForm />);

    expect(await screen.findByText('Test başarısız')).toBeInTheDocument();
    expect(screen.queryByText('Bağlı')).not.toBeInTheDocument();
  });

  it('son test başarılıysa Bağlı rozetini test tarihiyle gösterir', async () => {
    mockSavedSettings({ lastTestSucceeded: true, lastTestedAt: '2026-08-11T10:30:00Z' });

    renderForm(<ERPConnectionForm />);

    expect(await screen.findByText('Bağlı')).toBeInTheDocument();
    expect(screen.getByText(/Son başarılı test: 11\.08\.2026/)).toBeInTheDocument();
  });

  it('kayıtlı şifreyle test yapılabilir; şifre tekrar istenmez', async () => {
    mockSavedSettings();
    mockTestConnection(true, 'Bağlantı başarılı.');
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı Test Et' }));

    expect(await screen.findByText('Bağlantı başarılı.')).toBeInTheDocument();
    const [, body] = mocks.post.mock.calls[0];
    expect(body).not.toHaveProperty('password');
  });

  it('alan değişince bayat test sonucu ekrandan kalkar', async () => {
    mockSavedSettings();
    mockTestConnection(true, 'Bağlantı başarılı.');
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı Test Et' }));
    expect(await screen.findByText('Bağlantı başarılı.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Sunucu Adresi'), '0');

    expect(screen.queryByText('Bağlantı başarılı.')).not.toBeInTheDocument();
  });

  it('kaydetmeden önce test eder; test başarısızsa teyit ister', async () => {
    mockSavedSettings();
    mockTestConnection(false, 'Kullanıcı adı veya şifre hatalı.');
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: SAVED_SETTINGS } });
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Bağlantı testi başarısız');
    expect(mocks.put).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yine de kaydet' }));

    expect(mocks.put).toHaveBeenCalledTimes(1);
  });
});
