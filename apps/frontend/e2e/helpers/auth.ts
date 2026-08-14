import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_USER } from './testConfig';

interface LoginApiResponse {
  data?: { accessToken?: string };
}

/**
 * Arayüzden giriş; oturum sonrası panele düşülmesi de doğrulanır.
 *
 * Giriş formunda FormControl doğrudan Input'u değil saran div'i kimliklendirdiği
 * için etiket-alan bağı kurulmuyor; alanlar placeholder ile bulunur.
 */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.getByPlaceholder('ornek@sirket.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginViaUi(page, ADMIN_USER.email, ADMIN_USER.password);
}

/**
 * Giriş ucu IP başına dakikada 10 istekle sınırlıdır; aynı kullanıcının jetonu
 * koşum boyunca yeniden kullanılır.
 */
const tokenCache = new Map<string, string>();

/**
 * API üzerinden erişim jetonu alır. Jeton yalnızca bellekte tutulduğu için
 * (useAuthStore) tarayıcıdan okunamaz; uç nokta sözleşmesini doğrulayan
 * senaryolar jetonu buradan alır.
 */
export async function getAccessToken(
  request: APIRequestContext,
  email: string = ADMIN_USER.email,
  password: string = ADMIN_USER.password,
): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const response = await request.post('/api/v1/auth/login', { data: { email, password } });
  expect(
    response.ok(),
    `Giriş isteği başarısız (HTTP ${response.status()}): ${(await response.text()).slice(0, 200)}`,
  ).toBeTruthy();

  const body = (await response.json()) as LoginApiResponse;
  const token = body.data?.accessToken;
  expect(token, 'Giriş yanıtında accessToken yok').toBeTruthy();

  tokenCache.set(email, token as string);
  return token as string;
}

export interface RegisteredUser {
  email: string;
  password: string;
}

/**
 * Kayıt ucu her zaman Individual rolü üretir; şirket yöneticisi olmayan
 * kullanıcı senaryoları bu hesapla koşar.
 */
export async function registerIndividualUser(request: APIRequestContext): Promise<RegisteredUser> {
  const email = `e2e-bireysel-${Date.now()}@cargopilot.test`;
  const password = 'E2eBireysel123!';

  const response = await request.post('/api/v1/auth/register', {
    data: { firstName: 'E2E', lastName: 'Bireysel', email, password },
  });
  expect(response.ok(), 'Bireysel kullanıcı kaydı başarısız').toBeTruthy();

  return { email, password };
}
