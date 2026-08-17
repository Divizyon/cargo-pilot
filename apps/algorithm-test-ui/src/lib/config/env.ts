import { z } from 'zod';

/**
 * Varsayılan istek zaman aşımı. 500 kutuluk senaryolarda üç kriter paralel
 * koştuğu için tek koşu 15 sn'yi aşabiliyordu; `VITE_API_TIMEOUT_MS` ile
 * senaryo büyüklüğüne göre yükseltilebilir.
 */
const DEFAULT_API_TIMEOUT_MS = 60_000;

const envSchema = z.object({
  /**
   * Backend kök adresi. Boş bırakılırsa istekler göreli gider ve Vite'ın
   * `/api` proxy'si devreye girer — yerel geliştirmenin normal hâli budur.
   *
   * Tanımsız değer de boş sayılır: depoda `.env` dosyası yok (`.env.local`
   * yoksayılıyor), yani şema `undefined`'ı reddettiğinde temiz bir checkout'ta
   * arayüz hiç açılmıyordu. "Ayar verilmemiş" ile "ayar boş verilmiş" burada
   * aynı şeydir.
   */
  VITE_API_BASE_URL: z
    .string()
    .url('VITE_API_BASE_URL geçerli bir URL olmalıdır')
    .or(z.literal(''))
    .default(''),
  VITE_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive('VITE_API_TIMEOUT_MS pozitif bir tam sayı olmalıdır')
    .default(DEFAULT_API_TIMEOUT_MS),
});

const _result = envSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_TIMEOUT_MS: import.meta.env.VITE_API_TIMEOUT_MS,
});

if (!_result.success) {
  throw new Error(`[env] Geçersiz ortam değişkenleri tespit edildi:\n${_result.error.toString()}`);
}

export const API_BASE_URL = _result.data.VITE_API_BASE_URL;
export const API_TIMEOUT_MS = _result.data.VITE_API_TIMEOUT_MS;
