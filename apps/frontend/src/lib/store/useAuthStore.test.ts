import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/useAuthStore';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'admin@test.com',
  fullName: 'Admin User',
  role: 'admin',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('setAuth sonrası isAuthenticated true, token ve role set edilir', () => {
    useAuthStore.getState().setAuth(mockUser, 'test-access-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('test-access-token');
    expect(state.role).toBe('admin');
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
