import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { FAKE_ERP } from './testConfig';

const ERP_SETTINGS_URL = '/api/v1/erp-settings';
const INTEGRATIONS_URL = '/api/v1/integrations';

/** Backend sözleşmesi: SyncFrequency → FourHours = 0, Daily = 1. */
export const SYNC_FREQUENCY = { FourHours: 0, Daily: 1 } as const;

interface IntegrationsApiResponse {
  data?: Array<{ id: string }>;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Kısa süre içinde görünürse tıklar; görünmezse akış sessizce devam eder. */
async function clickIfVisible(locator: Locator, timeoutMs: number): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch {
    return false;
  }
  await locator.click();
  return true;
}

export interface SaveErpConnectionOptions {
  serverAddress: string;
  /** false ise "Bağlantı testi başarısız" diyaloğundan "Yine de kaydet" ile devam edilir. */
  expectTestSuccess: boolean;
}

/**
 * ERP bağlantı ayarlarını arayüzden kaydeder. Kaydetmeden önce bağlantı otomatik
 * test edildiği için başarısız test ve veri kaynağı değişikliği diyalogları da
 * bu akışın parçasıdır.
 */
export async function saveErpConnection(
  page: Page,
  { serverAddress, expectTestSuccess }: SaveErpConnectionOptions,
): Promise<void> {
  await page.goto('/settings?tab=erp-baglanti');
  await expect(page.getByLabel('Veritabanı Adı')).toBeVisible();

  await page.getByLabel('ERP Sistemi').click();
  await page.getByRole('option', { name: 'Netsis' }).click();
  await page.getByLabel('Veritabanı Adı').fill(FAKE_ERP.database);
  await page.getByLabel('Kullanıcı Adı').fill(FAKE_ERP.username);
  // Şifre alanı saran div içinde olduğu için etiketle bulunamıyor; autocomplete sabit.
  await page.locator('input[autocomplete="current-password"]').fill(FAKE_ERP.password);
  await page.getByLabel('Sunucu Adresi').fill(serverAddress);

  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();

  // Kayıtlı bağlantının kaynağı değişiyorsa önce teyit istenir.
  await clickIfVisible(page.getByRole('button', { name: 'Üzerine yaz' }), 3_000);

  if (!expectTestSuccess) {
    await page.getByRole('button', { name: 'Yine de kaydet' }).click();
  }

  await expect(page.getByText('ERP bağlantı ayarları kaydedildi')).toBeVisible();
}

export async function fetchIntegrationId(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const response = await request.get(INTEGRATIONS_URL, { headers: authHeaders(token) });
  expect(response.ok(), 'Entegrasyon listesi alınamadı').toBeTruthy();

  const body = (await response.json()) as IntegrationsApiResponse;
  const id = body.data?.[0]?.id;
  expect(id, 'Kayıtlı ERP entegrasyonu bulunamadı').toBeTruthy();
  return id as string;
}

export async function setSyncFrequency(
  request: APIRequestContext,
  token: string,
  integrationId: string,
  syncFrequency: number,
): Promise<void> {
  const response = await request.put(`${INTEGRATIONS_URL}/${integrationId}/sync-settings`, {
    headers: authHeaders(token),
    data: { syncFrequency },
  });
  expect(response.ok(), 'Çekim sıklığı kaydedilemedi').toBeTruthy();
}

/** Kayıtlı bağlantıyı kaldırır; kayıt yoksa 404 dönmesi de kabul edilir. */
export async function deleteErpConnection(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const response = await request.delete(ERP_SETTINGS_URL, { headers: authHeaders(token) });
  expect(
    [200, 204, 404].includes(response.status()),
    `Bağlantı kaldırma beklenmedik durum döndü: ${response.status()}`,
  ).toBeTruthy();
}

export async function triggerRunNow(
  request: APIRequestContext,
  token: string,
  integrationId: string,
): Promise<number> {
  const response = await request.post(`${INTEGRATIONS_URL}/${integrationId}/sync/run-now`, {
    headers: authHeaders(token),
  });
  return response.status();
}

/** ERP Ürünleri ekranındaki elle çekim butonu. */
export function syncButton(page: Page): Locator {
  return page.getByRole('button', { name: "ERP'den Ürün Çek" }).first();
}

/** Sonner bildirimi; tür (success/warning/error) veri özniteliğinden okunur. */
export function toast(page: Page, type: 'success' | 'warning' | 'error'): Locator {
  return page.locator(`[data-sonner-toast][data-type="${type}"]`).first();
}
