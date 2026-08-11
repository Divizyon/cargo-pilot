import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_USER } from './testConfig';

interface LoginApiResponse {
  data?: { accessToken?: string };
}

/** Arayüzden giriş; oturum sonrası panele düşülmesi de doğrulanır. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginViaUi(page, ADMIN_USER.email, ADMIN_USER.password);
}

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
  const response = await request.post('/api/v1/auth/login', { data: { email, password } });
  expect(response.ok(), 'Giriş isteği başarısız').toBeTruthy();

  const body = (await response.json()) as LoginApiResponse;
  const token = body.data?.accessToken;
  expect(token, 'Giriş yanıtında accessToken yok').toBeTruthy();
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
