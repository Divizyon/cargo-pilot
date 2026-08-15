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

/** Sahte ERP'de kayıtlı örnek satırlar (infra/docker/erp-mssql/init/01-netsis-seed.sql). */
export const FAKE_ERP_ROWS = {
  /** GRUP_KODU = 'Box' → ItemCategory.Box(2) → arayüzde "Koli". */
  box: { sku: 'E2E-BOX-001', name: 'E2E Koli - LED TV' },
  /** GRUP_KODU = 'Drum' → ItemCategory.Drum(3) → arayüzde "Varil". */
  drum: { sku: 'E2E-DRUM-001', name: 'E2E Varil - Kimyasal' },
  /** EN/BOY/GENISLIK/BIRIM_AGIRLIK = 0 → "Eksik alan" rozeti. */
  missing: { sku: 'E2E-MISSING-001', name: 'E2E Olcusu Eksik Parca' },
  /** SATISKILIT = 'E' → hiç çekilmez. */
  salesLocked: { sku: 'E2E-LOCKED-001', name: 'E2E Satisa Kapali Urun' },
} as const;
