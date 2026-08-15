import { defineConfig } from 'vite';
import path from 'path';

/**
 * Komut satırı aracının derlenmesi.
 *
 * Kaynak `@/` takma adını kullanıyor ve TypeScript; Node ikisini de doğrudan
 * çözemiyor. Ayrı bir çalışma zamanı bağımlılığı (tsx/ts-node) eklemek yerine
 * zaten kurulu olan Vite ile SSR modunda tek dosyaya derleniyor — bağımlılık
 * listesi büyümüyor ve CI'daki `npm ci` etkilenmiyor.
 *
 * Bağımlılıklar (axios, zod) SSR modunda dışarıda bırakılır; çıktı node_modules
 * içinden çözer.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    ssr: 'src/algorithm-test/cli/runSuiteCli.ts',
    target: 'node20',
    outDir: 'dist-cli',
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'runSuiteCli.js' },
    },
  },
});
