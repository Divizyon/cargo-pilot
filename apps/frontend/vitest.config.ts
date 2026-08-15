import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const alias = { '@': path.resolve(__dirname, './src') };

// src/lib/config/env.ts import anında doğrulama yapıyor; testlerde geçerli değerler şart.
const testEnv = {
  VITE_API_BASE_URL: 'http://localhost:5000',
  VITE_APP_VERSION: '0.0.0-test',
  VITE_APP_ENV: 'test',
};

export default defineConfig({
  test: {
    // Vitest 4'te environmentMatchGlobs kaldırıldı; ortam ayrımı projects ile yapılır.
    // Saf mantık testleri node'da, bileşen testleri (*.test.tsx) jsdom'da koşar.
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['node_modules', 'dist'],
          env: testEnv,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.{test,spec}.tsx'],
          exclude: ['node_modules', 'dist'],
          env: testEnv,
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/test/**'],
    },
  },
  resolve: {
    alias,
  },
});
