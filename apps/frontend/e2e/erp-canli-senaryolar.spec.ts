import { expect, test, type Page } from '@playwright/test';
import { getAccessToken, loginAsAdmin, loginViaUi, registerIndividualUser } from './helpers/auth';
import {
  SYNC_FREQUENCY,
  deleteErpConnection,
  fetchIntegrationId,
  saveErpConnection,
  setSyncFrequency,
  runSyncNow,
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
    await runSyncNow(page);

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
    await runSyncNow(page);
    await expect(toast(page, 'warning')).toBeVisible({ timeout: 60_000 });

    await page
      .getByPlaceholder('Ürün adı, SKU, ERP ID veya barkod ile ara...')
      .fill(FAKE_ERP_ROWS.transferred.sku);
    // Stok kodu hem SKU hem ERP ID sütununda görünür; ilk hücre üzerinden ilerlenir.
    await expect(
      page.getByRole('cell', { name: FAKE_ERP_ROWS.transferred.sku }).first(),
    ).toBeVisible();

    await page.getByLabel(`${FAKE_ERP_ROWS.transferred.name} satırını seç`).first().check();
    await page.getByRole('button', { name: 'Ürünlere Aktar' }).click();

    // Aktarım ekranı modal değil, kendi rotası: ürün ve araç ekleme sayfalarıyla
    // aynı kabuğu kullanıyor.
    await expect(page).toHaveURL(/\/erp\/aktar$/);
    const editor = page.getByRole('table');
    await expect(editor).toBeVisible();
    // Satırda iki açılır liste var (Tip ve Yük Grubu); tip ilk sıradadır.
    await expect(editor.getByRole('combobox').first()).toHaveText('Koli');
  });

  // (4) Sunucuda FourHours kayıtlıysa senkronizasyon sekmesi Günlük göstermez.
  test('sunucudaki 4 saatlik sıklık arayüzde seçili gelir', async ({ page }) => {
    await withWorkingConnection(page);

    const token = await getAccessToken(page.request);
    const integrationId = await fetchIntegrationId(page.request, token);
    await setSyncFrequency(page.request, token, integrationId, SYNC_FREQUENCY.FourHours);

    // Sıklık ayarı Ayarlar'dan çekim diyaloğuna taşındı; aksiyonun yanında duruyor.
    await page.goto('/erp');
    await syncButton(page).click();

    const syncDialog = page.getByRole('dialog');
    await expect(syncDialog).toBeVisible();
    await expect(syncDialog.getByRole('radio', { name: '4 saatte bir' })).toBeChecked();
    await expect(syncDialog.getByRole('radio', { name: 'Günlük' })).not.toBeChecked();
  });

  // (5) Geçmiş sekmesinin rozeti: bağlantı yokken sessiz, hata varken sayılı.
  test('senkronizasyon geçmişi sekmesi bağlantı yokken ve hatada doğru davranır', async ({
    page,
  }) => {
    const token = await getAccessToken(page.request);
    await deleteErpConnection(page.request, token);
    await loginAsAdmin(page);

    await page.goto('/settings?tab=erp');
    // Bağlantı yokken "kayıt yok" değil, bağlantı kurma yönlendirmesi gösterilir.
    await expect(page.getByText('Önce ERP bağlantısını kaydedin')).toBeVisible();
    // Üç sekme tek "ERP Entegrasyonu" sekmesinde birleşti; hata rozeti de oraya taşındı.
    const erpTab = page.getByRole('button', { name: /ERP Entegrasyonu/ });
    await expect(erpTab.getByText(/^\d+$/)).toHaveCount(0);

    // Başarısız bir çekim hata kaydı üretir; rozet bu sayıdan beslenir.
    await saveErpConnection(page, {
      serverAddress: UNREACHABLE_ERP_SERVER,
      expectTestSuccess: false,
    });
    await page.goto('/erp');
    await runSyncNow(page);
    await expect(toast(page, 'error')).toBeVisible({ timeout: 60_000 });

    await page.goto('/settings?tab=erp');
    await expect(erpTab.getByText(/^\d+$/)).toBeVisible();
  });

  // (6) Şirket yöneticisi olmayan kullanıcı /erp adresine doğrudan girerse.
  test('yönetici olmayan kullanıcı /erp adresinde kilitli ekran görür', async ({ page }) => {
    const user = await registerIndividualUser(page.request);
    await loginViaUi(page, user.email, user.password);

    // Faz 1'de /erp rotasına rol koruması eklendi: yetkisiz kullanıcı sayfaya hiç
    // ulaşmaz, sayfa içi kilitli görünüm yerine erişim reddi ekranına düşer.
    await page.goto('/erp');
    await expect(page.getByRole('heading', { name: 'Erişim Reddedildi' })).toBeVisible();
    await expect(syncButton(page)).toHaveCount(0);

    // ERP ayar sekmesine URL ile gelinirse varsayılan sekmeye düşülür.
    await page.goto('/settings?tab=erp');
    await expect(page.getByRole('heading', { name: 'Bireysel Hesap' })).toBeVisible();
  });
});
