import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('@/lib/api/axiosInstance', () => ({
  axiosInstance: { get: mocks.get, put: mocks.put, post: mocks.post, delete: mocks.delete },
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    warning: mocks.toastWarning,
    info: vi.fn(),
  },
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
  dimensionUnit: 0,
  weightUnit: 0,
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

function mockTestConnection(isSuccess: boolean, message: string, warning: string | null = null) {
  mocks.post.mockResolvedValue({
    data: { isSuccess: true, data: { isSuccess, message, warning } },
  });
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

  it('yeni bağlantıda sertifika doğrulaması açık gelir', async () => {
    mockEmptyState();

    renderForm(<ERPConnectionForm />);

    // Anahtar atlamayı ifade eder; kapalı olması sertifikanın doğrulandığını gösterir.
    const trustSwitch = await screen.findByRole('switch', {
      name: /sertifika doğrulamasını atla/i,
    });
    expect(trustSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('kayıtlı ayardaki sertifika tercihi forma aynen yansır', async () => {
    mockSavedSettings({ trustServerCertificate: true });

    renderForm(<ERPConnectionForm />);

    const trustSwitch = await screen.findByRole('switch', {
      name: /sertifika doğrulamasını atla/i,
    });
    expect(trustSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('bağlantı yokken kurulum yardımını kart olarak gösterir', async () => {
    mockEmptyState();

    renderForm(<ERPConnectionForm />);

    // İlk kurulumda kullanıcı ne yapacağını bilmiyor; yardım düğme arkasında
    // dururken bulunması kullanıcıya kalıyordu.
    expect(await screen.findByText('Henüz bir ERP bağlantınız yok')).toBeInTheDocument();
    expect(screen.getByText(/TCP 1433 açık olmalı/)).toBeInTheDocument();
    expect(screen.getByText(/allowlist/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /kurulum yardımı/i })).not.toBeInTheDocument();
  });

  it('bağlantı varken kurulum yardımı düğmenin arkasına çekilir', async () => {
    mockSavedSettings();
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    expect(screen.queryByText('Henüz bir ERP bağlantınız yok')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /kurulum yardımı/i }));

    expect(await screen.findByText('Ağ ön koşulları')).toBeInTheDocument();
  });

  it('bağlantı yokken test ve kaldırma aksiyonları gösterilmez', async () => {
    mockEmptyState();

    renderForm(<ERPConnectionForm />);

    // Kurulu baglanti olmadan ikisi de anlamsiz; ekranda durunca yaniltiyordu.
    expect(await screen.findByLabelText('Veritabanı Adı')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bağlantıyı test et' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bağlantıyı kaldır' })).not.toBeInTheDocument();
  });

  it('form değişmeden Bağlan çubuğu görünmez; zorunlu alan eksikken pasiftir', async () => {
    mockEmptyState();
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    expect(screen.queryByRole('button', { name: 'Bağlan' })).not.toBeInTheDocument();

    await user.type(await screen.findByLabelText('Veritabanı Adı'), 'NETSIS2024');

    // Cubuk cikti ama sunucu adresi, kullanici ve sifre hala bos.
    expect(screen.getByRole('button', { name: 'Bağlan' })).toBeDisabled();

    await user.type(screen.getByLabelText('Sunucu Adresi'), '10.0.0.5');
    await user.type(screen.getByLabelText('Kullanıcı Adı'), 'erp_okuyucu');
    await user.type(screen.getByLabelText('Şifre'), 'gizli');

    expect(screen.getByRole('button', { name: 'Bağlan' })).toBeEnabled();
  });

  it('sunucu adresi alanında named instance ve port örneği gösterir', async () => {
    mockEmptyState();

    renderForm(<ERPConnectionForm />);

    const serverInput = await screen.findByLabelText('Sunucu Adresi');
    expect(serverInput).toHaveAttribute('placeholder', expect.stringContaining('\\'));
    expect(serverInput).toHaveAttribute('placeholder', expect.stringContaining(',1433'));
  });

  it('sistem seçimi Logo olunca alan örnekleri Logo metinlerine döner', async () => {
    mockEmptyState();
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    // Varsayilan Netsis: Logo urun cekimi henuz desteklenmiyor, varsayilanla
    // ilerleyen kullanici senkronda hataya carpiyordu.
    expect(await screen.findByLabelText('Veritabanı Adı')).toHaveAttribute(
      'placeholder',
      'NETSIS2024',
    );

    await user.click(screen.getByRole('combobox', { name: 'ERP Sistemi' }));
    await user.click(await screen.findByRole('option', { name: 'Logo' }));

    expect(screen.getByLabelText('Veritabanı Adı')).toHaveAttribute('placeholder', 'TIGERDB');
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

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı test et' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const [, body] = mocks.post.mock.calls[0];
    expect(body).not.toHaveProperty('password');
  });

  it('başarılı test sonucu toast ile bildirilir, forma kutu eklenmez', async () => {
    mockSavedSettings();
    mockTestConnection(true, 'Bağlantı başarılı.');
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı test et' }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledTimes(1));
    expect(mocks.toastSuccess.mock.calls[0][0]).toBe('Bağlantı başarılı.');
    // Sonuç formun içinde yer kaplamaz; durum kartı zaten son test tarihini yazıyor.
    expect(screen.queryByText('Bağlantı başarılı.')).not.toBeInTheDocument();
  });

  it('başarısız test sonucu hata toastı ile bildirilir', async () => {
    mockSavedSettings();
    mockTestConnection(false, 'Kullanıcı adı veya şifre hatalı.');
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı test et' }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1));
    expect(mocks.toastError.mock.calls[0][0]).toBe('Kullanıcı adı veya şifre hatalı.');
  });

  it('sertifika uyarısı sonuçtan ayrı bir toast olarak çıkar', async () => {
    mockSavedSettings();
    mockTestConnection(true, 'Bağlantı başarılı.', 'Sunucu sertifikası doğrulanmadı.');
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı test et' }));

    // Uyarı test başarılıyken de çıkabilir; başarı mesajının içinde eriyip kaybolmamalı.
    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledTimes(1));
    expect(mocks.toastWarning.mock.calls[0][0]).toBe('Sunucu sertifikası doğrulanmadı.');
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('kaydetmeden önce test eder; test başarısızsa teyit ister', async () => {
    mockSavedSettings();
    mockTestConnection(false, 'Kullanıcı adı veya şifre hatalı.');
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: SAVED_SETTINGS } });
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    // Cubuk yalnizca degisiklik yapilinca cikar. Sunucu adresi degistirilseydi
    // once 'veri kaynagi degisiyor' teyidi cikardi; burada test edilen o degil.
    await user.type(await screen.findByLabelText('Kullanıcı Adı'), '2');
    await user.click(screen.getByRole('button', { name: 'Bağlan' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Bağlantı testi başarısız');
    expect(mocks.put).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yine de kaydet' }));

    expect(mocks.put).toHaveBeenCalledTimes(1);
  });
});

describe('ERPConnectionForm riskli değişiklik korumaları', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sunucu adresi değişince kayıt teyide bağlanır', async () => {
    mockSavedSettings();
    mockTestConnection(true, 'Bağlantı başarılı.');
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: SAVED_SETTINGS } });
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.type(await screen.findByLabelText('Sunucu Adresi'), '9');
    await user.click(screen.getByRole('button', { name: 'Bağlan' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Veri kaynağı değişiyor');
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Üzerine yaz' }));

    expect(mocks.put).toHaveBeenCalledTimes(1);
  });

  it('yalnızca kullanıcı adı değiştiyse üzerine yazma teyidi istemez', async () => {
    mockSavedSettings();
    mockTestConnection(true, 'Bağlantı başarılı.');
    mocks.put.mockResolvedValue({ data: { isSuccess: true, data: SAVED_SETTINGS } });
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.type(await screen.findByLabelText('Kullanıcı Adı'), '2');
    await user.click(screen.getByRole('button', { name: 'Bağlan' }));

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Veri kaynağı değişiyor')).not.toBeInTheDocument();
  });

  it('bağlantı kaldırma teyit ister ve DELETE ucunu çağırır', async () => {
    mockSavedSettings();
    mocks.delete.mockResolvedValue({ data: { isSuccess: true, data: true } });
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm />);

    await user.click(await screen.findByRole('button', { name: 'Bağlantıyı kaldır' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Bağlantı kaldırılsın mı?');
    expect(mocks.delete).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Bağlantıyı kaldır' }));

    expect(mocks.delete).toHaveBeenCalledWith('/api/v1/erp-settings');
  });

  it('form kirlendiğinde üst sekmeye bildirir', async () => {
    mockSavedSettings();
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();

    renderForm(<ERPConnectionForm onDirtyChange={onDirtyChange} />);

    await user.type(await screen.findByLabelText('Sunucu Adresi'), '9');

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});
