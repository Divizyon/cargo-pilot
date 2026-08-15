import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Ayrı config: vite.config.ts uygulama sunucusu ve proxy içindir, testler
 * onların hiçbirine ihtiyaç duymaz. Denetleyiciler saf fonksiyon olduğu için
 * `node` ortamı yeterli — jsdom kurulmaz.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
