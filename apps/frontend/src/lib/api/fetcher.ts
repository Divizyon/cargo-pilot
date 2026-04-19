import { z } from 'zod';
import { API_BASE_URL } from '@/lib/config/env';

interface FetchOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: FetchOptions,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`[API] ${res.status} ${res.statusText} — ${path}`);
  }

  const json: unknown = await res.json();
  const result = schema.safeParse(json);

  if (!result.success) {
    throw new Error(
      `[API] Doğrulama hatası (${path}):\n${result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  }

  return result.data;
}
