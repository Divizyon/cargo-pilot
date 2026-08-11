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
