import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ERPItemsPage } from './ERPItemsPage';
import { USER_ROLES, useAuthStore, type UserRole } from '@/lib/store/useAuthStore';

vi.mock('@/features/data-management/imports/components/ERPItemsTable', () => ({
  ERPItemsTable: () => <div data-testid="erp-items-table" />,
}));

function signInAs(role: UserRole) {
  useAuthStore.setState({
    user: { id: 'u1', email: 'u@test.local', fullName: 'Test Kullanıcı', role },
    role,
    isAuthenticated: true,
    isInitializing: false,
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <ERPItemsPage />
    </MemoryRouter>,
  );
}

describe('ERPItemsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('şirket yöneticisine ERP tablosunu gösterir', () => {
    signInAs(USER_ROLES.CompanyAdmin);
    renderPage();

    expect(screen.getByTestId('erp-items-table')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Genel Bakış/ })).not.toBeInTheDocument();
  });

  /**
   * ERP ayarları köprüsü, ürün/araç ekranlarındaki gibi tablo araç çubuğuna taşındı;
   * köprünün kendisi ERPItemsTable testinde doğrulanır. Yetkisiz kullanıcıda tablo hiç
   * çizilmediği için köprü de çizilmez — aşağıdaki test bunun tek güvencesi.
   */
  it('yetkisiz kullanıcıya tablo yerine kilit mesajı gösterir', () => {
    signInAs(USER_ROLES.CompanyWorker);
    renderPage();

    expect(screen.queryByTestId('erp-items-table')).not.toBeInTheDocument();
    expect(
      screen.getByText('ERP ürünleri yalnızca şirket yöneticilerine açık'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Genel Bakış/ })).toHaveAttribute('href', '/dashboard');
  });
});
