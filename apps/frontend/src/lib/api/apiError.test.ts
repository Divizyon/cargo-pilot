import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from './apiError';

const FALLBACK = 'İşlem başarısız';

describe('getApiErrorMessage', () => {
  it('Result zarfındaki error.description mesajını döner', () => {
    const error = {
      response: {
        status: 400,
        data: {
          isSuccess: false,
          message: 'İlk kayıtta şifre zorunludur.',
          data: null,
          error: {
            type: 1,
            code: 'ErpSettings.PasswordRequired',
            description: 'İlk kayıtta şifre zorunludur.',
          },
        },
      },
    };

    expect(getApiErrorMessage(error, FALLBACK)).toBe('İlk kayıtta şifre zorunludur.');
  });

  it('model-binding hatasında ilk doğrulama mesajını döner', () => {
    const error = {
      response: {
        status: 400,
        data: {
          isSuccess: false,
          data: null,
          error: {
            code: 'Validation.Failed',
            description: 'Doğrulama hatası.',
            validationErrors: [{ field: 'providerType', message: 'Geçersiz ERP sağlayıcısı.' }],
          },
        },
      },
    };

    expect(getApiErrorMessage(error, FALLBACK)).toBe('Geçersiz ERP sağlayıcısı.');
  });

  it('ağ hatasında (response yok) fallback döner', () => {
    const error = { message: 'Network Error', code: 'ERR_NETWORK' };

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it('zarf okunamadığında (HTML gövde) fallback döner', () => {
    const error = { response: { status: 502, data: '<html>Bad Gateway</html>' } };

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it('error alanı yoksa Result message alanına düşer', () => {
    const error = {
      response: { status: 409, data: { isSuccess: false, message: 'Çakışma var.' } },
    };

    expect(getApiErrorMessage(error, FALLBACK)).toBe('Çakışma var.');
  });

  it('RFC7807 detail alanını geriye dönük destekler', () => {
    const error = { response: { status: 404, data: { title: 'Not Found', detail: 'Kayıt yok.' } } };

    expect(getApiErrorMessage(error, FALLBACK)).toBe('Kayıt yok.');
  });

  it('boş metinleri atlayıp fallback döner', () => {
    const error = {
      response: { status: 500, data: { isSuccess: false, message: '   ', error: null } },
    };

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });
});
