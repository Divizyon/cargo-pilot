import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url('VITE_API_BASE_URL geçerli bir URL olmalıdır')
    .or(z.literal('')),
  VITE_APP_VERSION: z.string().min(1, 'VITE_APP_VERSION boş olamaz'),
  VITE_APP_ENV: z.enum(['development', 'test', 'production'], {
    error: 'VITE_APP_ENV yalnızca development | test | production olabilir',
  }),
  VITE_OAUTH_GOOGLE_URL: z.string().optional(),
  VITE_OAUTH_MICROSOFT_URL: z.string().optional(),
});

const _result = envSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  VITE_OAUTH_GOOGLE_URL: import.meta.env.VITE_OAUTH_GOOGLE_URL,
  VITE_OAUTH_MICROSOFT_URL: import.meta.env.VITE_OAUTH_MICROSOFT_URL,
});

if (!_result.success) {
  throw new Error(`[env] Geçersiz ortam değişkenleri tespit edildi:\n${_result.error.toString()}`);
}

const _env = _result.data;

export const API_BASE_URL = _env.VITE_API_BASE_URL;
export const APP_VERSION = _env.VITE_APP_VERSION;
export const APP_ENV = _env.VITE_APP_ENV;
export const OAUTH_GOOGLE_URL = _env.VITE_OAUTH_GOOGLE_URL;
export const OAUTH_MICROSOFT_URL = _env.VITE_OAUTH_MICROSOFT_URL;
