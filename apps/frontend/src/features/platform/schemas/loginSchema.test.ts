import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/features/platform/schemas/loginSchema';

describe('loginSchema', () => {
  it('geçerli email ve şifre ile parse başarılı olur', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('geçersiz email formatı doğru hata mesajı döner', () => {
    const result = loginSchema.safeParse({
      email: 'gecersiz-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email');
      expect(emailError?.message).toBe('Geçerli bir e-posta girin');
    }
  });

  it('7 karakterli şifre doğru hata mesajı döner', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find((i) => i.path[0] === 'password');
      expect(passwordError?.message).toBe('Şifre en az 8 karakter olmalı');
    }
  });
});
