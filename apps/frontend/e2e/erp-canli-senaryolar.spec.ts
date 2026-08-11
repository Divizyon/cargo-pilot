import { expect, test, type Page } from '@playwright/test';
import { getAccessToken, loginAsAdmin, loginViaUi, registerIndividualUser } from './helpers/auth';
import {
  SYNC_FREQUENCY,
  deleteErpConnection,
  fetchIntegrationId,
  saveErpConnection,
  setSyncFrequency,
  syncButton,
  toast,
  triggerRunNow,
} from './helpers/erp';
import { FAKE_ERP, FAKE_ERP_ROWS, UNREACHABLE_ERP_SERVER } from './helpers/testConfig';

/**
 * Plan Bölüm 12 madde 11'deki altı canlı senaryonun koşulabilir karşılığı.
 * Her senaryo kendi bağlantı durumunu kurar; sıraya bağımlılık yoktur.
 */

/** Ulaşılabilir sahte Netsis kaynağına bağlı, giriş yapmış oturum. */
async function withWorkingConnection(page: Page): Promise<void> {
  const token = await getAccessToken(page.request);
  await deleteErpConnection(page.request, token);
  await loginAsAdmin(page);
  await saveErpConnection(page, {
    serverAddress: FAKE_ERP.serverAddress,
    expectTestSuccess: true,
  });
}

/** Kayıtlı ama erişilemeyen ERP adresi; "ERP ayakta değil" durumunu üretir. */
async function withUnreachableConnection(page: Page): Promise<void> {
  const token = await getAccessToken(page.request);
  await deleteErpConnection(page.request, token);
  await loginAsAdmin(page);
  await saveErpConnection(page, {
    serverAddress: UNREACHABLE_ERP_SERVER,
    expectTestSuccess: false,
  });
}

test.describe('ERP canlı senaryoları', () => {
  // (1) Gerçek MSSQL olmadan çekim: buton sessizce başarısız olmaz.
  test('erişilemeyen ERP ile çekim açık hata bildirimi verir', async ({ page }) => {
    await withUnreachableConnection(page);

    await page.goto('/erp');
    await syncButton(page).click();

    const error = toast(page, 'error');
    await expect(error).toBeVisible({ timeout: 60_000 });
    await expect(error).toContainText(/çekilemedi|hata/i);
  });

  // (2) run-now akışı: NotImplemented/500 değil, tanımlı sonuç döner.
  test('run-now ucu tanımlı bir sonuç döndürür', async ({ page }) => {
    await withWorkingConnection(page);

    const token = await getAccessToken(page.request);
    const integrationId = await fetchIntegrationId(page.request, token);
    const status = await triggerRunNow(page.request, token, integrationId);

    // 200 = tamamlandı, 409 = zaten çalışıyor. 500/501 kabul edilmez.
    expect([200, 409], `run-now beklenmedik durum kodu döndü: ${status}`).toContain(status);
  });

  // (3) Box(2) kategorili taslak aktarım ekranında "Koli" olarak açılır.
  test('Box kategorili taslak aktarımda Koli görünür', async ({ page }) => {
    await withWorkingConnection(page);

    await page.goto('/erp');
    await syncButton(page).click();
    await expect(toast(page, 'warning')).toBeVisible({ timeout: 60_000 });

    await page
      .getByPlaceholder('Ürün adı, SKU, ERP ID veya barkod ile ara...')
      .fill(FAKE_ERP_ROWS.box.sku);
    // Bağlantı her senaryoda yeniden kurulduğu için aynı ERP kodu birden fazla
    // taslak kaydına karşılık gelebilir; ilk satır üzerinden ilerlenir.
    await expect(page.getByRole('cell', { name: FAKE_ERP_ROWS.box.sku }).first()).toBeVisible();

    await page.getByLabel(`${FAKE_ERP_ROWS.box.name} satırını seç`).first().check();
    await page.getByRole('button', { name: 'Ürünlere Aktar' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Aktarım tablosunda tek satır var; oradaki tek açılır liste ürün tipidir.
    await expect(dialog.getByRole('combobox')).toHaveText('Koli');
  });

  // (4) Sunucuda FourHours kayıtlıysa senkronizasyon sekmesi Günlük göstermez.
  test('sunucudaki 4 saatlik sıklık arayüzde seçili gelir', async ({ page }) => {
    await withWorkingConnection(page);

    const token = await getAccessToken(page.request);
    const integrationId = await fetchIntegrationId(page.request, token);
    await setSyncFrequency(page.request, token, integrationId, SYNC_FREQUENCY.FourHours);

    await page.goto('/settings?tab=erp-senkronizasyon');
    await expect(page.getByRole('radio', { name: '4 saatte bir' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Günlük' })).not.toBeChecked();
  });

  // (5) Geçmiş sekmesinin rozeti: bağlantı yokken sessiz, hata varken sayılı.
  test('senkronizasyon geçmişi sekmesi bağlantı yokken ve hatada doğru davranır', async ({
    page,
  }) => {
    const token = await getAccessToken(page.request);
    await deleteErpConnection(page.request, token);
    await loginAsAdmin(page);

    await page.goto('/settings?tab=erp-gecmis');
    // Bağlantı yokken "kayıt yok" değil, bağlantı kurma yönlendirmesi gösterilir.
    await expect(page.getByText('Önce ERP bağlantısını kaydedin')).toBeVisible();
    const historyTab = page.getByRole('button', { name: /Senkronizasyon Geçmişi/ });
    await expect(historyTab.getByText(/^\d+$/)).toHaveCount(0);

    // Başarısız bir çekim hata kaydı üretir; rozet bu sayıdan beslenir.
    await saveErpConnection(page, {
      serverAddress: UNREACHABLE_ERP_SERVER,
      expectTestSuccess: false,
    });
    await page.goto('/erp');
    await syncButton(page).click();
    await expect(toast(page, 'error')).toBeVisible({ timeout: 60_000 });

    await page.goto('/settings?tab=erp-gecmis');
    await expect(historyTab.getByText(/^\d+$/)).toBeVisible();
  });

  // (6) Şirket yöneticisi olmayan kullanıcı /erp adresine doğrudan girerse.
  test('yönetici olmayan kullanıcı /erp adresinde kilitli ekran görür', async ({ page }) => {
    const user = await registerIndividualUser(page.request);
    await loginViaUi(page, user.email, user.password);

    await page.goto('/erp');
    await expect(page.getByText('ERP ürünleri yalnızca şirket yöneticilerine açık')).toBeVisible();
    await expect(syncButton(page)).toHaveCount(0);

    // ERP ayar sekmesine URL ile gelinirse varsayılan sekmeye düşülür.
    await page.goto('/settings?tab=erp-baglanti');
    await expect(page.getByRole('heading', { name: 'Bireysel Hesap' })).toBeVisible();
  });
});
