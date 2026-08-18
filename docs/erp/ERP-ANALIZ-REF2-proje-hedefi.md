# REF2 — CargoPilot ERP: Production'da Hedeflenen Çalışma Şekli (Dokümantasyon Sentezi)

> Kaynak: repo kökündeki 4 ERP raporu + `apps/backend/docs/erp-integration/` altındaki 4 doküman +
> `infra/docker/erp-mssql/` + `docs/context/kod-taramasi-2026-08.md`.
> Tüm referanslar `dosya_yolu:satır` biçimindedir. Tarih: 2026-08-13.
> Bu dosya salt dokümantasyon analizidir; kod değiştirilmemiştir.

## 0. Doküman Envanteri ve Güncellik Sırası (önce bunu oku)

| Doküman | Tarih | Nitelik | Git durumu |
|---|---|---|---|
| `ERP-DURUM-RAPORU.md` (109 satır) | 2026-08-08 (satır 3) | İlk durum tespiti, %45-50 tamamlanma | untracked, mtime 08-11 |
| `ERP-GELISTIRME-PLANI.md` (2238 satır) | 2026-08-10 + ek tur 2026-08-11 (satır 3, 1314) | Derin analiz + 37 task'lık plan (ERP-01..37) + kullanıcı ürün kararları | untracked, mtime 08-11 |
| `ERP-SON-DURUM-RAPORU.md` (116 satır) | 2026-08-12 (satır 4) | Uygulama sonrası durum: 37 task işlendi, 35 tam / 2 kısmen | untracked, mtime 08-12 |
| `ERP-DUZELTILECEK.md` (532 satır) | mtime 2026-08-13 (en taze) | Uygulama sonrası tespit edilen 6 sorun + kararlar (çoğu ÇÖZÜLDÜ) | untracked |
| `apps/backend/docs/erp-integration/adr-baglanti-mimarisi.md` | 2026-08-11, "Kabul edildi" (satır 3-4) | **Resmî mimari karar kaydı** | commit `4e517a93`, `5e669f6f` (08-11) |
| `apps/backend/docs/erp-integration/data-model.md` | son commit `c912cc02` (08-11) | Kodun bugünkü halini anlatan veri modeli | tracked |
| `apps/backend/docs/erp-integration/erp-export-kontrati.md` | commit `724842cb`, `425f92d1` (08-11) | ERP-18 export kontratı (flag kapalı) | tracked |
| `apps/backend/docs/erp-integration/erp-schema-divizyon.md` (481 satır) | son commit `61fe20db` (08-11) | Netsis şema referansı (DIVIZYON.bak örnek yedeği) | tracked |

**Geçerli kaynak hiyerarşisi:** Production hedefi için **ADR (`adr-baglanti-mimarisi.md`) + `data-model.md` + `erp-export-kontrati.md` + `erp-schema-divizyon.md`** esas alınmalı — bunlar repo'ya commit'li, koda göre 08-11'de güncellenmiş resmî dokümanlar. Kök dizindeki 4 ERP-*.md dosyası untracked çalışma raporlarıdır; kronoloji `DURUM-RAPORU (08-08) → GELISTIRME-PLANI (08-10/11) → SON-DURUM (08-12) → DUZELTILECEK (08-13 canlı)` şeklindedir ve **en güncel operasyonel durum `ERP-SON-DURUM-RAPORU.md` + `ERP-DUZELTILECEK.md`'dir**. `ERP-GELISTIRME-PLANI.md`'nin "bugünkü kod" tespitleri (NotImplemented handler'lar, silent failure vb.) 08-12 itibarıyla büyük ölçüde **düzeltilmiş** durumdadır; plan artık tarihsel gerekçe dokümanıdır, güncel davranış kaynağı değildir.

---

## 1. Hedeflenen Production Mimarisi: Buluttaki backend müşteri MSSQL'ine nasıl ulaşır?

**Karar (ADR, kabul edilmiş):** Doğrudan MSSQL bağlantısı — API yok, agent yok, tünel yok. Erişim **site-to-site VPN VEYA müşteri firewall'unda CargoPilot çıkış IP'sine allowlist** ile sağlanır.

