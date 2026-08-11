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

  it('şirket yöneticisine senkronizasyon ayarları köprüsü gösterir', () => {
    signInAs(USER_ROLES.CompanyAdmin);
    renderPage();

    expect(screen.getByRole('link', { name: /Senkronizasyon Ayarları/ })).toHaveAttribute(
      'href',
      '/settings?tab=erp-senkronizasyon',
    );
  });

  it('yetkisiz kullanıcıya ayarlar köprüsü göstermez', () => {
    signInAs(USER_ROLES.CompanyWorker);
    renderPage();

    expect(screen.queryByRole('link', { name: /Senkronizasyon Ayarları/ })).not.toBeInTheDocument();
  });

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
