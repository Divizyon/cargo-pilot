import { defineConfig, devices } from '@playwright/test';

/**
 * E2E koşucusu kendi sunucusunu ayağa kaldırmaz; compose test ortamına karşı çalışır.
 *
 * Ön koşul (repo kökünden):
 *   docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test \
 *     --profile e2e up -d --wait
 *   docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test \
 *     run --rm erp-mssql-init
 *
 * Ayrıntı: apps/frontend/e2e/README.md
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Senaryolar tek şirketin ERP ayarını ve taslak listesini paylaşır; paralel
  // koşum bu tek kaydı birbirinin altından çeker.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
