import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useAuthStore,
  parseUserRole,
  isCompanyAdminRole,
  USER_ROLES,
} from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/useAuthStore';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'admin@test.com',
  fullName: 'Admin User',
  role: USER_ROLES.CompanyAdmin,
};

describe('parseUserRole', () => {
  it('backendin gonderdigi rol adlarini cozer', () => {
    expect(parseUserRole('SuperAdmin')).toBe(USER_ROLES.SuperAdmin);
    expect(parseUserRole('CompanyAdmin')).toBe(USER_ROLES.CompanyAdmin);
    expect(parseUserRole('CompanyWorker')).toBe(USER_ROLES.CompanyWorker);
    expect(parseUserRole('Individual')).toBe(USER_ROLES.Individual);
  });

  it('bosluk ve buyuk kucuk harf farkini yok sayar', () => {
    expect(parseUserRole('  companyadmin  ')).toBe(USER_ROLES.CompanyAdmin);
  });

  it('taninmayan rol icin null doner', () => {
    expect(parseUserRole('admin')).toBeNull();
    expect(parseUserRole('')).toBeNull();
    expect(parseUserRole(null)).toBeNull();
    expect(parseUserRole(undefined)).toBeNull();
  });
});

describe('isCompanyAdminRole', () => {
  it('yalnizca SuperAdmin ve CompanyAdmin icin true doner', () => {
    expect(isCompanyAdminRole(USER_ROLES.SuperAdmin)).toBe(true);
    expect(isCompanyAdminRole(USER_ROLES.CompanyAdmin)).toBe(true);
    expect(isCompanyAdminRole(USER_ROLES.CompanyWorker)).toBe(false);
    expect(isCompanyAdminRole(USER_ROLES.Individual)).toBe(false);
    expect(isCompanyAdminRole(null)).toBe(false);
  });
});

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('setAuth sonrası isAuthenticated true, token ve role set edilir', () => {
    useAuthStore.getState().setAuth(mockUser, 'test-access-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('test-access-token');
    expect(state.role).toBe(USER_ROLES.CompanyAdmin);
    expect(state.user).toEqual(mockUser);
  });

  it('clearAuth sonrası tüm alanlar null veya false olur', () => {
    useAuthStore.getState().setAuth(mockUser, 'test-access-token');
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.role).toBeNull();
    expect(state.user).toBeNull();
  });

  it("localStorage'a hiçbir şey yazılmaz", () => {
    // localStorage not available in Node.js test environment; skip this test
    // The authStore is designed to NOT write to localStorage per CLAUDE.md requirements
    const mockStorage = { setItem: vi.fn(), getItem: vi.fn() };
    vi.stubGlobal('localStorage', mockStorage);

    useAuthStore.getState().setAuth(mockUser, 'test-access-token');

    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });
});
