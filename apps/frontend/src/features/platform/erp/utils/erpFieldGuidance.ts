import type { ErpConnectionFormValues } from '@/features/platform/erp/schemas/erpConnectionSchema';

type ErpProvider = ErpConnectionFormValues['systemType'];

/**
 * Bağlantı formundaki alanların sağlayıcıya göre etiket, örnek ve yardım metinleri.
 * Backend bu alanı SQL veritabanı adı (InitialCatalog) olarak kullandığı için etiket
 * 'Şirket Kodu' değil 'Veritabanı Adı'dır.
 */
export interface ErpFieldGuidance {
  databasePlaceholder: string;
  databaseHelp: string;
  usernamePlaceholder: string;
  usernameHelp: string;
  passwordHelp: string;
  serverPlaceholder: string;
  serverHelp: string;
  /** IT ekibine iletilecek bilgi listesi; panoya kopyalanır. */
  itChecklist: string;
}

/**
 * Doğrudan-veritabanı modelinin ağ ön koşulları. Bunlar sağlanmadan bağlantı testi
 * "sunucuya ulaşılamıyor" der ve kullanıcı nedeni ekranda göremez; ADR'de yazılıydı
 * ama kurulum ekranında hiç görünmüyordu.
 * Kaynak: apps/backend/docs/erp-integration/adr-baglanti-mimarisi.md
 */
export const ERP_NETWORK_PRECONDITIONS = [
  'Cargo Pilot sunucusundan ERP SQL sunucusuna TCP 1433 açık olmalı (yön: Cargo Pilot → müşteri).',
  'Erişim site-to-site VPN ile ya da güvenlik duvarında Cargo Pilot çıkış IP adresine allowlist ile verilir; 1433 doğrudan internete açılmaz.',
  'Adlandırılmış örnek kullanılıyorsa SQL Server sabit bir port’a alınmalı.',
  'Bağlantı her zaman şifrelenir; sunucunun geçerli bir sertifikası yoksa formdaki sertifika ayarı açılır.',
] as const;

/** Salt-okunur SQL login şablonu; yazma yetkisi bilinçli olarak verilmez. */
export const ERP_READONLY_LOGIN_SCRIPT = [
  "CREATE LOGIN cargopilot_ro WITH PASSWORD = '<güçlü-parola>', CHECK_POLICY = ON;",
  'USE [ERP_VERITABANI];',
  'CREATE USER cargopilot_ro FOR LOGIN cargopilot_ro;',
  'ALTER ROLE db_datareader ADD MEMBER cargopilot_ro;',
].join('\n');

const SERVER_HELP =
  'ERP veritabanının çalıştığı SQL Server adresi. Adlandırılmış örnek için SUNUCU\\INSTANCE, ' +
  'özel port için sunucu,1433 biçimini kullanın. Adresi IT yöneticinizden alın.';

const PASSWORD_HELP =
  'Yukarıdaki SQL Server kullanıcısının şifresi. Şifre şifrelenerek saklanır, ekranda bir daha gösterilmez.';

function buildChecklist(providerLabel: string, databaseExample: string): string {
  return [
    `CargoPilot ${providerLabel} bağlantısı için gereken bilgiler:`,
    '1) SQL Server sunucu adresi (adlandırılmış örnek: SUNUCU\\INSTANCE, özel port: sunucu,1433)',
    `2) ${providerLabel} veritabanının SQL Server'daki adı (örn. ${databaseExample})`,
    '3) SQL Server kullanıcı adı — yalnızca okuma yetkili (db_datareader) bir hesap yeterlidir',
    '4) Bu kullanıcının şifresi',
    '5) Sunucunun TLS sertifikası kurum içi (self-signed) mi, yoksa geçerli bir sertifika mı?',
    '',
    'Ağ ön koşulları:',
    ...ERP_NETWORK_PRECONDITIONS.map((line, index) => `${index + 1}) ${line}`),
    '',
    'Salt-okunur SQL login şablonu:',
    ERP_READONLY_LOGIN_SCRIPT,
  ].join('\n');
}

const GUIDANCE: Record<ErpProvider, ErpFieldGuidance> = {
  Netsis: {
    databasePlaceholder: 'NETSIS2024',
    databaseHelp:
      'Netsis verilerinin tutulduğu SQL Server veritabanının adı (örn. NETSIS2024). Netsis ekranındaki şirket/firma numarası değildir; IT yöneticinizden alın.',
    usernamePlaceholder: 'netsis_okuyucu',
    usernameHelp:
      'Netsis kullanıcısı değil, veritabanına bağlanan SQL Server kullanıcısıdır. IT yöneticinizden yalnızca okuma yetkili (db_datareader) bir hesap isteyin.',
    passwordHelp: PASSWORD_HELP,
    serverPlaceholder: 'SUNUCU\\NETSIS veya 192.168.1.100,1433',
    serverHelp: SERVER_HELP,
    itChecklist: buildChecklist('Netsis', 'NETSIS2024'),
  },
  Logo: {
    databasePlaceholder: 'TIGERDB',
    databaseHelp:
      'Logo verilerinin tutulduğu SQL Server veritabanının adı (örn. TIGERDB). Logo içindeki firma numarası değildir; IT yöneticinizden alın.',
    usernamePlaceholder: 'logo_okuyucu',
    usernameHelp:
      'Logo kullanıcısı değil, veritabanına bağlanan SQL Server kullanıcısıdır. IT yöneticinizden yalnızca okuma yetkili (db_datareader) bir hesap isteyin.',
    passwordHelp: PASSWORD_HELP,
    serverPlaceholder: 'SUNUCU\\LOGO veya 192.168.1.100,1433',
    serverHelp: SERVER_HELP,
    itChecklist: buildChecklist('Logo', 'TIGERDB'),
  },
};

export function getErpFieldGuidance(provider: ErpProvider): ErpFieldGuidance {
  return GUIDANCE[provider];
}
