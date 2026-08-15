import { expect, test } from '@playwright/test';
import { getAccessToken, loginAsAdmin } from './helpers/auth';
import { deleteErpConnection, runSyncNow, saveErpConnection, toast } from './helpers/erp';
import { FAKE_ERP, FAKE_ERP_ROWS } from './helpers/testConfig';

/**
 * ERP-03 kabul kriteri: sahte Netsis kaynağından elle çekim en az bir taslak ürün
 * üretir. Zincirin tamamı tek senaryoda koşar:
 * giriş → /erp → bağlantı ayarı → çekim → bekleyen taslak listesi.
 */
test.describe('ERP çekim zinciri (smoke)', () => {
  test('bağlantı kaydedilir, çekim taslak üretir', async ({ page }) => {
    const token = await getAccessToken(page.request);
    await deleteErpConnection(page.request, token);

    await loginAsAdmin(page);

    await page.goto('/erp');
    await expect(page.getByRole('heading', { name: 'ERP Ürünleri' })).toBeVisible();

    await saveErpConnection(page, {
      serverAddress: FAKE_ERP.serverAddress,
      expectTestSuccess: true,
    });

    await page.goto('/erp');
    await runSyncNow(page);

    // Sahte kaynakta eksik ölçülü ve satışa kapalı satırlar da var; özet uyarı tonunda gelir.
    const summary = toast(page, 'warning');
    await expect(summary).toBeVisible({ timeout: 60_000 });
    await expect(summary).toContainText(/satır bulundu/);
    await expect(summary).toContainText(/eklendi/);

    await page
      .getByPlaceholder('Ürün adı, SKU, ERP ID veya barkod ile ara...')
      .fill(FAKE_ERP_ROWS.box.sku);

    // Bağlantı her senaryoda yeniden kurulduğu için aynı ERP kodu birden fazla
    // taslak kaydına karşılık gelebilir; varlık kontrolü ilk satır üzerinden yapılır.
    await expect(page.getByRole('cell', { name: FAKE_ERP_ROWS.box.sku }).first()).toBeVisible();
  });
});
