/**
 * E2E ortam sabitleri. Varsayılanlar infra/env/.env.test ve
 * infra/compose/docker-compose.test.yml ile birebir aynıdır; CI'da ortam
 * değişkeniyle ezilebilir.
 */

/** Seed edilen şirket yöneticisi (DbInitializer). */
export const ADMIN_USER = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@cargopilot.com',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin@CargoPilot1!',
} as const;

/**
 * Sahte Netsis kaynağı. Sunucu adresi backend konteynerinden çözülür; tarayıcıdan
 * değil. Bu yüzden localhost değil compose servis adı kullanılır.
 */
export const FAKE_ERP = {
  serverAddress: process.env.E2E_ERP_SERVER ?? 'erp-mssql,1433',
  database: process.env.E2E_ERP_DATABASE ?? 'ERPTEST',
  username: process.env.E2E_ERP_USER ?? 'sa',
  password: process.env.E2E_ERP_PASSWORD ?? 'ErpFake_Pass123!',
} as const;

/** Hiçbir zaman çözülmeyen adres; "ERP ayakta değil" senaryosu için. */
export const UNREACHABLE_ERP_SERVER = 'erp-yok.invalid,1433';

/**
 * Sahte ERP'de kayıtlı örnek satırlar (infra/docker/erp-mssql/init/01-netsis-seed.sql).
 * Seed gerçek Netsis stok kodlarını taklit eder; buradaki değerler oradaki satırlarla
 * birebir aynı olmalıdır. Kullanılmayan satır burada tutulmaz: seed değiştiğinde
 * sessizce bayatlayıp CI'da "satır bulunamadı" olarak patlıyordu.
 *
 * ERP kaynaklı taslakların tipi GRUP_KODU'ndan türetilmez; hepsi sabit "Koli" (Box)
 * ile açılır ve kullanıcı aktarım ızgarasında değiştirir.
 */
export const FAKE_ERP_ROWS = {
  /** Aktarım senaryosu bunu Ürünler'e taşır; taslak "Aktarılanlar" durumuna geçer. */
  transferred: { sku: '600.02.0004', name: 'Buzdolabı No-Frost 480 L' },
  /**
   * Smoke senaryosu ayrı bir satır kullanır. Bağlantı kaldırılıp yeniden kurulduğunda
   * aynı entegrasyon canlandığı için senkronizasyon mevcut taslağı "değişmedi" sayıp
   * atlar; aktarılan satır bir daha "Bekleyenler" sekmesine dönmez.
   */
  pending: { sku: '153.01.0001' },
} as const;