- Ürün senkronizasyonu müşteri veritabanına doğrudan `SELECT` ile yapılır (MVP kararı): `apps/backend/docs/erp-integration/adr-baglanti-mimarisi.md:17-31`.
- Ağ ön koşulları tablosu (`adr-baglanti-mimarisi.md:78-91`):
  - Protokol/port: **TCP 1433** (named instance ise sabit porta alınmalı)
  - Yön: **CargoPilot backend (bulut) çıkışı → müşteri SQL sunucusu**
  - Erişim modeli: **Site-to-site VPN veya IP allowlist**; **"Doğrudan internete açık 1433 portu kabul edilebilir bir kurulum değildir"** (`adr-baglanti-mimarisi.md:90-91`)
  - Şifreleme: `Encrypt=true` her zaman açık; sertifika doğrulama `ErpSettings.TrustServerCertificate` ile yapılandırılabilir (geçerli sertifikada kapalı=doğrula, self-signed'da açık)
  - Timeout: bağlantı 15 sn, sorgu 120 sn
- Bağlantı hesabı: **yalnızca salt-okunur (`db_datareader`) özel SQL login** (`cargopilot_ro` şablonu, `adr-baglanti-mimarisi.md:66-76, 93-108`); `sa` kullanılmaz; test-connection yazma yetkisi tespit ederse görünür uyarı döner (test başarısız sayılmaz).
- Kullanıcının ürün kararı da bunu teyit eder: "CargoPilot bulutta, müşteri DB'si Logo/Netsis'te; ikisi de bulut üzerinden iletişim kurulabilir" (`ERP-GELISTIRME-PLANI.md:1708`, karar #6).

**Reddedilen/ertelenen alternatifler ve gerekçeleri** (`adr-baglanti-mimarisi.md:110-117`):

| Alternatif | Neden seçilmedi |
|---|---|
| Netsis NetOpenX / Logo REST (resmî API'ler) | Müşteri tarafında kurulum, lisans ve sürüm ön koşulları MVP takvimine sığmıyor; **bilinçli ertelendi** (`:56-63`). Yeniden değerlendirme tetikleyicileri: export'un üretimde açılması, stok dışı veri ihtiyacı, müşterinin DB erişimine izin vermemesi |
| Müşteri ağında agent/connector servisi | Kurulum ve güncelleme maliyeti; pilot için aşırı |
| Dosya tabanlı aktarım (CSV/Excel) | Zaten manuel içe aktarma olarak var; canlı senkronizasyonu karşılamıyor |

Ek karar: "Doğrudan-DB yaklaşımı bilinçli ürün kararı mı, MVP kestirmesi mi?" sorusuna kullanıcı cevabı: **"mvp kısaltmasıydı"** (`ERP-GELISTIRME-PLANI.md:1707`, karar #5). Yani doğrudan-DB kalıcı hedef değil, MVP pragmatizmi; resmî API'ye geçiş koşulları ADR'de tanımlı.

**Geri yazım (export) mimari kısıtı:** Sipariş/plan geri yazımı müşteri tablolarına doğrudan `INSERT/UPDATE` ile **yapılmaz** (`adr-baglanti-mimarisi.md:41-54`): Netsis sipariş tablolarında uygulama seviyesi tutarlılık kuralları var, doğrudan yazım veri bozabilir; yazım hatası geri alınamaz. Export feature-flag arkasında varsayılan kapalı geliştirilir; salt-okunur hesap zaten fiziksel yazımı engeller ("bilinçli güvenlik kilidi"). — Not: `erp-export-kontrati.md` ile arada gerilim var, bkz. Bölüm 8/Çelişkiler.

## 2. Bağlantı Ayarları Modeli

SSOT: **`ErpSettings`** — şirket başına tek kayıt, CompanyId unique (`data-model.md:31-44`):

| Alan | Not |
|---|---|
| `ProviderType` | Enum: **Logo=1, Netsis=2** (`data-model.md:38`) — eski FE kayması (Logo=0/Netsis=1) ERP-04'te veri migration'ıyla düzeltildi (`ERP-SON-DURUM-RAPORU.md:21`) |
| `CompanyCode` | **Gerçekte ERP veritabanı adı** (`Initial Catalog`); UI etiketi ERP-35 ile "Veritabanı Adı" yapıldı (`data-model.md:39`, `ERP-SON-DURUM-RAPORU.md:52`) |
| `Username` | SQL login; salt-okunur hesap önerilir |
| `PasswordEncrypted` | ASP.NET **`IDataProtectionProvider`** ile şifreli (`IErpPasswordProtector`), purpose `CargoPilot.ErpSettings.Password`; key ring DB'de (`DataProtectionKeys`), prod'da kalıcı volume'de (`ERP-GELISTIRME-PLANI.md:1262-1266`) |
| `ServerAddress` | SQL sunucu adresi (`Data Source`) |
| `TrustServerCertificate` | Varsayılan true; false ise sertifika doğrulanır (ERP-22, `data-model.md:44`) |

- `Integration.AuthCredentials` düz metin alanı hiç kullanılmıyordu, **ERP-23'te şemadan kaldırıldı**; kimlik bilgisi yalnızca ErpSettings'te (`data-model.md:22-25`, `adr-baglanti-mimarisi.md:121-124`).
- Parola katmanlar arası düz JSON string ile değil **tipli `ErpCredentials` record** ile taşınır; `ToString` maskeler, log/exception'a sızmaz (`adr-baglanti-mimarisi.md:126-127`).
- Parola çözülemezse (key ring değişmiş/bozuk kayıt) bağlantı denenmez; "ERP kimlik bilgileri okunamadı, parolayı yeniden kaydedin" hatası döner (`adr-baglanti-mimarisi.md:128-131`, commit `5e669f6f`).
- **Bağlantı testi:** `POST /erp-settings/test-connection`; hedef tasarımda (ERP-36, tamam — `ERP-SON-DURUM-RAPORU.md:53`) SqlException.Number bazlı sınıflandırılmış Türkçe hatalar (18456=kimlik, 4060=DB bulunamadı, timeout=sunucu/VPN), son test durumu kaydı; test-connection ayrıca **şema doğrulaması** yapar (Netsis'te TBLSTSABIT varlığı; `adr-baglanti-mimarisi.md:29-31`, ERP-21). Kaydet-öncesi otomatik test + "Yine de kaydet" ikincil yolu ERP-36 kapsamında (`ERP-GELISTIRME-PLANI.md:1667-1671`). Yazma yetkisi kontrolü (`HAS_PERMS_BY_NAME`) uyarı üretir (`adr-baglanti-mimarisi.md:68-70`).
- Üzerine yazma teyidi, kirli-form koruması ve backend **DELETE ucu** ERP-37 ile eklendi (`ERP-SON-DURUM-RAPORU.md:54`).

## 3. Otomatik Sync — Hedef Tasarım

- **Tetikleyici:** Hangfire `ErpScheduledSyncJob`, **15 dakikada bir tarama** yapar; yalnızca vadesi gelen (`NextScheduledSyncAt <= now`) entegrasyonları çalıştırır (`erp-schema-divizyon.md:186-189`; ERP-20 task tanımı `ERP-GELISTIRME-PLANI.md:478-495`; uygulandı: `ERP-SON-DURUM-RAPORU.md:37`, `ERP-DUZELTILECEK.md:24-25` — cron `*/15 * * * *`).
- **Periyot ayarı:** `Integration.SyncFrequency` enum **FourHours(0) / Daily(1)** (`data-model.md:16`, `ERP-GELISTIRME-PLANI.md:800-802`); kullanıcı `/settings` ERP senkronizasyon sekmesindeki sync-settings PUT'u ile seçer; `NextScheduledSyncAt` hesaplanıp saklanır.
- **Aç/kapa:** `SyncFrequency = null` → yalnızca manuel tetikleme ("Null ise sadece manuel tetiklenir", `data-model.md:15-16`); UI'da "null frekans göstergesi" eklendi (ERP-20, `ERP-SON-DURUM-RAPORU.md:37`).
- **Kapsam:** Ürün master (`TBLSTSABIT`) **tam tarama** — delta yok, çünkü tabloda güvenilir değişiklik damgası kolonu yok; maliyet `SELECT TOP (@MaxRowCount)` (=20.000) ile sınırlanır, limit dolarsa uyarı + mutabakat kırılımında görünür (`erp-schema-divizyon.md:178-192`). Müşteri şemasında damga doğrulanırsa delta eklenecek (`:191-192`).
- **Kim için:** Vadesi gelen her entegrasyon; şirket başına **eşzamanlı tek sync** kuralı korunur (`erp-schema-divizyon.md:189`; kilit: `Integration.SyncStatus=Running` + `SyncStartedAtUtc` zaman aşımıyla çözülür, `data-model.md:18-19`; ERP-13). Otomatik sync'te audit alanları sabit **sistem aktörü** kimliğiyle (`00000000-...-0001`) yazılır (`ERP-DUZELTILECEK.md:41-53`).
- **Hata durumu:** Satır bazlı hata izolasyonu + `SyncLog.PartialFailure` + `RowErrorsJson` (`data-model.md:46-62`); değişmeyen satırlar `MatchesErpSnapshot` ile atlanır ve `UnchangedCount` sayılır (`ERP-DUZELTILECEK.md:485-521`, migration `20260813123245_AddSyncLogUnchangedCount`). Mutabakat invariantı: `SourceTotal == added + updated + unchanged + skipped + ΣDropped`; fark `UnaccountedCount`'a yazılır (`data-model.md:56-60`, `ERP-DUZELTILECEK.md:503-508`).

## 4. Manuel Sync — Hedef Tasarım

- İki giriş noktası tekleşti: `POST /integrations/{id}/sync/run-now` artık `SyncErpItemsCommand`'a **delege eder** (ERP-14, NotImplemented kaldırıldı — `ERP-SON-DURUM-RAPORU.md:31`); asıl mantık `POST /integrations/{id}/items/sync` → `SyncErpItemsCommandHandler`.
- **Kullanıcı yüzeyi kararı:** /erp sayfasındaki sync butonu kalır; ayarlardaki gerekli bilgiler sync anında popup ile sorulabilir (kullanıcı kararı #8, `ERP-GELISTIRME-PLANI.md:1710`).
- Çalışan sync varken ikinci istek **409 "Senkronizasyon zaten devam ediyor"** alır (mantıksal kilit + `(IntegrationId, ErpId)` unique index güvenlik ağı; ERP-13, `ERP-SON-DURUM-RAPORU.md:30, 87`).
- Sync çalışırken frontend 5 sn polling yapar (`ERP-DURUM-RAPORU.md:42`).
- Sonuç toast'ı muhasebeli: "ERP'de 29 satır bulundu — 0 eklendi, 2 güncellendi, 25 değişmedi" (`ERP-DUZELTILECEK.md:513-515`; ERP-26 neden kırılımı, `ERP-SON-DURUM-RAPORU.md:43`).
- Manuel sync'te `CreatedBy` gerçek kullanıcı ID'sidir (`ERP-DUZELTILECEK.md:29-31`).
- Logo seçili entegrasyonda sync **açık "desteklenmiyor" hatası** döner (K12, `ERP-SON-DURUM-RAPORU.md:84`; `adr-baglanti-mimarisi.md:36-38`).

## 5. Sync Geçmişi / Log — Hedef Tasarım

`SyncLog` alanları (`data-model.md:46-60`): `IntegrationId`, `LoadingPlanId?` (yalnız plan-export kayıtlarında dolar), `StartedAt`, `CompletedAt?`, `Status` (Running/Success/**PartialFailure**/Failed), `SyncedRecordCount`, `ErrorMessage?`, `RowErrorsJson?` (satır bazlı hatalar), `SourceTotal`, `FetchedCount`, `DroppedByReasonJson?` (`ErpDropReason` adı→adet), `UnaccountedCount`, + `UnchangedCount` (`ERP-DUZELTILECEK.md:507-508`). Ölü `RuleAssignedCount`/`RuleNotAssignedCount` kaldırıldı (`ERP-DUZELTILECEK.md:183-189`).

- **Kullanıcıya gösterim:** `GET /integrations/{id}/sync-logs` sayfalı; ERPSyncHistory'de durum + neden bazlı eleme kırılımı ("Eksik ölçü: 12, Satış kilidi: 40, Depo filtresi: 210" formatı), `unaccounted > 0` ise kırmızı uyarı rozeti + tooltip (ERP-26, `ERP-GELISTIRME-PLANI.md:1470-1480`). Eleme dili ayrışır: kullanıcı seçimi filtreler "filtrelendi", sorunlu elemeler "atlandı" (kullanıcı kararı #2, `ERP-GELISTIRME-PLANI.md:1704`); `Unchanged` ikisine de girmez (`ERP-DUZELTILECEK.md:508-512`).
- **Manuel/otomatik ayrımı:** Log şemasında açık bir "tetikleyen" alanı dokümante edilmemiş; ayrım yalnızca audit alanından okunur — otomatik sync kayıtlarında `CreatedBy` = sistem aktörü GUID'i, manuelde gerçek kullanıcı (`ERP-DUZELTILECEK.md:41-53`). (Log satırında ayrı bir Manual/Scheduled bayrağı: dokümanlarda **belirsiz/yok**.)
- **Ürün sync'i vs plan export ayrımı:** `SyncLog.LoadingPlanId` dolu kayıtlar (export) **ürün senkronizasyon geçmişinde listelenmez**; filtre `ErpSyncPolicy.ProductSyncLog` (`erp-export-kontrati.md:73-75`).
- **Saklama süresi:** Hiçbir dokümanda retention/purge politikası tanımlı değil — **belirsiz** (NotificationCleanupJob benzeri bir SyncLog temizliği dokümante edilmemiş).

## 6. DraftItems (Taslak Ürün) Akışı ve Onay Mekanizması — Hedef Tasarım

Çekirdek prensip (kullanıcı gereksinimi a): **ERP verisi asla doğrudan `Items` tablosuna yazılmaz**; sync yalnızca `DraftItem` staging tablosuna upsert eder, Item'a geçiş kullanıcı onayıyla olur (`ERP-GELISTIRME-PLANI.md:13, 19, 826-833`). `data-model.md:64-65`: "ERP verisiyle Item arasındaki **tek** ara tablodur" — paralel `PendingItemMapping` zinciri ölü bulunup **kaldırıldı**, SSOT DraftItem (`data-model.md:90-95`, K1/ERP-16).

- **Statüler:** `Pending, Approved, Rejected, UpdatePending, UpdateDismissed` (`data-model.md:72`). Anahtar: `(IntegrationId, ErpId)` unique (`data-model.md:70`).
- **Sync → taslak:** Yeni ürün → Pending; mevcut Approved taslakta ERP verisi **gerçekten değiştiyse** → UpdatePending (snapshot karşılaştırması `MatchesErpSnapshot`, `ERP-DUZELTILECEK.md:485-497`); eksik ölçülü satırlar **elenmez**, `MissingFieldsJson` işaretiyle taslağa düşer (ERP-09/K4, `data-model.md:77`, `ERP-SON-DURUM-RAPORU.md:26`). ERP tazelemesi ölçü/ağırlık/barkod/yük grubunu da günceller; ölçü yalnız ERP değeri >0 ise yazılır (kullanıcının elle girdiği değer silinmez), barkod yalnız doluysa, yük grubu yalnız `GRUP_KODU` gerçekten bilgi taşıyorsa (`ERP-DUZELTILECEK.md:104-117`).
- **Alan türetme kararları (#4):** `GRUP_KODU` → **Yük Grubu** (`StackGroup`) anahtar kelime eşleştirmesiyle (`ErpLoadGroupResolver`: KIMYA/GIDA/TEKSTIL... desenleri; eşleşme yoksa "Genel") + `IncompatibleGroupsJson` otomatik hesaplanır; **Tip (`Category`) ERP'den türetilmez, sabit "Koli" (Box)** ile açılır (`ERP-DUZELTILECEK.md:266-352`, `erp-schema-divizyon.md:31`). Varil seçilirse Diameter=Width davranışı mevcut grid mantığıyla aynıdır (`ERP-DUZELTILECEK.md:380-405`).
- **Onay:** `/erp` (ERPItemsPage → ERPItemsTable → BulkImportDialog, CompanyAdmin korumalı — ERP-29) üzerinden; kullanıcı satırları düzenler (PUT `/draft-items/{id}`), sonra tek yol `POST /draft-items/approve-bulk` (tekil-döngü yolu kaldırıldı, ERP-12). Onay **ortak `ItemFactory`/`ItemSpec` + tek validasyon kural seti**nden geçer (ERP-10): geçersiz taslak Item'a geçemez, toplu akışta hatalı satır atlanır + nedeni sonuçta döner; **hatalı satır doğruları engellemez** (satır bazlı kısmi onay, gereksinim c — `ERP-SON-DURUM-RAPORU.md:27-29`). Yük Grubu onay zincirinde **zorunlu** iş kuralıdır (K6/karar #3, `ERP-GELISTIRME-PLANI.md:1705`).
- **Ret:** Toplu ret AlertDialog teyitli (ERP-34); **reddedilen taslak kalıcıdır** — sonraki sync ERP verisini tazeler ama statüyü Pending'e döndürmez; geri alma yalnızca kullanıcı aksiyonudur ("reinstate" ucu) (`data-model.md:79-80`, K2, `ERP-SON-DURUM-RAPORU.md:32`). Güncelleme reddi ayrı `UpdateDismissed` statüsü alır (ERP-15).
- **Onayda Item'a taşınan:** SKU, Barcode, Name, ProductType, Category, ölçüler, istif kuralları, `IncompatibleGroupsJson` birebir (`data-model.md:73-76`); Item'a `ErpId` + `IntegrationId` damgalanır (`data-model.md:97-100`).
- Excel toplu import DraftItem'a uğramaz, doğrudan `POST /items/bulk` (bilinçli ayrım; aynı validasyon setini paylaşır — `ERP-GELISTIRME-PLANI.md:1030-1036`, karar #8 planda açık soru olarak kalmıştı).

## 7. Logo vs Netsis — Hedeflenen Kapsam Farkı

| Yetenek | Netsis | Logo |
|---|---|---|
| Bağlantı testi (SqlConnection + şema doğrulaması) | ✅ (TBLSTSABIT varlık kontrolü) | ✅ login testi; LG_ tablo deseni kontrolü planlı (ERP-21, `ERP-GELISTIRME-PLANI.md:1370`) |
| Ürün sync (fetcher) | ✅ `NetsisProductFetcher`, TBLSTSABIT sorgusu (`erp-schema-divizyon.md:163-176`) | ❌ **Fetcher yok**; sync açık "Logo ürün senkronizasyonu henüz desteklenmiyor" hatası döner, Netsis SQL'i asla çalıştırılmaz (`adr-baglanti-mimarisi.md:36-38`, `erp-schema-divizyon.md:3-6`, K12 `ERP-SON-DURUM-RAPORU.md:84`) |
| Şema dokümanı | ✅ `erp-schema-divizyon.md` (TBLSTSABIT/TBLSIPAMAS/TBLSIPATRA, DIVIZYON.bak'tan) | ❌ Logo şeması (`LG_` tabloları) repo'da hiç belgelenmemiş; "şema dokümanı gelene kadar kapalı" (`adr-baglanti-mimarisi.md:130-131`) |
| Plan → ERP export | ✅ implementasyon hazır, TBLSIPAMAS/TBLSIPATRA'ya, **flag kapalı** (`erp-export-kontrati.md:1-16`) | ❌ kapsam dışı |
| Resmî API (NetOpenX / Logo REST) | Ertelendi | Ertelendi (`adr-baglanti-mimarisi.md:56-63`) |

Yani hedef: **Netsis birinci sınıf sağlayıcı; Logo yalnızca bağlantı ayarı düzeyinde tanımlı, veri akışı bilinçli kapalı** (sessiz yanlış-şema sorgusu yerine açık hata — ERP-21 kabul kriteri).

**Export (ERP-18) hedefi — yalnız Netsis** (`erp-export-kontrati.md` tamamı): Onaylanan plan tek sipariş olarak `TBLSIPAMAS` (1 başlık) + `TBLSIPATRA` (yerleşen ürün başına 1 satır) yazılır; kaynak yerleşimlerdir (araca sığmayan ürün siparişe girmez). Idempotency: `FATIRS_NO = {Prefix}-{planId[0..12]}` deterministik, serializable transaction'da varlık kontrolü → mükerrer sipariş yok. Kalıcı hata yeniden denenmez; geçici hata `ErpExportRetryableException` ile Hangfire `AutomaticRetry(3)`'e devredilir. Plan detayında rozet: Sent/Pending/Failed + `erpExportMessage`. Şirkette **tam olarak bir** ERP bağlantısı olmalı; yoksa/birden fazlaysa aktarım keyfi seçim yapmadan durur (`erp-export-kontrati.md:78-81`). Anahtar (`Erp:ExportEnabled=false`) müşteri kurulumunda FTIRSIP/KAPATILMIS/INCKEYNO/cari kodu doğrulanmadan **açılmaz** (`erp-export-kontrati.md:83-91`).

**Test/E2E ortamı — `infra/docker/erp-mssql/` ne için var:** Sahte Netsis ERP kaynağı; yalnızca e2e/test ortamı içindir (`infra/docker/erp-mssql/init/01-netsis-seed.sql:1-9`). `ERPTEST` DB'sinde fetcher'ın okuduğu kolonlarla birebir aynı `TBLSTSABIT` kurar (Turkish_CI_AS collation + N'li literaller — ErpLoadGroupResolver'ın Türkçe normalizasyonunu gerçekçi test etmek için, `:36-56`), Gıda/Kimya vb. grup senaryoları ve eksik-ölçü satırları içerir. `infra/compose/docker-compose.test.yml:113-160`'ta `erp-mssql` + tek seferlik `erp-mssql-init` servisi olarak ayağa kalkar; Playwright E2E (7 senaryo) ve CI `e2e-smoke` job'u bunu kullanır (`ERP-SON-DURUM-RAPORU.md:20, 66`; `.github/workflows/test-deploy.yml:393`). **Production bileşeni değildir.**

## 8. Dokümanlar Arası Çelişkiler / Bayatlamış İfadeler

1. **ERP-DURUM-RAPORU.md ve ERP-GELISTIRME-PLANI.md'nin "mevcut durum" tespitleri vs sonraki dokümanlar:** Plan, ErpExportService/TriggerSync NotImplemented, silent-failure, PendingItemMapping ölü zinciri, enum kayması vb. sorunları "bugünkü kod" olarak anlatır (`ERP-GELISTIRME-PLANI.md:13` vd.). Bunların tamamı 08-11/08-12 turunda çözüldü (`ERP-SON-DURUM-RAPORU.md:16-58`). **Geçerli:** SON-DURUM + tracked dokümanlar. İlk iki rapor tarihsel bağlam içindir.
2. **Şirket Kodu:** DURUM/PLAN döneminde "Şirket Kodu etiketi yanıltıcı" bulgu (`ERP-GELISTIRME-PLANI.md:1998-2004`); ERP-35 ile "Veritabanı Adı" olarak düzeltildi, `data-model.md:39` da bunu söylüyor. Çelişki kapandı.
3. **PendingItemMapping / ErpUserMapping:** İlk raporlarda "yarım/ölü akış, karar bekliyor"; `data-model.md:90-95` kesin durumu verir: **her ikisi de kaldırıldı**. Ancak `erp-schema-divizyon.md:476-481`'de hâlâ "ErpUserMapping Notu" bölümü var (KAYITYAPANKUL eşleşmesi anlatılıyor) — **bayat**: kaldırılmış bir tabloya referans veriyor; `data-model.md` esas alınmalı.
4. **Export "doğrudan tabloya yazmaz" (ADR) vs "TBLSIPAMAS/TBLSIPATRA'ya INSERT" (export kontratı):** `adr-baglanti-mimarisi.md:41-54` doğrudan tablo yazımını reddeder ve "tercihen resmî API veya müşterinin onayladığı ara tablo" der; `erp-export-kontrati.md` ise Netsis standart sipariş tablolarına doğrudan yazan hazır bir implementasyon tanımlar. Uzlaşma her iki dokümanda aynı: **flag varsayılan kapalı, müşteri şeması + yazım yöntemi doğrulanmadan açılmaz** (`adr:50-52`, `kontrat:3-4`) ve ADR "ERP-18 yöntemi ek karar olarak bu ADR'ye işlenecek" der (`adr:131-133`). Yine de "asla doğrudan yazma" ile "doğrudan yazan kod hazır" arasındaki gerilim **açık bir karar borcudur**; kontrat daha yeni commit'lidir (`724842cb`) ama ADR'ye ek karar işlenmemiştir.
5. **KAPATILMIS anlamı:** `erp-schema-divizyon.md` alanı "'H' = kapalı" diye tanımlarken örnek veri ve açık-sipariş sorgusu (`KAPATILMIS != 'H'` = açık) tersini gösteriyor; `erp-export-kontrati.md:85-87` bu çelişkiyi açıkça "doğrulanacak" diye işaretler. **Müşteri kurulumunda doğrulanmadan çözülemez.**
6. **data-model.md eski sürümü vs kod:** Planın tespit ettiği "AuthCredentials şifreli" çelişkisi (`ERP-GELISTIRME-PLANI.md:1795-1799`) 08-11 commit'leriyle (`4e517a93`, `c912cc02`) düzeltildi; güncel data-model.md kodla uyumlu ilan edildi (ERP-23 kabul kriteri `ERP-GELISTIRME-PLANI.md:1418`).
7. **ERP-SON-DURUM'un iki kritik UX hatası vs sonraki commit'ler:** Rapor "Tümünü seç yanlış küme" ve "SKU çakışması akış kilidi" hatalarını **düzeltilmedi** diye bırakır (`ERP-SON-DURUM-RAPORU.md:71-72`); ancak sonraki commit'ler `411b1b82` ("tumunu sec aktif sekmeye baglandi") ve `94dfdceb` ("kendi sku'su cakisma sayilmiyor") bunları kapatmış görünüyor — SON-DURUM raporu bu iki maddede artık bayat.
8. **ERP-SON-DURUM "kırılganlık 0-2" (ERP-32 kısmen) vs commit `a3c50f19`:** "toplu ice aktarimda kirilganlik yerine kisit ve yuk grubu alanlari kullaniliyor" — plan-kod çelişkisi sonradan farklı bir yaklaşımla ele alınmış olabilir; dokümante edilmiş net bir kapanış yok → **belirsiz**.

## 9. Dokümanlarda Zaten "Yapılacak / Eksik / Bilinen Sorun" Olarak İşaretli Maddeler

### ERP-DUZELTILECEK.md içinde hâlâ AÇIK olanlar
- **Izgara barkodu taşımıyor** (`ERP-DUZELTILECEK.md:523-530`): BulkImportDialog satır modelinde barkod alanı yok → onay öncesi `UpdateDraftItem` barkodu null'a çekiyor, ürüne NULL yazılıyor; taslak-ürün arasında kalıcı barkod farkı (24 taslağın 19'u). Karar bekliyor: onayda barkodu ürüne taşımak YA DA sync'in onaylı taslakta barkoda dokunmaması.
- **UpdatePending diff gösterimi** kapsam dışı bırakıldı — "ERP'den gelen yeni değer vs mevcut taslak" karşılaştırma ekranı ayrı iş kalemi (`ERP-DUZELTILECEK.md:124-125`).
- **BARKOD1 tek seferlik yan etki**: değişiklik sonrası ilk sync'te tüm taslaklar bir kez "güncellendi" işaretlenir (`ERP-DUZELTILECEK.md:517-521`) — bilinen, kabul edilmiş davranış.

### ERP-SON-DURUM-RAPORU.md "çözülmemiş" listesi (Bölüm 4-5)
- 🔴 **Sızmış Resend API anahtarı** `infra/env/.env.test` — rotate edilmeli (kod dışı acil aksiyon) (`:73`).
- 🔴 UX: "Tümünü seç" yanlış küme (`:71`) ve SKU kontrolü akış kilidi (`:72`) — *muhtemelen sonraki commit'lerle kapandı, bkz. Çelişki #7*.
- **Hiçbir migration gerçek MSSQL'e uygulanmadı** (ortamda DB yok); deploy öncesi staging'de kuru çalıştırma önerilir (`:76, 108`).
- **CI e2e-smoke job'u GitHub Actions'ta hiç koşmadı** — ilk PR'da doğrulanmalı (`:66, 107`).
- ERP-25 `RowScreeningPolicy` ayrı sınıf olarak yapılmadı (mantık fetcher+handler içinde) (`:77`).
- ERP-32 kırılganlık 0-2 kısıtı uygulanmadı (backend enum 0-9 ile çelişki; planın güncellenmesi gerekiyor) (`:78`).
- **Backend hata zarfı ↔ FE `validationFailures` uyumsuzluğu**: 422 hataları satır bazlı gösterilemiyor (`:79`).
- Kategori filtresi/arama sunucu sayfalamasıyla tutarsız (arama ilk 100 kayıtta; Toplam sayacı filtreden habersiz) (`:80, 96`).
- K3: Export flag'i kapalı; **Netsis'e gerçek yazma hiç canlı test edilmedi**; FTIRSIP, KAPATILMIS='H', INCKEYNO identity, cari kod sabiti müşteri kurulumunda doğrulanmalı (`:83`; aynı liste `erp-export-kontrati.md:83-91`).
- K12: Logo fetcher yok (`:84`).
- K6 yük grubu zorunluluğu yalnız taslak-onay yolunda; `CreateItem`/bulk-create ortak kurala eklenmedi (`:85`).
- Satır izolasyonunda tek `SaveChangesAsync` sonda — DB düzeyinde patlayan satır (unique ihlali) tüm batch'i düşürebilir (`:86`).
- Eş zamanlılık kilidi mantıksal; DB satır kilidi yok (`:87`).
- BulkImportDialog/VehicleBulkImportDialog ham `<table>` kaldı (ERP-30, sticky header riski) (`:88`).
- Test dosyaları tsconfig exclude'da; 6 dosyada 15+ tip hatası düzeltilmeden bırakıldı (`:89`).
- npm 10 güvenlik uyarısı doğrulanmadı (`:90`).
- UX orta/düşük bulgular (Bölüm 5, `:97-99`): "Satır Ekle" satırı sessizce kayboluyor; TLS switch etiketi ters anlamlı; sürükle-bırak vaadi ama handler yok; kategori filtre paneli el yapımı popover; skeleton kolon sayısı; RequiresErpConnection yüklenirken boş ekran; "Tümünü seç" bilgi bandı, sekme rozetleri vb. iyileştirme önerileri.
- `.gitattributes` eksikliği / CRLF-LF gürültüsü (`:64, 116`).

### erp-export-kontrati.md "anahtar açılmadan doğrulanacaklar" (`:83-91`)
FTIRSIP fiş tipi; KAPATILMIS 'H' anlamı; INCKEYNO identity mi; siparişin hangi cariye yazılacağı (bugün tek sabit `Erp:CustomerCode`); export açıldığında iki tabloya yazma yetkili SQL hesabı ihtiyacı.

### adr-baglanti-mimarisi.md "Açık konular" (`:129-133`)
Logo şema dokümanı gelmeden Logo fetcher yazılmayacak; ERP-18 resmî API/ara tablo yöntemi müşteri şeması doğrulandıktan sonra ADR'ye ek karar olarak işlenecek.

### ERP-GELISTIRME-PLANI.md ürün kararları — verilenler ve kalanlar
Ek tur kararlarının çoğu kullanıcı tarafından cevaplandı (`ERP-GELISTIRME-PLANI.md:1703-1712`): SATISKILIT çekilmesin; filtre elemesi "filtrelendi"; Yük Grubu zorunlu; etiket "Veritabanı Adı"; doğrudan-DB = MVP kestirmesi; bulut-bulut iletişim; AuthCredentials birleştir; sync butonu /erp'de kalsın; DELETE ucu eklensin. **Cevapsız kalan:** #10 2FA — "CLAUDE.md ERP ayarları 2FA varsayımına uymalı der; backend enforce ediyor mu?" cevabı "bilmiyorum tartışırız" (`:1712`) → **belirsiz, açık karar**. İlk tur listesindeki (bölüm 4, `:499-514`) bazı maddeler de dokümante kapanış almadı: #8 Excel importunun staging'i atlaması kalıcı mı; #10 ERP'de silinen ürünün CP'de pasifleştirilmesi (reconciliation — planda yok, `:512`); #12 DataProtection key'lerinin at-rest şifrelenmesi (sertifika/KeyVault) gereksinim mi (`:514`, `ERP-GELISTIRME-PLANI.md:1262-1268`: key'ler DB'de düz XML).

---

## 10. Tek Paragraf Özet (production hedefi)

Buluttaki CargoPilot backend'i, müşterinin ağındaki Netsis MSSQL'ine **site-to-site VPN veya IP allowlist ile açılan TCP 1433 üzerinden, salt-okunur `cargopilot_ro` SQL hesabıyla doğrudan bağlanır** (API yok, agent yok — bilinçli MVP kararı, ADR'li). Bağlantı bilgisi şirket başına tek `ErpSettings` kaydında, parola DataProtection ile şifreli tutulur; test-connection şema doğrulaması ve sınıflandırılmış Türkçe hatalar üretir. Ürün sync'i (manuel buton veya Hangfire'ın 15 dk'lık taramasıyla FourHours/Daily vadesi gelen entegrasyonlar için) `TBLSTSABIT`'i TOP 20.000 ile tam tarar, satır bazlı hata izolasyonu ve `SourceTotal==added+updated+unchanged+skipped+ΣDropped` mutabakatıyla `SyncLog`'a yazar ve ürünleri yalnızca `DraftItem` staging tablosuna düşürür; kullanıcı /erp ekranında düzenleyip onayladığında ortak validasyondan geçerek Item olur, ret kalıcıdır. Logo yalnızca bağlantı düzeyinde tanımlıdır; ürün çekimi açık hata döner. Plan→ERP sipariş yazımı (TBLSIPAMAS/TBLSIPATRA) kod olarak hazır ama `Erp:ExportEnabled=false` ile kapalıdır ve müşteri şeması doğrulanmadan açılmayacaktır.
