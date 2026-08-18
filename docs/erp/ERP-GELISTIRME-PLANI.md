# CargoPilot — ERP Derin Analiz ve Geliştirme Planı

**Tarih:** 2026-08-10
**Yöntem:** Ultracode workflow — 7 paralel araştırma ajanı (kod-kanıtlı, salt-okunur) + 3 adversarial doğrulama ajanı + sentez. Toplam 11 ajan, 335 araç çağrısı.
**Doğrulama sonucu:** 34 kritik/yüksek bulgunun 32'si doğrulandı, 2'si düzeltilerek (kısmen doğru) plana alındı; tekzip edilen bulgu yok.
**Kapsam:** Analiz ve plan — implementasyon YAPILMADI (Opus ile ayrıca yürütülecek).
**Önceki rapor:** ERP-DURUM-RAPORU.md — bu doküman onu derinleştirir ve yer yer düzeltir.

---

## 1. Yönetici Özeti

ERP entegrasyonunun çekirdek staging mimarisi sağlam: ERP verisi doğrudan Items tablosuna yazılmıyor, SyncErpItemsCommandHandler DraftItem ara tablosuna upsert ediyor ve Item'a geçiş yalnızca kullanıcı onayıyla oluyor — kullanıcının 'ara tablo' gereksinimi mimari olarak karşılanıyor, korunmalı. Ancak bu çekirdeğin etrafı ciddi biçimde kırık. En kritik 5 sorun: (1) ErpExportService NotImplemented olduğu için onaylanan her plan ErpFailed'e düşüyor ve AutomaticRetry Failure Result'ta hiç tetiklenmiyor; (2) providerType enum kayması (FE Logo=0/Netsis=1, BE Logo=1/Netsis=2) yüzünden Logo hiç kaydedilemiyor, Netsis yanlış sağlayıcı olarak kaydediliyor; (3) sync akışı all-or-nothing — tek hatalı satır tüm batch'i düşürüyor, SyncLog.PartialFail hiç çağrılmıyor, skipped hep 0 ve eksik ölçülü ERP satırları SQL WHERE ile sessizce eleniyor (kullanıcının kısmi-başarı ve eksik-alan-bildirimi gereksinimleri karşılanmıyor); (4) 10 frontend hook'unun çağırdığı 6 rota ailesi backend'de hiç yok ve GET hook'ları safeParse fallback'leriyle her hatayı 'boş ama hatasız' ekrana çeviriyor; (5) test altyapısı fiilen sıfır — backend'de test projesi yok, CI test adımını sessizce atlıyor, RTL/jsdom ve Playwright kurulu değil. Onay tarafında ters yönlü bir sorun daha var: BulkImportDialog'da tek hatalı satır tüm seçimin aktarılmasını engelliyor; backend approve-bulk zaten satır atlamayı desteklediği için düzeltme client tarafında. Validasyon asimetrik: Excel bulk-create ~20 kuralla doğrularken draft approve yolu hiç doğrulamıyor ve zorunlu seçilen incompatibleGroups backend'e hiç ulaşmıyor — tek ortak validasyon mantığı (gereksinim d) ERP-10/11 ile kuruluyor. Plan bu yüzden test altyapısını (ERP-01/02/03) en öne alıyor, ardından kırık kontratları (enum, hata zarfı, silent-failure) düzeltip kısmi-başarı ve eksik-alan bildirimini backend+UI olarak ekliyor. 'Doğru kurgulanmış ama çalışmayan' akışlar (plan onayı→export, run-now, sevkiyat emirleri) için E2E senaryoları ilgili taskların kabul kriterlerine gömüldü. PendingItemMapping/ERPPage/ErpUserMapping gibi ölü zincirler için implement-veya-kaldır ürün kararları ayrı listede; bu kararlar verilmeden ERP-15/16/17 başlamamalı.

### Kullanıcı gereksinimlerinin durumu

| Gereksinim | Bugünkü durum | Kapatan task |
|---|---|---|
| (a) ERP verisi doğrudan DB'ye yazılmasın, ara tablo üzerinden aksın | ✅ **Mimari olarak karşılanıyor** — sync yalnızca DraftItem (staging) tablosuna yazıyor, Item'a geçiş kullanıcı onayıyla | Korunacak; ERP-10 validasyonu güçlendirir |
| (b) Eksik alanlar kullanıcıya söylensin | ❌ Eksik ölçülü satırlar SQL WHERE ile **sessizce eleniyor**, kullanıcı hiç görmüyor | ERP-09 |
| (c) Hatalı satırlar gösterilsin ama doğruların kaydını engellemesin | ❌ Sync all-or-nothing (tek hatalı satır tüm batch'i düşürüyor); BulkImportDialog'da tek hata tüm aktarımı blokluyor | ERP-08 (sync), ERP-12 (UI) |
| (d) Import/export ve bulk, ERP sync ile tutarlı tek validasyon paylaşsın | ❌ Bulk-create ~20 kural, draft approve **0 kural**; kopya Item-kurma kodu | ERP-10, ERP-11, ERP-19 |
| (e) Test edilebilirlik | ❌ Backend'de test projesi yok, CI test adımını sessizce atlıyor | ERP-01, ERP-02, ERP-03 |
| (f) Kurgulanmış-ama-çalışmayan akışlara E2E | ❌ Playwright kurulu değil | ERP-03 + ilgili taskların kabul kriterleri |

---

## 2. Doğrulama Düzeltmeleri

Adversarial doğrulamada iki bulgu düzeltildi:

- **Hook envanteri: 23 hook, 7'sinin endpoint'i backend'de yok** — *kısmen doğru.* 23 hook sayısı ve hook-endpoint eşlemesinin tamamı doğru (useERPIntegration.ts 608 satır, tam 23 export; eksik uçları çağıran satırlar :293, :443, :482, :495, :512, :531, :545, :562, :581, :595 teyitli). Ancak başlıktaki '7' sayısı yanlış: endpoint'i olmayan hook sayısı 10 (useERPSyncOptions, useERPShipmentOrders, useERPRemoteUsers, useERPUserMappings, useCreateERPUserMapping, useERPRoleConflictLog, useUpdateERPUserMapping, useDeleteERPUserMapping, useERPUnassignedData, useAssignUnassignedData), rota ailesi olarak 6'dır. Düzeltilmiş ifade: '23 hook'tan 10'unun çağırdığı 6 rota ailesi backend'de yok'.
- **run-now NotImplemented 500 dönüyor; frontend'in 409 özel akışı dışında kalıyor** — *kısmen doğru.* Çekirdek iddia teyit: TriggerSyncCommandHandler.cs:44-47 başarı yoluna ulaşan her çağrıda ErrorType.Unexpected + 'Sync.NotImplemented' döner; BaseController.cs:25 bunu 500'e çevirir ve Error kaydında (Error.cs:18-22) 'detail' alanı olmadığından useERPIntegration.ts:396-402'deki error.response?.data?.detail undefined kalır → kullanıcı 'Senkronizasyon başlatılamadı' görür. Düzeltme: 'her çağrıda' ifadesi tam doğru değil — handler önce guard'lardan geçer ve çalışan sync varsa 409 (satır 30-33), entegrasyon yoksa 404 (satır 37-39), şirket bağlamı yoksa 401 (satır 25-27) dönebilir; NotImplemented yalnızca bu guard'ları geçen (yani normalde başarılı olması gereken) her çağrıda döner.

---

## 3. Task Kırılımı (bağımlılık sıralı, her task ~1 PR)

| # | Task | Öncelik | Efor | Bağımlılık |
|---|---|---|---|---|
| ERP-01 | Backend test altyapısı: xUnit projesi + CI'daki sessiz test atlamasının kaldırılması | P0 | M (8-12 saat) | — |
| ERP-02 | Frontend test altyapısı: RTL/jsdom kurulumu + ERP şema/kontrat vitest'leri | P0 | M (6-10 saat) | — |
| ERP-03 | E2E altyapısı: Playwright + compose'a sahte ERP MSSQL + CI smoke | P0 | L (12-16 saat) | ERP-01, ERP-02 |
| ERP-04 | providerType enum kaymasının düzeltilmesi (FE {Logo:1, Netsis:2}) + mevcut kayıt kontrolü | P0 | S (3-5 saat) | ERP-02 |
| ERP-05 | Hata zarfı uyumu: backend Result kontratını okuyan ortak hata-mesajı yardımcısı | P0 | S (3-4 saat) | ERP-02 |
| ERP-06 | Silent-failure kaldırma: GET hook'larında hata fırlatma + bileşenlerde isError + Failed sync durumu | P0 | M (8-12 saat) | ERP-04, ERP-05 |
| ERP-07 | Plan onayı ERP export'unun feature-flag arkasına alınması + entegrasyon-yok durumunda açıklayıcı log | P0 | S (4-6 saat) | ERP-01 |
| ERP-08 | Sync'te satır bazlı hata izolasyonu ve kısmi başarı (backend) | P0 | L (12-16 saat) | ERP-01, ERP-06 |
| ERP-09 | Eksik alanlı ERP satırlarının kullanıcıya bildirilmesi | P0 | M (8-12 saat) | ERP-08 |
| ERP-10 | Tek ortak validasyon: Item kurulum factory'si + approve yolunda zorunlu doğrulama | P0 | L (12-16 saat) | ERP-01 |
| ERP-11 | incompatibleGroups'un draft onay zincirinde uçtan uca taşınması | P1 | M (6-8 saat) | ERP-10 |
| ERP-12 | BulkImportDialog'da satır bazlı kısmi aktarım + approve-bulk tekleştirme | P0 | M (8-10 saat) | ERP-02, ERP-10 |
| ERP-13 | Sync eşzamanlılık kilidi + DraftItems unique index + companyId guard | P1 | M (8-10 saat) | ERP-08 |
| ERP-14 | TriggerSync (run-now) NotImplemented'ın SyncErpItems'a delege edilmesi | P1 | S (4-6 saat) | ERP-13 |
| ERP-15 | Rejected taslak akışının düzeltilmesi: sekme, aksiyon ve kalıcılık semantiği | P1 | M (8-12 saat) | ERP-08 |
| ERP-16 | Ölü kod ve ölü kontrat temizliği: ERPPage, PendingItemMapping zinciri, ölü hook'lar | P1 | M (8-12 saat) | ERP-06 |
| ERP-17 | Provider-aware fetcher + ERP bağlantı sertleştirme (sa/DIVIZYON fallback, timeout, SQL filtresi) | P1 | L (12-16 saat) | ERP-13 |
| ERP-18 | ErpExportService gerçek implementasyonu: plan→ERP geri yazımı | P1 | L (16-24 saat) | ERP-07, ERP-17 |
| ERP-19 | Import/export şablon simetrisi: Yük Grubu sütunu, Kırılganlık ayrıştırma, round-trip kayıpları | P1 | S (4-6 saat) | ERP-12 |
| ERP-20 | Zamanlanmış otomatik sync: NextScheduledSyncAt'ı tüketen Hangfire RecurringJob | P2 | M (8-10 saat) | ERP-13, ERP-14 |

### Task Detayları

---

#### ERP-01 — Backend test altyapısı: xUnit projesi + CI'daki sessiz test atlamasının kaldırılması

**Öncelik:** P0 · **Efor:** M (8-12 saat) · **Bağımlılık:** yok

Backend'de hiç test projesi yok ve ci.yml test adımını sessizce atlıyor; tüm ERP düzeltmeleri test kapısıyla girsin diye altyapı ilk iş olarak kurulmalı (gereksinim e).

**Alt görevler:**
- [ ] apps/backend/tests/CargoPilot.Application.Tests/CargoPilot.Application.Tests.csproj oluştur (xUnit + FluentAssertions + NSubstitute) ve cargo-pilot.sln'e ekle
- [ ] İlk sabitleme testleri: TriggerSyncCommandHandler'ın 3 gerçek dalı (NoCompany:25-27, AlreadyRunning:30-33, NotFound:37-39) + bugünkü NotImplemented davranışı (41-47)
- [ ] ApprovePlanCommandHandler.cs:45-48 için 'onayda scheduler.Enqueue tam 1 kez çağrılır' birim testi
- [ ] ErpExportService.cs:16-19 için 'şu an Failure döner' davranış-sabitleme testi (ERP-18'de gerçek senaryoya çevrilecek)
- [ ] SyncErpItemsCommandHandler upsert testleri: yeni ürün→Pending, Approved→UpdatePending (:100-106), Rejected→ResetToPending (:108-110)
- [ ] .github/workflows/ci.yml:120-127'deki 'Test projesi bulunamadı, adım atlanıyor' dalını kaldır; dotnet test'i zorunlu yap

**Kabul kriterleri:**
- dotnet test sln kökünden yeşil geçiyor ve CI'da zorunlu adım olarak koşuyor
- Test projesi olmayan bir branch'te CI artık yeşil geçemiyor (atlama dalı silindi)
- En az 10 handler birim testi (TriggerSync dalları, ApprovePlan enqueue, ErpExportService, Sync upsert) mevcut

*İlgili bulgular:* Backend'de test projesi yok; CI test adımı sessizce atlanıyor · Teyit: run-now ucu UI+409 akışıyla hazır, handler NotImplemented

---

#### ERP-02 — Frontend test altyapısı: RTL/jsdom kurulumu + ERP şema/kontrat vitest'leri

**Öncelik:** P0 · **Efor:** M (6-10 saat) · **Bağımlılık:** yok

13 mevcut vitest dosyasının hiçbiri ERP'ye dokunmuyor ve jsdom/RTL kurulu olmadığından bileşen testi yazılamıyor; ERP Zod şemaları ve enum eşlemeleri 'beklenen kontrat' olarak testle sabitlenmeli (gereksinim d, e).

**Alt görevler:**
- [ ] apps/frontend/package.json'a jsdom + @testing-library/react + @testing-library/user-event + @testing-library/jest-dom ekle; apps/frontend/vitest.config.ts'e environmentMatchGlobs ile *.test.tsx için jsdom tanımla (mevcut node ortamı korunur)
- [ ] apps/frontend/src/lib/types/erp.ts şemalarına (erpSettings, syncLog, shipmentOrder, savedMatch, pendingItemMapping) örnek backend payload'larıyla parse/reddetme vitest'leri yaz
- [ ] PROVIDER_TYPE_TO_INT ve SYNC_FREQUENCY_TO_INT (useERPIntegration.ts:25,32-40) için backend enum sayılarına (ErpProviderType.cs, SyncFrequency.cs) kilitleyen kontrat testleri — bu test ERP-04'teki düzeltmeyi önce kırmızı yakalar
- [ ] İlk RTL testi: ERPItemsPage/ERPItemsTable taslak onay akışı mock'lu render

**Kabul kriterleri:**
- npm run test hem node hem jsdom testlerini koşuyor, CI'da yeşil
- PROVIDER_TYPE kontrat testi mevcut haliyle KIRMIZI (kaymayı belgeler), ERP-04 ile yeşile döner
- erp.ts şemaları için en az 8 parse/reject testi mevcut

*İlgili bulgular:* RTL/jsdom altyapısı kurulu değil · Frontend'de 13 vitest dosyası var, hiçbiri ERP'ye dokunmuyor

---

#### ERP-03 — E2E altyapısı: Playwright + compose'a sahte ERP MSSQL + CI smoke

**Öncelik:** P0 · **Efor:** L (12-16 saat) · **Bağımlılık:** ERP-01, ERP-02

E2E doğrulanabilirlik sıfır; 'kurgulanmış ama çalışmayan' akışların kabul kriterlerine E2E girebilmesi için koşucu+ortam kurulmalı (gereksinim f). docker-compose.test.yml ortam yarısı hazır, koşucu yarısı yok.

**Alt görevler:**
- [ ] apps/frontend'e @playwright/test ekle; playwright.config.ts baseURL=http://localhost:3001 (infra/env/.env.test ile uyumlu), docker-compose.test.yml'in ayakta olması ön koşul
- [ ] infra/compose/docker-compose.test.yml'e 'erp-mssql' servisi + init.sql ile TBLSTSABIT örnek verisi ekle (şema kaynağı: apps/backend/docs/erp-integration/erp-schema-divizyon.md — Netsis şeması)
- [ ] İlk smoke senaryosu: login → /erp sayfası yüklenir → /settings?tab=erp-baglanti'de ayar kaydet → items/sync tetikle → taslak listesi dolar
- [ ] .github/workflows'a compose-up→smoke job'u ekle (test-deploy sonrası)
- [ ] infra/env/.env.test'teki gerçek RESEND_API_KEY'i placeholder ile değiştir (rotate kararı ürün kararlarında)

**Kabul kriterleri:**
- npx playwright test lokalde compose ortamına karşı yeşil
- Sahte ERP MSSQL'den items/sync ile en az 1 DraftItem oluştuğu E2E ile doğrulanıyor
- CI'da smoke job'u koşuyor; .env.test'te gerçek sır kalmadı

*İlgili bulgular:* Playwright/e2e altyapısı hiç yok · docker-compose.test.yml tam-yığın 'test ortamı' kuruyor; e2e için hazır ama bağlanmış tüketicisi yok · CI'da e2e/entegrasyon aşaması yok

---

#### ERP-04 — providerType enum kaymasının düzeltilmesi (FE {Logo:1, Netsis:2}) + mevcut kayıt kontrolü

**Öncelik:** P0 · **Efor:** S (3-5 saat) · **Bağımlılık:** ERP-02

FE Logo=0/Netsis=1 gönderirken BE Logo=1/Netsis=2 bekliyor: Logo hiç kaydedilemiyor (400), Netsis Logo olarak kaydediliyor, GET round-trip çapraz bozuk. Tek taraflı frontend düzeltmesi en küçük güvenli diff.

**Alt görevler:**
- [ ] apps/frontend/src/lib/api/useERPIntegration.ts:25 PROVIDER_TYPE_TO_INT'i {Logo:1, Netsis:2} yap
- [ ] apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:35 PROVIDER_TYPE_FROM_INT'i {1:'Logo', 2:'Netsis'} yap
- [ ] apps/frontend/src/lib/types/erp.ts:198'deki yanlış '0=Logo, 1=Netsis' yorumunu düzelt
- [ ] Mevcut erp_settings kayıtlarında Netsis niyetiyle Logo=1 yazılmış veri var mı kontrol et; varsa tek seferlik düzeltme SQL'i/migration hazırla (backend PR'ı olarak)
- [ ] ERP-02'deki kırmızı kontrat testinin yeşile döndüğünü doğrula

**Kabul kriterleri:**
- Logo seçilip kaydet/test-connection 400 almadan çalışıyor; Netsis kaydı GET dönüşünde formda Netsis görünüyor (round-trip testi)
- PROVIDER_TYPE kontrat vitest'i yeşil
- E2E: sahte ERP'ye Netsis ayarıyla test-connection başarılı sonucu ERPConnectionForm'da inline görünüyor

*İlgili bulgular:* PROVIDER_TYPE enum kayması: frontend Logo=0/Netsis=1, backend Logo=1/Netsis=2

---

#### ERP-05 — Hata zarfı uyumu: backend Result kontratını okuyan ortak hata-mesajı yardımcısı

**Öncelik:** P0 · **Efor:** S (3-4 saat) · **Bağımlılık:** ERP-02

Tüm ERP mutation'ları error.response?.data?.detail (RFC7807) okuyor ama backend Result zarfı ({message, error:{description}}) döndürüyor; backend'in Türkçe hata mesajları kullanıcıya hiç ulaşmıyor.

**Alt görevler:**
- [ ] apps/frontend/src/lib/api içinde ortak yardımcı: getApiErrorMessage(error) → error.response?.data?.error?.description ?? error.response?.data?.message ?? fallback
- [ ] useERPIntegration.ts'deki tüm onError'ları (:143, :264, :284, :330, :378, :397, :521, :551, :570, :601) ve useDraftItems.ts mutation'larını bu yardımcıya geçir; 409 özel akışı (:395-403) korunur
- [ ] Yardımcı için vitest: Result zarfı, model-binding hatası ve network hatası örnekleriyle

**Kabul kriterleri:**
- Backend'in 'İlk kayıtta şifre zorunludur' gibi mesajları toast'ta birebir görünüyor (RTL/E2E ile doğrulanır)
- 409 'Senkronizasyon zaten devam ediyor' özel mesajı bozulmadı
- Yardımcının 3 senaryolu vitest'i yeşil

*İlgili bulgular:* Frontend hata gösterimi backend hata zarfıyla uyumsuz: 'detail' alanı hiç gelmiyor

---

#### ERP-06 — Silent-failure kaldırma: GET hook'larında hata fırlatma + bileşenlerde isError + Failed sync durumu

**Öncelik:** P0 · **Efor:** M (8-12 saat) · **Bağımlılık:** ERP-04, ERP-05

9+ GET hook'u safeParse/try-catch ile her hatayı boş veriye çeviriyor; UI 'boş ama hatasız' görünüyor ve backend'i olmayan uçların 404'ü gizleniyor. Ayrıca backend ErpSyncStatus.Failed(2) FE'de Idle görünüyor.

**Alt görevler:**
- [ ] useERPIntegration.ts'de fallback'leri kaldırıp parse/HTTP hatasını fırlat: :109-115 (settings), :191-192 (connection), :294-295 (sync-options), :422-423 (sync-logs), :438-449 (shipment-orders), :483-484, :496-497, :532-533, :582-583; useDraftItems.ts:74-75 aynı şekilde
- [ ] Bileşenlere isError dalı ekle: ERPShipmentOrders.tsx, ERPSyncHistory.tsx, ERPConnectionForm.tsx, ERPSyncPanel.tsx, ERPItemsTable.tsx — hata kutusu ile 'boş liste' / 'hata' ayrımı görünür
- [ ] erp.ts ErpSyncStatus tipine Failed ekle; useERPIntegration.ts:349'daki ===1 kontrolünü 0/1/2 tam eşlemeye çevir; Failed için görünür uyarı render et
- [ ] RTL testleri: 404/500/parse-hatası → hata kutusu render; başarılı boş liste → boş-durum metni

**Kabul kriterleri:**
- Backend'i olmayan bir ucu çağıran sekme artık 'Henüz ... yok' değil, hata durumu gösteriyor (RTL ile kanıtlı)
- Sync Failed durumunda ERPSyncPanel 'Başarısız' uyarısı render ediyor
- E2E: backend kapalıyken /settings ERP sekmeleri boş-durum değil hata durumu gösteriyor

*İlgili bulgular:* Silent-failure kalıpları satır satır: 9 GET hook'u hatayı boş veriye çeviriyor · Sync-settings durum eşlemesi eksik: backend Failed(2) frontend'de 'Idle' görünür

---

#### ERP-07 — Plan onayı ERP export'unun feature-flag arkasına alınması + entegrasyon-yok durumunda açıklayıcı log

**Öncelik:** P0 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-01

ErpExportService NotImplemented olduğundan onaylanan her plan ErpFailed'e düşüyor; export gerçeklenene kadar plan onayı ERP'siz temiz tamamlanmalı. Ayrıca entegrasyon yokken plan sessizce Failed oluyor ve 'otomatik aktar' switch'i sahte.

**Alt görevler:**
- [ ] appsettings tabanlı feature flag (örn. Erp:ExportEnabled=false): ApprovePlanCommandHandler.cs:45-48'deki MarkErpPending+Enqueue'yu flag'e bağla; flag kapalıyken plan onayı ERP durumuna hiç dokunmaz
- [ ] ErpExportJob.cs:35-42: entegrasyon bulunamadığında sessiz MarkErpFailed yerine açıklayıcı SyncLog kaydı + hata mesajı yaz; integrations[0] keyfi seçimini TODO olarak ERP-18'e bağla
- [ ] ERPSyncPanel.tsx:140-154'teki 'Plan onayında otomatik aktar' switch'ini kaldır veya disabled+açıklama yap (yalnızca yerel Zustand tercihi, backend'i yok)
- [ ] xUnit: flag kapalı→Enqueue çağrılmaz; flag açık→Enqueue 1 kez; entegrasyon yok→SyncLog yazılır

**Kabul kriterleri:**
- Flag kapalıyken plan onayı ErpPending/ErpFailed üretmiyor (birim + E2E: plan onayla → plan detayında ERP hata rozeti yok)
- Entegrasyon-yok senaryosunda kullanıcıya görünür bir neden kaydı oluşuyor
- Yanıltıcı switch UI'dan kalktı veya devre dışı

*İlgili bulgular:* ErpExportService NotImplemented: her onaylanan plan ErpFailed oluyor · ErpExportJob entegrasyonu keyfi seciyor: integrations[0] · 'Plan onayında otomatik aktar' switch'i yalnızca yerel UI tercihi

---

#### ERP-08 — Sync'te satır bazlı hata izolasyonu ve kısmi başarı (backend)

**Öncelik:** P0 · **Efor:** L (12-16 saat) · **Bağımlılık:** ERP-01, ERP-06

SyncErpItemsCommandHandler all-or-nothing: tek try/catch, tek SaveChanges, skipped hep 0, PartialFail hiç çağrılmıyor. Kullanıcının 'hatalı satır doğruları engellemesin' gereksiniminin (c) sync ayağı.

**Alt görevler:**
- [ ] SyncErpItemsCommandHandler.cs:82-173: foreach gövdesine satır başına try/catch; hatalı ürün atlanır, skipped++ ve satır hatası (erpId, sku, neden) listeye eklenir
- [ ] SyncLog entity'sine satır hataları için JSON alanı (örn. RowErrorsJson) + EF migration; sonda hata varsa syncLog.PartialFail(added+updated, özet) çağır (SyncLog.cs:46-53'teki ölü metot canlanır)
- [ ] SyncErpItemsResult'a errorCount + rowErrors ekle; GET sync-logs DTO'suna (SyncLogDto) hata detayını yansıt
- [ ] FE: useTriggerERPSync başarı toast'ını 'X eklendi, Y güncellendi, Z atlandı, N hatalı' formatına çevir (useERPIntegration.ts:323-327); ERPSyncHistory'de PartialFailure durumunu ve satır hatalarını göster
- [ ] xUnit: 3 üründen 1'i exception fırlatır → 2 kaydedilir, skipped=1, log PartialFailure; kontrat testi: yeni DTO alanları FE şemasıyla uyumlu

**Kabul kriterleri:**
- Tek bozuk satır artık diğer satırların kaydını engellemiyor (birim testle kanıtlı)
- SyncLog'da PartialFailure + satır bazlı hata nedenleri saklanıyor ve sync-logs UI'ında görünüyor
- E2E: sahte ERP'ye 1 bozuk satır ekle → sync sonrası taslak listesi dolu + geçmişte 'kısmi başarı' kaydı ve hatalı satır detayı görünüyor

*İlgili bulgular:* Sync'te satır bazlı hata izolasyonu ve kısmi başarı YOK — all-or-nothing · SyncLog'da satır bazlı hata kaydı için hiçbir yapı yok

---

#### ERP-09 — Eksik alanlı ERP satırlarının kullanıcıya bildirilmesi

**Öncelik:** P0 · **Efor:** M (8-12 saat) · **Bağımlılık:** ERP-08

EN/BOY/GENISLIK eksik satırlar SQL WHERE ile kaynaktan sessizce eleniyor, ağırlık null→0 varsayılıyor; kullanıcı 'ERP'de eksik' bilgisini hiç görmüyor (gereksinim b).

**Alt görevler:**
- [ ] SqlServerErpProductFetcher.cs:19-27: WHERE filtresini kaldır, eksik ölçülü satırları da çek ve ErpProduct'a eksik-alan bilgisi taşı (hangi alanlar null/<=0)
- [ ] SyncErpItemsCommandHandler: eksik alanlı satırları DraftItem'a 'eksik alan' işaretiyle yaz (DraftItem'a MissingFields alanı + migration) veya skipped+neden olarak ERP-08'in satır-hata listesine ekle — ürün kararına göre (varsayılan: taslak olarak yaz, kullanıcı tamamlasın)
- [ ] Ağırlık null→0 varsayımını kaldır: weight null ise eksik-alan işareti (SqlServerErpProductFetcher.cs:47)
- [ ] FE: ERPItemsTable'da eksik alanlı taslak satırında uyarı rozeti + BulkImportDialog'da ilgili hücre vurgusu; sync toast'ında 'M satırda eksik alan var' bilgisi
- [ ] xUnit: eksik EN'li satır → draft MissingFields=['width']; vitest: rozet render

**Kabul kriterleri:**
- Eksik ölçülü ERP satırı artık sessizce kaybolmuyor; kullanıcı sayısını ve hangi alanların eksik olduğunu görüyor
- 0 kg görünen ürünlerde 'ERP'de eksik' ayrımı UI'da net
- E2E: sahte ERP'ye ölçüsüz 1 ürün ekle → /erp'de eksik-alan rozeti ile listeleniyor ve tamamlanmadan onaylanamıyor

*İlgili bulgular:* Eksik alanlı ERP satırları sessizce eleniyor; kullanıcıya hiçbir bildirim yok

---

#### ERP-10 — Tek ortak validasyon: Item kurulum factory'si + approve yolunda zorunlu doğrulama

**Öncelik:** P0 · **Efor:** L (12-16 saat) · **Bağımlılık:** ERP-01

Bulk-create ~20 kuralla doğrularken draft approve hiç doğrulamıyor; iki yol kopya Item-kurma kodu taşıyor. Import/bulk/ERP sync tek validasyon mantığı paylaşmalı (gereksinim d).

**Alt görevler:**
- [ ] CargoPilot.Application altında ortak ItemFactory/ItemValidationService: CreateItemCommandValidator kural setini (SKU, boyut>0, fragility, maxWeightOnTop...) paylaşılan validator'a çıkar
- [ ] BulkCreateItemsCommandHandler.cs:85-107 ve ApproveDraftItemCommandHandler.cs:63-94 + ApproveDraftItemsCommandHandler.cs:73-104'teki kopya Item kurulumunu factory'ye delege et
- [ ] Approve/approve-bulk'ta doğrulama: tekil akışta geçersiz draft → 422 + alan hataları; toplu akışta geçersiz draft skip + nedenli sonuç (ApproveDraftItemsResult'a reason listesi)
- [ ] UpdateDraftItemCommandValidator.cs'i ortak kural setine genişlet (bugün 5 kural)
- [ ] Sync varsayılanlarını aynı merkeze bağla: SyncErpItemsCommandHandler.cs:131-136'daki isStackable=true+maxWeightOnTop=0 çelişkisini factory'nin normalize mantığıyla düzelt
- [ ] xUnit: weight=0 draft tekil approve → 422; toplu approve → skip+neden; Excel bulk-create ile approve aynı kural setinden geçiyor (paylaşım testi)

**Kabul kriterleri:**
- API'ye doğrudan approve çağrısıyla weight=0 ürün Items'a geçemiyor
- Excel importu ve draft approve birebir aynı validator kodunu kullanıyor (tek SSOT, testle kanıtlı)
- Toplu onayda geçersiz satırlar nedenleriyle sonuçta dönüyor

*İlgili bulgular:* Validasyon asimetrisi: bulk-create satır satır doğrular, draft approve hiç doğrulamaz · ERP sync varsayılanları ile Excel import varsayılanları çelişkili · Excel importu staging'i atlar, ERP sync staging kullanır

---

#### ERP-11 — incompatibleGroups'un draft onay zincirinde uçtan uca taşınması

**Öncelik:** P1 · **Efor:** M (6-8 saat) · **Bağımlılık:** ERP-10

UI yük grubunu zorunlu tutuyor ama draft yolunda backend'e hiç gönderilmiyor; ERP kaynaklı ürünler incompatibleGroups=null ile doğuyor ve optimizasyon ayrıştırma kuralları devre dışı kalabiliyor.

**Alt görevler:**
- [ ] UpdateDraftItemRequest (DraftItemsController.cs:118-135) ve UpdateDraftItemCommand'a IncompatibleGroups alanı ekle; DraftItem entity'sine sakla (migration)
- [ ] ApproveDraftItemCommandHandler.cs:48,82 ve ApproveDraftItemsCommandHandler.cs:56,92'deki sabit null yerine draft'taki değeri Item'a taşı
- [ ] FE: BulkImportDialog.tsx:142-164 rowToUpdatePayload'a incompatibleGroups ekle; useDraftItems.ts:81-99 UpdateDraftItemPayload tipini güncelle
- [ ] xUnit + kontrat testi: PUT draft → approve → Item.IncompatibleGroups dolu

**Kabul kriterleri:**
- ERP kaynaklı onaylanan üründe kullanıcının seçtiği yük grubu Item'da kayıtlı (entegrasyon testi)
- Excel yolu ile draft yolu aynı alan kümesini gönderiyor
- E2E: draft düzenle→onayla→ürün detayında yük grubu görünüyor

*İlgili bulgular:* ERP draft onay yolunda kullanıcının zorunlu seçtiği incompatibleGroups backend'e hiç ulaşmıyor

---

#### ERP-12 — BulkImportDialog'da satır bazlı kısmi aktarım + approve-bulk tekleştirme

**Öncelik:** P0 · **Efor:** M (8-10 saat) · **Bağımlılık:** ERP-02, ERP-10

Tek hatalı satır tüm seçimin aktarılmasını engelliyor (gereksinim c'nin UI ayağı); ayrıca aynı iş hem approve-bulk hem N tekil istekle yapılıyor ve kısmi sonuç toast'ta gizleniyor.

**Alt görevler:**
- [ ] BulkImportDialog.tsx:446-447 (hasClientErrors→return) ve :515-516 (canImport: errorRowCount===0) mantığını değiştir: 'Geçerli satırları aktar (N)' butonu — hatalı satırlar dışarıda kalır, kalanlar aktarılır
- [ ] useDraftItems.ts:152-169 useBulkApproveItemsIndividual'ı kaldır; her iki modda tek POST /draft-items/approve-bulk kullan
- [ ] ApproveDraftItemsResult'ı (approved/skipped + ERP-10'un nedenleri) parse edip toast'ta 'X aktarıldı, Y atlandı (neden)' göster (useDraftItems.ts:125-128'deki ids.length yanılgısını düzelt)
- [ ] Aktarım sonrası hatalı satırlar diyalogda kalır ve 'M satır hata nedeniyle bekliyor' özeti görünür
- [ ] RTL: 3 satırın 1'i hatalı → 2'si aktarılır, özet doğru

**Kabul kriterleri:**
- 100 üründen 1'i hatalıyken kalan 99 tek tıkla aktarılabiliyor (RTL + E2E)
- Toast backend'in gerçek approved/skipped sayaçlarını gösteriyor
- Tekil-döngü onay yolu koddan kalktı; tüm toplu onay atomik approve-bulk üzerinden

*İlgili bulgular:* Onay diyaloğunda tek hatalı satır TÜM seçimin aktarılmasını engelliyor · Aynı işin iki farklı yolu: toplu onay hem approve-bulk hem N tekil istekle · Toplu onayın kısmi başarı sonucu kullanıcıya gösterilmiyor

---

#### ERP-13 — Sync eşzamanlılık kilidi + DraftItems unique index + companyId guard

**Öncelik:** P1 · **Efor:** M (8-10 saat) · **Bağımlılık:** ERP-08

POST /items/sync hiçbir kilit kullanmıyor, Running durumu hiç set edilmiyor ve (IntegrationId, ErpId) indexi unique değil — eşzamanlı iki sync çift DraftItem üretebilir.

**Alt görevler:**
- [ ] SyncErpItemsCommandHandler.cs başına HasAnyRunningSyncAsync kontrolü (409 Sync.AlreadyRunning) + Integration.StartSync/CompleteSync/FailSync yaşam döngüsü (Integration.cs:57-65'teki ölü metotlar canlanır); Running'de takılmaya karşı zaman aşımı (örn. 30 dk sonra stale sayılır)
- [ ] DraftItemConfiguration.cs:96-97'deki IX_DraftItems_IntegrationId_ErpId'yi IsUnique yap + migration (öncesinde mevcut duplicate temizliği); upsert'i unique ihlalini yakalayacak şekilde sertleştir
- [ ] SyncErpItemsCommandHandler.cs:55-64'e companyId null→Auth.NoCompany erken dönüşü ekle (TriggerSyncCommandHandler.cs:24-27 kalıbı)
- [ ] xUnit: çalışan sync varken items/sync → 409; migration sonrası aynı ErpId ikinci draft yazamıyor

**Kabul kriterleri:**
- Eşzamanlı iki sync isteğinden ikincisi 409 alıyor; FE 409 mesajı görünüyor
- DB düzeyinde çift DraftItem imkânsız (unique index migration'ı uygulandı)
- CompanyId'siz token NRE değil 401 üretiyor

*İlgili bulgular:* (3) /items/sync eşzamanlılık kilidi kullanmıyor; Running durumu hiç set edilmiyor · (1) Staging/onay akışı mevcut — ama upsert anahtarı unique değil · (10) Çoklu-tenant izolasyonu tutarlı — küçük bir null-güvenlik pürüzü var

---

#### ERP-14 — TriggerSync (run-now) NotImplemented'ın SyncErpItems'a delege edilmesi

**Öncelik:** P1 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-13

İki sync giriş noktası tutarsız: items/sync çalışıyor, run-now NotImplemented ('PR #463 bekleniyor' — repoda izi yok). Tek sync mantığı olmalı.

**Alt görevler:**
- [ ] TriggerSyncCommandHandler.cs:41-47'deki NotImplemented bloğunu kaldır; SyncErpItemsCommand'ı mediator üzerinden çağır veya ortak sync servisine delege et; 409/404/401 guard'ları korunur
- [ ] 'PR #463 bekleniyor' yorumunu sil
- [ ] ERPSyncPanel.tsx:167-213'teki kategori/depo filtre Select'lerini kaldır (sync-options backend'i yok, filtreler isteğe zaten gönderilmiyor) — sync-options implementasyonu ayrı ürün kararı
- [ ] ERP-01'deki NotImplemented sabitleme testini 'delege edildi' testine çevir; E2E: ayarlar panelinden 'Şimdi çalıştır' → sync geçmişine kayıt düşüyor

**Kabul kriterleri:**
- POST sync/run-now gerçek sync tetikliyor; sonuç sync-logs'ta görünüyor (E2E kabul senaryosu)
- Çalışan sync varken run-now 409 + doğru toast
- Dekoratif filtre UI'ı kalktı

*İlgili bulgular:* TriggerSync (POST sync/run-now) NotImplemented; PR #463 izi repoda yok · ERPSyncPanel'deki kategori/depo filtreleri run-now isteğine gönderilmiyor · run-now NotImplemented 500 dönüyor

---

#### ERP-15 — Rejected taslak akışının düzeltilmesi: sekme, aksiyon ve kalıcılık semantiği

**Öncelik:** P1 · **Efor:** M (8-12 saat) · **Bağımlılık:** ERP-08

Reddedilenler routed UI'da görüntülenemiyor, Pending'den reddedilemiyor; reddedilen taslak sonraki sync'te otomatik Pending'e dönüyor ve update reddi draft'ı yanlışlıkla Approved işaretliyor.

**Alt görevler:**
- [ ] ERPItemsTable.tsx:323-336'ya 'Reddedilenler' sekmesi ekle (GetDraftItems status filtresi zaten destekli); ölü Rejected render dalı (:505,528-530) canlanır
- [ ] Bekleyenler sekmesi aksiyon çubuğuna Reddet butonu ekle (:640-670'te yalnız UPDATE_PENDING'de var)
- [ ] Ürün kararına göre kalıcılık: SyncErpItemsCommandHandler.cs:108-110'daki Rejected→ResetToPending'i kaldır (kalıcı ret) veya 'yeniden değerlendir' ayrı aksiyonu ekle
- [ ] RejectDraftItemCommandHandler.cs:33-39: UpdatePending reddinde draft.Approve() yerine yeni statü (örn. UpdateDismissed) + DraftItem'a statü ekle (migration); sync bu statüyü UpdatePending'e geri çevirmesin
- [ ] xUnit: reddedilen taslak ikinci sync'te Rejected kalıyor; RTL: Reddedilenler sekmesi listeleme

**Kabul kriterleri:**
- Kullanıcı /erp'de reddedilenleri görebiliyor ve Pending taslağı reddedebiliyor
- Reddedilen taslak sonraki sync'te sessizce geri gelmiyor (birim test + E2E: reddet→sync→hâlâ Reddedilenler'de)
- Update reddi draft/Item verisini ayrıştırmıyor

*İlgili bulgular:* Reddedilen taslaklar DB'de saklanıyor ama routed UI'da görüntülenemiyor · Reject kalıcı değil: sonraki sync reddedileni Pending'e döndürüyor

---

#### ERP-16 — Ölü kod ve ölü kontrat temizliği: ERPPage, PendingItemMapping zinciri, ölü hook'lar

**Öncelik:** P1 · **Efor:** M (8-12 saat) · **Bağımlılık:** ERP-06

İkili SSOT ve ölü yüzeyler drift üretiyor: orphan ERPPage + 3 ölü bileşen, hiç dolmayan PendingItemMapping tablosu + 3 endpoint'i, işlevsiz ErpUserMapping entity'si ve backend'i olmayan 10 hook. Ürün kararları sonrası tek onay hattı kalmalı.

**Alt görevler:**
- [ ] Ürün kararı 'kaldır' ise: apps/frontend/src/pages/erp/ERPPage.tsx + ERPPendingMatches.tsx + ERPItemMatchDialog + ERPUserMapping.tsx + ERPDraftItems.tsx sil (canlı muadil ERPItemsTable kalır)
- [ ] PendingItemMapping zincirini kaldır: entity, EF konfigürasyonu, repo, IntegrationsController.cs:170-236'daki 3 endpoint, handler'lar, drop migration; FE'den useERPPendingMatches/useSaveERPMatch/useDeleteERPMatch (useERPSavedMatches canlı CreatePlanFromOrdersDialog kullanımı için ayrıca değerlendirilir)
- [ ] ErpUserMapping entity+konfigürasyon+tablo için kaldırma migration'ı (veya implement kararıysa ayrı task)
- [ ] Backend'i olmayan 10 hook'tan kaldırılacak olanları ve useERPIntegration.ts:608 ölü yorumunu sil; kalacak rota aileleri (örn. shipment-orders) için FE Zod şemalarını beklenen-kontrat testi olarak sakla
- [ ] tsc + eslint + mevcut test paketi yeşil; silinen dosyalara referans kalmadığını grep ile doğrula

**Kabul kriterleri:**
- Taslak onayı için tek SSOT: DraftItem zinciri (PendingItemMapping izi kalmadı)
- Repo'da import edilmeyen ERP bileşeni ve çağrılmayan ERP hook'u kalmadı
- Build/test/lint yeşil, bundle'dan ölü kod çıktı

*İlgili bulgular:* PendingItemMapping olu akis · ERPUserMapping backend'de tamamen islevsiz · ERPPage orphan · Ölü bileşenler · pending-item-mappings kontratı alan ve şekil düzeyinde kırık

---

#### ERP-17 — Provider-aware fetcher + ERP bağlantı sertleştirme (sa/DIVIZYON fallback, timeout, SQL filtresi)

**Öncelik:** P1 · **Efor:** L (12-16 saat) · **Bağımlılık:** ERP-13

Fetcher provider ayrımı olmadan Netsis TBLSTSABIT'e kilitli (Logo müşterisinde SqlException), fallback'te 'sa'/'DIVIZYON' sabitleri var, timeout/satır limiti yok, depo filtresi bellekte.

**Alt görevler:**
- [ ] IErpConnector'a (IErpConnector.cs) FetchProductsAsync ekle; TBLSTSABIT sorgusunu SqlServerErpProductFetcher'dan NetsisErpConnector'a taşı; ProviderType'a göre çözümlenen connector factory (DependencyInjection.cs:106 tekil kaydı yerine)
- [ ] Logo seçiliyken fetch: şema dokümanı gelene kadar açık 'Logo ürün senkronizasyonu henüz desteklenmiyor' hatası döndür (sessiz SqlException yerine)
- [ ] SqlServerErpProductFetcher.cs:100-108'deki 'sa'/'DIVIZYON' fallback'lerini kaldır; eksik kimlik bilgisinde açıklayıcı Failure; TrustServerCertificate ve sa-kullanıcı uyarısını dokümante et
- [ ] ConnectTimeout/CommandTimeout ve satır limiti/sayfalama ekle; warehouseFilter'ı (:55-56) SQL parametresine taşı
- [ ] erp-schema-divizyon.md başına 'bu Netsis şemasıdır' notu ekle
- [ ] xUnit: Netsis→Netsis connector seçilir, Logo→açık hata; kimlik bilgisi eksik→Failure

**Kabul kriterleri:**
- Logo entegrasyonunda sync patlamıyor, anlaşılır hata dönüyor
- Hiçbir kod yolunda 'sa'/'DIVIZYON' sabiti kalmadı
- E2E: sahte Netsis MSSQL'e karşı sync depo filtresiyle doğru alt kümeyi çekiyor

*İlgili bulgular:* SqlServerErpProductFetcher saglayici-farksiz ve Netsis TBLSTSABIT'e kilitli · warehouseFilter bellekte uygulaniyor, fallback'te sabit 'sa'/'DIVIZYON' · (7) Sağlayıcı soyutlaması yetersiz

---

#### ERP-18 — ErpExportService gerçek implementasyonu: plan→ERP geri yazımı

**Öncelik:** P1 · **Efor:** L (16-24 saat) · **Bağımlılık:** ERP-07, ERP-17

Plan onayı→ERP export boru hattı (Hangfire, job, sync log) hazır ama servis NotImplemented; gerçek yazma implemente edilip ERP-07'deki flag açılmalı. 'Kurgulanmış ama çalışmayan' akışların en kritiği.

**Alt görevler:**
- [ ] Hedef ERP tablo/prosedür kontratını netleştir (erp-schema-divizyon.md sipariş tabloları TBLSIPAMAS/TBLSIPATRA baz alınarak; ürün kararı gerekli)
- [ ] ErpExportService.cs'i connector üzerinden (ERP-17 factory) gerçek yazma ile implemente et; idempotency: aynı plan tekrar export edilirse duplicate kayıt oluşmasın
- [ ] ErpExportJob.cs:35-42 integrations[0] keyfi seçimini kaldır: plana entegrasyon ID bağla veya tek-entegrasyon varsayımını açık domain kuralı yap; Failure Result'ta da retry çalışsın (Failure'ı exception'a çevir veya job içinde yeniden kuyrukla — AutomaticRetry yalnız exception'da tetikleniyor)
- [ ] Başarıda plan.MarkErpSent + SyncLog; feature flag'i (ERP-07) staging ortamında aç
- [ ] xUnit: başarılı export→MarkErpSent; geçici hata→retry; kalıcı hata→açıklayıcı log + MarkErpFailed

**Kabul kriterleri:**
- E2E (kabul senaryosu): plan onayla → job tamamlanınca sahte ERP DB'sinde sipariş kaydı oluşuyor ve plan detayında ERP durumu 'aktarıldı' görünüyor
- Aynı planın ikinci export'u duplicate üretmiyor
- Failure durumunda 3 retry gerçekten çalışıyor ve son durumda kullanıcıya neden görünüyor

*İlgili bulgular:* ErpExportService NotImplemented: her onaylanan plan ErpFailed oluyor · Teyit: Plan onayı → ERP export akışı kurgulanmış ama her seferinde Failed üretiyor · (4) Retry/backoff yalnız export job'ında

---

#### ERP-19 — Import/export şablon simetrisi: Yük Grubu sütunu, Kırılganlık ayrıştırma, round-trip kayıpları

**Öncelik:** P1 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-12

Resmi şablonda zorunlu 'Yük Grubu' sütunu yok (şablonu dolduranın tüm satırları hatalı düşüyor); export fragility 3-9'u sıfırlıyor ve grup/kısıt sütunlarını hiç yazmıyor — 'export et→düzenle→geri import et' akışı sessizce veri kaybediyor.

**Alt görevler:**
- [ ] export-utils.ts:159-204 şablonuna 'Yük Grubu' sütunu ekle (geçerli değerler + örnek satır); BulkImportDialog.tsx:191-195'teki Kırılganlık→constraintIds çifte kullanımını ayrıştır veya başlığı gerçek aralıkla (1-9) hizala
- [ ] exportItemsToExcel (:127-143): fragility'yi gerçek 0-9 değeriyle yaz; stackGroup/incompatibleGroups/constraintIds sütunlarını ekle — parser ile birebir simetrik
- [ ] ERPItemsTable.tsx:46 yanlış 'cm→mm' yorumunu ve :83-87 ölü case 6 dalını temizle
- [ ] Vitest round-trip testi: export çıktısı → xlsxToRows parse → hatasız ve kayıpsız

**Kabul kriterleri:**
- Resmi şablonu dolduran kullanıcının satırları 'Yük Grubu zorunlu' hatasına düşmüyor
- Export→import round-trip'te fragility ve grup/kısıt verisi kaybolmuyor (vitest ile kanıtlı)
- Ölü kod/yanlış yorum temizlendi

*İlgili bulgular:* Import şablonu ile parser uyumsuz: zorunlu 'Yük Grubu' sütunu şablonda yok · Ürün Excel exportu import ile round-trip kayıplı · Küçük tutarsızlıklar: yanıltıcı 'cm → mm' yorumu

---

#### ERP-20 — Zamanlanmış otomatik sync: NextScheduledSyncAt'ı tüketen Hangfire RecurringJob

**Öncelik:** P2 · **Efor:** M (8-10 saat) · **Bağımlılık:** ERP-13, ERP-14

Kullanıcının seçtiği sync frekansı tamamen kozmetik: UpdateSyncSettings NextScheduledSyncAt hesaplıyor ama hiçbir zamanlayıcı okumuyor (Program.cs'te ERP job'u yok).

**Alt görevler:**
- [ ] CargoPilot.Infrastructure/Jobs altına ErpScheduledSyncJob: vadesi gelen (NextScheduledSyncAt <= now) entegrasyonları tarayıp SyncErpItemsCommand tetikler; Program.cs:43-51'e RecurringJob kaydı (örn. 15 dk'da bir tarama)
- [ ] Sync sonrası Integration.RecordSync + bir sonraki NextScheduledSyncAt hesaplama; ERP-13 kilidi sayesinde çakışma güvenli
- [ ] Full-sync maliyetine karşı sorguya TOP/sayfalama notu (delta mümkün değilse dokümante et — TBLSTSABIT'te değişiklik damgası yok)
- [ ] xUnit: vadesi gelen 2 + gelmeyen 1 entegrasyon → yalnız 2'si tetiklenir; ERPSyncPanel'de son/sonraki sync zamanı doğru görünür

**Kabul kriterleri:**
- Frekans ayarı gerçek davranış üretiyor: E2E/staging'de vadesi gelen entegrasyon otomatik sync oluyor ve sync-logs'a kayıt düşüyor
- Çalışan sync varken zamanlayıcı ikinci sync başlatmıyor
- Vade hesaplama birim testleri yeşil

*İlgili bulgular:* (5) Delta sync yok — her sync tam tablo taraması; otomatik zamanlanmış sync de yok

---

## 4. Karar Bekleyen Ürün Maddeleri

Aşağıdaki kararlar verilmeden ilgili tasklar (özellikle ERP-15/16/17/18) başlamamalı:

1. ERPPage'in 7 sekmeli tasarımı mı, UnifiedSettingsPage'in 4 sekmeli hali mi hedef UX? (ERP-16 temizliğinin yönünü belirler; öneri: ERPPage'i sil, /settings tek kaynak)
2. PendingItemMapping akışı kaldırılsın mı, yoksa sync'e mapping üreten akış mı eklensin? (Öneri: kaldır — DraftItem tek SSOT; ERP-16 buna göre şekillenir)
3. Backend'i olmayan 6 rota ailesinden hangileri gerçek yol haritasında: shipment-orders (sevkiyattan plan oluşturma), erp-users/user-mappings, role-conflict-log, unassigned-data, sync-options? Implement edilmeyecekler ERP-16'da FE'den silinecek
4. Logo müşterisi hedefte mi? Hedefteyse Logo tablo şeması (LG_*) dokümanı kimden/ne zaman gelecek — ERP-17'de Logo fetch bu olmadan 'desteklenmiyor' hatasıyla kalır
5. Bağlantı bilgisinin SSOT'u: şirket başına tek ErpSettings mi, entegrasyon başına Integration.AuthCredentials mı? Çoklu aktif entegrasyon gerçek gereksinim mi? (ERP-18'de plan-entegrasyon bağını belirler)
6. Reddedilen taslak semantiği: kalıcı ret mi, yoksa ERP'de var oldukça yeniden değerlendirme mi? (ERP-15'in sync davranışını belirler)
7. Eksik ölçülü ERP satırları 'eksik alanlı taslak' olarak mı gösterilsin (öneri, ERP-09 varsayılanı) yoksa yalnızca sayı/neden raporu mu?
8. Excel importunun staging'i (DraftItem) atlaması bilinçli mi, yoksa ileride Excel de onay kuyruğuna mı girecek?
9. ERP-18 export hedef kontratı: plan hangi ERP tablolarına/prosedürüne yazılacak (TBLSIPAMAS/TBLSIPATRA mı, müşteri-özel mi)?
10. ERP'de silinen/satışa kapatılan ürünlerin CargoPilot'ta pasifleştirilmesi (reconciliation) istenen bir özellik mi? (Planda yok; istenirse ayrı task)
11. infra/env/.env.test'te açığa çıkmış gerçek RESEND_API_KEY rotate edilmeli mi? (Öneri: evet, ERP-03 sırasında)
12. DataProtection key'lerinin at-rest şifrelenmesi (sertifika/KeyVault) güvenlik gereksinimi mi, yoksa DB erişim kontrolü yeterli mi?

---

## 5. Test Stratejisi

Katmanlı piramit; her task kendi test kanıtıyla kapanır ve altyapı (ERP-01/02/03) her şeyden önce kurulur. (1) Backend birim (xUnit + NSubstitute, ERP-01): handler dalları — sync upsert/kısmi başarı/skip nedenleri, approve validasyonu, TriggerSync guard'ları, ApprovePlan enqueue, export retry. NotImplemented durumları önce 'davranış-sabitleme' testiyle kırmızı/yeşil belgelenir, implementasyon PR'ında gerçek senaryoya çevrilir. (2) Backend kontrat (WebApplicationFactory + Testcontainers-MSSQL): endpoint yanıtlarının frontend Zod şemalarına (lib/types/erp.ts beklenen-kontrat olarak sabitlenir) birebir uyduğu serialization testleri; enum sayı eşlemeleri (ProviderType, SyncFrequency, ErpSyncStatus, SyncLogStatus) çift taraflı test edilir — providerType kayması sınıfı hatalar bir daha giremesin. (3) Frontend birim (Vitest node): Zod parse/reject, hata-zarfı yardımcısı, export/import round-trip. (4) Frontend bileşen (RTL + jsdom, ERP-02 sonrası): silent-failure düzeltmelerinde isError render, BulkImportDialog kısmi aktarım, Reddedilenler sekmesi, eksik-alan rozetleri. (5) E2E (Playwright + docker-compose.test.yml + sahte ERP MSSQL, ERP-03): 'doğru kurgulanmış ama çalışmayan' akışların kabul senaryoları — (a) ayar kaydet→test-connection→items/sync→taslak listesi dolar→kısmi aktarım→Items'ta görünür; (b) bozuk/eksik alanlı ERP satırı→kısmi başarı + eksik-alan rozeti; (c) run-now→sync geçmişine kayıt; (d) plan onayla→sahte ERP'de sipariş kaydı + plan detayında 'aktarıldı' (ERP-18 ile). CI: backend test adımı zorunlu, vitest mevcut, compose-up→Playwright smoke job'u test-deploy sonrası koşar. Kural: kontrat değiştiren her PR hem backend serialization testini hem FE şema testini aynı PR'da günceller (gereksinim d'nin test güvencesi).

---

## 6. Bulgu Envanteri (alan alan, kanıtlı)

Toplam 67 bulgu: 9 kritik, 25 yüksek, 23 orta, 10 düşük. Kritik/yüksek bulguların tamamı adversarial doğrulamadan geçirildi.

### 6.1 Backend Çekirdek

Backend ERP yüzeyi üç controller'dan oluşuyor: ErpSettingsController (api/v1/erp-settings: GET, PUT, POST test-connection), IntegrationsController (api/v1/integrations: GET listesi, GET {id}/sync-logs, GET/PUT {id}/sync-settings, POST {id}/sync/run-now, POST {id}/items/sync, GET/PUT/DELETE {id}/pending-item-mappings[...]) ve DraftItemsController (api/v1/draft-items: GET, PUT {id}, POST {id}/approve, POST approve-bulk, POST {id}/reject); ayrıca PlansController'daki POST {id}/approve ERP export job'ını kuyrukluyor. Rapordaki tüm ana iddialar koddan teyit edildi: ErpExportService her çağrıda NotImplemented hatası döndüğü için onaylanan her plan ErpFailed'e düşüyor; TriggerSyncCommandHandler 'PR #463 bekleniyor' yorumuyla NotImplemented dönüyor ve repoda 463 ile ilişkili hiçbir branch yok; PendingItemMapping tablosunu dolduran tek satır kod yok (3 endpoint boş tablo üzerinde çalışıyor); ErpUserMapping entity+migration dışında hiçbir Application/WebAPI kodunda geçmiyor; SqlServerErpProductFetcher tek kayıtla (provider ayrımı olmadan) DI'a bağlı ve sabit Netsis TBLSTSABIT sorgusuna kilitli, Diameter=null ve ErpConstraints boş sözlük gönderiyor. Frontend'in çağırdığı sync-options/shipment-orders/erp-users/user-mappings/role-conflict/unassigned-data rotalarının hiçbiri backend'de yok (grep sıfır eşleşme). Ek yeni bulgular: ErpExportJob şirketin ilk entegrasyonunu rastgele seçiyor, AutomaticRetry(3) hata Result'ta tetiklenmiyor (yalnızca exception'da), warehouseFilter bellek içinde uygulanıyor, bağlantı dizisi fallback'inde 'sa'/'DIVIZYON' sabitleri var ve SyncErpItemsResult.skipped hiç artırılmıyor. EN/BOY/GENISLIK kolon eşlemesi ise erp-schema-divizyon.md ile birebir uyumlu, yani şüpheli görünse de hata değil.

<details>
<summary>🔴 Kritik — ErpExportService NotImplemented: her onaylanan plan ErpFailed oluyor</summary>

ApprovePlan zinciri eksiksiz kurulu: handler plani MarkErpPending yapip Hangfire'a ErpExportJob kuyrukluyor; job her denemede ErpExportService.ExportAsync cagiriyor, servis kosulsuz 'Erp.ExportNotImplemented' Failure dondugu icin job her seferinde syncLog.Fail + plan.MarkErpFailed yaziyor. Uretimde plan onaylayan her kullanici ERP hatasi goruyor. Ek nuans: [AutomaticRetry(Attempts=3)] yalnizca exception'da tetiklenir; Failure Result normal donus oldugu icin Hangfire job'i 'basarili' sayar, retry hic calismaz — yani 3 deneme bile yapilmiyor, tek seferde Failed kaliyor.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/ErpExportService.cs:16-19; apps/backend/CargoPilot.Application/Features/Plans/ApprovePlan/ApprovePlanCommandHandler.cs:45-48; apps/backend/CargoPilot.Infrastructure/Jobs/ErpExportJob.cs:7,48-57; apps/backend/CargoPilot.WebAPI/Controllers/PlansController.cs:240-248

**Önerilen iş:** ApprovePlan'daki enqueue'yu feature-flag arkasina al (plan onayi ERP'siz tamamlansin), ardindan ErpExportService'i gercek yazma ile implemente et.

</details>

<details>
<summary>🟠 Yüksek — TriggerSync (POST sync/run-now) NotImplemented; PR #463 izi repoda yok</summary>

Handler once 409 (Sync.AlreadyRunning) ve 404 kontrollerini gercekten yapiyor, sonra kosulsuz 'Sync.NotImplemented' Failure donuyor. Yorumda 'PR #463 bekleniyor' yaziyor ancak 'git branch -a' ciktisinda 463, sync veya erp iceren hicbir yerel/uzak branch yok (yalnizca AUDIT-* branch'leri var); beklenen PR'in bir karsiligi repoda mevcut degil. Gercek sync mantigi zaten ayni controller'daki POST {id}/items/sync -> SyncErpItemsCommandHandler'da calisiyor; iki giris noktasi tutarsiz.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/TriggerSync/TriggerSyncCommandHandler.cs:41-47; apps/backend/CargoPilot.WebAPI/Controllers/IntegrationsController.cs:120-131; git branch -a ciktisi (463 eslesmesi yok)

**Önerilen iş:** TriggerSyncCommandHandler'i SyncErpItemsCommand mantigina delege et (veya ayni servisi cagir), 409 on-kontrolunu koru; PR #463 yorumunu kaldir.

</details>

<details>
<summary>🟠 Yüksek — PendingItemMapping olu akis: tabloya yazan kod yok, 3 endpoint bos tablo uzerinde</summary>

'new PendingItemMapping(' grep'i tum backend'de yalnizca EF konfigurasyon kaydini ve DTO projeksiyonunu buluyor; entity'yi olusturan tek satir uretim kodu yok. GET/PUT/DELETE pending-item-mappings endpoint'leri ve handler'lari calisir durumda ama daima bos tablo okuyor. Approve handler'i da yalnizca mapping.Approve(itemId) ile status gunceliyor; DraftItem/Item olusturmuyor — sync akisi (SyncErpItemsCommandHandler) bu tabloyu tamamen atlayip dogrudan DraftItem yaziyor.

**Kanıt:** grep 'new PendingItemMapping' -> sadece AppDbContext.cs:74 (konfigurasyon) ve GetPendingItemMappingsQueryHandler.cs:42 (DTO); apps/backend/CargoPilot.WebAPI/Controllers/IntegrationsController.cs:170-236; apps/backend/CargoPilot.Application/Features/Integrations/PendingItemMappings/ApprovePendingItemMappingCommandHandler.cs:55-57

**Önerilen iş:** Urun karari sonrasi ya PendingItemMapping zincirini (entity, repo, 3 endpoint, migration) kaldir ya da SyncErpItemsCommandHandler'a mapping ureten akisi ekle; ikili SSOT birakma.

</details>

<details>
<summary>🟠 Yüksek — SqlServerErpProductFetcher saglayici-farksiz ve Netsis TBLSTSABIT'e kilitli</summary>

DI'da IErpProductFetcher tek implementasyonla kayitli; ErpSettings.ProviderType (Logo/Netsis) hic sorgulanmiyor. SQL sabit 'FROM TBLSTSABIT' (Netsis/Divizyon semasi); Logo secen bir musteride items/sync SQL hatasiyla patlar. IErpConnector arayuzunde yalnizca TestConnectionAsync var (Logo ve Netsis connector'lari birebir ayni govde); item cekme connector'lara hic baglanmamis. Diameter her zaman null, ErpConstraints her zaman bos sozluk gonderiliyor; DraftItem sabit varsayilanlarla (NonFragile, isStackable:true, maxStackCount:1, maxWeightOnTop:0, AllowedRotations.All) olusuyor. Not: EN=Width, BOY=Depth, GENISLIK=Height eslemesi erp-schema-divizyon.md ile uyumlu, hata degil.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/DependencyInjection.cs:106,113-114; apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:19-27,82-83; apps/backend/CargoPilot.Application/Common/Interfaces/IErpConnector.cs; apps/backend/CargoPilot.Infrastructure/Services/ErpConnectors/LogoErpConnector.cs:12-44; apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:131-137; apps/backend/docs/erp-integration/erp-schema-divizyon.md:132-134

**Önerilen iş:** IErpConnector'a FetchProductsAsync ekleyip TBLSTSABIT sorgusunu Netsis connector'a tasi; ProviderType'a gore connector sec; Logo sema sorgusu icin dokumantasyon edin.

</details>

<details>
<summary>🟠 Yüksek — Frontend'in cagirdigi 6 rota ailesinin backend'de karsiligi yok</summary>

sync-options, {id}/shipment-orders, erp-users, user-mappings, role-conflict-log, unassigned-data desenlerinin hicbiri backend kaynak kodunda gecmiyor (grep sifir eslesme). ERP'ye dokunan controller'lar yalnizca IntegrationsController ve ErpSettingsController (Controllers klasoru grep'i); DraftItemsController ve PlansController.approve tamamlayici uclar. Bu rotalari cagiran frontend hook'lari 404 alir.

**Kanıt:** grep 'sync-options|shipment-orders|erp-users|user-mappings|role-conflict|unassigned-data' apps/backend -> No matches; grep 'Erp|erp' Controllers -> yalnizca IntegrationsController.cs, ErpSettingsController.cs

**Önerilen iş:** Kontrat karari: her rota icin ya backend query/command implemente et ya da frontend'den cagriyi kaldir; oncelik sirasi urun karariyla belirlensin.

</details>

<details>
<summary>🟡 Orta — ErpUserMapping backend'de tamamen islevsiz</summary>

Entity, EF konfigurasyonu ve 20260507231317_AddErpIntegrationTables migration'i mevcut; ancak Application ve WebAPI katmanlarinda ErpUserMapping'e referans veren tek bir handler, query veya endpoint yok (grep sonuclarinin tamami Domain/Infrastructure/migration/doc dosyalari). erp_user_mappings tablosu olu.

**Kanıt:** grep 'ErpUserMapping' -> 31 dosya, hicbiri CargoPilot.Application veya CargoPilot.WebAPI altinda handler/controller degil; apps/backend/CargoPilot.Domain/Entities/ErpUserMapping.cs; apps/backend/CargoPilot.Infrastructure/Persistence/Configurations/ErpUserMappingConfiguration.cs

**Önerilen iş:** Frontend'in bekledigi erp-users/user-mappings kontratina uygun CRUD handler + endpoint'ler yaz veya entity+migration'i kaldirma karari al.

</details>

<details>
<summary>🟡 Orta — ErpExportJob entegrasyonu keyfi seciyor: integrations[0]</summary>

Job sirkete ait entegrasyon listesinden ilk elemani aliyor; birden fazla entegrasyon varsa hedef ERP belirsiz/siralamaya bagli. Entegrasyon yoksa plan sessizce Failed isaretleniyor (sync log da yazilmiyor, kullaniciya neden gorunmuyor). Ayrica in-memory modda NoOpErpExportJobScheduler kayitli oldugu icin onaylanan plan sonsuza dek Pending kalir.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Jobs/ErpExportJob.cs:35-42; apps/backend/CargoPilot.Infrastructure/DependencyInjection.cs:150-153; apps/backend/CargoPilot.Infrastructure/Jobs/NoOpErpExportJobScheduler.cs:5

**Önerilen iş:** Export implementasyonu sirasinda plan-entegrasyon iliskisini acik hale getir (plana entegrasyon ID bagla veya tek-entegrasyon varsayimini domain kuralina cevir) ve entegrasyon-yok durumunda aciklayici sync log yaz.

</details>

<details>
<summary>🟢 Düşük — warehouseFilter bellekte uygulaniyor, fallback'te sabit 'sa'/'DIVIZYON'</summary>

Depo filtresi SQL'e degil, tum tablo cekildikten sonra satir satir C# tarafinda uygulaniyor (buyuk stok tablolarinda gereksiz tam tarama). BuildConnectionString'de kimlik bilgisi cozulemezse Database='DIVIZYON', UserID='sa' sabitleri devreye giriyor ve authCredentialsJson null/deserializasyon hatasinda apiEndpoint dogrudan connection string sayiliyor. Ayrica SyncErpItemsResult.skipped hicbir yerde artirilmadigi icin her zaman 0 donuyor; SyncErpItemsCommandHandler constructor'ina inject edilen IValidator parametresi hic kullanilmiyor.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:55-56,90-113 (ozellikle 103-104: 'DIVIZYON'/'sa'); apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:38,91,150

**Önerilen iş:** DEPO_KODU filtresini SQL parametresine tasi, sabit 'sa'/'DIVIZYON' fallback'lerini hata donusune cevir, skipped sayacini gercek atlama mantigina bagla veya kaldir.

</details>

<details>
<summary>🟢 Düşük — Hangfire kurulumu saglam; ikili scheduler kaydi dogru calisiyor</summary>

SQL Server storage ile AddHangfire (Infrastructure DI:138-148), AddHangfireServer ve /hangfire dashboard (WebAPI DI:357,389) kurulu; ErpExportJob transient, HangfireErpExportJobScheduler yalnizca kalici DB modunda, in-memory modda NoOp kayitli. Kuyruklama mekanizmasi calisiyor — sorun yalnizca job'un icindeki NotImplemented servis. Rapordaki 'boru hatti kurulu' tespiti dogru.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/DependencyInjection.cs:138-153; apps/backend/CargoPilot.WebAPI/DependencyInjection.cs:357,389; apps/backend/CargoPilot.Infrastructure/Jobs/HangfireErpExportJobScheduler.cs:14

**Önerilen iş:** Degisiklik gerekmiyor; export implementasyonu geldiginde mevcut kuyruklama altyapisi aynen kullanilabilir.

</details>

**Açık sorular:** PR #463 hangi repoda acildi? Bu repoda ne branch ne baska iz var — GitHub'da kapali/silinmis bir PR mi, yoksa hic acilmamis bir plan referansi mi (gh ile dogrulanabilir)? · Coklu entegrasyon senaryosu gercek bir gereksinim mi? ErpExportJob integrations[0] secimi ve TriggerSync'in sirket-geneli kilidi tek-entegrasyon varsayimini ima ediyor ama veri modeli cogula izin veriyor. · SyncErpItemsCommandHandler'daki kullanilmayan IValidator parametresi: MediatR pipeline'inda ayri bir ValidationBehavior var mi, yoksa validasyon fiilen calismiyor mu? (Pipeline kaydi bu incelemede dogrulanmadi.) · ErpSettings.CompanyCode alani fetcher'da Database adi olarak kullaniliyor (SyncErpItemsCommandHandler.cs:74) — Logo/Netsis'te sirket kodu ile veritabani adi ayni sey mi? Yanlis eslesme baglanti hatasi uretir.

### 6.2 Frontend Yüzeyi

Frontend ERP yüzeyi iki API dosyasına (lib/api/useERPIntegration.ts: 23 hook, lib/api/useDraftItems.ts: 6 hook) ve iki rotaya yayılıyor: /erp (ERPItemsPage → ERPItemsTable, taslak ürün onayı + manuel item sync) ve /settings?tab=erp-* (UnifiedSettingsPage, admin-only 4 ERP sekmesi: Bağlantı, Sevkiyat Emirleri, Senkronizasyon, Geçmiş). Rapordaki ana iddialar koddan teyit edildi: ERPPage.tsx orphan (router.tsx ve lazyPages.ts'te yok), backend'de karşılığı olmayan 7 endpoint'i çağıran hook'lar safeParse/try-catch fallback'leriyle 404'leri boş listeye çevirip UI'ı "boş ama hatasız" gösteriyor (IntegrationsController'da yalnızca 9 rota var, sync-options/shipment-orders/erp-users/user-mappings/role-conflict-log/unassigned-data yok). Raporun eksik bıraktığı nüans: ERP bileşenlerinin 4'ü UnifiedSettingsPage üzerinden gerçekten erişilebilir; ölü olanlar ERPPendingMatches (+ERPItemMatchDialog), ERPUserMapping ve ERPDraftItems. Yeni bulgular: ERPSyncPanel'deki kategori/depo filtreleri run-now isteğine hiç gönderilmiyor (dekoratif UI) ve "Plan onayında otomatik aktar" switch'i yalnızca yerel Zustand tercihi olup backend davranışını etkilemiyor. Mutation'larda hata geribildirimi tutarlı (toast + detail); sorgu (GET) tarafında ise error state neredeyse hiçbir hook'ta yüzeye çıkmıyor — tek görünür hata yüzeyi ERPConnectionForm'un test-connection sonucu ve mutation toast'ları.

<details>
<summary>🔴 Kritik — Hook envanteri: 23 hook, 7'sinin endpoint'i backend'de yok</summary>

useERPIntegration.ts hook'ları ve endpoint'leri: [1] useERPSettings GET /api/v1/erp-settings (var, ErpSettingsController:29). [2] useSaveERPSettings PUT /erp-settings (var:46). [3] useTestERPSettings POST /erp-settings/test-connection (var:65). [4] useERPConnection GET /api/v1/integrations (var, IntegrationsController:33). [5] useERPPendingMatches GET /{id}/pending-item-mappings?status=0 (var:170). [6] useERPSavedMatches aynı uç status=1 (var). [7] useSaveERPMatch PUT /{id}/pending-item-mappings/{mid} (var:198). [8] useDeleteERPMatch DELETE aynı uç (var:223). [9] useERPSyncOptions GET /integrations/sync-options — BACKEND'DE YOK. [10] useTriggerERPSync POST /{id}/items/sync (var:143). [11] useERPSyncSettings GET /{id}/sync-settings (var:74). [12] useSaveERPSyncSettings PUT /{id}/sync-settings (var:96). [13] useRunERPSyncNow POST /{id}/sync/run-now (var:120, handler NotImplemented). [14] useERPSyncLogs GET /{id}/sync-logs (var:52). [15] useERPShipmentOrders GET /{id}/shipment-orders — YOK. [16] useERPRemoteUsers GET /erp-users — YOK. [17] useERPUserMappings GET /user-mappings — YOK. [18] useCreateERPUserMapping POST /user-mappings — YOK. [19] useERPRoleConflictLog GET /role-conflict-log — YOK. [20] useUpdateERPUserMapping PATCH /user-mappings/{id} — YOK. [21] useDeleteERPUserMapping DELETE /user-mappings/{id} — YOK. [22] useERPUnassignedData GET /unassigned-data — YOK. [23] useAssignUnassignedData POST /unassigned-data/{id}/assign — YOK. Mutation'ların tümü onError'da toast gösterir (görünür hata); GET hook'larının çoğu hatayı yutar.

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:105-606; apps/backend/CargoPilot.WebAPI/Controllers/IntegrationsController.cs:33-223; apps/backend/CargoPilot.WebAPI/Controllers/ErpSettingsController.cs:29-65

**Önerilen iş:** Kontrat boşluğu listesini backend backlog'una birebir taşı; her eksik uç için ya backend implementasyonu ya da frontend'den hook+UI kaldırma kararı ver.

</details>

<details>
<summary>🔴 Kritik — Silent-failure kalıpları satır satır: 9 GET hook'u hatayı boş veriye çeviriyor</summary>

(a) useERPSettings:109-115 try/catch→null: her hata (401/500/network dahil) 'ayar yok' gibi görünür, ERPConnectionForm boş formla açılır. (b) useERPConnection:191-192 safeParse fail→null: kontrat kayarsa 'bağlantı yok' sanılır ve TÜM ERP sekmeleri integrationId'siz kalır (kaskad: sync paneli 'önce bağlantıyı kaydedin' der, sevkiyat/geçmiş sorguları enabled=false olur). (c) useERPSyncOptions:294-295 safeParse→{categories:[],warehouses:[]}: eksik GET /sync-options endpoint'inin 404'ünü gizler; ERPSyncPanel'de select'ler yalnızca 'Tüm' seçeneğiyle dolu görünür. (d) useERPSyncLogs:422-423 safeParse→boş sayfa: ERPSyncHistory 'Henüz senkronizasyon geçmişi yok' (ERPSyncHistory.tsx:58-61) gösterir. (e) useERPShipmentOrders:438-449 try/catch→[] VE safeParse→[]: eksik shipment-orders endpoint'inin 404'ünü gizler; ERPShipmentOrders.tsx:164-171 'Henüz aktarılmış sevkiyat emri yok' gösterir — rapordaki 'sekme hep boş-hatasız' iddiası birebir doğru. (f) useERPRemoteUsers:483-484, (g) useERPUserMappings:496-497, (h) useERPRoleConflictLog:532-533, (i) useERPUnassignedData:582-583 safeParse→[]: eksik user-mapping backend'inin tamamını gizler. Ek: useDraftItems.ts:74-75 de safeParse→boş sayfa (canlı /erp sayfasını besler). Bu hook'ların hiçbiri isError/error döndürmediği için bileşenlerde error state render etmek mümkün değil.

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:109-115, 191-192, 294-295, 422-423, 438-449, 483-484, 496-497, 532-533, 582-583; apps/frontend/src/lib/api/useDraftItems.ts:74-75; apps/frontend/src/features/platform/erp/components/ERPShipmentOrders.tsx:164-171; apps/frontend/src/features/platform/erp/components/ERPSyncHistory.tsx:58-61

**Önerilen iş:** Fallback'leri kaldırıp parse/HTTP hatasını fırlat, bileşenlerde isError durumuna hata kutusu ekle; '404 = özellik yok' ile 'boş liste' ayrımını UI'da görünür kıl (raporun Adım 1'i).

</details>

<details>
<summary>🟠 Yüksek — ERPPage orphan; ama 4 ERP bileşeni /settings üzerinden canlı</summary>

ERPPage router.tsx'te ve lazyPages.ts'te tanımlı değil, hiçbir dosya import etmiyor — orphan teyit. Router'da /erp → ERPItemsPage (taslak ürün tablosu), /integrations → /settings?tab=erp-baglanti redirect. Rapordaki eksik nüans: UnifiedSettingsPage (rota /settings, ADMIN_ONLY_TABS ile CompanyAdmin'e kısıtlı) 4 ERP sekmesi render ediyor: ERPConnectionForm, ERPShipmentOrders, ERPSyncPanel, ERPSyncHistory — bu bileşenler ölü değil, erişilebilir. ERPPage'in 7 sekmeli tasarımı UnifiedSettingsPage'in 4 sekmeli halinin süperseti; ikisi arasında kopyalanmış tab/badge kodu var (drift riski).

**Kanıt:** apps/frontend/src/pages/erp/ERPPage.tsx:92 (tanım, import eden yok); apps/frontend/src/router.tsx:270-277; apps/frontend/src/pages/lazyPages.ts:99-100 (yalnızca ERPItemsPage); apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:111-117, 259-262

**Önerilen iş:** ERPPage'i ya router'a bağla (ve UnifiedSettingsPage'deki ERP sekmelerini oraya taşı) ya da sil; iki paralel sekme implementasyonundan birini tek kaynak yap.

</details>

<details>
<summary>🟠 Yüksek — Ölü bileşenler: ERPPendingMatches, ERPItemMatchDialog, ERPUserMapping, ERPDraftItems</summary>

features/platform/erp/components altındaki 10 dosyadan erişilebilir olanlar: ERPConnectionForm, ERPShipmentOrders (+CreatePlanFromOrdersDialog), ERPSyncPanel, ERPSyncHistory (hepsi /settings), erpConnectionSchema. Ölü olanlar (yalnızca orphan ERPPage'den import ediliyor): ERPPendingMatches ve onun açtığı ERPItemMatchDialog, ERPUserMapping, ERPDraftItems. ERPDraftItems ayrıca canlı /erp'deki ERPItemsTable (features/data-management/imports) ile aynı işi yapan MÜKERRER implementasyon — taslak ürün onayı iki farklı bileşende yazılmış, biri ölü. Bu yüzden fiilen erişilemeyen hook'lar: useERPPendingMatches, useSaveERPMatch, useDeleteERPMatch ve 8 user-mapping hook'u (raporun '23 hook tümü kullanımda' cümlesi teknik olarak doğru ama yanıltıcı: kullanan bileşenlerin bir kısmı hiçbir rotadan render edilmiyor).

**Kanıt:** apps/frontend/src/pages/erp/ERPPage.tsx:5-11 (tek import noktası); apps/frontend/src/features/platform/erp/components/ERPPendingMatches.tsx:28, ERPUserMapping.tsx:153, ERPDraftItems.tsx:87; apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:27,220 (canlı muadil)

**Önerilen iş:** ERPDraftItems/ERPItemsTable mükerrerliğinde birini seç; ölü bileşen + ölü hook zincirini ya rotaya bağla ya kaldır (raporun Adım 2 kararına girdi).

</details>

<details>
<summary>🟡 Orta — ERPSyncPanel'deki kategori/depo filtreleri run-now isteğine gönderilmiyor</summary>

Panel filters state'i (categoryId/warehouseId) iki Select ile dolduruluyor ama handleRunNow yalnızca runNow(integrationId) çağırıyor; useRunERPSyncNow POST /sync/run-now'a hiçbir filtre parametresi eklemiyor. Filtre destekleyen hook useTriggerERPSync ise bu panelde değil ERPItemsTable'da ve filtresiz kullanılıyor. Sonuç: kullanıcının seçtiği filtreler hiçbir isteğe yansımıyor — dekoratif UI. (sync-options endpoint'i de olmadığından listeler zaten hep boş; iki katmanlı ölü özellik.)

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:46-49, 67-70, 167-213; apps/frontend/src/lib/api/useERPIntegration.ts:384-405 (useRunERPSyncNow, filtre yok), 301-334 (useTriggerERPSync filtre destekli)

**Önerilen iş:** Ya run-now kontratına filtre parametrelerini ekleyip state'i isteğe bağla, ya da sync-options implementasyonu gelene kadar filtre Select'lerini panelden kaldır.

</details>

<details>
<summary>🟡 Orta — 'Plan onayında otomatik aktar' switch'i yalnızca yerel UI tercihi</summary>

ERPSyncPanel'deki switch useErpSettingsStore (Zustand) içindeki autoTriggerOnApproval'ı yazıyor; hiçbir API çağrısına veya backend ayarına bağlanmıyor. Backend ise (rapora göre) ApprovePlan'da export job'ını koşulsuz kuyrukluyor. Kullanıcı switch'i kapatsa da davranış değişmez — UI, sahip olmadığı bir kontrolü vaat ediyor.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:43-44, 140-154; apps/frontend/src/lib/store/useErpSettingsStore (yalnızca client state)

**Önerilen iş:** Switch'i backend'de gerçek bir ayara bağla (ErpExportService/feature-flag işiyle birlikte) veya kaldır; mevcut haliyle yanıltıcı.

</details>

<details>
<summary>🟡 Orta — Kullanıcı geribildirimi haritası: mutation'lar konuşuyor, sorgular susuyor</summary>

Görünür hata yüzeyleri: (1) tüm mutation'larda onError toast + backend detail (useERPIntegration.ts:142-145, 263-266, 282-285, 329-332, 377-380, 395-403 [409 özel mesajı], 520-523, 551-554, 570-573, 601-604) ve useDraftItems mutation toast'ları; (2) ERPConnectionForm test-connection sonucu inline success/error kutusu (222-243) ve 'kayıtlı şifre korunuyor' bilgisi (197-202); (3) sync başarı özeti toast (324-327, 'atlanan' bilinçli gösterilmiyor — yorum 323). Yutulan yerler: tüm GET hook'ları (bkz. silent-failure bulgusu) — hiçbir liste bileşeni isError render etmiyor, hepsi skeleton→boş-durum ikilisiyle yetiniyor. useDeleteERPUserMapping başarı toast'ı 'Veriler atanmamış kayıtlara taşındı' diyor ama bu davranışın backend'i yok (endpoint dahi yok) — ölü kod olsa da yanlış vaat.

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:142-145, 323-327, 395-403, 566-568; apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:75-96, 222-243

**Önerilen iş:** Liste bileşenlerine (sevkiyat, geçmiş, taslak, eşleştirme) isError dalı ekle; hook'lar hata fırlatır hale gelince UI otomatik doğru davranır.

</details>

<details>
<summary>🟢 Düşük — Küçük teyitler: ölü yorum ve kullanılmayan şema</summary>

useERPIntegration.ts dosyası 608. satırdaki '── ERP Items Page hooks ──' başlık yorumuyla bitiyor; altında hiç kod yok (ölü yorum, rapor teyit). useERPSavedMatches (223-231) yanıtı elle map'liyor; erpSavedMatchSchema boundary parse'ta kullanılmıyor (rapor teyit). PROVIDER_TYPE_TO_INT (Logo:0, Netsis:1) ve SYNC_FREQUENCY_TO_INT (FourHours:0, Daily:1) eşlemeleri dosyada sabit; backend enum sırasıyla karşılaştırma bu incelemenin kapsamı dışında kaldı (raporun 6. doğrulama maddesi açık).

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:25, 32-40, 214-235, 608

**Önerilen iş:** Ölü yorumu sil; useERPSavedMatches'i erpSavedMatchSchema ile parse edecek şekilde düzenle.

</details>

**Açık sorular:** PROVIDER_TYPE_TO_INT ve SYNC_FREQUENCY_TO_INT frontend sabitleri backend enum tanımlarıyla (ProviderType, SyncFrequency) birebir aynı sırada mı? (Backend enum dosyaları bu turda doğrulanmadı.) · ERPPage'in 7 sekmeli tasarımı mı yoksa UnifiedSettingsPage'in 4 sekmeli hali mi hedef UX? İkisi paralel yaşıyor; ürün kararı gerekiyor. · ERPDraftItems (ölü) ile ERPItemsTable (canlı) mükerrerliğinde hangisi korunacak? · useERPConnection'ın GET /integrations yanıtında ilk kaydı alması (data[0]) çoklu entegrasyon senaryosunda doğru mu, yoksa tek-entegrasyon varsayımı backend'ce garanti mi?

### 6.3 API Kontrat Matrisi

Frontend'in ERP çağrıları tek dosyada toplanmış (useERPIntegration.ts, 608 satır, başka ERP fetcher yok); backend tarafında yalnızca ErpSettingsController (3 route) ve IntegrationsController (9 route) mevcut. Raporun kontrat-boşluğu iddiası birebir doğrulandı: sync-options, shipment-orders, erp-users, user-mappings, role-conflict-log ve unassigned-data rotalarının hiçbiri backend'de yok (grep 0 sonuç). Bunun ötesinde rapordan daha ağır iki yeni bulgu çıktı: (1) PROVIDER_TYPE enum eşlemesi frontend'de Logo=0/Netsis=1 iken backend'de Logo=1/Netsis=2 — Logo ayarı hiç kaydedilemez (400), Netsis ayarı Logo olarak kaydedilir ve GET dönüşünde form yanlış sağlayıcı gösterir; (2) pending-item-mappings endpoint'i var ama response'u PagedResult ({items,...}) dönerken frontend düz dizi bekliyor ve zorunlu alanlar (erpProductId, erpWeight/Width/Height/Length) backend DTO'sunda hiç yok — tablo dolsa bile parse patlar. SYNC_FREQUENCY_TO_INT ise backend ile birebir uyumlu (0/1). Ayrıca frontend tüm hata toast'larında RFC7807 'detail' alanını okuyor ama backend Result<T> zarfı (message/error) döndürüyor; backend hata mesajları kullanıcıya hiç ulaşmıyor. Sync-settings'te backend'in Failed(2) durumu frontend'de Idle olarak görünüyor. Uyumlu olan kontratlar: erp-settings alan adları, integrations listesi, sync-logs sayfalı yapısı, items/sync özeti (SyncErpItemsResult).

<details>
<summary>🔴 Kritik — PROVIDER_TYPE enum kayması: frontend Logo=0/Netsis=1, backend Logo=1/Netsis=2</summary>

Frontend PUT /erp-settings ve POST /test-connection isteklerinde providerType olarak 0 (Logo) veya 1 (Netsis) gönderiyor. Backend enum'unda Logo=1, Netsis=2 olduğu ve UpsertErpSettingsCommandValidator + TestErpConnectionCommandValidator IsInEnum kontrolü yaptığı için: Logo seçen kullanıcı her zaman 400 'Geçersiz ERP sağlayıcısı' alır (Logo hiç kaydedilemez/test edilemez); Netsis seçen kullanıcının 1 değeri backend'de Logo olarak yorumlanıp yanlış sağlayıcıyla kaydedilir ve test-connection Logo connector'ı ile çalışır. GET dönüşünde de backend 1(Logo)/2(Netsis) döndürür; ERPConnectionForm PROVIDER_TYPE_FROM_INT {0:Logo,1:Netsis} ile 1'i Netsis gösterir, 2'yi tanımayıp Logo'ya düşer — round-trip tamamen çapraz bozuk. Handler'da hiçbir dönüşüm/shim yok (UpsertErpSettingsCommandHandler ProviderType'ı ham geçirir).

**Kanıt:** FE: useERPIntegration.ts:25, :126, :157; ERPConnectionForm.tsx:35, :62; erp.ts:198 (yanlış '0=Logo, 1=Netsis' yorumu). BE: CargoPilot.Domain/Enums/ErpProviderType.cs:5-6 (Logo=1, Netsis=2); UpsertErpSettingsCommandValidator.cs:9-10; TestErpConnectionCommandValidator.cs:9-10; UpsertErpSettingsCommandHandler.cs:48,85; TestErpConnectionCommandHandler.cs:18. Enum'lar sayı olarak serileşiyor: DependencyInjection.cs:258-261'de JsonStringEnumConverter yok.

**Önerilen iş:** Tek taraflı düzeltme: frontend'de PROVIDER_TYPE_TO_INT/FROM_INT değerlerini {Logo:1, Netsis:2} yap (erp.ts:198 yorumu dahil) veya backend enum'unu 0/1'e çek; hangi taraf seçilirse mevcut DB kayıtlarındaki provider_type değerleri için migration/kontrol gerekir.

</details>

<details>
<summary>🔴 Kritik — pending-item-mappings kontratı alan ve şekil düzeyinde kırık (endpoint var ama tüketilemez)</summary>

Backend GET /{id}/pending-item-mappings PagedResult döner: data = {items:[...], totalCount, page, pageSize}. Frontend pendingItemMappingListResponseSchema ise data'yı düz dizi bekliyor ve .parse (safeParse değil) kullanıyor — yanıt gelse bile ZodError fırlar, useERPPendingMatches/useERPSavedMatches her zaman error state'e düşer. Ayrıca alan adları uyuşmuyor: backend DTO'da erpId var, frontend erpProductId bekliyor; frontend'in zorunlu (nullable ama required) erpWeight/erpWidth/erpHeight/erpLength alanları backend DTO'sunda hiç yok; useERPSavedMatches'ın okuduğu cargoPilotItemName/cargoPilotItemSku de yok. Yani rapordaki 'endpoint + frontend bileşenler hazır, sadece tabloyu dolduran kod eksik' tespiti eksik: tablo dolsa bile UI bu veriyi parse edemez.

**Kanıt:** BE: PendingItemMappingDto.cs:5-15 (ErpId, ErpSku, ErpProductName, ErpRawDataJson, CargoPilotItemId, Status, CreatedAtUtc, UpdatedAtUtc — boyut/ağırlık alanı yok); GetPendingItemMappingsQueryHandler.cs:48-49 + PagedResult.cs:3-7. FE: useERPIntegration.ts:43-53 (data: z.array), :207, :222 (.parse), :228-230 (cargoPilotItemName/Sku); erp.ts:34-46 (erpProductId, erpWeight/Width/Height/Length zorunlu).

**Önerilen iş:** Kontratı tek kaynağa bağla: backend DTO'ya erpProductId (veya FE'yi erpId'ye çevir), boyut/ağırlık alanları ve approved eşleşmeler için cargoPilotItemName/Sku ekle; FE şemasını PagedResult zarfına ({items:[...]}) uyarla. Bu iş PendingItemMapping'in yaşayıp yaşamayacağı ürün kararına (rapor Adım 2) bağlanmalı.

</details>

<details>
<summary>🟠 Yüksek — 6 endpoint grubunun backend'de hiç olmadığı teyit edildi</summary>

Frontend'in çağırdığı GET /integrations/sync-options, GET /{id}/shipment-orders, GET /erp-users, GET+POST /user-mappings, PATCH+DELETE /user-mappings/{id}, GET /role-conflict-log, GET /unassigned-data ve POST /unassigned-data/{dataId}/assign rotalarının hiçbiri backend'de tanımlı değil (tüm backend'de bu string'ler için grep 0 sonuç). IntegrationsController'ın tam route listesi: GET /, GET sync-logs, GET/PUT sync-settings, POST sync/run-now, POST items/sync, GET/PUT/DELETE pending-item-mappings. Bu 9 hook'un tümü safeParse-fallback veya try/catch ile 404'ü boş dizi/varsayılana çevirdiği için UI hatasız-boş görünüyor.

**Kanıt:** FE çağrılar: useERPIntegration.ts:293 (sync-options), :443 (shipment-orders), :482 (erp-users), :495/:512/:545/:562 (user-mappings), :531 (role-conflict-log), :581/:595 (unassigned-data). BE: IntegrationsController.cs:33-223 (mevcut rotaların tamamı); backend genelinde 'sync-options|shipment-orders|erp-users|user-mappings|role-conflict|unassigned-data' grep: 0 eşleşme.

**Önerilen iş:** Her grup için implement-veya-kaldır kararı ver; kalacaklar için frontend Zod şemalarını (erp.ts:151-192, 82-120) backend DTO tasarımının kaynağı olarak kullan, kaldırılacak hook'ları ve bileşenlerini sil.

</details>

<details>
<summary>🟠 Yüksek — run-now NotImplemented 500 dönüyor; frontend'in 409 özel akışı dışında kalıyor</summary>

TriggerSyncCommandHandler her çağrıda ErrorType.Unexpected ile 'Sync.NotImplemented' failure döndürüyor; BaseController bunu 500'e çevirir. Frontend yalnızca 409'u özel mesajla ele alıyor; 500'de detail de gelmediği için (bkz. önceki bulgu) kullanıcı sadece 'Senkronizasyon başlatılamadı' görür. Rapordaki NotImplemented tespiti doğru; satır numarası 41-47 olarak teyit edildi ve 'PR #463 bekleniyor' yorumu yerinde.

**Kanıt:** BE: TriggerSyncCommandHandler.cs:41-47; BaseController.cs:25 (Unexpected→500). FE: useERPIntegration.ts:395-403.

**Önerilen iş:** Handler'ı SyncErpItemsCommand mantığına delege et (rapor Adım 3); geçici olarak Unexpected yerine BusinessRule (422) dönmek bile UI mesajını iyileştirir.

</details>

<details>
<summary>🟡 Orta — Frontend hata gösterimi backend hata zarfıyla uyumsuz: 'detail' alanı hiç gelmiyor</summary>

useERPIntegration.ts'deki tüm mutation onError'ları error.response?.data?.detail okuyor (ApiError {detail, title} — RFC7807 varsayımı). Backend ise hatalarda Result<T> zarfı döndürüyor: {isSuccess, message, data, error:{type, code, description}} (model-binding hataları da aynı kontrata çevriliyor). data.detail her zaman undefined kalır; kullanıcı backend'in ürettiği Türkçe hata mesajlarını (ör. 'İlk kayıtta şifre zorunludur', 'Şirket için senkronizasyon zaten çalışıyor') hiç görmez, hep jenerik fallback toast görür. 409 özel durumu status koduna baktığı için çalışır.

**Kanıt:** FE: useERPIntegration.ts:27-30 (ApiError), :143, :264, :284, :330, :378, :397, :521 vb. (data.detail). BE: Result.cs:3-21 (message/error alanları, detail yok); BaseController.cs:9-30 (Result'ı olduğu gibi döndürür); DependencyInjection.cs:263-269 (model-binding hataları da Result kontratı).

**Önerilen iş:** Tek satırlık ortak yardımcıyla hata mesajı çıkarımını backend zarfına uyarla (error.response?.data?.error?.description ?? message) ve tüm ERP mutation'larında kullan.

</details>

<details>
<summary>🟡 Orta — Sync-settings durum eşlemesi eksik: backend Failed(2) frontend'de 'Idle' görünür</summary>

Backend ErpSyncStatus üç değerli: Idle=0, Running=1, Failed=2. Frontend syncStatus'ü yalnızca ===1 kontrolüyle Running/Idle ikilisine indirgeniyor (erp.ts'deki ErpSyncStatus tipinde de Failed yok). Senkronizasyon başarısız olduğunda kullanıcı 'Idle' (sorun yok) görür; ayrıca Running-polling durana kadar Failed'e geçişte 5sn'lik refetch de durur (===1 olmadığı için polling kapanır, bu doğru ama durum yanlış etiketlenir).

**Kanıt:** BE: CargoPilot.Domain/Enums/ErpSyncStatus.cs:4-11 (Idle, Running, Failed). FE: useERPIntegration.ts:349; erp.ts:15-20 (Failed tanımsız).

**Önerilen iş:** FE ErpSyncStatus'e Failed ekle, 0/1/2 eşlemesini tam yap ve Failed için kullanıcıya görünür bir uyarı durumu render et.

</details>

<details>
<summary>🟢 Düşük — SYNC_FREQUENCY_TO_INT backend ile birebir uyumlu (teyit)</summary>

Frontend {FourHours:0, Daily:1} gönderiyor/okuyor; backend SyncFrequency enum'u Every4Hours=0, Daily=1 (açık değer atanmamış, sıra 0'dan başlıyor). PUT sync-settings body'si {syncFrequency:int|null} UpdateSyncSettingsCommand(SyncFrequency? SyncFrequency) ile eşleşiyor. Bu enum çifti sorunsuz; providerType'taki kaymanın aksine burada risk yok.

**Kanıt:** FE: useERPIntegration.ts:32-40, :370. BE: CargoPilot.Domain/Enums/SyncFrequency.cs:4-9; UpdateSyncSettingsCommand.cs:9-12.

**Önerilen iş:** —

</details>

<details>
<summary>🟢 Düşük — Uyumlu kontratlar: erp-settings, integrations listesi, sync-logs, items/sync özeti (teyit)</summary>

Alan-alan karşılaştırmada şu çiftler uyumlu: (1) GET/PUT /erp-settings ↔ ErpSettingsResponse(id, providerType, companyCode, username, serverAddress, hasPassword) — FE erpSettingsApiSchema ile aynı camelCase alanlar (yalnızca providerType değeri kayık, ayrı bulgu); (2) GET /integrations ↔ IntegrationSummary(id, systemName, apiEndpoint) = FE integrationItemSchema; (3) GET sync-logs ↔ SyncLogDto(id, startedAt, completedAt, status:int, syncedRecordCount, errorMessage) + PagedResult — FE syncLogsPageResponseSchema paged zarfı doğru bekliyor ve SyncLogStatus int değerleri (Running=0, Success=1, PartialFailure=2, Failed=3) birebir aynı; (4) POST items/sync ↔ SyncErpItemsResult(syncLogId, added, updated, skipped) = FE erpSyncSummarySchema; (5) test-connection yanıtı ErpConnectionTestResponse(isSuccess, message) = FE testConnectionResponseSchema.

**Kanıt:** BE: ErpSettingsResponse.cs:5-11; ListIntegrationsQueryHandler.cs:33; SyncLogDto.cs:5-11; SyncLogStatus.cs:3-8; SyncErpItemsResult.cs:3-7; ErpConnectionTestResponse.cs:3. FE: erp.ts:137-147, :196-203; useERPIntegration.ts:80-98, :175-184.

**Önerilen iş:** —

</details>

**Açık sorular:** Backend DateTime serileştirmesi offset içeriyor mu? FE sync-settings şeması nextScheduledSyncAt/lastSyncAt için z.string().datetime({offset:true}) kullanıyor (useERPIntegration.ts:61-62); backend DateTime? alanları Kind=Utc değilse 'Z'siz string üretir ve parse tüm sync-settings sorgusunu düşürür — LastSyncAt'in nasıl damgalandığı (entity tarafı) runtime'da doğrulanmalı. · providerType düzeltmesi hangi tarafta yapılacak? Frontend 1/2'ye çekilirse mevcut DB'de yanlış kaydedilmiş (Netsis niyetiyle Logo=1 yazılmış) erp_settings kayıtları var mı, veri düzeltmesi gerekir mi? · PendingItemMapping akışı ürün kararıyla kaldırılacaksa (rapor Adım 2), kontrat-kırığı bulgusu üzerinde iş yapmaya değer mi, yoksa hook+endpoint birlikte mi silinmeli? · Integration.ApiEndpoint null olabilen eski kayıtlar var mı? FE integrationItemSchema apiEndpoint: z.string() zorunlu; null gelirse safeParse düşer ve useERPConnection null döner (tüm ERP sekmeleri kapalı görünür).

### 6.4 Ara Tablo (Staging) ve Kısmi Başarı

Kullanıcının ana endişesinin çekirdeği karşılanıyor: ERP verisi DB'deki ana Items tablosuna DOĞRUDAN yazılmıyor; SyncErpItemsCommandHandler ürünleri DraftItem ara (staging) tablosuna upsert ediyor ve ancak kullanıcı onayıyla (DraftItemsController approve/approve-bulk → ApproveDraftItem(s)CommandHandler) Item'a dönüşüyor — raporun 'doğrulanacak' bıraktığı DraftItem→Item akışı uçtan uca gerçek ve çalışır durumda (yeni Item oluşturma, UpdatePending'de mevcut Item.Update, SKU çakışmasında skip/409). Ancak gereksinimin geri kalanı büyük ölçüde karşılanmıyor: sync akışı all-or-nothing — tek try/catch tüm döngüyü sarıyor, tek SaveChangesAsync sonda; herhangi bir satırdaki hata tüm batch'i düşürüyor, SyncLog.PartialFail hiç çağrılmıyor ve 'skipped' sayacı hep 0. Eksik ölçülü ERP satırları SQL WHERE ile sessizce eleniyor; kullanıcıya 'kaç satır neden atlandı' bilgisi hiçbir katmanda verilmiyor ve SyncLog'da satır bazlı hata alanı yok. Onay tarafında ise ters yönde bir sorun var: BulkImportDialog'da tek hatalı satır tüm seçimin aktarılmasını engelliyor. Reddedilen kayıtlar DB'de saklanıyor ama routed UI'da görüntülenemiyor (Rejected sekmesi yok, ölü render dalı var) ve bir sonraki sync'te otomatik Pending'e dönüyor. Kısmi başarı semantiği yalnızca onay (approve-bulk) tarafında backend'de var; sync tarafında yok.

<details>
<summary>🟠 Yüksek — Staging (ara tablo) mimarisi mevcut: ERP verisi önce DraftItem'a yazılıyor, Item'a ancak onayla geçiyor</summary>

Kullanıcının ana endişesinin çekirdeği karşılanıyor. Sync akışı ERP ürünlerini DraftItem tablosuna Pending statüsüyle upsert ediyor; ana Items tablosuna yazım yalnızca kullanıcı onayı (approve / approve-bulk) ile ApproveDraftItem(s)CommandHandler üzerinden oluyor. Onay handler'ları gerçek ve eksiksiz: yeni Item oluşturma + SetErpSource, UpdatePending statüsünde mevcut Item.Update, SKU çakışmasında tekil akışta 409, toplu akışta skip. Frontend ERPItemsPage → ERPItemsTable → BulkImportDialog zinciri bu endpointleri gerçekten çağırıyor (PUT draft + approve-bulk / tekil approve).

**Kanıt:** SyncErpItemsCommandHandler.cs:93-141 (DraftItem upsert), ApproveDraftItemCommandHandler.cs:36-96, ApproveDraftItemsCommandHandler.cs:36-109, DraftItemsController.cs:81-115, BulkImportDialog.tsx:450-464, useDraftItems.ts:120-135,152-169, router.tsx:273

**Önerilen iş:** İş gerekmez; bu akış korunmalı. Raporun 5 no'lu 'doğrulanacak' maddesi kapatılabilir: DraftItem→Item onay/dönüşüm akışı uçtan uca çalışıyor.

</details>

<details>
<summary>🟠 Yüksek — Sync'te satır bazlı hata izolasyonu ve kısmi başarı (partial success) YOK — all-or-nothing</summary>

SyncErpItemsCommandHandler'da tüm ürün döngüsü tek try/catch içinde ve tek SaveChangesAsync en sonda. Herhangi bir satırda exception oluşursa (veya kaydetme sırasında tek bir satır DB kısıtına takılırsa) hiçbir satır kaydedilmez, syncLog.Fail çağrılır ve kullanıcı yalnızca genel 'Senkronizasyon başarısız' mesajı görür. SyncLog.PartialFail metodu ve SyncLogStatus.PartialFailure enum'u tanımlı ama hiçbir yerden çağrılmıyor (grep: yalnız tanım + doküman). SyncErpItemsResult'taki 'skipped' sayacı hiç artırılmıyor, hep 0 dönüyor — frontend bunu bildiği için toast'ta göstermiyor bile (useERPIntegration.ts:323 yorumu). Kullanıcının 'hatalı satır doğru satırların kaydını engellememeli' gereksinimi sync katmanında karşılanmıyor.

**Kanıt:** SyncErpItemsCommandHandler.cs:82-173 (tek try/catch), :91 (skipped hiç artmıyor), :147 (tek SaveChangesAsync), :152-172 (catch→Fail); SyncLog.cs:46-53 (PartialFail ölü); useERPIntegration.ts:323-327

**Önerilen iş:** Döngüde satır başına try/catch ile hatalı ürünü atlayıp skipped++ yapmak, sonunda hata varsa syncLog.PartialFail(added+updated, hataÖzeti) çağırmak; sonucun skipped/hata sayısını frontend toast'ında göstermek.

</details>

<details>
<summary>🟠 Yüksek — Eksik alanlı ERP satırları sessizce eleniyor; kullanıcıya hiçbir bildirim yok</summary>

SqlServerErpProductFetcher SQL sorgusunda EN/BOY/GENISLIK null veya <=0 olan satırları WHERE ile daha kaynaktan dışlıyor. Bu satırların sayısı bile bilinmiyor; 'X satır eksik ölçü nedeniyle atlandı' bilgisi ne SyncErpItemsResult'a ne SyncLog'a ne UI'a ulaşıyor. Ağırlık (BIRIM_AGIRLIK) null ise 0 varsayılanıyla DraftItem'a giriyor — kullanıcı tabloda '0 kg' görür ama bunun 'ERP'de eksik' anlamına geldiği söylenmez. Kullanıcının 'eksik alanlar kullanıcıya söylenmeli' gereksinimi karşılanmıyor.

**Kanıt:** SqlServerErpProductFetcher.cs:19-27 (WHERE ile sessiz eleme), :47 (weight null→0m), SyncErpItemsCommandHandler.cs:130-134 (sabit varsayılanlar: NonFragile, isStackable:true, maxStackCount:1)

**Önerilen iş:** WHERE filtresini kaldırıp eksik ölçülü satırları da çekmek, bunları DraftItem'a 'eksik alan' işaretiyle yazmak veya en azından elenen satır sayısını + nedenlerini sync sonucuna/SyncLog'a ekleyip UI'da göstermek.

</details>

<details>
<summary>🟡 Orta — SyncLog'da satır bazlı hata kaydı için hiçbir yapı yok</summary>

SyncLog tek bir string ErrorMessage alanı taşıyor; satır/ürün bazlı hata tablosu, JSON hata listesi veya benzeri bir yapı yok. Sync bir bütün olarak ya Success ya Failed. Hangi ERP ürününün neden işlenemediği hiçbir yerde saklanamıyor, dolayısıyla UI'da da gösterilemiyor. 'Hatalı satırlar gösterilmeli' gereksiniminin veri modeli karşılığı mevcut değil.

**Kanıt:** SyncLog.cs:5-54 (yalnız ErrorMessage, satır bazlı alan yok); data-model.md:25

**Önerilen iş:** SyncLog'a satır hataları için bir JSON alanı (veya SyncLogError alt tablosu) eklemek ve sync-log detay UI'ında satır bazlı hataları listelemek.

</details>

<details>
<summary>🟡 Orta — Onay diyaloğunda tek hatalı satır TÜM seçimin aktarılmasını engelliyor</summary>

BulkImportDialog.handleImport'ta hasClientErrors kontrolü herhangi bir satırda doğrulama hatası varsa tüm işlemi iptal ediyor; 'Aktar' butonu da errorRowCount===0 şartına bağlı. Yani ERP'den gelen 100 üründen 1'inin ağırlığı 0 ise (ERP'de eksik olduğu için bu olağan) kullanıcı o satırı düzeltmeden veya seçimden çıkarmadan geri kalan 99'u aktaramıyor. Hatalar satır bazında kırmızı gösteriliyor (iyi) ama 'hatalı satır doğruları engellemesin' gereksiniminin tam tersi davranış. Backend approve-bulk zaten satır atlamayı destekliyor; engel tamamen client tarafında.

**Kanıt:** BulkImportDialog.tsx:446-447 (hasClientErrors→return), :515-516 (canImport: errorRowCount===0), :96-107 (validateRow); karşılaştırma: ApproveDraftItemsCommandHandler.cs:34-105 (backend skip destekli)

**Önerilen iş:** Diyalogda 'geçerli satırları aktar' seçeneği: hatalı satırları dışarıda bırakıp kalanları approve etmek ve sonuçta 'N aktarıldı, M hata nedeniyle bekliyor' özeti göstermek.

</details>

<details>
<summary>🟡 Orta — Reddedilen (Rejected) taslaklar DB'de saklanıyor ama routed UI'da görüntülenemiyor</summary>

Rejected kayıtlar DraftItem tablosunda Status=2 ile duruyor ve GetDraftItems status filtresi bunu destekliyor; ancak ERPItemsTable'daki sekmeler yalnız Bekleyenler/Aktarılanlar/Güncellemeler (DRAFT_REJECTED sekmesi yok). Rejected satır render kodu (opacity-50, XCircle) var ama status filtreli sorgu nedeniyle asla veri gelmediği için ölü kod. Ayrıca Bekleyenler sekmesinin aksiyon çubuğunda Reddet butonu hiç yok (yalnız Güncellemeler sekmesinde var); Pending bir taslağı reddedebilen tek UI, router'a bağlı olmayan orphan ERPPage→ERPDraftItems. Sonuç: kullanıcı reddedilenleri göremez ve ana ekrandan reddedemez.

**Kanıt:** ERPItemsTable.tsx:323-336 (üç sekme, Rejected yok), :505,528-530 (ölü Rejected render), :640-670 (Reddet yalnız UPDATE_PENDING'de); ERPPage.tsx orphan (router.tsx'te yalnız ERPItemsPage: router.tsx:273); GetDraftItemsQueryHandler.cs:30-31 (status filtresi destekli)

**Önerilen iş:** ERPItemsTable'a 'Reddedilenler' sekmesi eklemek ve Bekleyenler sekmesine Reddet aksiyonu koymak; orphan ERPPage/ERPDraftItems için kaldır-veya-bağla kararı vermek (rapor Adım 2 ile birleşebilir).

</details>

<details>
<summary>🟡 Orta — Reject kalıcı değil: sonraki sync reddedilen taslağı otomatik Pending'e döndürüyor; update reddi ise draft'ı 'Approved' işaretliyor</summary>

İki semantik tutarsızlık: (1) SyncErpItemsCommandHandler mevcut Rejected taslağı ERP'den tekrar görünce ResetToPending çağırıyor — kullanıcının reddi bir sonraki senkronda sessizce geri alınıyor, ürün tekrar bekleyenlere düşüyor. (2) RejectDraftItemCommandHandler, UpdatePending statüsündeki taslağın reddinde draft.Approve() çağırıyor; ancak SetUpdatePending draft'ın SKU/Name/RawData'sını yeni ERP değerleriyle çoktan ezmiş durumda — Item'a uygulanmayan yeni değerler taşıyan draft 'Approved' görünüyor ve draft ile Item verisi kalıcı olarak ayrışıyor. Bir sonraki sync bu draft'ı Approved gördüğü için yeniden UpdatePending'e çeviriyor; reddedilen güncelleme de her sync'te geri geliyor.

**Kanıt:** SyncErpItemsCommandHandler.cs:108-110 (Rejected→ResetToPending), :100-106 (Approved→SetUpdatePending); RejectDraftItemCommandHandler.cs:33-39 (UpdatePending reddinde Approve); DraftItem.cs:136-142 (SetUpdatePending draft verisini eziyor)

**Önerilen iş:** Ürün kararı gerekiyor: reddin kalıcı olması isteniyorsa Rejected taslak sync'te atlanmalı (veya 'kalıcı ret' ayrı bir statü olmalı); update reddi için Approved yerine ayrı bir statü (örn. UpdateDismissed) kullanılmalı.

</details>

<details>
<summary>🟡 Orta — Approve yolunda backend doğrulaması yok: geçersiz draft (örn. weight=0) doğrudan Item'a kopyalanabilir</summary>

UpdateDraftItemCommandValidator (Width/Height/Length/Weight>0) yalnızca PUT /draft-items/{id} çağrısında devrede. Approve ve approve-bulk handler'ları draft değerlerini hiçbir doğrulama yapmadan Item constructor'ına geçiriyor; Item constructor'ında da guard/throw yok. Normal UI akışında BulkImportDialog client validasyonu bunu engelliyor, ama API'ye doğrudan approve çağrısıyla (veya UI'daki tekil onay yolu eklenirse) ERP'den 0 ağırlıkla gelen taslak, planlama hesaplarını bozacak şekilde Items'a geçebilir. Doğrulama savunması yalnızca client tarafında.

**Kanıt:** UpdateDraftItemCommandValidator.cs:9-32 (yalnız update komutunda), ApproveDraftItemCommandHandler.cs:63-94 (doğrulamasız Item oluşturma), ApproveDraftItemsCommandHandler.cs:73-104, Item.cs:38 (constructor'da guard yok, grep: throw yok), SqlServerErpProductFetcher.cs:47 (weight null→0)

**Önerilen iş:** Approve handler'larına (veya Item domain'ine) pozitif ölçü/ağırlık doğrulaması eklemek; toplu akışta geçersiz draft'ı skip sayacına yazıp nedenini sonuçta döndürmek.

</details>

<details>
<summary>🟢 Düşük — Toplu onayın kısmi başarı sonucu (approved/skipped) kullanıcıya gösterilmiyor</summary>

ApproveDraftItemsCommandHandler kısmi başarıyı doğru uyguluyor: SKU çakışan veya zaten onaylı draft'ları atlayıp kalanları onaylıyor ve ApproveDraftItemsResult(approved, skipped) döndürüyor. Ancak frontend useBulkApproveDraftItems başarı toast'ında sonucu okumadan 'ids.length ürün onaylandı' yazıyor — 10 seçimden 3'ü atlandıysa kullanıcı yine '10 ürün onaylandı' görüyor. Yanıltıcı bilgi; backend'in döndürdüğü sayaçlar boşa gidiyor.

**Kanıt:** ApproveDraftItemsCommandHandler.cs:34-109 (approved/skipped sayaçları), useDraftItems.ts:125-128 (toast ids.length kullanıyor, response'u okumuyor); aynı sorun useBulkApproveItemsIndividual (152-163) ve useBulkRejectDraftItems (171-180)

**Önerilen iş:** Mutation'ın dönen ApproveDraftItemsResult'ını parse edip toast'ta 'X onaylandı, Y atlandı (SKU çakışması)' göstermek.

</details>

<details>
<summary>🟢 Düşük — Çift sync giriş noktası teyit: UI'daki ana sync butonu çalışan items/sync'e bağlı, run-now hâlâ NotImplemented</summary>

Rapordaki iddia doğru: TriggerSyncCommandHandler 'PR #463 bekleniyor' yorumuyla Sync.NotImplemented hatası döndürüyor. Ancak kritik olan nokta: ERPItemsTable'daki 'ERP ile Sync' butonu useTriggerERPSync üzerinden ÇALIŞAN POST /{id}/items/sync endpoint'ini çağırıyor; NotImplemented olan run-now yalnızca useRunERPSyncNow hook'unu kullanan ayar ekranını etkiliyor. Yani ana ürün-alma akışı bu eksikten etkilenmiyor.

**Kanıt:** TriggerSyncCommandHandler.cs:41-47 (NotImplemented), IntegrationsController.cs:120-131 (run-now→TriggerSync) ve :143-157 (items/sync→SyncErpItems), ERPItemsTable.tsx:220,291-294 (useTriggerERPSync), useERPIntegration.ts:313-314 (items/sync), :388 (run-now)

**Önerilen iş:** Rapor Adım 3 aynen geçerli: TriggerSyncCommandHandler'ı SyncErpItemsCommand mantığına delege etmek; 409 (AlreadyRunning) kontrolü zaten orada, items/sync'te ise böyle bir eşzamanlılık kilidi YOK — delege ederken items/sync'e de eklenmeli.

</details>

**Açık sorular:** Reddedilen taslağın sonraki sync'te Pending'e dönmesi bilinçli bir ürün kararı mı (ERP'de hâlâ var olan ürün yeniden değerlendirilsin) yoksa kaçak mı? Kalıcı ret isteniyorsa ayrı statü gerekir. · Sync sırasında eksik ölçülü ERP satırları hiç mi çekilmemeli (bugünkü SQL filtresi) yoksa 'eksik alanlı taslak' olarak kullanıcıya mı gösterilmeli? Kullanıcının 'eksik alanlar söylenmeli' talebi ikincisini ima ediyor. · POST /{id}/items/sync endpoint'inde eşzamanlılık kilidi yok (HasAnyRunningSync kontrolü yalnız run-now'da); iki admin aynı anda sync başlatırsa duplicate upsert/yarış riski kabul ediliyor mu? · Orphan ERPPage/ERPDraftItems (Reddet aksiyonunu içeren tek UI) kaldırılacak mı, router'a mı bağlanacak? (Raporun Adım 2 ürün kararıyla birlikte netleşmeli.)

### 6.5 Import / Export / Bulk

Import/export ve bulk akışları incelendi. İki ayrı ürün giriş hattı var: (1) Excel/CSV toplu içe aktarma (BulkImportDialog + POST /api/v1/items/bulk) DraftItem/staging KULLANMAZ, doğrudan Item tablosuna atomik yazar ve her satırı CreateItemCommandValidator'dan geçirir; (2) ERP sync (POST /integrations/{id}/items/sync) ürünleri DraftItem staging'e yazar, kullanıcı ERPItemsTable üzerinden seçip aynı BulkImportDialog'da düzenleyerek onaylar (PUT draft + approve). İki hat aynı dialog bileşenini paylaşsa da varsayılanlar ve sunucu tarafı validasyon birbirinden kopya/çelişkili: ERP sync isStackable=true + maxWeightOnTop=0 varsayarken Excel importu isStackable=false varsayar ve maxWeightOnTop'u hesaplar; draft onay yolunda hiçbir alan validasyonu çalışmaz ve zorunlu tutulan yük grubu (incompatibleGroups) backend'e hiç iletilmez. Kullanıcının 'import/export bununla bağlantılı mı' sorusunun cevabı: HAYIR — frontend'deki Excel/PDF exportları (lib/utils/export/*) tamamen istemci tarafı dosya üretimidir; ErpExportService ise plan onayında Hangfire ile kuyruklanan plan→ERP geri yazımıdır ve halen NotImplemented'dır (rapordaki iddia teyit edildi). Ayrıca resmi import şablonunda 'Yük Grubu' sütunu yokken parser bu sütunu zorunlu sayar; şablonu dolduran kullanıcının tüm satırları hatalı düşer. Araç toplu importu için backend bulk endpoint'i yoktur; N adet tekil POST atılır ve kısmi başarı üretir.

<details>
<summary>🔴 Kritik — Dosya exportları (Excel/PDF) ile ErpExportService tamamen ayrık; plan→ERP geri yazımı halen NotImplemented</summary>

Kullanıcının sorusunun cevabı: bağlantılı DEĞİL. Frontend'deki tüm exportlar (exportItemsToExcel, exportVehiclesToExcel, exportPlanToPdf, şablon indirme) istemci tarafında SheetJS/react-pdf ile dosya üretir, hiçbir ERP çağrısı yapmaz. ErpExportService ise plan onayında (ApprovePlan) Hangfire'a kuyruklanan plan→ERP geri yazım servisidir ve her çağrıda 'Erp.ExportNotImplemented' hatası döndürür; dolayısıyla her onaylanan plan ERP tarafında Failed işaretlenir. Rapordaki iddia koddan teyit edildi.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/ErpExportService.cs:11-19 (NotImplemented failure); apps/backend/CargoPilot.Application/Features/Plans/ApprovePlan/ApprovePlanCommandHandler.cs:48 (_jobScheduler.Enqueue); apps/frontend/src/lib/utils/export/ (yalnızca istemci tarafı dosya üretimi)

**Önerilen iş:** Rapordaki öneri geçerli: ErpExportService gerçeklenene kadar ApprovePlan'daki enqueue'yu feature-flag arkasına al; dosya exportlarına dokunmaya gerek yok.

</details>

<details>
<summary>🟠 Yüksek — Import şablonu ile parser uyumsuz: zorunlu 'Yük Grubu' sütunu şablonda yok</summary>

downloadItemImportTemplate 14 sütunlu şablon üretir ama 'Yük Grubu' sütunu içermez; xlsxToRows bu başlığı okur ve validateRow incompatibleGroups boşsa satırı hatalı sayar. Resmi şablonu dolduran kullanıcının TÜM satırları 'Zorunlu alan' hatasıyla kırmızıya düşer, her satır için elle yük grubu seçmek zorunda kalır. Ayrıca 'Kırılganlık' sütunu çifte görev görüyor: başlık 0-2 (fragility) derken parser aynı değeri constraintIds'e de yazıyor (grid seçenekleri 1-9).

**Kanıt:** apps/frontend/src/lib/utils/export/export-utils.ts:159-204 (şablon başlıkları, Yük Grubu yok); apps/frontend/src/features/data-management/imports/components/BulkImportDialog.tsx:105 (zorunlu), 196-199 (parser 'Yük Grubu' bekler), 191-195 (fragility→constraintIds çifte kullanım)

**Önerilen iş:** Şablona 'Yük Grubu' sütununu ekle (geçerli değerler ve örnekle) ve Kırılganlık sütununu fragility/constraint olarak ayrıştır ya da başlık metnini gerçek değer aralığıyla (1-9) hizala.

</details>

<details>
<summary>🟠 Yüksek — ERP draft onay yolunda kullanıcının zorunlu seçtiği incompatibleGroups backend'e hiç ulaşmıyor</summary>

BulkImportDialog draft modunda rowToUpdatePayload yalnızca stackGroup: incompatibleGroups[0] gönderir, incompatibleGroups alanı payload'da yok; UpdateDraftItemRequest'te de böyle bir alan tanımlı değil. Approve handler'ları Item constructor'ına incompatibleGroups için sabit null geçer. Sonuç: UI yük grubunu zorunlu tutuyor ama ERP kaynaklı ürünler uyumsuzluk grubu OLMADAN oluşuyor; Excel yolu (rowToRequest) ise aynı alanı dolduruyor. Aynı ürün iki yoldan farklı optimizasyon davranışıyla doğuyor.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/BulkImportDialog.tsx:142-164 (rowToUpdatePayload'da incompatibleGroups yok) vs 115-140 (rowToRequest'te var); apps/backend/CargoPilot.WebAPI/Controllers/DraftItemsController.cs:118-135 (request'te alan yok); apps/backend/CargoPilot.Application/Features/DraftItems/ApproveDraftItem/ApproveDraftItemCommandHandler.cs:48,82 (incompatibleGroups=null); ApproveDraftItems/ApproveDraftItemsCommandHandler.cs:56,92

**Önerilen iş:** UpdateDraftItemCommand/Request'e IncompatibleGroups alanı ekle, DraftItem'da sakla ve approve handler'larında Item'a taşı; frontend rowToUpdatePayload'a alanı ekle.

</details>

<details>
<summary>🟠 Yüksek — Validasyon asimetrisi: bulk-create satır satır doğrular, draft approve hiç doğrulamaz</summary>

POST /items/bulk her satırı CreateItemCommandValidator'dan geçirir (SKU, boyut, fragility, constraintIds, maxWeightOnTop vb. ~20 kural) ve batch-içi + DB SKU çakışmalarını kontrol eder. Draft yolunda ise UpdateDraftItemCommandValidator yalnızca 5 alanı (width/height/length/weight/maxStackCount) doğrular; Approve handler'ları hiçbir alan validasyonu uygulamadan draft'ı Item'a kopyalar. Aynı Item tablosuna giden iki yol farklı sıkılıkta korunuyor; ERP'den bozuk/eksik veri (örn. null SKU — draftItemSchema sku'yu nullable tanımlıyor) validasyonsuz kalıcı ürüne dönüşebilir.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Items/BulkCreateItems/BulkCreateItemsCommandHandler.cs:40-76 vs apps/backend/CargoPilot.Application/Features/DraftItems/ApproveDraftItem/ApproveDraftItemCommandHandler.cs:59-96; UpdateDraftItem/UpdateDraftItemCommandValidator.cs:9-29 (yalnızca 5 RuleFor); apps/frontend/src/lib/api/useDraftItems.ts:23 (sku nullable)

**Önerilen iş:** Approve handler'larında Item oluşturmadan önce CreateItemCommandValidator ile aynı kural setini (ortak bir validator'a çıkarıp) çalıştır; UpdateDraftItem validasyonunu genişlet.

</details>

<details>
<summary>🟡 Orta — ERP sync varsayılanları ile Excel import varsayılanları çelişkili</summary>

SyncErpItemsCommandHandler yeni DraftItem'ı FragilityType.NonFragile, isStackable=true, maxStackCount=1, maxWeightOnTop=0, AllowedRotations.All ile yaratır. Excel importunda ise İstiflenebilir sütununun varsayılanı false, rotasyon varsayılanları true, maxWeightOnTop stackable ise weight*maxStackCount (min 1) olarak HESAPLANIR. 'istiflenebilir ama üstüne 0 kg alabilir' kombinasyonu frontend mantığının asla üretmeyeceği çelişkili bir durumdur; kullanıcı draft'ı dialogda düzenlemeden approve endpoint'i doğrudan çağrılırsa bu değerler olduğu gibi Item'a geçer (approve yolunda validasyon yok).

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:131-136 vs apps/frontend/.../BulkImportDialog.tsx:200 (isStackable fallback false), apps/frontend/src/lib/api/itemMappers.ts:96-103 (toMaxWeightOnTop)

**Önerilen iş:** Varsayılan üretimini tek bir yere (backend'de ortak bir default/normalizasyon fonksiyonu) topla; sync'te maxWeightOnTop'u aynı formülle hesapla ya da isStackable varsayılanını false yap.

</details>

<details>
<summary>🟡 Orta — Aynı işin iki farklı yolu: toplu onay hem approve-bulk endpoint'i hem N tekil istekle yapılıyor</summary>

BulkImportDialog mode='update' iken tek POST /draft-items/approve-bulk kullanır; mode='import' iken useBulkApproveItemsIndividual ile N adet POST /draft-items/{id}/approve atar. Backend'de her iki endpoint de Pending ve UpdatePending durumlarını zaten aynı şekilde ele alıyor; tekil-döngü yolu atomik değildir (ortada hata olursa kısmi onay kalır) ve tek toast ile 'N ürün onaylandı' diyerek kısmi başarıyı gizler. Ayrıca öncesindeki PUT'lar Promise.all ile paralel atılır; biri düşerse diğer draft'lar güncellenmeden onaylanma riski try/catch ile tümden iptal ediliyor ama güncellenmiş draft'lar geride kalıyor.

**Kanıt:** apps/frontend/.../BulkImportDialog.tsx:450-470 (mode'a göre dallanma); apps/frontend/src/lib/api/useDraftItems.ts:120-135 (approve-bulk) ve 152-169 (N tekil istek); apps/backend/.../ApproveDraftItemsCommandHandler.cs:36-105 (bulk endpoint iki durumu da işliyor)

**Önerilen iş:** useBulkApproveItemsIndividual'ı kaldırıp her iki modda approve-bulk endpoint'ini kullan; sonuçtaki approved/skipped sayısını toast'a yansıt.

</details>

<details>
<summary>🟡 Orta — Araç toplu importu için bulk endpoint yok; N tekil create ile kısmi başarı üretiyor</summary>

VehicleBulkImportDialog satırları sırayla tek tek POST'lar (useCreateVehicle döngüsü). Backend'de bulk endpoint yalnızca Items ve Notifications için var (grep: Vehicles'ta yok). Ürün importu atomikken (ya hepsi ya hiçbiri) araç importu yarıda hata alırsa bazı araçlar eklenmiş bazıları eklenmemiş kalır — aynı iş için iki farklı desen.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/VehicleBulkImportDialog.tsx:219-244 (satır başına createVehicle.mutate döngüsü); backend grep sonucu: bulk yalnızca Items/Notifications controller'larında (ItemsController.cs:114,135; DraftItemsController.cs:94)

**Önerilen iş:** BulkCreateItems desenini örnek alan bir POST /vehicles/bulk endpoint'i ekle ve dialog'u ona bağla; ya da en azından kısmi başarı raporlamasını satır bazında göster.

</details>

<details>
<summary>🟡 Orta — Ürün Excel exportu import ile round-trip kayıplı: fragility 3-9 sıfırlanıyor, grup/kısıt alanları hiç yazılmıyor</summary>

exportItemsToExcel 'Kırılganlık' değerini item.fragility===2?2:1?1:0 ile üçe indirger; Flammable(3)–Chemical(9) arası ürünler 0=Normal olarak export edilir. stackGroup, incompatibleGroups ve constraintIds sütun olarak hiç yazılmaz. Bu dosya import şablonuyla aynı başlıkları kullandığından kullanıcı 'export et → düzenle → geri import et' akışında sessizce kırılganlık/kısıt verisi kaybeder (backend FragilityType enum'u 0-9'dur).

**Kanıt:** apps/frontend/src/lib/utils/export/export-utils.ts:127-143 (özellikle 135-136); apps/backend/CargoPilot.Domain/Enums/FragilityType.cs:3-14 (0-9 aralığı)

**Önerilen iş:** Export'ta fragility'yi gerçek değeriyle yaz ve Yük Grubu/kısıt sütunlarını ekle; import parser'ıyla birebir simetrik hale getir.

</details>

<details>
<summary>🟢 Düşük — Excel importu staging'i atlar, ERP sync staging kullanır — iki hat tasarım gereği ayrı ama tutarlılık tek dialog'a bağlı</summary>

Excel/CSV importu DraftItem'a uğramadan doğrudan POST /items/bulk ile Item tablosuna yazar; ERP sync ise ürünleri DraftItem'a yazar ve onay ERPItemsTable→BulkImportDialog üzerinden yürür. Raporun 'sync DraftItem'a yazıyor' iddiası teyit. İki hattın alan mantığı yalnızca paylaşılan BulkImportDialog/itemMappers sayesinde kısmen ortak; backend tarafında ise CreateItem ve ApproveDraft kopya Item-kurma kodu taşıyor (BulkCreateItemsCommandHandler.cs:85-107 ile ApproveDraftItemCommandHandler.cs:63-85 hemen hemen aynı constructor çağrısı).

**Kanıt:** apps/backend/CargoPilot.WebAPI/Controllers/ItemsController.cs:114 (POST bulk → Item); apps/backend/.../SyncErpItemsCommandHandler.cs:117-140 (DraftItem'a yazım); apps/backend/.../BulkCreateItemsCommandHandler.cs:85-107 vs ApproveDraftItemCommandHandler.cs:63-85 (kopya kurulum)

**Önerilen iş:** Item kurulumunu (validasyon + constructor + varsayılanlar) tek bir factory/servise çıkarıp hem bulk-create hem approve handler'larından kullan.

</details>

<details>
<summary>🟢 Düşük — Küçük tutarsızlıklar: yanıltıcı 'cm → mm' yorumu, ölü rotasyon dalı ve sessiz-boş draft listesi</summary>

ERPItemsTable'da draftItemToImportRow üzerindeki yorum 'cm → mm' dönüşümü iddia eder ama fonksiyon hiçbir birim dönüşümü yapmaz (değerler aynen kopyalanır). Aynı fonksiyondaki switch'te case 6 backend AllowedRotations enum'unda (0-5) bulunmayan ölü daldır. useDraftItems'ta safeParse başarısız olursa sessizce boş sayfa döndürülür — raporun 'silent failure UI'ı boş ama hatasız gösteriyor' kalıbının bu alandaki örneği.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:46 (yanlış yorum), 83-87 (case 6); apps/frontend/src/lib/api/itemMappers.ts:34-42 (enum 0-5); apps/frontend/src/lib/api/useDraftItems.ts:74-75 (safeParse→sessiz boş)

**Önerilen iş:** Yorumu düzelt/sil, case 6 dalını kaldır; draftItems parse hatasında en azından console.error + hata state'i döndür.

</details>

**Açık sorular:** ERP draft'ları BulkImportDialog'a hiç girmeden doğrudan /draft-items/{id}/approve çağrılabilecek başka bir UI/istemci var mı? (Varsa sync varsayılanları — isStackable=true, maxWeightOnTop=0 — validasyonsuz Item'a geçer.) · İş kuralı olarak Excel importunun staging'i (DraftItem) atlaması bilinçli bir karar mı, yoksa ileride Excel'in de onay kuyruğuna girmesi mi hedefleniyor? · Optimizasyon motoru incompatibleGroups'u mu yoksa stackGroup'u mu esas alıyor? (ERP kaynaklı ürünlerde incompatibleGroups null kaldığı için ayrıştırma kuralları fiilen devre dışı olabilir.) · exportItemsToExcel çıktısının import şablonu olarak geri kullanılması desteklenen bir senaryo mu? Destekleniyorsa round-trip kayıpları öncelikli düzeltilmeli.

### 6.6 Test ve E2E Doğrulanabilirlik

Test envanteri raporun "test kapsamı yok" iddiasını büyük ölçüde doğruluyor ve derinleştiriyor. Backend tarafında cargo-pilot.sln yalnızca 4 üretim projesi içeriyor (Application, Domain, Infrastructure, WebAPI); hiçbir xUnit/test projesi yok ve CI (ci.yml:120-127) test projesi bulamayınca test adımını sessizce atlıyor — yani backend CI'da hiçbir test hiç koşmamış. Frontend tarafında src altında 13 vitest dosyası var (geometry, export, auth store/schema, scene, debounce ağırlıklı); hiçbiri ERP'ye dokunmuyor ve vitest.config.ts environment:'node' olduğundan RTL/jsdom bileşen testi altyapısı bile kurulu değil (package.json'da @testing-library/* ve jsdom yok). Playwright hiç kurulmamış: bağımlılık, config, e2e klasörü ve CI adımı yok; CLAUDE.md'de "Playwright kritik akışlar için" yazıyor ama bu tamamen kağıt üzerinde. infra/compose/docker-compose.test.yml aslında bir e2e test rig'i değil, "test" adlı staging ortamı (backend+frontend+MSSQL+MinIO); .env.test bunu localhost'a uyarlıyor — yani tam-yığın bir ortam ayağa kaldırılabilir durumda, e2e için kullanılabilir ama hiçbir test koşucusu ona bağlanmıyor. "Doğru kurgulanmış ama çalışmayan" akışlar koddan teyit edildi: plan onayı→ERP export (ErpExportService her çağrıda Failure dönüyor, ApprovePlan yine de enqueue ediyor), manuel sync run-now (TriggerSyncCommandHandler NotImplemented), sevkiyat emirleri/sync-options/user-mapping uçları (frontend 10+ rotayı çağırıyor, IntegrationsController'da yalnızca 8 uç var). Bu akışlar için katman katman test senaryoları ve altyapı kurulum adımları bulgularda listelendi.

<details>
<summary>🔴 Kritik — Backend'de test projesi yok; CI test adımı sessizce atlanıyor</summary>

cargo-pilot.sln yalnızca CargoPilot.Application/Domain/Infrastructure/WebAPI içeriyor; hiçbir *.Tests.csproj repo genelinde yok. ci.yml'deki backend test adımı 'find ... *.Tests.csproj' boş dönünce 'Test projesi bulunamadı, adım atlanıyor' deyip yeşil geçiyor. Sonuç: backend'e hiçbir zaman otomatik test kapısı uygulanmamış; NotImplemented handler'lar ve ölü akışlar bu yüzden fark edilmeden merge edilebilmiş.

**Kanıt:** cargo-pilot.sln:9-16; .github/workflows/ci.yml:120-127; Glob apps/backend/**/*Tests*.csproj → 0 sonuç

**Önerilen iş:** sln'e apps/backend/tests/CargoPilot.Application.Tests (xUnit + FluentAssertions + NSubstitute) ekle; CI'daki 'atla' dalını kaldırıp dotnet test'i zorunlu yap (test projesi eklendiği PR'da).

</details>

<details>
<summary>🔴 Kritik — Teyit: Plan onayı → ERP export akışı kurgulanmış ama her seferinde Failed üretiyor</summary>

ApprovePlanCommandHandler her onayda job kuyrukluyor (Hangfire kayıtlıysa), ErpExportJob → ErpExportService.ExportAsync koşulsuz 'Erp.ExportNotImplemented' Failure dönüyor. UI+pipeline hazır, uç nokta boş — 'doğru kurgulanmış ama çalışmayan' akışların en kritiği. Not: DI'da Hangfire kapalıyken NoOpErpExportJobScheduler devreye giriyor (DependencyInjection.cs:153); yani ortama göre davranış 'sessizce hiçbir şey olmaz' ile 'her plan ErpFailed olur' arasında değişiyor — rapor bu ikiliği belirtmiyor. Önerilen test (xUnit, Application katmanı): GIVEN onaylanabilir plan + aktif entegrasyon WHEN ApprovePlanCommand THEN scheduler.Enqueue tam 1 kez çağrılır; (Infrastructure) GIVEN ErpExportService WHEN ExportAsync THEN şu an Failure döner (implementasyon gelince gerçek yazma senaryosuna çevrilir). E2E (Playwright, ERP-mssql'li compose ortamında): GIVEN onaylı plan WHEN export tamamlanır THEN plan detayında ERP durumu 'aktarıldı' görünür.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/ErpExportService.cs:16-19; apps/backend/CargoPilot.Application/Features/Plans/ApprovePlan/ApprovePlanCommandHandler.cs:48; apps/backend/CargoPilot.Infrastructure/Jobs/HangfireErpExportJobScheduler.cs:14; apps/backend/CargoPilot.Infrastructure/DependencyInjection.cs:150-153

**Önerilen iş:** ApprovePlan handler'ına scheduler-enqueue birim testi + ErpExportService'e davranış-sabitleme testi yaz; export implemente edilene kadar enqueue'yu feature-flag'e alan PR'a bu testleri iliştir.

</details>

<details>
<summary>🔴 Kritik — Teyit: frontend'in çağırdığı 6 ERP rota ailesi backend'de yok — kontrat testi ihtiyacı</summary>

useERPIntegration.ts sync-options, {id}/shipment-orders, erp-users, user-mappings (GET/POST/PATCH/DELETE), role-conflict-log, unassigned-data(+/assign) çağırıyor; IntegrationsController'da yalnızca sync-logs, sync-settings (GET/PUT), sync/run-now, items/sync ve pending-item-mappings (GET/PUT/DELETE) uçları var. Bu, UI hazır + backend yok akışlarının tamamı: ERP sevkiyat emirlerinden plan oluşturma ve kullanıcı eşleştirme ekranları fiilen ölü. Önerilen senaryolar: (Vitest, akslar mock'lanarak) GIVEN shipment-orders 404 döner WHEN useERPShipmentOrders THEN hook error state'e düşer (bugün boş dizi dönüyor — önce silent-failure düzeltmesi gerekli); (xUnit, endpoint yazıldığında) GIVEN ERP'de N sipariş WHEN GET shipment-orders THEN frontend erpShipmentOrderSchema'sına birebir uyan DTO; (Playwright) GIVEN sahte ERP verili ortam WHEN kullanıcı ERP sekmesinde siparişleri seçip 'plan oluştur' der THEN /planning/new sihirbazı seçili kalemlerle açılır.

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:293,443,482,495,512,531,545,562,581,595; apps/backend/CargoPilot.WebAPI/Controllers/IntegrationsController.cs:52-223 (yalnızca 8 uç)

**Önerilen iş:** Backend uçları yazılmadan önce frontend Zod şemalarını 'beklenen kontrat' olarak sabitleyen şema testleri ekle; her yeni endpoint PR'ı bu şemaya karşı serialization testi içersin.

</details>

<details>
<summary>🟠 Yüksek — Frontend'de 13 vitest dosyası var, hiçbiri ERP'ye dokunmuyor</summary>

src altındaki testler: geometry x5, export x1, format x1, scene x2, auth (loginSchema, useAuthStore), VehicleTypeSelector, useDebounce. lib/api/useERPIntegration.ts (23 hook), lib/types/erp.ts şemaları ve features/platform/erp bileşenleri için sıfır test. Raporun '13 vitest dosyasının hiçbiri ERP değil' iddiası birebir doğru.

**Kanıt:** Glob apps/frontend/src/**/*.test.* → 13 dosya (apps/frontend/src/lib/utils/geometry/*.test.ts, apps/frontend/src/lib/store/useAuthStore.test.ts vb.); apps/frontend/src/lib/api/useERPIntegration.ts için eşleşen test yok

**Önerilen iş:** Öncelik: lib/types/erp.ts Zod şemalarına (erpSettings, syncLog, shipmentOrder, savedMatch) örnek backend payload'larıyla parse/reddetme vitest'leri; PROVIDER_TYPE_TO_INT ve SYNC_FREQUENCY_TO_INT eşlemelerini backend enum değerlerine sabitleyen kontrat testleri.

</details>

<details>
<summary>🟠 Yüksek — RTL/jsdom altyapısı kurulu değil — bileşen testi şu an yazılamaz</summary>

vitest.config.ts environment:'node' ve package.json'da @testing-library/react, @testing-library/jest-dom, jsdom/happy-dom hiçbiri yok. CLAUDE.md 'RTL bileşen davranışı için' dese de altyapı mevcut değil; mevcut 13 test bu yüzden yalnızca saf fonksiyon/store/şema testi.

**Kanıt:** apps/frontend/vitest.config.ts:6 (environment: 'node'); apps/frontend/package.json:30-53 (devDependencies'te testing-library/jsdom yok)

**Önerilen iş:** jsdom + @testing-library/react + @testing-library/user-event + @testing-library/jest-dom ekle; vitest.config'e environmentMatchGlobs ile *.test.tsx için jsdom tanımla; ilk RTL testi olarak ERPItemsPage onay akışını mock'lu yaz.

</details>

<details>
<summary>🟠 Yüksek — Playwright/e2e altyapısı hiç yok (bağımlılık, config, senaryo, CI adımı)</summary>

Repo genelinde playwright.config yok, @playwright/test bağımlılığı yok, e2e klasörü yok, CI'da e2e job'u yok. 'playwright' kelimesi yalnızca dokümanlarda (CLAUDE.md, docs/context) geçiyor. E2E doğrulanabilirlik sıfır; ERP'nin 'boş ama hatasız' görünen silent-failure ekranları hiçbir otomasyonla yakalanamaz durumda.

**Kanıt:** Grep 'playwright' (node_modules hariç) → yalnızca CLAUDE.md, docs/context/*.md, ALGORITMA.html, subfeatures.html; apps/frontend/package.json'da playwright yok; Glob playwright*.config* → yalnızca vitest.config.ts

**Önerilen iş:** apps/frontend'e @playwright/test ekle; playwright.config.ts baseURL'i .env.test'teki http://localhost:3001'e bağla; webServer yerine docker-compose.test.yml'in ayakta olmasını ön koşul yap; ilk smoke: login → /erp → ayar kaydet → items/sync.

</details>

<details>
<summary>🟠 Yüksek — Teyit: run-now ucu UI+409 akışıyla hazır, handler NotImplemented</summary>

IntegrationsController'da POST {id}/sync/run-now ucu var, frontend hook'u 409 için özel mesaj taşıyor; TriggerSyncCommandHandler ise company/çakışan-sync/entegrasyon kontrollerini yapıp sonda koşulsuz 'Sync.NotImplemented' Failure dönüyor ('PR #463 bekleniyor' yorumu 41. satırda). Önerilen testler (xUnit): GIVEN çalışan sync var WHEN TriggerSync THEN Sync.AlreadyRunning (Conflict) — bu dal gerçek ve test edilebilir; GIVEN geçerli entegrasyon WHEN TriggerSync THEN bugün NotImplemented (delege PR'ıyla birlikte SyncErpItems'e delege edildiğini doğrulayan teste dönüştürülür). Vitest: run-now mutation'ının 409 gövdesini kullanıcı mesajına çevirmesi.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/TriggerSync/TriggerSyncCommandHandler.cs:41-47; apps/backend/CargoPilot.WebAPI/Controllers/IntegrationsController.cs:120

**Önerilen iş:** TriggerSync handler'ının 3 gerçek dalını (NoCompany, AlreadyRunning, NotFound) şimdi birim testine al; delege PR'ı bu testlerin üstüne gelsin.

</details>

<details>
<summary>🟠 Yüksek — Test altyapısı kurulum yol haritası (somut adımlar)</summary>

1) Backend: apps/backend/tests/CargoPilot.Application.Tests.csproj (xUnit) oluştur, sln'e ekle; ilk hedefler SyncErpItemsCommandHandler (upsert/Approved/Rejected/SyncLog), TriggerSync dalları, ApprovePlan enqueue, UpsertErpSettings şifreleme sınırı. 2) Backend entegrasyon: WebApplicationFactory + Testcontainers-MSSQL ile IntegrationsController kontrat testleri. 3) Frontend birim: erp.ts şema + PROVIDER_TYPE_TO_INT eşleme testleri (mevcut node ortamında hemen yazılabilir). 4) Frontend bileşen: jsdom+RTL kurulumundan sonra ERPItemsPage/ERPSettings. 5) E2E: @playwright/test + playwright.config (baseURL localhost:3001), docker-compose.test.yml'e sahte ERP MSSQL servisi, CI'ya compose-up→smoke job'u. 6) ci.yml'deki backend 'test yoksa atla' dalını test projesi eklenen PR'da kaldır. Sıralama raporun Adım 5'iyle uyumlu; ancak rapor RTL/jsdom eksikliğini ve CI'daki sessiz atlama dalını hiç anmıyor.

**Kanıt:** cargo-pilot.sln; .github/workflows/ci.yml:120-127; apps/frontend/vitest.config.ts:6; infra/compose/docker-compose.test.yml

**Önerilen iş:** Yukarıdaki 6 adımı 3 PR'a böl: (a) xUnit projesi+CI sıkılaştırma, (b) frontend şema testleri+RTL kurulumu, (c) Playwright+compose smoke.

</details>

<details>
<summary>🟡 Orta — docker-compose.test.yml tam-yığın 'test ortamı' kuruyor; e2e için hazır ama bağlanmış tüketicisi yok</summary>

Compose dosyası backend(8081)+frontend(3001)+MSSQL 2022(1434)+MinIO kuruyor, healthcheck'li; .env.test tüm değerleri localhost'a çevirmiş (gerçek Resend API anahtarı dahil — testte gerçek e-posta gider uyarısı dosyada mevcut). Bu bir staging/smoke ortamı; hiçbir test koşucusu (Playwright, dotnet integration test) bu ortamı hedeflemiyor. Yani e2e'nin 'ortam' yarısı hazır, 'koşucu' yarısı tamamen eksik. Ayrıca ERP e2e'si için üçüncü bir bileşen gerekiyor: sahte ERP MSSQL'i (TBLSTSABIT şemalı) compose'da yok.

**Kanıt:** infra/compose/docker-compose.test.yml:4-131; infra/env/.env.test:10-11,28-30,58; compose'da ERP kaynak DB servisi yok

**Önerilen iş:** Compose'a 'erp-mssql' servisi + init.sql ile TBLSTSABIT örnek verisi ekle (Netsis şeması docs/erp-integration'dan); Playwright/entegrasyon testleri bu ortama bağlansın. .env.test'teki gerçek RESEND_API_KEY test ortamından çıkarılmalı.

</details>

<details>
<summary>🟡 Orta — CI'da e2e/entegrasyon aşaması yok; test-deploy yalnızca image dağıtıyor</summary>

ci.yml frontend'te lint+format+build+vitest, backend'te restore+build koşuyor; hiçbir workflow docker-compose.test.yml ortamına karşı smoke/e2e koşmuyor. Yani 'test' ortamına deploy edilen sürümün ERP dahil hiçbir akışı otomatik doğrulanmıyor.

**Kanıt:** .github/workflows/ci.yml:56-127; .github/workflows/test-deploy.yml (yalnızca image build/deploy amaçlı, test koşucusu adımı yok)

**Önerilen iş:** test-deploy sonrası '/health + login + /erp sayfası yükleniyor' Playwright smoke job'u ekle; ERP uçları geldikçe senaryo genişlet.

</details>

**Açık sorular:** PR #463 (manuel sync implementasyonu) hâlâ açık mı, yoksa terk mi edildi? TriggerSync test stratejisi buna bağlı. · docker-compose.test.yml ortamı e2e için mi yoksa yalnızca staging için mi tasarlandı — ekip e2e'yi bu ortamda mı yoksa vite dev + mock'la mı koşmak istiyor? · Backend entegrasyon testleri için Testcontainers (Docker gerektirir) mi, yoksa CI'da servis container'ı MSSQL mi tercih edilecek? · infra/env/.env.test dosyası .gitignore kapsamında olduğu iddia edilse de working tree'de mevcut ve gerçek RESEND_API_KEY içeriyor — bu anahtar rotate edilmeli mi? · Sahte ERP verisi (TBLSTSABIT) için kanonik şema apps/backend/docs/erp-integration altındaki doküman mı, yoksa gerçek Netsis dump'ı mı kullanılacak?

### 6.7 Sektörel Standartlar

Sektörel best-practice merceğiyle bakıldığında ERP entegrasyonunun çekirdeği (staging+onay, tenant izolasyonu, sır şifreleme, kalıcı job altyapısı) olgun sayılabilecek düzeyde; ancak veri güvenilirliği kalıpları (satır bazlı hata/kısmi başarı, idempotency kilidi, delta sync, mutabakat) fiilen yok. Şema dokümanı sorusunun cevabı: apps/backend/docs/erp-integration/erp-schema-divizyon.md, Netsis'in standart tablo adlarını (TBLSTSABIT/TBLSIPAMAS/TBLSIPATRA) taşıyan, Divizyon'a ait 3 tabloluk örnek bir DIVIZYON.bak yedeğinden çıkarılmıştır — yani şema Netsis şemasıdır, Logo için geçerli değildir; fetcher'ın bu sorguya sabitlenmesi Logo müşterisinde sessizce SqlException üretir. Raporun ana iddiaları (ErpExportService NotImplemented, TriggerSync NotImplemented, fetcher'ın Netsis'e kilitli olması) koddan teyit edildi; DataProtection key-ring riski ise tekzip edildi (keyler DB'de, DB kalıcı volume'de). Ek yeni bulgular: DraftItems'ta upsert anahtarında unique index yok ve /items/sync hiçbir eşzamanlılık kilidi kullanmıyor (çift kayıt riski), SyncLog.PartialFail hiç çağrılmıyor, sync ayarlarındaki NextScheduledSyncAt'ı tüketen hiçbir zamanlayıcı yok (otomatik sync tamamen yok) ve sync akışı Integration yerine şirket başına tek ErpSettings kullandığı için dokümandaki 'çoklu aktif entegrasyon' modeli fiilen desteklenmiyor. ERP SQL çağrılarında retry/circuit-breaker/timeout disiplini yok; rate limiter yalnızca auth uçlarında.

<details>
<summary>🟠 Yüksek — (2) Satır bazlı hata raporu ve kısmi başarı hiç yok</summary>

SyncErpItemsCommandHandler tüm ürünleri tek try/catch içinde işliyor: tek bozuk satır tüm sync'i Failed yapar, o ana kadarki değişiklikler kaydedilmez. SyncLog.PartialFail metodu domain'de tanımlı ama repo genelinde hiç çağrılmıyor; SyncErpItemsResult'taki 'skipped' sayacı daima 0. Olgun ERP entegrasyonunda beklenen satır-hata tablosu / hata CSV'si karşılığı yok.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:82-151 (tek catch, skipped=0); apps/backend/CargoPilot.Domain/Entities/SyncLog.cs:46-53 (PartialFail); grep 'PartialFail(' → yalnız tanım

**Önerilen iş:** foreach gövdesine satır bazlı try/catch + hata listesi ekle; sonunda hata varsa syncLog.PartialFail(count, özet) çağır ve satır hatalarını sonuca/loga döndür.

</details>

<details>
<summary>🟠 Yüksek — (3) /items/sync eşzamanlılık kilidi kullanmıyor; Running durumu hiç set edilmiyor</summary>

HasAnyRunningSyncAsync yalnızca TriggerSync (run-now) yolunda çağrılıyor, o da NotImplemented. Gerçek sync yolu (POST /items/sync) ne StartSync() ile SyncStatus=Running yapıyor ne kilit kontrol ediyor; Integration.StartSync/FailSync ölü. İki admin aynı anda sync başlatırsa unique index de olmadığından çift DraftItem oluşur — idempotency yalnızca tek-iş-parçacığı varsayımıyla ayakta.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/TriggerSync/TriggerSyncCommandHandler.cs:30-33 (tek kilit burada); SyncErpItemsCommandHandler.cs:51-150 (StartSync/HasAnyRunningSync yok); apps/backend/CargoPilot.Domain/Entities/Integration.cs:57-65

**Önerilen iş:** SyncErpItemsCommandHandler başında HasAnyRunningSyncAsync + StartSync/CompleteSync-FailSync yaşam döngüsünü işlet (409 dön); Running'de takılı kalmaya karşı zaman aşımı düşün.

</details>

<details>
<summary>🟠 Yüksek — (4) Retry/backoff yalnız export job'ında; sync tarafında sıfır, dead-letter süreci tanımsız</summary>

ErpExportJob [AutomaticRetry(Attempts=3)] ile Hangfire SQL Server storage (kalıcı) üzerinde çalışıyor — bu kısım standarda uygun. Ancak ErpExportService NotImplemented döndüğü için her onaylanan plan 3 deneme sonunda Failed'a düşüyor (rapor iddiası teyit; ApprovePlan her onayda enqueue ediyor). Sync tarafında (SqlServerErpProductFetcher) hiçbir retry/backoff yok; Hangfire Failed set'i dışında bir dead-letter/alerting mekanizması yok. Ayrıca ErpExportJob integrations[0] diyerek şirketin ilk entegrasyonunu keyfi seçiyor.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Jobs/ErpExportJob.cs:7,35-42; apps/backend/CargoPilot.Infrastructure/Services/ErpExportService.cs:11-19; apps/backend/CargoPilot.Application/Features/Plans/ApprovePlan/ApprovePlanCommandHandler.cs:45-48; apps/backend/CargoPilot.Infrastructure/DependencyInjection.cs:138-145 (UseSqlServerStorage)

**Önerilen iş:** Export hazır olana dek ApprovePlan'daki enqueue'yu feature-flag arkasına al (rapordaki Adım 7 ön-PR'ı); export implementasyonunda hedef entegrasyonu keyfi [0] yerine plan/ayar üzerinden seç.

</details>

<details>
<summary>🟠 Yüksek — (5) Delta sync yok — her sync tam tablo taraması; otomatik zamanlanmış sync de yok</summary>

Fetcher LastSyncDate parametresi almıyor, sorguda tarih filtresi yok (TBLSTSABIT'te zaten değişiklik damgası kolonu da yok; dokümandaki delta sorgusu yalnız sipariş tabloları için ve kod karşılığı hiç yok). Integration.RecordSync yalnızca damga atıyor, hiçbir sorgu tüketmiyor. Daha kritiği: UpdateSyncSettings NextScheduledSyncAt hesaplayıp kaydediyor ama bunu okuyan hiçbir RecurringJob/scheduler yok — Program.cs'te yalnız trial-expiry ve notification-cleanup job'ları var. Kullanıcının seçtiği sync frekansı tamamen kozmetik.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:19-27 (filtresiz sorgu); apps/backend/CargoPilot.Application/Features/Integrations/UpdateSyncSettings/UpdateSyncSettingsCommandHandler.cs:36-41; apps/backend/CargoPilot.WebAPI/Program.cs:43-51 (ERP sync recurring job yok); docs/erp-integration/erp-schema-divizyon.md:430-445

**Önerilen iş:** NextScheduledSyncAt'ı tarayıp vadesi gelen entegrasyonlar için sync tetikleyen bir Hangfire RecurringJob ekle; ürün master için delta mümkün değilse bunu dokümante edip full-sync'i sayfalı/TOP'lu yap.

</details>

<details>
<summary>🟠 Yüksek — (7) Sağlayıcı soyutlaması yetersiz: IErpConnector yalnız TestConnection, fetch Netsis'e sabit</summary>

IErpConnector tek metotlu (TestConnectionAsync); Logo ve Netsis connector gövdeleri birebir aynı (kopya kod), provider farkı yalnız ProviderType property'si. Ürün çekme IErpProductFetcher'a ayrılmış ama DI'da tek implementasyon (SqlServerErpProductFetcher) provider'a bakılmaksızın kayıtlı ve TBLSTSABIT Netsis sorgusuna gömülü — ErpSettings.ProviderType=Logo olsa bile Netsis sorgusu çalışır ve 'Invalid object name TBLSTSABIT' ile patlar. Ayrıca sync, Integration.ApiEndpoint/AuthCredentials yerine şirket başına tek ErpSettings kullanıyor; data-model.md'deki 'bir firma birden fazla aktif entegrasyona sahip olabilir' modeli fiilen desteklenmiyor (rapor teyit + genişletme).

**Kanıt:** apps/backend/CargoPilot.Application/Common/Interfaces/IErpConnector.cs:6-16; ErpConnectors/LogoErpConnector.cs ve NetsisErpConnector.cs (özdeş gövdeler); Infrastructure/DependencyInjection.cs:106; SqlServerErpProductFetcher.cs:19-27,103 (InitialCatalog default 'DIVIZYON'); SyncErpItemsCommandHandler.cs:64-89 (ErpSettings tabanlı bağlantı); docs/erp-integration/data-model.md:16

**Önerilen iş:** FetchProductsAsync'i (ve ileride FetchShipmentOrders/Export'u) IErpConnector yüzeyine taşı, ProviderType'a göre çözümlenen bir factory ekle; bağlantı bilgisinin SSOT'unu (ErpSettings mi Integration mı) netleştir.

</details>

<details>
<summary>🟠 Yüksek — TriggerSync NotImplemented ve PendingItemMapping ölü zinciri teyit</summary>

TriggerSyncCommandHandler tüm ön kontrollerden sonra koşulsuz Sync.NotImplemented failure dönüyor ('PR #463 bekleniyor' yorumu mevcut). PendingItemMapping için 3 endpoint + repo + entity var ama tabloya yazan üretici kod yok (sync DraftItem yazıyor); staging kalıbı iki paralel, yarım tasarım olarak duruyor — endüstri standardında tek onay hattı olmalı.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/TriggerSync/TriggerSyncCommandHandler.cs:41-47; apps/backend/CargoPilot.WebAPI/Controllers/IntegrationsController.cs:170-236 (pending-item-mappings uçları); grep 'new PendingItemMapping(' → üretici yok

**Önerilen iş:** Raporun Adım 2-3'ü aynen geçerli: SSOT olarak DraftItem'ı seçip PendingItemMapping zincirini kaldır, run-now'u SyncErpItemsCommand'a delege et.

</details>

<details>
<summary>🟡 Orta — (1) Staging/onay akışı mevcut ve çalışıyor — ama upsert anahtarı unique değil</summary>

DraftItem gerçek bir staging tablosu: sync Pending yazar, ApproveDraftItem(s) handler'ları Item'a upsert eder (GetByErpIdAsync ile mevcut Item güncellenir, SetErpSource ile köken damgalanır). Ancak DraftItems üzerindeki IX_DraftItems_IntegrationId_ErpId indexi IsUnique() içermiyor; upsert 'önce oku sonra yaz' deseniyle yapıldığından eşzamanlı iki sync aynı ErpId için çift taslak üretebilir.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Persistence/Configurations/DraftItemConfiguration.cs:96-97 (unique yok); apps/backend/CargoPilot.Infrastructure/Persistence/Repositories/DraftItemRepository.cs:21-23; apps/backend/CargoPilot.Application/Features/DraftItems/ApproveDraftItems/ApproveDraftItemsCommandHandler.cs:46,97

**Önerilen iş:** IX_DraftItems_IntegrationId_ErpId ve Items(ErpId,IntegrationId,CompanyId) üzerinde unique (filtreli) index ekleyen migration; upsert'i unique ihlalini yakalayacak şekilde sertleştir.

</details>

<details>
<summary>🟡 Orta — (6) Reconciliation/audit izi: SyncLog var ama satır detayı ve mutabakat yok</summary>

SyncLog StartedAt/CompletedAt/Status/SyncedRecordCount/ErrorMessage tutuyor ve sayfalı GET /sync-logs ile UI'a açık — temel audit izi mevcut. Ancak kayıt bazında ne eklendi/güncellendi/atlandı bilgisi yok (added/updated ayrımı yalnız API cevabında, loga yazılmıyor), ERP↔CP kayıt sayısı mutabakatı (ERP'de silinen ürünün CP'de pasife çekilmesi vb.) hiç yok — ERP'de silinen ürün CP'de sonsuza dek kalır.

**Kanıt:** apps/backend/CargoPilot.Domain/Entities/SyncLog.cs:5-53; SyncErpItemsCommandHandler.cs:144-150 (yalnız toplam sayı); fetcher'da silinen/kilitli ürünler için deaktivasyon akışı yok

**Önerilen iş:** SyncLog'a added/updated/skipped kırılımı ekle; sync sonunda ERP sonuç kümesinde olmayan DraftItem/Item'ları işaretleyen bir 'orphan reconciliation' adımı tasarla.

</details>

<details>
<summary>🟡 Orta — (8) Sır yönetimi: key ring DB'de kalıcı — rapordaki risk tekzip; ama key'ler at-rest şifresiz</summary>

AddDataProtection().PersistKeysToDbContext<AppDbContext>() ile key ring uygulama veritabanında; prod compose'ta mssql verisi adlandırılmış volume'de (cargo-pilot-mssql-data-prod). Container yeniden oluşsa da ERP parolaları çözülebilir kalır — raporun 'key ring kalıcı değilse' riski infra kanıtıyla kapanıyor. Sapmalar: ProtectKeysWithCertificate/AzureKeyVault yok, key'ler DataProtectionKeys tablosunda düz XML (DB dump'ı alan herkes ERP parolalarını çözebilir); hem CP DB'si hem ERP bağlantısı fallback'i 'sa' kullanıcısı; ERP bağlantı dizesi TrustServerCertificate=true.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/DependencyInjection.cs:107-108; infra/compose/docker-compose.prod.yml:101-102,136-138; apps/backend/CargoPilot.Infrastructure/Services/DataProtectionErpPasswordProtector.cs:10-17; SqlServerErpProductFetcher.cs:100-108 (UserID default 'sa')

**Önerilen iş:** Key ring'i sertifikayla koru (ProtectKeysWith*), ERP bağlantısı için sa yerine salt-okur bir ERP kullanıcısı zorunlu kıl; 'sa'/'DIVIZYON' fallback'lerini kaldırıp eksik kimlik bilgisinde açık hata döndür.

</details>

<details>
<summary>🟡 Orta — (9) ERP çağrılarında timeout/circuit breaker disiplini yok; rate limiter ERP uçlarını kapsamıyor</summary>

Polly/circuit breaker repo'da hiç yok (grep yalnız bir doküman dosyasına çarpıyor). Test bağlantısında ConnectTimeout=10 var; ama asıl veri çeken SqlServerErpProductFetcher bağlantı dizesinde ConnectTimeout set etmiyor (default 15 sn) ve SqlCommand'a CommandTimeout vermiyor (default 30 sn); sorguda TOP/sayfalama yok — büyük stok tablosunda istek HTTP thread'i üzerinde senkron bekler (sync bir Hangfire job'ı değil, request-scope'ta çalışıyor). EnableRateLimiting yalnız login/register/password-reset/contact'ta; pahalı /items/sync ucunda yok.

**Kanıt:** grep Polly → yalnız docs/user-story-tracker.md; SqlServerErpProductFetcher.cs:34-41,100-108; ErpConnectors/NetsisErpConnector.cs:29; grep EnableRateLimiting → yalnız AuthController/ContactController

**Önerilen iş:** Fetcher'a ConnectTimeout/CommandTimeout ve satır limiti ekle; sync'i arka plan job'ına taşı (409 + polling zaten frontend'de var); /items/sync'e rate limit policy uygula.

</details>

<details>
<summary>🟡 Orta — Şema dokümanı: TBLSTSABIT Netsis standardıdır, kaynak Divizyon örnek yedeği; Logo için geçersiz</summary>

erp-schema-divizyon.md, DIVIZYON.bak adlı 3 tabloluk bir SQL Server yedeğinden üretilmiş; TBLSTSABIT/TBLSIPAMAS/TBLSIPATRA adları ve kolonları (STOK_KODU, SATISKILIT, FATIRS_NO, INCKEYNO...) Netsis'in standart şemasıdır — yani doküman 'Divizyon müşterisinin Netsis veritabanını' belgeler; Divizyon'a özel custom bir şema değildir, ama tam Netsis şeması da değildir (134 kolonluk tek tablo örneklemi). Logo (LG_XXX_ITEMS vb.) şeması repo'da hiç belgelenmemiş; rapordaki Risk 3 geçerliliğini koruyor. EN/BOY/GENISLIK→Width/Depth/Height eşlemesi fetcher'da dokümanla birebir uyumlu.

**Kanıt:** apps/backend/docs/erp-integration/erp-schema-divizyon.md:1-8,131-168; SqlServerErpProductFetcher.cs:19-27,45-50 (aynı kolonlar/mapping)

**Önerilen iş:** Dokümanın başına 'bu Netsis şemasıdır' notu ekle; Logo müşterisi hedefleniyorsa Logo tablo şeması için ayrı bir doküman çıkarılmadan Adım 4 (provider-aware fetcher) başlatılmamalı.

</details>

<details>
<summary>🟢 Düşük — (10) Çoklu-tenant izolasyonu tutarlı — küçük bir null-güvenlik pürüzü var</summary>

İncelenen tüm ERP repo sorguları companyId ile scope'lu: DraftItemRepository.GetByErpIdAsync, ItemRepository.GetByErpIdAsync, IntegrationRepository.ListByCompany/GetById/HasAnyRunningSync, ErpExportJob plan sorgusu (loadingPlanId+companyId). Controller'lar CompanyAdmin policy'li. Sapma: SyncErpItemsCommandHandler companyId'yi null kontrolü yapmadan integration sorgusuna geçirip 64. satırda companyId!.Value ile zorluyor — CompanyId claim'i olmayan bir token'da NRE/beklenmedik davranış; TriggerSync ve ApprovePlan'daki gibi erken Unauthorized dönüşü yok.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Persistence/Repositories/IntegrationRepository.cs:22-30; ItemRepository.cs:48-51; DraftItemRepository.cs:21-23; SyncErpItemsCommandHandler.cs:55-64 (companyId!.Value); TriggerSyncCommandHandler.cs:24-27 (doğru kalıp)

**Önerilen iş:** SyncErpItemsCommandHandler'a diğer handler'lardaki 'companyId is null → Auth.NoCompany' erken dönüşünü ekle.

</details>

**Açık sorular:** Logo müşterisi gerçekten hedefte mi? Hedefteyse Logo şema dokümanı (LG_ tablo yapısı) kimden/ne zaman gelecek — provider-aware fetcher bu olmadan başlayamaz. · Bağlantı bilgisinin SSOT'u hangisi olacak: şirket başına tek ErpSettings mi, entegrasyon başına Integration.AuthCredentials mı? (data-model.md çoklu aktif entegrasyon vaat ediyor, kod tekli ErpSettings kullanıyor.) · PR #463 (manuel sync implementasyonu) hâlâ açık/bekleyen bir iş mi; NextScheduledSyncAt'ı tüketecek zamanlayıcı bu PR'ın kapsamında mı? · Ürün master'ında ERP'de silinen/satışa kapatılan kayıtların CP tarafında pasifleştirilmesi (reconciliation) ürün olarak isteniyor mu? · DataProtection key'lerinin at-rest şifrelenmesi (sertifika/KeyVault) için bir güvenlik gereksinimi tanımlı mı, yoksa DB erişim kontrolü yeterli mi kabul ediliyor?

---

*Bu doküman ultracode analiz çıktısıdır; implementasyon Opus ile task sırasına göre yürütülecektir. Ham analiz verisi: session scratchpad `erp-analiz.json`.*


---

# EK ANALİZ TURU — Bağlantı Mimarisi, Satır Muhasebesi, UX/UI (2026-08-11)

**Yöntem:** İkinci ultracode workflow — 5 paralel araştırma ajanı (UX ajanları ui-ux-pro-max rehberliğiyle) + 2 adversarial doğrulama + sentez (8 ajan, 160 araç çağrısı).
**Doğrulama:** 22 kritik/yüksek bulgunun 21'i doğrulandı, 1'i düzeltilerek alındı; tekzip yok. İlk turun bulguları kullanıcı tarafından ONAYLANDI — bu bölüm onaylı planın üzerine ERP-21..ERP-37 tasklarını ekler.

## 7. Bağlantı Sorusunun Cevabı: API mi, doğrudan DB mi?

Hayır — Logo/Netsis bağlantısı API ile yapılmıyor; her iki 'connector' da (LogoErpConnector.cs:21-33 ve NetsisErpConnector.cs:21-33, satır satır özdeş) Microsoft.Data.SqlClient ile müşterinin MSSQL veritabanına doğrudan SqlConnection açıyor ve yalnızca login denemesi (OpenAsync) yapıyor; Logo REST API, LogoObjects veya Netsis NetOpenX hiçbir yerde kullanılmıyor, docs/erp-integration altında da geçmiyor. Asıl veri çekimi SqlServerErpProductFetcher.cs:19-27'de: 'apiEndpoint' adlı parametre aslında SQL sunucu adresi ve sorgu sabit olarak Netsis tablosu TBLSTSABIT üzerinde ham SELECT — Logo seçilse bile her zaman Netsis şeması sorgulanır (DI'da tek fetcher kayıtlı: DependencyInjection.cs:106), yani Logo desteği bugün fiilen yoktur ve test-connection'ın yeşil dönmesi bunu maskeler. Şifre saklama zinciri sağlam (DataProtection ile PasswordEncrypted, UpsertErpSettingsCommandHandler.cs:44,82) ama SyncErpItemsCommandHandler.cs:71-77 düz şifreyi JSON string'e koyup fetcher'a taşıyor. Fetcher'da üç tehlikeli fallback var: credentials JSON parse edilemezse apiEndpoint olduğu gibi connection string sayılıyor (:110-113 catch yutması), kullanıcı adı yoksa 'sa' (:104), veritabanı yoksa 'DIVIZYON' (:103). Tüm bağlantılarda TrustServerCertificate=true sabit — trafik şifreli ama sertifika doğrulanmıyor (MITM'e açık). Bu mimari, CargoPilot backend'inin müşterinin üretim MSSQL 1433 portuna ağ erişimini (VPN/port yönlendirme) varsayar; bu ön koşul ve salt-okunur DB hesabı zorunluluğu hiçbir dokümanda yazılı değildir. ERP-17 provider-aware fetcher'ı kısmen planlıyor; ERP-21/22/23 bu katmanın üzerine şema doğrulaması, TLS yapılandırması, tipli credential taşıma ve ADR/doküman işlerini ekliyor.

## 8. Satır Düşürme Muhasebesi — hangi satırlar nerede düşüyor, "atlanan var mı" kontrolü

ERP kaynağından DraftItem'a giden yolda 8 düşürme/dönüşüm noktası tespit edildi, tamamı sayaçsız: D1) SATISKILIT != 'E' SQL'de eler (SqlServerErpProductFetcher.cs:23); D2-D4) EN/BOY/GENISLIK NULL veya <=0 tek WHERE bloğunda elenir, hangi nedenin kaç satır elediği ayrıştırılamaz (:24-26); D5) categoryFilter SQL'e eklenir (:29-30); D6) warehouseFilter kod içinde sayaçsız 'continue' ile satır atlar (:55-56); D7) ağırlık null→0 sessiz dönüşümü (:47); D8) ad null→stok kodu fallback (:46). Handler'da ek eleme yoktur (SyncErpItemsCommandHandler.cs:93-142) ama skipped değişkeni tanımlanıp hiç artırılmadan hep 0 döner (:91,:150), SyncLog yalnızca yazılanı sayar (Complete(added+updated), :145) ve backend'de TBLSTSABIT üzerinde tek bir COUNT sorgusu bile yoktur — yani kayıp = kaynakToplam − (added+updated+skipped) denkleminin sol tarafı hiçbir katmanda mevcut değildir; frontend de bu yüzden skipped'i bilerek gizler (useERPIntegration.ts:323-327). Ek muhasebe hatası: aynı batch'te tekrarlanan STOK_KODU, GetByErpIdAsync henüz kaydedilmemiş entity'yi göremediği için iki kez 'added' sayılır. Tasarım: (1) ERP-24 — IErpProductFetcher kontratı ErpFetchResult'a genişler (Products + aynı sorguda CASE-sayımlı SourceTotalCount + neden bazlı DroppedAtSource), SyncLog'a SourceTotal/FetchedCount/DroppedByReasonJson kolonları eklenir ve handler sonunda mutabakat invariantı (SourceTotal == added+updated+skipped+ΣDropped, fark 'unaccounted' olarak kaydedilir) kurulur; (2) ERP-25 — tüm eleme kararları DropReason enum'lu tek RowScreeningPolicy'de toplanır, warehouseFilter elemesi sayılır (ERP-17 bunu SQL'e taşısa da saymaz — düzeltilmiş bulgu) ve batch-içi duplicate HashSet ile yakalanır; (3) ERP-26 — UI 'ERP'de X satır bulundu — Y eklendi, U güncellendi, Z atlandı' toast'ı ve ERPSyncHistory'de neden kırılımı gösterir. Böylece 'hiç satır atlandı mı' sorusu her sync'te sayısal ve nedenli olarak cevaplanabilir hale gelir; ERP-08 (satır izolasyonu) ve ERP-09 (eksik-alan bildirimi) bu üç task'ın ön koşuludur, çakışma yoktur.

## 9. Ek Tur Yönetici Özeti

Bu tur, onaylı ERP-GELISTIRME-PLANI.md'nin (ERP-01..20) üzerine dört alanda (bağlantı mimarisi, satır muhasebesi, ERP yönetimi UX'i, ayarlar UX'i + UI teknik test) doğrulanmış bulguları ekliyor. En kritik yeni tespit: Logo/Netsis 'bağlantısı' hiçbir API kullanmıyor — iki connector da müşterinin MSSQL'ine doğrudan SqlConnection açan birebir aynı kod ve asıl veri çeken fetcher provider'dan bağımsız olarak her zaman Netsis şemasını (TBLSTSABIT) sorguluyor; yani Logo desteği bugün fiilen yok, test-connection ise bu körlüğü yeşil sonuçla maskeliyor. İkinci kritik grup satır muhasebesi: ERP'den DraftItem'a giden yolda 8 ayrı düşürme/dönüşüm noktası var, hiçbiri sayılmıyor ve kaynak-toplam (WHERE'siz COUNT) hiçbir katmanda ölçülmediği için sistem 'hiç satır atlandı mı' sorusuna yapısal olarak cevap veremiyor; skipped değişkeni her zaman 0 dönüyor ve frontend bu 0'ı yanıltıcı olduğu için bilerek gizliyor. ERP-08/09 handler-içi hataları ve eksik-ölçü elemesini kapatıyor ama kaynak-toplam baz çizgisi, warehouseFilter sayımı, batch-içi duplicate ErpId ve mutabakat invariantı planın dışında kalıyordu — bunlar ERP-24/25/26 olarak ekleniyor. UI teknik testte mekanik kapılar temiz (tsc 0 hata, eslint 0, 107 vitest yeşil, build başarılı) ancak canlı aktarım yolunda kanonik mapper'ın tersini yapan kopya bir kategori dönüşümü bulundu: Package(0) ürün 'koli', Box(2) ürün 'varil' tipiyle aktarılıyor — doğru dönüşümü kullanan tek bileşen ise ölü ERPPage zincirinde; bu ERP-27 olarak P0 önceliğinde. UX tarafında ekran teknik olmayan operasyon personası için kendini anlatmıyor: boş durumda çıkış yok, aynı akış beş farklı adla ('Sync/Senkronize/Aktar/Onayla/İçe Aktar') anlatılıyor, zorunlu Yük Grubu her taslakta boş gelip satır satır elle doldurma cezası üretiyor, reddetme teyitsiz ve reddedilenler arayüzden kayboluyor. Ayarlar yüzeyinde 'Şirket Kodu' etiketi gerçekte SQL veritabanı adı (InitialCatalog) olarak kullanılıyor, test-connection ham İngilizce SqlException basıyor, test etmeden kayda izin var ve 'Bağlı' rozeti yalnızca kayıt varlığını gösteriyor; sync panelindeki filtreler hiçbir isteğe gitmiyor, kayıtlı sıklık bir useState init hatası yüzünden hep 'Günlük' görünüyor ve 'Sonraki senkronizasyon' tarihi çalışmayan bir zamanlayıcıyı vaat ediyor. Güvenlik/operasyon katmanında TrustServerCertificate=true sabit (MITM riski), sa/DIVIZYON fallback'leri ve salt-okunur hesap garantisinin yokluğu doğrudan-DB mimarisinin yazılı olmayan ön koşullarıyla birleşiyor; ERP-18 (geri yazım) başlamadan 'doğrudan tabloya mı, resmi API ile mi' ADR kararı ön koşul yapılmalı. Yeni 17 task (ERP-21..ERP-37) mevcut plana bağımlılık vererek ekleniyor; hiçbiri ERP-01..20 ile çakışmıyor, 'yanlış' hükümlü bulgu yok, tek 'kısmen doğru' bulgu (warehouseFilter'ın ERP-17'de SQL'e taşınması ama sayılmaması) düzeltilmiş haliyle ERP-25'e işlendi. Canlı tarayıcı doğrulaması bu ortamda yapılamayan altı senaryo ERP-03'ün kabul kriterlerine ek olarak listelendi.

## 10. Doğrulama Düzeltmesi

- **ERP-23: warehouseFilter elemesi ile batch-içi duplicate ErpId, onaylı ERP-08/ERP-09 kapsamının DIŞINDA kalıyor** — *kısmen doğru.* Çekirdek iddialar doğru, bir alt iddia tekzip edildi. DOĞRU olanlar: (a) ERP-08 (plan :216-234) yalnızca handler foreach'inde exception fırlatan satırları izole ediyor, ERP-09 (plan :238-256) yalnızca eksik-ölçü WHERE'ini kaldırıyor; kaynak-toplam COUNT hiçbir taskta yok. (b) Batch-içi duplicate mekanizması doğru: DraftItemRepository.cs:21-23 GetByErpIdAsync DB'ye FirstOrDefaultAsync atar — EF Core sorgusu henüz SaveChanges edilmemiş (yalnızca Added-tracked) ilk kaydı DÖNDÜRMEZ; SaveChanges tek sefer sonda (:147), dolayısıyla aynı batch'te tekrarlanan STOK_KODU iki kez Add/added++ olur (handler :95-96, :139-140). ERP-13 unique index'i (plan :334) bunu upsert hatasına çevirecek, 'duplicate' nedeni muhasebede yine görünmeyecek — öngörü tutarlı. TEKZİP edilen: 'warehouseFilter continue (D6) hiçbir taskta geçmiyor' — yanlış; ERP-17 alt görevi (plan :422) ':55-56 warehouseFilter'ı SQL parametresine taşı' diye açıkça kapsıyor. Ancak ERP-17'nin çözümü elemeyi SAYMAZ (SQL'e taşır), yani muhasebe boşluğu argümanı ayakta kalır; sadece 'hiçbir taskta yok' ifadesi hatalı.

## 11. Yeni Task Kırılımı (ERP-21..ERP-37)

| # | Task | Öncelik | Efor | Bağımlılık |
|---|---|---|---|---|
| ERP-21 | Provider-başına fetcher stratejisi + connector tekleştirme + şema doğrulaması | P0 | L (12-16 saat) | ERP-01, ERP-04, ERP-17 |
| ERP-22 | Bağlantı güvenliği: TrustServerCertificate yapılandırması + tipli credential taşıma | P1 | M (6-10 saat) | ERP-17, ERP-21 |
| ERP-23 | Bağlantı mimarisi ADR + doküman düzeltmeleri + salt-okunur hesap kontrolü | P1 | M (6-10 saat) | ERP-17, ERP-21 |
| ERP-24 | Satır muhasebesi çekirdeği: kaynak-toplam baz çizgisi + SyncLog genişletme + mutabakat invariantı | P0 | L (12-16 saat) | ERP-01, ERP-08, ERP-09, ERP-17 |
| ERP-25 | RowScreeningPolicy: neden bazlı eleme sayımı + warehouseFilter + batch-içi duplicate | P0 | M (8-12 saat) | ERP-08, ERP-09, ERP-13, ERP-24 |
| ERP-26 | Muhasebe UI: 'ERP'de X satır bulundu — Y aktarıldı, Z atlandı' gösterimi | P1 | M (6-10 saat) | ERP-02, ERP-08, ERP-24, ERP-25 |
| ERP-27 | KRİTİK düzeltme: canlı aktarım yolunda kategori/rotasyon ters eşlemesi (koli↔varil) | P0 | S (3-5 saat) | ERP-02, ERP-16 |
| ERP-28 | ERPSyncPanel durum hataları: kayıtlı sıklığın görünmemesi + çalışmayan özellik vaatleri | P1 | S (4-6 saat) | ERP-02, ERP-06, ERP-20 |
| ERP-29 | /erp rotasına rol koruması (ayarlar RBAC'i ile tutarlılık) | P1 | S (3-4 saat) | ERP-02, ERP-06 |
| ERP-30 | ERP UI teknik borç paketi: shadcn Table, erişilebilirlik, magic number, ölü sekme | P2 | M (6-10 saat) | ERP-06, ERP-08, ERP-16 |
| ERP-31 | /erp ilk-kullanım deneyimi: boş durumlar, CTA'lar ve akış köprüleri | P1 | M (6-8 saat) | ERP-02, ERP-06 |
| ERP-32 | Terminoloji ve etiket sözlüğü: tek dil + eksen başlıkları + kırılganlık sözlüğü | P1 | M (6-10 saat) | ERP-06, ERP-14, ERP-19 |
| ERP-33 | BulkImportDialog'a sütun bazlı toplu doldurma (Yük Grubu / Kırılganlık) | P1 | S (4-6 saat) | ERP-02, ERP-11, ERP-12 |
| ERP-34 | Reddetme teyidi + Reddedilenler görünürlüğünün UI katmanı | P1 | S (4-6 saat) | ERP-02, ERP-15 |
| ERP-35 | Bağlantı formu alan rehberliği: 'Şirket Kodu' düzeltmesi + IT-dostu yardım metinleri | P1 | M (5-8 saat) | ERP-02, ERP-04, ERP-17 |
| ERP-36 | Test-connection UX: sınıflandırılmış Türkçe hatalar + kaydet-öncesi test + son test durumu | P1 | M (8-12 saat) | ERP-01, ERP-05, ERP-21 |
| ERP-37 | Ayarlar riskli değişiklik korumaları: üzerine yazma onayı + dirty tracking + silme kararı | P2 | S (4-6 saat) | ERP-02, ERP-35 |

### Task Detayları

---

#### ERP-21 — Provider-başına fetcher stratejisi + connector tekleştirme + şema doğrulaması

**Öncelik:** P0 · **Efor:** L (12-16 saat) · **Bağımlılık:** ERP-01, ERP-04, ERP-17

Logo seçiliyken sync'in sessizce Netsis şeması (TBLSTSABIT) sorgulamasını engellemek ve 'bağlantı başarılı' mesajının yanlış veritabanına karşı yeşil dönmesini önlemek. LogoErpConnector/NetsisErpConnector birebir aynı kod (LogoErpConnector.cs:21-33, NetsisErpConnector.cs:21-33); tek fetcher kayıtlı (DependencyInjection.cs:106) ve FetchAsync sabit TBLSTSABIT SQL'i içeriyor (SqlServerErpProductFetcher.cs:19-27).

**Alt görevler:**
- [ ] İki connector'ın ortak SqlConnection kurulumunu tek SqlServerConnectionTester yardımcı sınıfına indir; IErpConnector provider farkını gerçek davranışa dönüştürecek şekilde korunur
- [ ] IErpProductFetcher'ı provider-başına stratejiye ayır: NetsisProductFetcher (mevcut TBLSTSABIT SQL'i taşır), Logo için fetcher gerçeklenene kadar SyncErpItemsCommandHandler'da açık Validation hatası ('Logo ürün senkronizasyonu henüz desteklenmiyor') — sessiz yanlış-şema sorgusu imkânsız hale gelir
- [ ] TestConnectionAsync'e şema doğrulaması ekle: Netsis'te TBLSTSABIT varlık kontrolü (INFORMATION_SCHEMA), Logo'da LG_ tablo deseni kontrolü; bulunamazsa 'Bağlantı açıldı ancak beklenen ERP şeması bulunamadı' uyarısı
- [ ] ERPItemsTable.tsx:534-539'daki yalnız-Logo hardcoded ikonunu provider→ikon sabit tablosuna al (Logo/Netsis, bilinmeyen sağlayıcıda metin rozeti)
- [ ] xUnit: Logo entegrasyonuyla sync → açık hata; Netsis fetcher SQL'i mevcut davranışı korur (sabitleme testi)

**Kabul kriterleri:**
- Logo entegrasyonunda sync açık ve anlaşılır hata döner; yanlış şema asla sorgulanmaz (birim testle kanıtlı)
- Test-connection, login başarılı ama şema yanlışsa artık düz 'başarılı' demiyor
- Netsis akışı davranış değişikliği olmadan yeşil (mevcut E2E smoke bozulmaz)
- Ürün satırlarında Netsis kayıtları da sağlayıcı kimliğiyle görünüyor

---

#### ERP-22 — Bağlantı güvenliği: TrustServerCertificate yapılandırması + tipli credential taşıma

**Öncelik:** P1 · **Efor:** M (6-10 saat) · **Bağımlılık:** ERP-17, ERP-21

Her yerde sabit TrustServerCertificate=true (LogoErpConnector.cs:27-28, NetsisErpConnector.cs:27-28, SqlServerErpProductFetcher.cs:106-107) MITM'e açık; ayrıca düz şifre JSON string ile katmanlar arası taşınıyor ve 'apiEndpoint' parametre adı gerçekte SQL sunucu adresi (IErpProductFetcher.cs:7, SyncErpItemsCommandHandler.cs:71-77).

**Alt görevler:**
- [ ] ErpSettings'e opsiyonel trustServerCertificate alanı (varsayılan true) + migration; connector ve fetcher değeri buradan okur
- [ ] UI: ERPConnectionForm'a 'Sunucu sertifikasını doğrulama' anahtarı + güvenlik uyarısı metni (varsayılan açık)
- [ ] IErpProductFetcher imzasını yeniden adlandır/tiple: (serverAddress, ErpCredentials record, filters) — düz şifre JSON string yerine tipli record; record'da ToString/log maskesi
- [ ] BuildConnectionString'in catch{return apiEndpoint} yutmasını (SqlServerErpProductFetcher.cs:110-113) logla+Failure'a çevir (ERP-17'nin fallback temizliğiyle aynı PR dizisi)
- [ ] xUnit: maskeli ToString, trustServerCertificate=false ile connection string doğrulaması

**Kabul kriterleri:**
- trustServerCertificate ayarı uçtan uca akıyor; false seçildiğinde sertifika doğrulaması aktif
- Şifre hiçbir log/exception mesajında düz metin görünmüyor (maskeleme testi yeşil)
- Bozuk credentials artık anlamsız SqlException değil, açık 'ERP kimlik bilgileri okunamadı' hatası üretiyor

---

#### ERP-23 — Bağlantı mimarisi ADR + doküman düzeltmeleri + salt-okunur hesap kontrolü

**Öncelik:** P1 · **Efor:** M (6-10 saat) · **Bağımlılık:** ERP-17, ERP-21

Doğrudan-DB modelinin ağ ön koşulları (backend→müşteri 1433, VPN/allowlist) ve salt-okunur DB hesabı zorunluluğu hiçbir yerde yazılı değil (docs altında 0 kayıt); data-model.md:13 'AuthCredentials IDataProtectionProvider ile şifreli' notu kodla çelişiyor (Integration.cs:15,48 düz string, kullanılmıyor); sa fallback'i tam tersini teşvik ediyor. ERP-18 (geri yazım) başlamadan yazım-yöntemi kararı alınmalı.

**Alt görevler:**
- [ ] docs/erp-integration'a 'Bağlantı Mimarisi' bölümü: doğrudan MSSQL modeli, ağ ön koşulları, önerilen SQL login şablonu (db_datareader-only)
- [ ] data-model.md AuthCredentials notunu ErpSettings.PasswordEncrypted gerçeğine göre düzelt; SyncLog.PartialFailure ve ErpUserMapping'in implement edilmemiş olduğunu işaretle
- [ ] ADR yaz: Logo REST/LogoObjects ve Netsis NetOpenX'in bilinçli ertelendiği karar kaydı + ERP-18 için 'doğrudan tabloya mı, resmi API ile mi' kararı (ERP-18 ön koşulu)
- [ ] ErpSettings kayıt/test akışına yazma-yetkisi kontrolü: HAS_PERMS_BY_NAME ile hesabın yazma izni varsa 'salt-okunur hesap önerilir' uyarısı döndür ve UI'da göster
- [ ] Integration.AuthCredentials alanının kaderini (kaldır/birleştir) ürün kararına bağla ve kararı dokümana işle

**Kabul kriterleri:**
- Kurulum dokümanı ağ ve hesap ön koşullarını içeriyor; ADR merge edildi
- Yazma yetkili hesapla test-connection'da görünür uyarı üretiliyor
- data-model.md kodla çelişmiyor
- ERP-18, ADR kararı verilmeden başlamıyor (plan bağımlılığı güncellendi)

---

#### ERP-24 — Satır muhasebesi çekirdeği: kaynak-toplam baz çizgisi + SyncLog genişletme + mutabakat invariantı

**Öncelik:** P0 · **Efor:** L (12-16 saat) · **Bağımlılık:** ERP-01, ERP-08, ERP-09, ERP-17

'Hiç satır atlandı mı' sorusu bugün cevaplanamıyor: TBLSTSABIT üzerinde hiçbir COUNT yok, erpProducts.Count bile kaydedilmiyor, skipped hep 0 (SyncErpItemsCommandHandler.cs:91,145,150), SyncLog yalnız SyncedRecordCount tutuyor (SyncLog.cs:11-14) ve FE skipped'i bilerek gizliyor (useERPIntegration.ts:323-327). kayıp = kaynakToplam − (added+updated+skipped) denkleminin sol tarafı kurulacak.

**Alt görevler:**
- [ ] IErpProductFetcher dönüşünü ErpFetchResult'a genişlet: Products + SourceTotalCount + neden bazlı DroppedAtSource sözlüğü; kaynak-toplam, snapshot tutarlılığı için ürün SELECT'iyle AYNI sorguda SUM(CASE...) kırılımıyla alınır (ayrı COUNT round-trip'i yok)
- [ ] SyncLog'a SourceTotal, FetchedCount, DroppedByReasonJson kolonları + EF migration; Complete/PartialFail imzaları yeni alanları alır
- [ ] Handler sonunda mutabakat invariantı: SourceTotal == added+updated+skipped+ΣDropped değilse fark 'unaccounted' olarak loglanır ve SyncLog'a yazılır
- [ ] SyncErpItemsResult ve GetSyncLogs DTO'suna sourceTotal/droppedByReason/unaccounted alanları; FE şeması (erpSyncSummaryResponseSchema) ERP-02 kontrat testiyle kilitlenir
- [ ] xUnit: 10 kaynak satır, 3'ü WHERE-elemeli, 7 fetch, 1 handler-hatası → SourceTotal=10, dropped=3, added+updated=6, skipped=1, unaccounted=0

**Kabul kriterleri:**
- Her sync kaydında 'ERP'de kaç satır vardı' bilgisi kalıcı olarak saklanıyor
- Mutabakat invariantı birim testle kanıtlı; fark oluşursa unaccounted alanında görünüyor
- sync-logs API yanıtı yeni alanları döndürüyor ve FE şema kontrat testi yeşil

---

#### ERP-25 — RowScreeningPolicy: neden bazlı eleme sayımı + warehouseFilter + batch-içi duplicate

**Öncelik:** P0 · **Efor:** M (8-12 saat) · **Bağımlılık:** ERP-08, ERP-09, ERP-13, ERP-24

8 düşürme noktasının (D1 SATISKILIT :23, D2-D4 EN/BOY/GENISLIK :24-26, D5 categoryFilter :29-30, D6 warehouseFilter sayaçsız continue :55-56, D7 ağırlık null→0 :47, D8 ad fallback :46 — SqlServerErpProductFetcher.cs) tamamını tek politika sınıfında nedenli saymak. Düzeltilmiş bulgu: ERP-17 warehouseFilter'ı SQL'e taşıyor ama SAYMIYOR; ayrıca aynı batch'te tekrarlanan STOK_KODU iki kez 'added' oluyor (DraftItemRepository.cs:21 kaydedilmemiş entity'yi görmez; handler :95-96,139-140).

**Alt görevler:**
- [ ] DropReason enum tanımla: SalesLocked, MissingWidth, MissingDepth, MissingHeight, ZeroOrNegativeDimension, MissingWeight, WarehouseFiltered, CategoryFiltered, DuplicateErpId
- [ ] Eleme kararlarını tek RowScreeningPolicy sınıfına topla; SQL'de kalan koşullar (D1, D5) için aynı sorgudaki CASE-sayımlarından, kodda kalanlar için politika sayaçlarından beslenir
- [ ] warehouseFilter elemesi (ERP-17 SQL'e taşısa da) droppedByReason[WarehouseFiltered] olarak sayılır
- [ ] Handler foreach'ine batch-içi HashSet<string> görülenErpId: tekrar gelen satır DuplicateErpId ile atlanır (ERP-13 unique index güvenlik ağı olarak kalır; 'duplicate' artık muhasebede görünür)
- [ ] D7/D8 dönüşümleri ErpProductDto'ya MissingFields listesi olarak taşınır (ERP-09'un 'taslak yaz + rozet göster' varsayılanıyla uyumlu; satır düşmez, bilgi kaybolmaz)
- [ ] xUnit: her DropReason için en az 1 senaryo + duplicate batch testi (aynı STOK_KODU 2 kez → 1 added, 1 DuplicateErpId)

**Kabul kriterleri:**
- Her elenen/atlanan satır bir DropReason ile sayılıyor; hiçbir eleme yolu sayaçsız değil (kod taramasıyla continue/WHERE envanteri kapalı)
- Batch-içi duplicate çift insert üretmiyor ve nedeni muhasebede görünüyor
- SATISKILIT ürün kararı 'Açık Sorular'dan karara bağlanana kadar en azından sayı olarak raporlanıyor

---

#### ERP-26 — Muhasebe UI: 'ERP'de X satır bulundu — Y aktarıldı, Z atlandı' gösterimi

**Öncelik:** P1 · **Efor:** M (6-10 saat) · **Bağımlılık:** ERP-02, ERP-08, ERP-24, ERP-25

FE bugün skipped'i bilerek gizliyor (useERPIntegration.ts:323-327 yorumu) ve ERP-08'in planladığı toast sourceTotal/neden kırılımı olmadan eksik kalacak; ERPSyncHistory'de 'kaynakta kaç satır vardı' sütunu planda yok. Kullanıcı seçimi olan filtre elemeleri 'filtrelendi', diğerleri 'atlandı' dilinde ayrışmalı (ürün kararı).

**Alt görevler:**
- [ ] erpSyncSummaryResponseSchema'ya sourceTotal ve droppedByReason (Record<string,number>) + unaccounted alanları; ERP-02 altyapısıyla şema kontrat vitest'i
- [ ] Sync toast'ını 'ERP'de X satır bulundu — Y eklendi, U güncellendi, Z atlandı' formatına çevir (ERP-08 FE alt göreviyle birleşir)
- [ ] ERPSyncHistory satır detayında neden bazlı kırılım tablosu (ör. 'Eksik ölçü: 12, Satış kilidi: 40, Depo filtresi: 210'); filtre kaynaklı elemeler 'filtrelendi' dilinde
- [ ] unaccounted > 0 ise satırda kırmızı uyarı rozeti + açıklama tooltip'i
- [ ] 'Kayıt' sütun başlığını 'İşlenen Ürün' yap; RTL testi: kırılım tablosu render

**Kabul kriterleri:**
- Kullanıcı her sync sonrası kaynak toplamını ve atlanma nedenlerini sayısal olarak görüyor
- Yanıltıcı 'skipped gizleme' yorumu ve davranışı kalktı
- E2E (ERP-03 ortamı): elemeli sahte veriyle sync → geçmişte doğru kırılım görünüyor

---

#### ERP-27 — KRİTİK düzeltme: canlı aktarım yolunda kategori/rotasyon ters eşlemesi (koli↔varil)

**Öncelik:** P0 · **Efor:** S (3-5 saat) · **Bağımlılık:** ERP-02, ERP-16

ERPItemsTable.draftItemToImportRow kanonik mapper'ın tersini yapıyor: category 0→'koli', Box(2)→'varil' (ERPItemsTable.tsx:48-52) — itemMappers.fromCategory (itemMappers.ts:150-154) 2→'koli', 0→'varil' der. Package/Box ürünleri yanlış tiple Items'a geçip 3D yerleşim ve varil çap mantığını bozuyor. Doğru mapper'ı kullanan ERPDraftItems ölü ERPPage zincirinde; içindeki yorum (ERPDraftItems.tsx:34-35) tam bu tuzağı uyarıyor.

**Alt görevler:**
- [ ] ERPItemsTable.tsx:48-88'deki inline dönüşümü sil; ERPDraftItems.tsx:33-58'deki gibi fromCategory/fromAllowedRotations (itemMappers) çağıran tek draftItemToRow yardımcısına delege et (ERP-10 factory'siyle uyumlu)
- [ ] Ölü rotasyon case 6'yı (:83-87) kaldır — backend enum 0-5 (itemMappers.ts:34-42); case 2 (AllLocked) davranışını açık hale getir
- [ ] Yanıltıcı '(cm → mm)' yorumunu kaldır (hiçbir birim dönüşümü yok)
- [ ] Vitest: dönüşüm tablosu testi — category 0/1/2/3 ve rotations 0-5 için beklenen çıktılar (önce mevcut hatayı kırmızı belgeler, düzeltmeyle yeşil)
- [ ] ERP-16 silme sırası şerhi: önce bu taşıma, sonra ERPPage/ERPDraftItems zinciri kaldırılır; useERPIntegration.ts:608'deki boş bölüm başlığı da temizlenir

**Kabul kriterleri:**
- Box(2) kategorili draft aktarımda 'koli', Package(0) 'varil' olarak görünüyor (kanonik mapper ile birebir; vitest yeşil)
- Canlı yolda itemMappers dışında kategori/rotasyon dönüşümü kalmadı (grep ile kanıtlı)
- E2E (ERP-03'e ek): Box kategorili draft'ın BulkImportDialog'da doğru tip göstermesi

---

#### ERP-28 — ERPSyncPanel durum hataları: kayıtlı sıklığın görünmemesi + çalışmayan özellik vaatleri

**Öncelik:** P1 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-02, ERP-06, ERP-20

localInterval useState(syncSettings?.syncInterval ?? Daily) ile init ediliyor (ERPSyncPanel.tsx:51-53); veri asenkron geldiğinden kayıtlı değer (örn. FourHours) RadioGroup'a hiç yansımıyor ve kullanıcı yanlışlıkla gerçek ayarını ezebiliyor. Ayrıca 'Sonraki senkronizasyon: <tarih>' (:118-128) çalışmayan zamanlayıcıyı (ERP-20 öncesi) kesin taahhüt gibi gösteriyor.

**Alt görevler:**
- [ ] localInterval'i kaldır; RadioGroup value'sunu doğrudan syncSettings.syncInterval'den türet (kaydetme sırasında optimistic update ile ['erp','sync-settings'] cache'ine yaz, isSavingSettings ile disabled) — ERPConnectionForm.tsx:59-68'deki useEffect+reset desenine tutarlı
- [ ] ERP-20 tamamlanana kadar frekans bölümü ve 'Sonraki senkronizasyon' satırını 'Yakında' rozetiyle işaretle veya gizle; UnifiedSettingsPage.tsx:92-95 sekme açıklamasını hizala
- [ ] ERP-20 sonrası: son çalıştırma sonucu (başarılı/başarısız + tarih) aynı blokta gösterilir
- [ ] RTL testi: sunucudan FourHours gelirken RadioGroup FourHours seçili render (ERP-02 altyapısı)

**Kabul kriterleri:**
- Kayıtlı sıklık her açılışta doğru seçili görünüyor (RTL ile kanıtlı)
- Zamanlayıcı çalışmıyorken kullanıcıya tarih taahhüdü gösterilmiyor
- Kullanıcının farkında olmadan ayar ezmesi mümkün değil

---

#### ERP-29 — /erp rotasına rol koruması (ayarlar RBAC'i ile tutarlılık)

**Öncelik:** P1 · **Efor:** S (3-4 saat) · **Bağımlılık:** ERP-02, ERP-06

UnifiedSettingsPage ERP sekmelerini ADMIN_ONLY_TABS + canManageCompany ile koruyor (UnifiedSettingsPage.tsx:111-117,128-135) ama /erp rotası yalnız genel ProtectedRoute arkasında (router.tsx:160,270-276); yetkisiz kullanıcı sync/onay/red aksiyonlarını görüp tetikleyebiliyor — 'kilitli özellik sessizce başarısız olmasın' ilkesine aykırı.

**Alt görevler:**
- [ ] /erp rotasını ProtectedRoute'un requiredRole/izin mekanizmasına bağla veya ERPItemsPage içinde isCompanyAdminRole kontrolüyle açıklayıcı kilit ekranı göster
- [ ] Sidebar'daki /erp linkinin aynı koşulla gizlendiğini/kilitlendiğini doğrula
- [ ] RTL: non-admin render → kilit ekranı; admin → tablo

**Kabul kriterleri:**
- Non-admin /erp'de sync/onay aksiyonlarını göremiyor; açıklayıcı kilit mesajı var
- Ayarlar ve /erp aynı yetki modelini kullanıyor
- E2E (ERP-03'e ek): non-admin doğrudan URL girişi senaryosu

---

#### ERP-30 — ERP UI teknik borç paketi: shadcn Table, erişilebilirlik, magic number, ölü sekme

**Öncelik:** P2 · **Efor:** M (6-10 saat) · **Bağımlılık:** ERP-06, ERP-08, ERP-16

Gerçek ama küçük bozuklukların tek PR paketi: ERPSyncHistory ham <table> + overflow-hidden (ERPSyncHistory.tsx:65-66, dar ekranda kırpılma) ve truncate+tooltip'siz hata mesajı (:101-103); şifre toggle ham button, aria-label yok, tabIndex=-1 (ERPConnectionForm.tsx:187-194); bağsız Label'lar (ERPSyncPanel.tsx:169,192; CreatePlanFromOrdersDialog.tsx:245); rozet hesabında magic number 2/3 ve ilk-20-kayıt sınırı (UnifiedSettingsPage.tsx:146-150); ölü 'goruntu-ayarlari' sekme kimliği (:38,:118); ölü ErpSyncLogStatus/ErpSyncEntityType tipleri (erp.ts:122-135).

**Alt görevler:**
- [ ] ERPSyncHistory'yi shadcn Table primitivlerine geçir (ERPShipmentOrders deseni), sarmalayıcı overflow-x-auto; errorMessage hücresine Tooltip/title
- [ ] Şifre toggle'ını Button variant=ghost size=icon + aria-label='Şifreyi göster/gizle' yap, tabIndex=-1 kaldır; SelectTrigger'lara id + Label htmlFor bağla
- [ ] Rozet hesabını SyncLogStatus sabitleriyle yaz; hata sayısını sync-logs yanıtına failedCount alanıyla (ERP-08 zarfına eklenir) pageSize'dan bağımsızlaştır
- [ ] 'goruntu-ayarlari' kimliğini TabId ve DIRTY_TRACKED_TABS'tan kaldır; erp.ts ölü tiplerini ERP-16 temizliğine dahil et
- [ ] Bağlantı yokken ERPSyncHistory/ERPShipmentOrders'ın yanlış 'kayıt yok' boş durumu yerine paylaşılan RequiresErpConnection sarmalayıcısı ('Önce ERP bağlantısını kaydedin' + erp-baglanti linki; doğru örnek ERPSyncPanel.tsx:72-78)

**Kabul kriterleri:**
- ERP altında ham <table> ve etiketlenmemiş ikon buton kalmadı
- Hata rozeti sayfa sınırından bağımsız doğru sayı gösteriyor
- Bağlantı yokken hiçbir sekme 'henüz kayıt yok' demiyor, yönlendirme gösteriyor
- axe-core smoke (ERP-02 üstüne) etiket ihlali raporlamıyor

---

#### ERP-31 — /erp ilk-kullanım deneyimi: boş durumlar, CTA'lar ve akış köprüleri

**Öncelik:** P1 · **Efor:** M (6-8 saat) · **Bağımlılık:** ERP-02, ERP-06

Bağlantı yokken kullanıcı yalnızca tablo içinde 'ERP bağlantısı yapılandırılmamış.' görüyor (ERPItemsTable.tsx:488-494), sync butonu açıklamasız disabled (:419) ve /erp ↔ /settings arasında hiçbir köprü yok (ERPItemsPage.tsx:8-11, router.tsx:270-277) — teknik olmayan operasyon kullanıcısı akışı ancak deneme-yanılmayla öğreniyor.

**Alt görevler:**
- [ ] Boş durumu gerçek EmptyState bileşenine çevir: ikon + 'Henüz ERP bağlantınız yok' + 3 adımlı mini akış (Bağlan → Senkronize et → Onayla) + '/settings?tab=erp-baglanti'ye 'ERP Bağlantısı Kur' primary butonu
- [ ] integrationId yokken sync butonuna Tooltip ('Önce ERP bağlantısı kurun') veya butonu gizle
- [ ] Bağlantı var + hiç taslak yok durumunda 'ERP'den Ürün Çek' CTA'sı (bugünkü kuru 'Bekleyen ERP ürünü yok.' yerine)
- [ ] ERPItemsPage başlık satırına 'Senkronizasyon Ayarları' ikincil butonu (→ /settings?tab=erp-senkronizasyon)
- [ ] Onay toast'ına 'Ürünlere git' aksiyonu (useDraftItems.ts:128,162) — onaylanan ürünlerin /products'a gittiği görünür olur
- [ ] RTL: üç boş-durum varyantı (bağlantı yok / taslak yok / hata) doğru render

**Kabul kriterleri:**
- Bağlantısız kullanıcı tek tıkla kurulum ekranına ulaşıyor
- Hiçbir buton açıklamasız disabled değil (CLAUDE.md 'kilitli özellik sessizce başarısız olmasın')
- Onay sonrası kullanıcı ürünlerin nereye gittiğini görüyor

---

#### ERP-32 — Terminoloji ve etiket sözlüğü: tek dil + eksen başlıkları + kırılganlık sözlüğü

**Öncelik:** P1 · **Efor:** M (6-10 saat) · **Bağımlılık:** ERP-06, ERP-14, ERP-19

Aynı akış beş adla anlatılıyor ('ERP ile Sync' ERPItemsTable.tsx:426, 'Şimdi Senkronize Et' ERPSyncPanel.tsx:222, 'Ürünlere Aktar' :665, 'Taslak Ürünleri Onayla' BulkImportDialog.tsx:596-606, 'İçe Aktar'); eksen başlıkları veriyle uyumsuz ('Uzunluk/Çap (X)' width gösteriyor — ERPItemsTable.tsx:467-475 vs :558-571, sahne sözleşmesi X=genişlik ile çelişir); kırılganlık diyalogda 9 seçenek, Excel'de 0-2 ve fragility String(Math.max(...ids)) hack'iyle üretiliyor (BulkImportDialog.tsx:39-49,191-195,763-767).

**Alt görevler:**
- [ ] Tek sözlük belirle ve uygula: 'ERP'den Ürün Çek' (sync), 'Bekleyen Ürünler' (taslak), 'Ürünlere Aktar' (onay); ERPItemsTable, BulkImportDialog, ERPSyncPanel, useDraftItems/useERPIntegration toast metinlerini hizala
- [ ] ERP-14 sonrası iki sync tetiğini tek isim/tek davranışa indir (hangi yüzeyin kalacağı ürün kararı)
- [ ] Eksen başlıklarını 'Genişlik (X) / Yükseklik (Y) / Derinlik (Z)' olarak ERPItemsTable, BulkImportDialog ve Excel şablonunda (downloadItemImportTemplate) hizala — ERP-19 ile birlikte
- [ ] Kırılganlık/kısıt sözlüğünü lib/config altında tek kaynağa indir; Excel şablon başlığını gerçek seçeneklerle eşitle; Math.max türetimini açık eşleme fonksiyonuyla değiştir
- [ ] 'İptal Et' → 'Seçimi Temizle' (ERPItemsTable.tsx:629-639); ufak okunabilirlik: ürün adı text-foreground, 10px başlıklar 11-12px
- [ ] Metin değişikliklerinin ekran görüntüleriyle PR notu (CLAUDE.md görsel not kuralı)

**Kabul kriterleri:**
- Sync→taslak→onay zinciri tüm yüzeylerde aynı üç terimle anlatılıyor (grep ile eski terim kalmadı)
- Bir kenar ölçüsü tüm ekranlarda ve Excel şablonunda aynı adla geçiyor
- Kırılganlık tek sözlükten besleniyor; 0-2 dışı değer üretimi kalktı

---

#### ERP-33 — BulkImportDialog'a sütun bazlı toplu doldurma (Yük Grubu / Kırılganlık)

**Öncelik:** P1 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-02, ERP-11, ERP-12

ERP taslakları her zaman incompatibleGroups: [] ile geliyor (ERPItemsTable.tsx:106) ve validateRow boş grubu hata sayıyor (BulkImportDialog.tsx:105); 200 ürün aktaran kullanıcı her satırın Yük Grubu popover'ını tek tek doldurmak zorunda — ERP-12'nin satır-izolasyonundan bağımsız bir veri girişi sürtünmesi.

**Alt görevler:**
- [ ] Yük Grubu (ve Kırılganlık) sütun başlığına 'tümüne uygula' popover'ı: seçilen değer görünen/seçili tüm satırlara yazılır, dolu satırlar için 'üzerine yaz' onayı
- [ ] 'Yük Grubu zorunlu mu, Genel varsayılanı mı' ürün kararına göre: varsayılan atanacaksa draftItemToImportRow'da ['Genel'] ver (ERP-10 ortak validasyonla çelişmemeli)
- [ ] RTL: 50 satırlık mock'ta tek işlemle tüm Yük Grupları dolar ve onay butonu aktifleşir

**Kabul kriterleri:**
- N ürünlük seçimde Yük Grubu tek işlemle doldurulabiliyor
- Toplu doldurma satır bazlı düzenlemeyi ezmiyor (dolu satır onaysız değişmiyor)
- ERP-12'nin 'Geçerli satırları aktar' akışıyla birlikte sorunsuz çalışıyor (RTL)

---

#### ERP-34 — Reddetme teyidi + Reddedilenler görünürlüğünün UI katmanı

**Öncelik:** P1 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-02, ERP-15

'Reddet' hiçbir onay diyaloğu olmadan bulkReject.mutate çağırıyor (ERPItemsTable.tsx:309-316,642-653) ve DRAFT_REJECTED sekmesi olmadığından reddedilen kayıtlar arayüzden kayboluyor (:323-328; ölü REJECTED stilleri :505,528-529) — kullanıcı için 'veri silindi' paniği. ERP-15 backend kalıcılık semantiğini ve sekmeyi getiriyor; bu task teyit/geri-al UI katmanını tamamlar.

**Alt görevler:**
- [ ] shadcn AlertDialog ile toplu red teyidi: 'N ürünü reddetmek üzeresiniz — bu ürünler Ürünler listesine aktarılmayacak' (tekil red zaten ERPDraftItems'ta teyitli — desen oradan alınır)
- [ ] ERP-15'in 'Reddedilenler' sekmesi + 'Tekrar beklemeye al' aksiyonunun UI'da görünür ve keşfedilebilir olması (sekme rozeti, satır aksiyonu)
- [ ] Red toast'ına mümkünse 'Geri Al' aksiyonu (ERP-15'in yeniden-değerlendirme ucu varsa)
- [ ] RTL: teyit reddedilirse mutation çağrılmaz; onaylanırsa çağrılır ve 'Reddedilenler'e düşer

**Kabul kriterleri:**
- Toplu red artık teyitsiz çalışmıyor (RTL kanıtı)
- Reddedilen kayıtlar UI'dan kaybolmuyor; geri alma yolu görünür
- E2E: reddet→teyit→Reddedilenler sekmesinde görünür→tekrar beklemeye al

---

#### ERP-35 — Bağlantı formu alan rehberliği: 'Şirket Kodu' düzeltmesi + IT-dostu yardım metinleri

**Öncelik:** P1 · **Efor:** M (5-8 saat) · **Bağımlılık:** ERP-02, ERP-04, ERP-17

'Şirket Kodu' etiketi (placeholder '001', ERPConnectionForm.tsx:149-151) backend'de doğrudan SQL veritabanı adı (InitialCatalog) olarak kullanılıyor (NetsisErpConnector.cs:23-24); sunucu adresi placeholder'ı named instance/port biçimlerinden bahsetmiyor (:213-215); hiçbir alanda yardım metni yok ve alanlar Logo/Netsis'e göre uyarlanmıyor — teknik olmayan kullanıcı formu fiilen dolduramıyor.

**Alt görevler:**
- [ ] 'Şirket Kodu' etiketini gerçek anlamına ('Veritabanı Adı') düzelt — ayrı 'Firma No' alanı gerekip gerekmediği ürün kararına bağlı (ERP-17/21 sözleşmesiyle birlikte)
- [ ] Her alana FormDescription yardım metni: 'IT yöneticinizden alın, örn. NETSIS2024'; sunucu adresi placeholder'ına 'SUNUCU\INSTANCE veya sunucu,1433' örneği
- [ ] systemType seçimine göre alan metin/örneklerini koşullu uyarla (Logo/Netsis)
- [ ] 'IT'nize gönderilecek bilgi listesini kopyala' yardımcısı (gereken 5 alanın adlarını panoya kopyalar)
- [ ] RTL: Logo/Netsis seçiminde metinlerin değiştiği doğrulanır

**Kabul kriterleri:**
- Etiketler backend'in gerçek kullanımıyla çelişmiyor
- Her alanın 'bu bilgiyi nereden bulacağım' cevabı ekranda
- Named instance/port örnekleri placeholder'da mevcut

---

#### ERP-36 — Test-connection UX: sınıflandırılmış Türkçe hatalar + kaydet-öncesi test + son test durumu

**Öncelik:** P1 · **Efor:** M (8-12 saat) · **Bağımlılık:** ERP-01, ERP-05, ERP-21

Connector'lar ham İngilizce SqlException.Message'ı aynen döndürüyor (NetsisErpConnector.cs:36-43, LogoErpConnector.cs:36-43; TestErpConnectionCommandHandler.cs:30-32), 'şifre yanlış' ile 'sunucuya ulaşılamadı' ayrılmıyor; test etmeden kayda izin var ve 'Bağlı' rozeti yalnızca kayıt varlığını gösteriyor (ERPConnectionForm.tsx:70-73,110-120; useERPIntegration.ts:186-199) — yanlış şifreyle kaydeden kullanıcı hem 'kaydedildi' hem 'Bağlı' görür.

**Alt görevler:**
- [ ] Connector'larda SqlException.Number sınıflandırması: 18456→'Kullanıcı adı veya şifre hatalı', 4060→'Veritabanı bulunamadı', -2/timeout→'Sunucuya ulaşılamadı — adresi/VPN bağlantınızı kontrol edin'; ham mesaj yalnız log'a
- [ ] Kaydetten önce otomatik test-connection; başarısızsa 'Yine de kaydet' onaylı ikincil yol
- [ ] Backend'e lastTestedAt/lastTestResult alanı + rozette 'Son başarılı test: <tarih>'; test hiç yoksa 'Kayıtlı (test edilmedi)' nötr durumu
- [ ] Backend test-connection'ı 'şifre gönderilmediyse kayıtlı şifreyle test et' olacak şekilde genişlet (bugünkü 'şifrenizi tekrar girin' bloğu :79-85 kalkar)
- [ ] form.watch ile herhangi bir alan değişince bayat testResult'ı temizle (:70-73,86)
- [ ] xUnit: hata sınıflandırma tablosu; RTL: alan değişiminde sonuç temizlenir

**Kabul kriterleri:**
- Üç ana hata sınıfı (kimlik/sunucu/veritabanı) ayrı Türkçe, eyleme dönük mesajla görünüyor
- Test edilmemiş/başarısız yapılandırma 'Bağlı' rozeti üretmiyor
- Kayıtlı şifreyle test mümkün; şifreyi bilmeyen kullanıcı bloklanmıyor

---

#### ERP-37 — Ayarlar riskli değişiklik korumaları: üzerine yazma onayı + dirty tracking + silme kararı

**Öncelik:** P2 · **Efor:** S (4-6 saat) · **Bağımlılık:** ERP-02, ERP-35

Mevcut bağlantının üzerine yazma onaysız (ERPConnectionForm.tsx:70-73), bağlantı silme arayüzü hiç yok ve ERP sekmeleri kaydedilmemiş-değişiklik korumasının dışında (UnifiedSettingsPage.tsx:118 DIRTY_TRACKED_TABS yalnız bolgesel-ayarlar/goruntu-ayarlari) — form yarım doldurulup sekme değişince her şey kayboluyor.

**Alt görevler:**
- [ ] existing varken sunucu adresi/sağlayıcı/veritabanı değişmişse AlertDialog: 'Mevcut ERP bağlantısının üzerine yazılacak; senkronizasyon bu yeni kaynaktan çalışacak'
- [ ] form.formState.isDirty'yi onDirtyChange ile UnifiedSettingsPage'e bağla; 'erp-baglanti'yi DIRTY_TRACKED_TABS'e ekle
- [ ] Bağlantıyı kaldırma aksiyonu için ürün kararı (backend DELETE ucu var mı doğrulanır; yoksa backend işi bu task'a eklenir) — yıkıcı stil + onay ile
- [ ] RTL: kirli formda sekme değişimi uyarı üretir; overwrite senaryosu teyit ister

**Kabul kriterleri:**
- Veri kaynağını değiştiren kayıt işlemi teyitsiz gerçekleşmiyor
- Yarım kalan form sessizce kaybolmuyor
- Silme/pasifleştirme kararı verildi ve (varsa) onaylı yıkıcı akışla uygulandı

---

## 12. Ek Karar Bekleyen Ürün Maddeleri

1. SATISKILIT='E' (satış kilitli) satırlar hiç çekilmemeli mi, yoksa 'pasif' rozetiyle taslaklarda gösterilmeli mi? (ERP-25'in D1 tasarımını belirler; ERP-09'un WHERE kaldırma gerekçesi yalnız eksik-ölçü) c: çekilmemeli
2. categoryFilter/warehouseFilter kullanıcı seçimi olduğu için elenen satırlar UI'da 'atlandı' (sorun) mu 'filtrelendi' (bilgi) olarak mı raporlanmalı? (ERP-26 metin dili) c: filtrelendi
3. ERP taslakları için 'Yük Grubu' gerçekten zorunlu iş kuralı mı, yoksa 'Genel' varsayılanı kabul edilebilir mi? (ERP-33 tasarımı; ERP-10 ortak validasyon kararıyla çelişmemeli) c: zorunlu
4. 'Şirket Kodu' alanının nihai anlamı: etiket 'Veritabanı Adı' olarak mı düzeltilecek, yoksa ayrı 'Veritabanı Adı' + 'Firma No' alanları mı açılacak? (ERP-35, ERP-17/21 ile birlikte) c: düzeltilecek
5. Doğrudan-DB yaklaşımı bilinçli ürün kararı mı, MVP kestirmesi mi — Logo için resmi REST/LogoObjects'e geçiş yol haritada var mı? ERP-18 geri yazımı doğrudan tabloya INSERT ile mi, NetOpenX/REST ile mi? (ERP-23 ADR'ı ERP-18'in ön koşulu) c: mvp kısaltmasıydı
6. CargoPilot bulut mu, müşteri on-prem mi çalışacak — müşteri MSSQL'ine ağ erişimi (VPN/agent/tünel) üretimde nasıl sağlanacak? (ERP-21/23 tasarımını belirler) c: müşteri veri tabanı zaten logo ya da netsiste bulunduğu için cargopilotta bulutta olduğu için ikiside bulut üzerinden iletişim kurulabilir.
7. Integration.AuthCredentials alanı (kullanılmıyor, şifresiz, data-model.md ile çelişiyor) kaldırılacak mı, ErpSettings ile birleştirilecek mi? c: birleştir
8. İki sync tetiği (items/sync ve sync/run-now) ERP-14 sonrası tek kullanıcı yüzeyine mi inecek — /erp'deki buton mu, settings paneli mi kalacak? (ERP-32 terminolojiyi buna göre kurar) c: erp sayfasındaki kalsın. ayarlarda önemli alanlar varsa adres gibi vs sync yaparken gereken bilgiler varsa, erp sayfasına sync butonunda popup ile çalışabiliriz.
9. ERP bağlantısını silme/pasifleştirme için backend DELETE ucu var mı; yoksa ERP-37'ye backend işi de eklenmeli mi? c: eklenmeli
10. 2FA: CLAUDE.md 'ERP ayarları 2FA varsayımına uymalı' der; backend gerçekten enforce ediyor mu, UI'da nasıl yüzeye çıkacak? (doğrulanmalı) c: bilmiyorum tartışırız.ab
11. ERP-03 kabul kriterlerine EK canlı-E2E senaryoları (bu turda tarayıcı doğrulaması yapılamadı): (1) /erp 'ERP ile Sync' butonunun gerçek MSSQL olmadan verdiği hata ve toast metni; (2) run-now 500/NotImplemented akışının kullanıcıya yansıması; (3) Box(2) kategorili draft'ın aktarımda 'varil' görünmesi (ERP-27 öncesi kırmızı kanıt); (4) sunucuda FourHours kayıtlıyken senkronizasyon sekmesinin 'Günlük' göstermesi (ERP-28 öncesi); (5) erp-sevkiyatlar/erp-gecmis sekme rozetlerinin bağlantı yokken ve hata durumundaki davranışı; (6) non-admin kullanıcının /erp URL'ine doğrudan girişi (ERP-29 öncesi)
12. Build'deki >500kB chunk uyarıları (react-pdf 1.4MB) ERP kapsamı dışı — ayrı performans backlog maddesi olarak değerlendirilmeli

---

## 13. Ek Tur Bulgu Envanteri

Toplam 44 bulgu: 4 kritik, 18 yüksek, 18 orta, 4 düşük.

### 13.1 Bağlantı Mekanizması (Logo/Netsis)

KESİN CEVAP: Logo ve Netsis bağlantısı API ile YAPILMIYOR — her iki 'connector' da Microsoft.Data.SqlClient ile müşterinin MSSQL veritabanına DOĞRUDAN SqlConnection açıyor. LogoErpConnector.cs ve NetsisErpConnector.cs satır satır birbirinin aynısı: SqlConnectionStringBuilder ile DataSource=serverAddress, InitialCatalog=companyCode, TrustServerCertificate=true, Encrypt=true, ConnectTimeout=10 kurup conn.OpenAsync ile sadece bağlantı testi yapıyorlar; Logo'ya özgü hiçbir şey (REST API, LogoObjects) yok. Asıl veri çekimi SqlServerErpProductFetcher'da: 'apiEndpoint' adlı parametre aslında SQL sunucu adresi (hatta credentials JSON parse edilemezse apiEndpoint doğrudan connection string olarak kullanılıyor) ve TBLSTSABIT (Netsis şeması) üzerinde ham SELECT çalıştırılıyor — yani fetcher provider'dan bağımsız olarak HER ZAMAN Netsis şemasını sorguluyor; Logo seçilse bile Logo tablo şeması (LG_XXX_ITEMS) hiç yok. Şifre zinciri sağlam: UpsertErpSettingsCommandHandler kaydederken IErpPasswordProtector.Protect ile ASP.NET DataProtection ('CargoPilot.ErpSettings.Password' purpose, anahtarlar DataProtectionKeys tablosunda) kullanıyor; SyncErpItemsCommandHandler:71 Unprotect edip düz şifreyi JSON'a koyarak fetcher'a geçiriyor. Fetcher'da Database='DIVIZYON' ve UserId='sa' fallback'leri var ve fetcher tarafında ConnectTimeout hiç set edilmiyor. docs/erp-integration altındaki iki doküman (data-model.md, erp-schema-divizyon.md) da doğrudan-DB modelini anlatıyor; Logo REST/LogoObjects veya Netsis NetOpenX'ten hiçbir yerde bahis yok. Doküman-kod uyumu kısmi: Netsis şema eşlemesi ve sync SQL'i kodla uyumlu, ancak data-model.md'nin Integration.AuthCredentials'ı 'IDataProtectionProvider ile şifreli' notu kodda karşılıksız (şifre ErpSettings.PasswordEncrypted'da; Integration.AuthCredentials düz string ve sync akışında kullanılmıyor) ve SyncLog'un PartialFailure durumu ile ErpUserMapping akışı dokümante edilip implement edilmemiş. Mimari sonuç: bu model müşterinin MSSQL 1433 portuna CargoPilot backend'inden ağ erişimi (VPN/port yönlendirme/firewall istisnası) varsayar; ERP üreticilerinin resmi entegrasyon katmanlarını (Logo REST API/LogoObjects, Netsis NetOpenX) bypass ettiği için şema değişikliklerine, lisans/destek koşullarına ve yazılabilir DB kullanıcısı verilmesi riskine açıktır. Bu bulgular ERP-17 (provider-aware fetcher + bağlantı sertleştirme) ile kısmen planlıdır; aşağıdaki ERP-21+ bulguları planın üzerine yeni katmanlar ekler.

<details>
<summary>🔴 Kritik — SqlServerErpProductFetcher provider-körü: Logo seçilse bile HER ZAMAN Netsis şeması (TBLSTSABIT) sorgulanıyor</summary>

DI'da tek fetcher kayıtlı (IErpProductFetcher → SqlServerErpProductFetcher) ve FetchAsync sabit olarak Netsis tablosu TBLSTSABIT'ten SELECT çeker (STOK_KODU, EN, BOY, GENISLIK...). Logo'nun tablo düzeni (LG_FFF_ITEMS vb.) hiçbir yerde yok. ErpSettings'te sağlayıcı Logo seçilmiş bir müşteride sync ya SqlException'la patlar ya da yanlış tablodan veri çeker. Bu, ERP-17'de 'provider-aware fetcher' olarak planlı; buradaki ek bulgu, TestConnection'ın da bu körlüğü maskelemesidir (Logo DB'sine login başarılıysa test yeşil, ama sync garantili kırık).

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:19-27 (sabit TBLSTSABIT SQL), DependencyInjection.cs:106 (tek fetcher kaydı), erp-schema-divizyon.md:11-13 ('Cargo Pilot Item sync kaynağı: TBLSTSABIT')

**Önerilen iş:** ERP-21: Provider başına IErpProductFetcher stratejisi (NetsisProductFetcher mevcut SQL ile, LogoProductFetcher ayrı task) + Logo seçiliyken sync'in 'desteklenmiyor' yerine sessizce Netsis SQL'i çalıştırmasının engellenmesi; TestConnection'a şema doğrulaması eklenmesi. ERP-17 ile birleştirilebilir ama kabul kriterine 'Logo entegrasyonunda sync açık hata döner, yanlış şema sorgulanmaz' maddesi eklenmeli.

</details>

<details>
<summary>🟠 Yüksek — Logo ve Netsis 'connector'ları API değil, doğrudan MSSQL SqlConnection — ve bayt bayt aynı kod</summary>

LogoErpConnector ve NetsisErpConnector yalnızca TestConnectionAsync içerir; ikisi de SqlConnectionStringBuilder (DataSource=serverAddress, InitialCatalog=companyCode, UserID/Password, TrustServerCertificate=true, Encrypt=true, ConnectTimeout=10) kurup SqlConnection.OpenAsync çağırır. Provider'a özgü tek satır yoktur — sınıflar sadece ProviderType özelliğiyle ayrışır. Yani 'Logo bağlantısı' fiilen 'Logo'nun MSSQL'ine login denemesi'dir; Logo REST API, LogoObjects, Netsis NetOpenX gibi resmi API katmanları kullanılmaz. TestErpConnectionCommandHandler.cs:18 connector'ı ProviderType eşleşmesiyle seçer, ancak seçim sonucu davranış değişmez.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/ErpConnectors/LogoErpConnector.cs:21-33, NetsisErpConnector.cs:21-33 (birebir aynı gövde), TestErpConnectionCommandHandler.cs:18-28, DependencyInjection.cs:113-114

**Önerilen iş:** ERP-17'nin kapsamına not düşülmeli: iki connector tek bir SqlServerConnectionTester'a indirgenip provider farkı (ileride Logo REST/NetOpenX adaptörleri) IErpConnector arayüzünde gerçek davranış farkına dönüştürülmeli; en azından LogoErpConnector'a Logo şema/DB doğrulaması (örn. LG_ tablo varlık kontrolü) eklenmeli ki 'bağlantı başarılı' mesajı yanlış DB'ye karşı yeşil dönmesin.

</details>

<details>
<summary>🟠 Yüksek — BuildConnectionString'in üç tehlikeli fallback'i: apiEndpoint'i ham connection string sayma, sa kullanıcısı ve DIVIZYON DB varsayılanı, yutulan exception</summary>

SqlServerErpProductFetcher.BuildConnectionString: (1) authCredentialsJson null ise veya JSON parse hatasında catch bloğu apiEndpoint'i OLDUĞU GİBİ connection string olarak döndürür — sunucu adresi alanına yazılmış bir değer ('192.168.1.10') geçersiz connection string olarak anlamsız SqlException üretir, hata gerçek nedeni (bozuk credentials JSON) gizler; (2) creds.UserId null ise 'sa' — sistem yöneticisi hesabı — varsayılan alınır; (3) creds.Database null ise 'DIVIZYON' — bir demo/geliştirme DB adı — varsayılır. Ayrıca connector'lardaki ConnectTimeout=10 burada yok; MSSQL varsayılanı 15sn ama komut timeout'u da set edilmediğinden büyük tabloda sync uzun süre asılı kalabilir. Bu, plandaki ERP-17'nin 'sa/DIVIZYON fallback, timeout' maddesiyle örtüşür; ek kanıt ve catch-yutma detayı yeni.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:90-114 (özellikle :92-93 null→apiEndpoint, :103 'DIVIZYON', :104 'sa', :110-113 catch{return apiEndpoint})

**Önerilen iş:** ERP-17 alt görevi olarak netleştir: fallback'ler kaldırılıp eksik credential açık Validation hatası dönmeli ('ERP kullanıcı adı/veritabanı tanımsız'), catch bloğu loglayıp Failure üretmeli, fetcher connection string'ine ConnectTimeout ve SqlCommand.CommandTimeout eklenmeli.

</details>

<details>
<summary>🟠 Yüksek — Doğrudan-DB mimarisinin operasyonel riskleri: ağ varsayımı, salt-okunurluk garantisi yok, şema kırılganlığı</summary>

Mevcut model müşterinin üretim ERP MSSQL'ine CargoPilot backend'inin (bulutta veya müşteri dışında koşuyorsa) TCP erişimini varsayar — VPN, port yönlendirme veya firewall istisnası gerekir; kodda/dokümanda bu ön koşul hiçbir yerde yazılı değildir ve UI 'sunucu adresi' alanından öteye yönlendirme yapmaz. Kullanılan SQL hesabının salt-okunur olması hiçbir katmanda zorlanmaz (sa fallback'i tam tersini teşvik eder); ERP-18 planlandığında (plan→ERP geri yazımı) aynı bağlantı YAZMA için de kullanılacak ve risk büyüyecek. Netsis şeması sürüme göre değişebilir (TBLSTSABIT kolonları); resmi API yerine ham tablo okuma, ERP güncellemelerinde sessiz kırılma ve ERP üreticisinin lisans/destek şartlarıyla çatışma riski taşır. Bu riskler plandaki ERP-17'nin kapsamı dışında kalan ürün/operasyon kararlarıdır.

**Kanıt:** SqlServerErpProductFetcher.cs:34-35 (doğrudan SqlConnection.Open), erp-schema-divizyon.md:3-5 (tek sürümlük şema anlık görüntüsü), docs klasöründe ağ/VPN/salt-okunur kullanıcı gereksinimine dair 0 kayıt

**Önerilen iş:** ERP-25: (a) ErpSettings kayıt/test akışına 'kullanıcının yazma yetkisi var mı' kontrolü ekle (IS_MEMBER/HAS_PERMS_BY_NAME sorgusu ile uyarı: salt-okunur hesap önerilir); (b) kurulum dokümanına ağ ön koşulları ve önerilen SQL login şablonu (db_datareader-only) ekle; (c) ERP-18 başlamadan 'geri yazım doğrudan tabloya mı, resmi API ile mi' ADR kararı alınmalı — bu karar ERP-18'in ön koşulu yapılmalı.

</details>

<details>
<summary>🟡 Orta — TrustServerCertificate=true her yerde sabit: şifreli ama doğrulanmayan TLS (MITM'e açık)</summary>

Hem iki connector hem fetcher Encrypt=true + TrustServerCertificate=true kullanıyor. Bu kombinasyon trafiği şifreler ama sunucu sertifikasını DOĞRULAMAZ; müşteri DB'sine internet/VPN üzerinden gidildiği senaryoda araya giren (MITM) saldırgan sahte sertifikayla sa parolası dahil tüm trafiği okuyabilir. Müşteri ortamlarında self-signed sertifika yaygın olduğundan pragmatik bir seçim, ancak ayar başına (integration bazında) yapılandırılabilir olmalı ve varsayılanın 'true' olduğu dokümante edilmeli.

**Kanıt:** LogoErpConnector.cs:27-28, NetsisErpConnector.cs:27-28, SqlServerErpProductFetcher.cs:106-107

**Önerilen iş:** ERP-22: ErpSettings'e opsiyonel 'trustServerCertificate' alanı (varsayılan true, UI'da 'Sunucu sertifikasını doğrulama' anahtarı + güvenlik uyarısı) ekle; connector ve fetcher bu değeri ErpSettings'ten okusun. ERP-17'nin bağlantı sertleştirme kapsamına alt madde olarak eklenebilir.

</details>

<details>
<summary>🟡 Orta — Şifre saklama zinciri sağlam ancak düz şifre JSON'la katmanlar arası taşınıyor</summary>

Kayıt: UpsertErpSettingsCommandHandler:44,82 → IErpPasswordProtector.Protect → DataProtectionErpPasswordProtector ('CargoPilot.ErpSettings.Password' purpose'lı IDataProtector) → ErpSettings.PasswordEncrypted; anahtarlar PersistKeysToDbContext ile DataProtectionKeys tablosunda (AddDataProtectionKeys migration). Çözme: SyncErpItemsCommandHandler:71 Unprotect eder, sonra :72-77 düz şifreyi Database/UserId/Password alanlı bir JSON string'e serialize edip FetchAsync'e 'authCredentialsJson' olarak verir. Düz şifre bellekte string olarak dolaşır ve bu JSON yanlışlıkla loglanırsa/exception mesajına girerse sızar; ayrıca 'apiEndpoint' parametre adı gerçekte SQL server adresi olduğundan arayüz sözleşmesi yanıltıcıdır (IErpProductFetcher.FetchAsync(apiEndpoint,...)).

**Kanıt:** UpsertErpSettingsCommandHandler.cs:44,82; DataProtectionErpPasswordProtector.cs:12,17; DependencyInjection.cs:107-109; SyncErpItemsCommandHandler.cs:71-77; IErpProductFetcher.cs:7

**Önerilen iş:** ERP-23: IErpProductFetcher imzasını (serverAddress, ErpCredentials record, filters) olarak yeniden adlandır/tiple — düz şifreyi JSON string yerine tipli record ile taşı, ToString/log güvenliği için record'da şifre alanını maskele. ERP-17 refaktörüyle aynı PR'da yapılabilir.

</details>

<details>
<summary>🟡 Orta — docs/erp-integration dokümantasyonu ile kod kısmi uyumlu; resmi Logo/Netsis API'lerinden hiç bahsedilmiyor</summary>

İki doküman var: data-model.md ve erp-schema-divizyon.md. Uyumlu kısımlar: doğrudan-DB modeli (erp-schema-divizyon.md restore edilmiş DIVIZYON.bak Netsis şemasını ve sync SQL'ini anlatır, SqlServerErpProductFetcher'daki sorgu bunun genişletilmiş hali — kod ayrıca EN/BOY/GENISLIK NOT NULL filtresi ekler ki bu da plandaki ERP-09 'sessiz eleme' bulgusunun kaynağıdır), cm birim sözleşmesi ve EN→Width/BOY→Depth/GENISLIK→Height eşlemesi kodla aynıdır. Uyumsuz kısımlar: (1) data-model.md:13 'AuthCredentials JSON — IDataProtectionProvider ile şifreli' der; kodda Integration.AuthCredentials düz string'dir, hiçbir protector'dan geçmez ve sync akışında hiç okunmaz — şifre gerçekte ErpSettings.PasswordEncrypted'dadır; (2) data-model.md:25 SyncLog.Status'ta PartialFailure tanımlar, plandaki bulguya göre PartialFail hiç çağrılmaz; (3) ErpUserMapping ve sipariş (TBLSIPAMAS/TBLSIPATRA) sync'i detaylı dokümante edilmiş ama backend'de sipariş çekme kodu yoktur (plan bunu 'endpoint'i olmayan 6 rota ailesi' içinde doğruladı). Logo REST API, LogoObjects, NetOpenX hiçbir dokümanda geçmez — doğrudan-DB tercihi bilinçli mi, geçici mi olduğu yazılı değildir.

**Kanıt:** apps/backend/docs/erp-integration/data-model.md:13,25,29-39; erp-schema-divizyon.md:163-169 (sync SQL) vs SqlServerErpProductFetcher.cs:19-27; Integration.cs:15,48 (AuthCredentials düz, protector yok); grep 'NetOpenX|LogoObjects|REST' docs altında 0 sonuç (yalnız user-story-tracker.md'de alakasız 'API' geçiyor)

**Önerilen iş:** ERP-24: docs/erp-integration'a 'Bağlantı Mimarisi' bölümü ekle: (a) mevcut yöntemin doğrudan MSSQL olduğu, ağ ön koşulları (backend→müşteri 1433, VPN/allowlist), salt-okunur DB kullanıcısı zorunluluğu; (b) data-model.md'deki AuthCredentials notunun ErpSettings.PasswordEncrypted gerçeğine göre düzeltilmesi; (c) Logo/Netsis resmi API alternatiflerinin (Logo REST/LogoObjects, Netsis NetOpenX) bilinçli olarak ertelendiğinin karar kaydı (ADR) olarak yazılması.

</details>

**Açık sorular:** Doğrudan-DB yaklaşımı bilinçli bir ürün kararı mı, MVP kestirmesi mi? Logo tarafı için resmi REST API/LogoObjects'e geçiş yol haritada var mı? (Kodda Logo şeması hiç olmadığı için Logo desteği bugün fiilen yok.) · Müşteri MSSQL'ine ağ erişimi üretimde nasıl sağlanacak — CargoPilot bulut mu, müşteri on-prem mi kurulacak? (VPN/agent/reverse-tunnel kararı ERP-17 ve ERP-25'in tasarımını belirler.) · Integration.AuthCredentials alanı (kullanılmıyor, şifresiz) kaldırılacak mı yoksa ErpSettings ile birleştirilecek mi? data-model.md'deki tanımla çelişiyor. · ERP-18 (plan→ERP geri yazımı) doğrudan Netsis tablolarına INSERT ile mi yoksa NetOpenX/REST ile mi yapılacak? Yazma yetkili DB hesabı istemek müşteri güvenlik politikalarına takılabilir.

### 13.2 Satır Düşürme Muhasebesi

Satır muhasebesi uçtan uca çıkarıldı: ERP kaynağından DraftItem tablosuna giden yolda 8 ayrı düşürme/dönüşüm noktası var ve bunların HİÇBİRİ sayılmıyor. SqlServerErpProductFetcher SQL'i dört WHERE koşuluyla (SATISKILIT, EN, BOY, GENISLIK) satırları kaynakta eler; kod tarafında warehouseFilter sayaçsız bir `continue` ile satır atlar; ağırlık null→0 ve ad null→stok kodu dönüşümleri sessizdir. ERP'deki toplam aday satır sayısı (WHERE'siz COUNT) hiçbir yerde ölçülmüyor — backend'de TBLSTSABIT üzerinde tek bir COUNT sorgusu bile yok. Handler'da fetch edilen liste sayısı (erpProducts.Count) dahi persist edilmiyor; SyncLog.Complete(added+updated) yalnızca yazılanı sayar, skipped değişkeni tanımlanıp hiç artırılmadan 0 olarak döner ve frontend bu 0'ı yanıltıcı olduğu için bilerek göstermiyor (koddaki yorum bunu itiraf ediyor). Dolayısıyla 'hiç satır atlandı mı' sorusuna sistemin bugün cevap VEREMEDİĞİ kanıtlıdır: kayıp = kaynakToplam − (added+updated) formülünün sol tarafı hiçbir katmanda mevcut değil. Onaylı plandaki ERP-08 handler-içi hataları, ERP-09 eksik-ölçü elemesini kapatıyor; ancak ikisi de kaynak-toplam baz çizgisi, warehouseFilter elemesi, batch-içi duplicate ErpId ve mutabakat invariantı (kaynakToplam == added+updated+skipped+ΣdroppedNeden) içermiyor. Bu boşluklar ERP-21..ERP-23 olarak tamamlayıcı tasarımla önerildi: aynı bağlantıda WHERE'siz toplam + neden bazlı eleme sayımı, SyncLog'a FetchedTotal/SourceTotal/DroppedByReasonJson alanları ve UI'da 'ERP'de X satır var, Y aktarıldı, Z şu nedenlerle atlandı' gösterimi.

<details>
<summary>🔴 Kritik — ERP-21: 'Hiç satır atlandı mı' sorusuna sistem cevap veremiyor — kaynak-toplam baz çizgisi hiçbir katmanda yok (KANIT)</summary>

Muhasebe denklemi kaynakToplam − (added+updated+skipped) = kayıp şeklinde kurulmalı; ama sol taraf hiçbir yerde ölçülmüyor. (1) WHERE'siz COUNT: backend genelinde TBLSTSABIT üzerinde hiçbir COUNT sorgusu yok (grep ile doğrulandı; tek COUNT kullanımları sayfalama TotalCount'ları). (2) Fetch sonrası liste sayısı bile kaydedilmiyor: handler erpProducts.Count'u ne loglar ne SyncLog'a yazar. (3) skipped değişkeni satır 91'de tanımlanır, döngüde HİÇ artırılmaz, satır 150'de hep 0 döner. (4) SyncLog.Complete(added+updated) yalnızca yazılan kayıt sayısını saklar (SyncedRecordCount); fetched/eligible/dropped alanı entity'de yok. (5) Frontend bu durumu biliyor ve gizliyor: useERPIntegration.ts'te "Atlanan sayısı backend akışında hiç üretilmiyor; gösterilmesi yanıltıcı olur" yorumu ile toast yalnızca added/updated gösteriyor. Sonuç: ERP'de 10.000 satır varken 3.000 taslak oluşsa sistemin hiçbir katmanı 7.000 satırın varlığını dahi bilmez.

**Kanıt:** apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:91 (int added=0, updated=0, skipped=0), :145 (syncLog.Complete(added+updated)), :150 (skipped hep 0 döner); apps/backend/CargoPilot.Domain/Entities/SyncLog.cs:11-14 (yalnız SyncedRecordCount/Rule* alanları); apps/frontend/src/lib/api/useERPIntegration.ts:323-327 (yorum + toast'ta skipped gizli); grep 'COUNT' apps/backend → TBLSTSABIT için sonuç yok

**Önerilen iş:** ERP-21 (bağımlılık: ERP-08): IErpProductFetcher kontratını ErpFetchResult'a genişlet: Products + SourceTotalCount (aynı bağlantıda WHERE'siz COUNT) + neden bazlı DroppedAtSource sözlüğü. SyncLog'a SourceTotal, FetchedCount, DroppedByReasonJson kolonları + EF migration. Handler sonunda mutabakat invariantı: SourceTotal == added+updated+skipped+ΣDropped değilse fark 'unaccounted' olarak loglanır ve SyncLog'a yazılır. SyncErpItemsResult ile GetSyncLogs DTO'suna sourceTotal/droppedByReason alanları eklenir.

</details>

<details>
<summary>🟠 Yüksek — ERP-22: Düşürme noktalarının tam envanteri — 8 nokta, tamamı sayaçsız ve nedensiz</summary>

Sıra numarasıyla uçtan uca eleme/dönüşüm haritası: D1) SATISKILIT != 'E' — satış-kilitli/pasif kayıt SQL'de elenir (satır 23). D2) EN IS NULL OR EN <= 0 (satır 24), D3) BOY (satır 25), D4) GENISLIK (satır 26) — NULL, sıfır VE negatif ölçüler tek koşulda elenir; hangi nedenin kaç satır elediği ayrıştırılamaz. D5) categoryFilter → SQL AND GRUP_KODU=@p (satır 29-30) — kullanıcı seçimi ama elenen sayı yine bilinmez. D6) warehouseFilter → kod içinde sayaçsız 'continue' (satır 55-56): satır fetch edilmiş, ağ trafiği harcanmış, sonra izsiz çöpe gidiyor; skipped++ bile yok. D7) BIRIM_AGIRLIK null → 0m sessiz dönüşümü (satır 47): satır düşmez ama 'ağırlık bilinmiyor' bilgisi kaybolur, 0 kg ürün oluşur. D8) STOK_ADI null → stokKodu fallback (satır 46): adsız kayıt bilgisi kaybolur. Handler tarafında ek eleme YOK (foreach her ürünü yazar, satır 93-142) ve SyncErpItemsCommandValidator yalnızca komut parametrelerini doğrular (IntegrationId boş mu, filtre uzunluğu ≤200) — satır bazlı kural içermez. Yani bugünkü tek eleme katmanı fetcher'dır ve tamamı görünmezdir.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:23 (SATISKILIT), :24-26 (EN/BOY/GENISLIK NULL veya <=0), :29-30 (categoryFilter), :46 (ad fallback), :47 (weight null→0), :55-56 (warehouseFilter continue, sayaçsız); SyncErpItemsCommandHandler.cs:93-142 (handler'da eleme yok); SyncErpItemsCommandValidator.cs:9-18 (yalnız komut düzeyi doğrulama)

**Önerilen iş:** ERP-22 (ERP-09 ile birlikte uygulanır, onu genişletir): ERP-09'un 'WHERE'i kaldır' alt görevi D2-D4'ü koda taşırken, eleme kararını tek bir RowScreeningPolicy sınıfına topla: her satır için DropReason enum (SalesLocked, MissingWidth, MissingDepth, MissingHeight, ZeroOrNegativeDimension, MissingWeight, WarehouseFiltered, CategoryFiltered, DuplicateErpId) üret. D1 (SATISKILIT) için ürün kararı alınana kadar SQL'de bırakılacaksa aynı sorguya 'SELECT SUM(CASE WHEN SATISKILIT='E' THEN 1 ...)' kırılım sayımı ekle. D6'daki warehouseFilter continue'su droppedByReason[WarehouseFiltered]++ ile sayılır. D7/D8 dönüşümleri ErpProductDto'ya MissingFields listesi olarak taşınır (ERP-09 varsayılan kararıyla uyumlu: taslak yazılır, rozetle gösterilir).

</details>

<details>
<summary>🟠 Yüksek — ERP-23: warehouseFilter elemesi ile batch-içi duplicate ErpId, onaylı ERP-08/ERP-09 kapsamının DIŞINDA kalıyor (tamamlayıcı boşluk)</summary>

Plan okundu; çakışma değil tamamlayıcılık analizi: ERP-08 yalnızca handler foreach'inde EXCEPTION fırlatan satırları izole edip skipped++ yapacak (plan satır 216-236) — fetcher'da hiç gelmeyen satırlara dokunmaz. ERP-09 yalnızca eksik-ölçü WHERE'ini (D2-D4) kaldırıp MissingFields taşıyacak (plan satır 238-258) — SATISKILIT (D1) ürün kararı olarak açık değil, warehouseFilter continue (D6) hiçbir taskta geçmiyor, kaynak-toplam COUNT hiçbir taskta yok. Ek muhasebe hatası: aynı fetch batch'inde aynı STOK_KODU iki kez gelirse GetByErpIdAsync DB'ye sorgu atar (DraftItemRepository.cs:21) ve henüz SaveChanges edilmemiş ilk kaydı GÖREMEZ → iki satır da 'added' sayılır ve iki DraftItem insert edilir; ERP-13 unique index ekleyerek bunu hataya çevirecek ama o noktada ikinci satır ERP-08'in genel hata yoluna düşer ve 'duplicate' nedeni muhasebede görünmez. Bu üç boşluk kapatılmadan 'ERP'de X vardı, Y aktarıldı, Z atlandı' cümlesi kurulamaz.

**Kanıt:** ERP-GELISTIRME-PLANI.md:216-258 (ERP-08/09 alt görevleri — COUNT, warehouseFilter, duplicate yok); SqlServerErpProductFetcher.cs:55-56 (sayaçsız continue); apps/backend/CargoPilot.Infrastructure/Persistence/Repositories/DraftItemRepository.cs:21 (GetByErpIdAsync DB sorgusu, tracked-ama-kaydedilmemiş entity'yi görmez); SyncErpItemsCommandHandler.cs:95-96, 139-140 (ikinci duplicate yine Add/added++)

**Önerilen iş:** ERP-23 (bağımlılık: ERP-08, ERP-13; ERP-21/22 ile aynı PR dizisinde): (a) handler foreach'ine batch-içi HashSet<string> görülenErpId — tekrar gelen satır droppedByReason[DuplicateErpId]++ ile atlanır (ERP-13 unique index'i güvenlik ağı olarak kalır); (b) warehouseFilter elemesi RowScreeningPolicy üzerinden sayılır; (c) SATISKILIT satırlarının çekilip 'pasif' rozetiyle mi gösterileceği yoksa yalnız sayı olarak mı raporlanacağı açık ürün kararı olarak plana eklenir (plan bölüm 'Açık Sorular' listesine madde).

</details>

<details>
<summary>🟡 Orta — ERP-24: UI muhasebe gösterimi — 'ERP'de X satır var, Y aktarıldı, Z şu nedenlerle atlandı'</summary>

Bugün useTriggerERPSync şeması skipped alanını parse ediyor ama toast'ta bilinçli olarak gizliyor (backend hep 0 ürettiği için). ERP-08'in FE alt görevi toast'ı 'X eklendi, Y güncellendi, Z atlandı, N hatalı' yapacak; ancak sourceTotal ve neden kırılımı ERP-21/22 olmadan bu toast yine eksik kalır — Z yalnız handler-içi hataları kapsar, fetcher elemeleri görünmez. ERPSyncHistory'de PartialFailure gösterimi planlı (ERP-08) ama 'kaynakta kaç satır vardı' sütunu planda yok.

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:304 (skipped tipte var), :323-327 (yorum: 'Atlanan sayısı backend akışında hiç üretilmiyor'); ERP-GELISTIRME-PLANI.md:224-225 (ERP-08 FE alt görevi — sourceTotal içermiyor)

**Önerilen iş:** ERP-24 (bağımlılık: ERP-21, ERP-08 FE alt görevi): erpSyncSummaryResponseSchema'ya sourceTotal ve droppedByReason (Record<string,number>) alanları; sync toast'ı 'ERP'de X satır bulundu — Y eklendi, U güncellendi, Z atlandı' formatına; ERPSyncHistory satır detayında (features/platform/erp) neden bazlı kırılım tablosu (ör. 'Eksik ölçü: 12, Satış kilidi: 40, Depo filtresi: 210'); mutabakat farkı (unaccounted > 0) varsa kırmızı uyarı rozeti. Vitest ile şema kontrat testi ERP-02 altyapısını kullanır.

</details>

**Açık sorular:** SATISKILIT='E' (satış kilitli) satırlar hiç çekilmemeli mi, yoksa 'pasif' işaretiyle taslaklarda gösterilmeli mi? (D1 için ürün kararı — ERP-09'un 'WHERE'i kaldır' alt görevi bu koşulu da kapsıyor gibi okunuyor ama gerekçesi yalnız eksik-ölçü) · categoryFilter/warehouseFilter kullanıcının bilinçli seçimi olduğu için elenen satırlar 'atlandı' (sorun) mu yoksa 'filtrelendi' (bilgi) olarak mı raporlanmalı? UI dili buna göre ayrışmalı. · WHERE'siz COUNT ile ürün SELECT'i arasında ERP tablosu değişirse (canlı sistem) mutabakat farkı doğal olarak oluşabilir — snapshot tutarlılığı için tek transaction/aynı sorguda CASE-sayım mı tercih edilmeli, yoksa küçük fark toleransı mı tanımlanmalı? · TBLSTSABIT'te STOK_KODU kaynak tarafında zaten unique ise batch-içi duplicate koruması (ERP-23a) yalnızca savunma katmanı olur; Netsis şemasında bu garanti var mı, doğrulanmalı.

### 13.3 UX — ERP Yönetimi Ekranları

/erp yüzeyi teknik olarak çalışan ama teknik olmayan bir operasyon çalışanı için "kendini anlatmayan" bir ekran. Sayfa tek cümlelik bir alt başlıkla açılıyor; ERP'den ürünün nasıl geldiği, taslağın ne olduğu, onaylayınca nereye gittiği zinciri hiçbir yerde gösterilmiyor — bağlantı kurulumu /settings altında, ürün onayı /erp altında ve iki yüzey birbirine link vermiyor. Hiç entegrasyon yokken kullanıcı yalnızca tablo içinde 'ERP bağlantısı yapılandırılmamış.' metnini görüyor; sıradaki adım söylenmiyor ve 'ERP ile Sync' butonu açıklamasız şekilde disabled kalıyor (CLAUDE.md'nin 'kilitli özellik sessizce başarısız olmasın' ilkesine aykırı). Terminoloji tutarsız: aynı eylem 'Sync / Senkronize / Aktar / Onayla / İçe Aktar' olarak beş farklı adla geçiyor ve iki ayrı ekranda iki farklı sync tetiği var. Onay akışının en büyük sürtünmesi, ERP taslaklarının zorunlu 'Yük Grubu' alanının her zaman boş gelmesi: kullanıcı 200 ürünü aktarmak istediğinde her satırı tek tek elle doldurmak zorunda, toplu doldurma yok. Reddetme aksiyonu teyit diyaloğu olmadan çalışıyor ve Rejected sekmesi bulunmadığından reddedilen kayıtlar arayüzden tamamen kayboluyor — persona için 'verim silindi' paniği. Manuel senkronizasyon panelinde kategori/depo filtreleri ekranda var ama isteğe hiç gönderilmiyor; 'özet bildirim gösterilir' vaadi de kodda karşılıksız; 'Plan onayında otomatik aktar' anahtarı yalnızca client-side Zustand'a yazıyor. Sütun etiketleri ('Uzunluk/Çap (X)' başlığının width alanını göstermesi) ve kırılganlık sözlüğü (diyalogda 9 seçenek, Excel şablonunda 0-2) tutarsız. Bu bulgular ERP-21+ olarak, özellikle ERP-12 (kısmi aktarım) ve ERP-15 (rejected semantiği) ile koordineli planlanmalı.

<details>
<summary>🟠 Yüksek — İlk kullanım boş durumu çıkışsız: bağlantı yokken CTA yok, sync butonu sessizce devre dışı</summary>

Entegrasyon yokken kullanıcı tablo gövdesinde tek satır 'ERP bağlantısı yapılandırılmamış.' görüyor; ayarlara götüren bir buton/link yok. 'ERP ile Sync' butonu disabled={isSyncing || !integrationId} ile sessizce kilitleniyor — neden tıklanamadığı söylenmiyor. Persona (ERP jargonu bilmeyen operasyon çalışanı) bu ekranda ne yapacağını bilemez; bağlantı kurulumunun /settings?tab=erp-baglanti altında olduğunu keşfetmesi imkânsıza yakın. CLAUDE.md 'kilitli özellikler sessizce başarısız olmamalı' der.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:488-494 (boş durum metni), :419 (disabled={isSyncing || !integrationId}); apps/frontend/src/pages/erp/ERPItemsPage.tsx:8-11 (yalnızca başlık+tek cümle)

**Önerilen iş:** ERP-21: ERPItemsTable boş durumunu gerçek bir EmptyState bileşenine çevir — ikon + 'Henüz ERP bağlantınız yok' başlığı + 3 adımlı mini akış açıklaması (Bağlan → Senkronize et → Onayla) + '/settings?tab=erp-baglanti'ye giden 'ERP Bağlantısı Kur' primary butonu. integrationId yokken sync butonuna tooltip ('Önce ERP bağlantısı kurun') ekle veya butonu gizle.

</details>

<details>
<summary>🟠 Yüksek — ERP taslak onayında zorunlu 'Yük Grubu' her zaman boş geliyor; satır satır elle doldurma zorunlu, toplu doldurma yok</summary>

draftItemToImportRow her ERP taslağını incompatibleGroups: [] ile diyaloğa taşıyor; validateRow ise incompatibleGroups.length === 0'ı hata sayıyor. Sonuç: kullanıcı 50 ürün seçip 'Ürünlere Aktar' dediğinde 50 satırın tamamı kırmızı 'Zorunlu alan' ile açılıyor ve her satırın Yük Grubu popover'ını tek tek tıklayıp doldurmadan onay butonu hiç aktifleşmiyor. Persona için bu 'toplu onay' değil 'toplu ceza'; ERP-12'nin çözdüğü satır-izolasyonundan bağımsız bir veri-girişi sürtünmesi.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:106 (incompatibleGroups: []); BulkImportDialog.tsx:105 (if (row.incompatibleGroups.length === 0) e.incompatibleGroups = 'Zorunlu alan'), :446-447 ve :515-516 (tek hata tüm onayı bloklar)

**Önerilen iş:** ERP-22: BulkImportDialog'a sütun bazlı toplu doldurma ekle — Yük Grubu (ve Kırılganlık) başlığına 'tümüne uygula' popover'ı; ayrıca ERP akışı için 'Genel' varsayılanı ürün kararına bağlanmalı (varsayılan atanacaksa draftItemToImportRow'da ['Genel'] ver). ERP-12 ile aynı PR'da veya hemen ardından yapılmalı.

</details>

<details>
<summary>🟠 Yüksek — Terminoloji tutarsız: aynı akış 'Sync / Senkronize / Aktar / Onayla / İçe Aktar' olarak beş adla anlatılıyor, iki ayrı sync tetiği var</summary>

/erp'de buton 'ERP ile Sync' (yarı İngilizce); aynı işi settings'te 'Şimdi Senkronize Et' yapıyor ama farklı endpoint'e gidiyor (items/sync vs sync/run-now). Onay zinciri: floating bar 'Ürünlere Aktar' → diyalog başlığı 'Taslak Ürünleri Onayla' → buton 'N Ürünü Onayla' → başarı rozeti 'aktarıma hazır' → sekme adı 'Aktarılanlar' → toast 'N ürün onaylandı.'. 'Taslak', 'SKU', 'ERP ID' açıklamasız. Jargon bilmeyen persona 'Sync', 'Aktar' ve 'Onayla'nın aynı şeyin parçaları mı ayrı işler mi olduğunu çözemez.

**Kanıt:** ERPItemsTable.tsx:426 ('ERP ile Sync'), :665 ('Ürünlere Aktar'), :326 ('Aktarılanlar'); BulkImportDialog.tsx:596-606 (başlık+açıklama), :615 ('aktarıma hazır'), :947 ('N Ürünü Onayla'); ERPSyncPanel.tsx:222 ('Şimdi Senkronize Et'); useERPIntegration.ts:314 (items/sync) vs :388 (sync/run-now)

**Önerilen iş:** ERP-23: Tek sözlük belirle ve uygula — öneri: 'ERP'den Ürün Çek' (sync), 'Bekleyen Ürünler' (taslak), 'Ürünlere Aktar' (onay). ERPItemsTable, BulkImportDialog, ERPSyncPanel ve useDraftItems/useERPIntegration toast metinlerini bu sözlükle hizala; ERP-14 (run-now delegasyonu) sonrası iki tetik tek isim/tek davranışa indirilmeli.

</details>

<details>
<summary>🟠 Yüksek — Manuel senkronizasyon filtreleri UI'da var ama isteğe hiç gönderilmiyor; vaat edilen 'özet bildirim' de yok</summary>

ERPSyncPanel kategori/depo filtre state'i tutuyor fakat handleRunNow yalnızca runNow(integrationId) çağırıyor — filters hiçbir isteğe girmiyor. Kullanıcı 'Depo: İstanbul' seçip senkronize ettiğinde tüm veriyi çektiğini fark edemez. Ayrıca panel metni 'Senkronizasyon tamamlanınca özet bildirim gösterilir' diyor ama useRunERPSyncNow'un onSuccess'inde hiç toast yok (yalnızca cache invalidation). Persona için: yaptığı seçimlerin etkisiz olduğu ve söz verilen geri bildirimin gelmediği çifte güven kırılması.

**Kanıt:** ERPSyncPanel.tsx:46-49 (filters state), :67-70 (handleRunNow filters'ı kullanmıyor), :162-164 ('özet bildirim gösterilir' vaadi); useERPIntegration.ts:389-394 (onSuccess'te toast yok)

**Önerilen iş:** ERP-24: (a) Filtreleri isteğe bağla (ERP-14'te run-now SyncErpItems'a delege edilirken categoryFilter/warehouseFilter parametrelerini taşı) ya da backend desteklenene dek filtre Select'lerini kaldır; (b) useRunERPSyncNow onSuccess'ine özet toast ekle veya panel metnindeki vaadi sil. Yanıltıcı UI bırakılmamalı.

</details>

<details>
<summary>🟠 Yüksek — Reddet aksiyonu teyitsiz; reddedilenler için sekme olmadığından kayıtlar arayüzden kayboluyor</summary>

Floating bar'daki 'Reddet' butonu hiçbir onay diyaloğu olmadan bulkReject.mutate çağırıyor. FilterTabs yalnızca Bekleyenler/Aktarılanlar/Güncellemeler içeriyor; DRAFT_REJECTED için sekme yok, dolayısıyla reddedilen satırlar bir daha görünmüyor (REJECTED satır stili kodda var ama erişilebilir bir görünüm yok). Persona yanlışlıkla 30 güncellemeyi reddederse geri alma yolu da, nereye gittiğini görme yolu da yok — 'veri silindi' algısı oluşur. ERP-15 backend kalıcılık semantiğini düzeltiyor; UI teyit/görünürlük katmanı orada kapsam dışı.

**Kanıt:** ERPItemsTable.tsx:309-316 (handleRejectSelected, teyitsiz), :642-653 (Reddet butonu), :323-328 (FilterTabs'ta Rejected yok), :505/528-529 (ölü REJECTED satır stilleri); useDraftItems.ts:171-186 (geri alma ucu yok)

**Önerilen iş:** ERP-25 (ERP-15 ile koordineli): shadcn AlertDialog ile 'N ürünü reddetmek üzeresiniz — bu ürünler Ürünler listesine aktarılmayacak' teyidi ekle; ERP-15 sekme/aksiyon semantiğini getirirken 'Reddedilenler' sekmesi + 'Tekrar beklemeye al' aksiyonunu UI'da göster; toast'a 'Geri Al' aksiyonu eklenebilirse ekle.

</details>

<details>
<summary>🟡 Orta — 'Plan onayında otomatik aktar' anahtarı yalnızca client-side store'a yazıyor; hiçbir backend davranışı değişmiyor</summary>

Switch, useErpSettingsStore (Zustand) içine yazıyor; hiçbir API çağrısı yok. Plan raporuna göre plan onayı export'u zaten her durumda tetikleniyor ve ErpExportService NotImplemented. Yani anahtar açık/kapalı fark yaratmıyor; teknik olmayan kullanıcı 'kapattım, ERP'ye gitmez' diye güvenir. Yanıltıcı kontrol, güven maliyeti yüksek.

**Kanıt:** ERPSyncPanel.tsx:43-44 (useErpSettingsStore), :140-154 (Switch, yalnızca setAutoTriggerOnApproval); useERPIntegration.ts'te bu ayarı backend'e yazan hiçbir mutation yok

**Önerilen iş:** ERP-26: ERP-07 (feature-flag) ve ERP-18 (gerçek export) kararına bağla — anahtar backend'de karşılığı olana kadar ya kaldırılmalı ya 'Yakında' rozetiyle disabled gösterilmeli; kalıcılaşacaksa sync-settings PUT sözleşmesine alan ekletilip oradan okunmalı.

</details>

<details>
<summary>🟡 Orta — Eksen etiketleri veri alanlarıyla uyumsuz: 'Uzunluk/Çap (X)' başlığı width gösteriyor, 'Derinlik (Z)' length gösteriyor</summary>

ERPItemsTable ve BulkImportDialog başlıkları 'Uzunluk/Çap (X)', 'Yükseklik (Y)', 'Derinlik (Z)' derken hücreler sırasıyla row.width, row.height, row.length basıyor; Excel şablonu ise 'Genişlik(cm)/Yükseklik(cm)/Uzunluk(cm)' adlarını kullanıyor. Sahne sözleşmesi (X=genişlik, Z=derinlik) ile 'Uzunluk (X)' etiketi çelişiyor. Ölçüleri kontrol etmesi istenen operasyon kullanıcısı hangi sayının hangi kenar olduğundan emin olamaz; yanlış ölçü onayı doğrudan yükleme planı hatasına döner.

**Kanıt:** ERPItemsTable.tsx:467-475 (başlıklar) vs :558-571 (width/height/length sırası); BulkImportDialog.tsx:647-649 (aynı başlıklar) vs :718-746 (width/height/length hücreleri) vs :187-189 (Excel 'Genişlik(cm)'→width)

**Önerilen iş:** ERP-27: Tek terminoloji seç (öneri: 'Genişlik (X) / Yükseklik (Y) / Derinlik (Z)') ve ERPItemsTable, BulkImportDialog, Excel şablonu (downloadItemImportTemplate) başlıklarını hizala; ERP-19 şablon simetrisi taskıyla birlikte ele alınmalı.

</details>

<details>
<summary>🟡 Orta — Kırılganlık sözlüğü tutarsız: diyalogda 9 seçenekli çoklu seçim, Excel şablonunda 0-2, gösterim 'max(id)' hack'iyle</summary>

FRAGILITY_OPTIONS 1-9 arası 9 tür sunuyor (Kırılgan…Kimyasal) ve çoklu seçim yapılabiliyor; Excel başlığı ise 'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)'. Seçimden fragility üretimi String(Math.max(...ids)) ile yapılıyor — yani 'Kokuya Hassas (6)' seçen kullanıcının fragility'si 6 oluyor, bu da form standartlarındaki 0-2 aralığını aşıyor. Persona hangi listenin geçerli olduğunu bilemez; aynı kavram iki ekranda iki farklı dille anlatılıyor.

**Kanıt:** BulkImportDialog.tsx:39-49 (9 seçenek), :191-195 (Excel 0-2 başlığı ve constraintIds türetimi), :763-767 (fragility: String(Math.max(...ids)))

**Önerilen iş:** ERP-28: Kırılganlık/kısıt sözlüğünü tek kaynağa indir (constraint listesi backend'den geliyorsa oradan beslenen tek sabit dosya, ör. lib/config altında) ve Excel şablon başlığını gerçek seçeneklerle eşitle; Math.max tabanlı fragility türetimini açık bir eşleme fonksiyonuyla değiştir. ERP-19 ile koordineli.

</details>

<details>
<summary>🟡 Orta — Akış görünürlüğü yok: bağlantı-senkron-onay zinciri iki ayrı yüzeye bölünmüş, aralarında köprü ve rehber yok</summary>

Bağlantı formu, senkron ayarları ve geçmiş /settings sekmelerinde; taslak onayı /erp sayfasında. /erp'den ayarlara, ayarlardan /erp'e giden hiçbir link/breadcrumb yok. 'ERP'den ürün nasıl gelir, onaylanınca ne olur' zincirini anlatan stepper/başarı yönlendirmesi yok: onay sonrası toast 'N ürün onaylandı.' diyor ama ürünlerin artık /products altında olduğunu söylemiyor. İlk kez kullanan operasyon çalışanı akışı ancak deneme-yanılmayla öğrenir.

**Kanıt:** router.tsx:270-277 (/erp yalnızca ERPItemsPage; /integrations → /settings redirect); UnifiedSettingsPage.tsx:79-103 (erp-baglanti/sevkiyatlar/senkronizasyon/gecmis sekmeleri); useDraftItems.ts:128,162 (toast'ta yönlendirme yok); ERPItemsPage.tsx:5-16 (rehber öge yok)

**Önerilen iş:** ERP-29: (a) ERPItemsPage başlık satırına 'Senkronizasyon Ayarları' ikincil butonu (→ /settings?tab=erp-senkronizasyon) ekle; (b) onay toast'ına 'Ürünlere git' aksiyonu ekle; (c) bağlantı var + hiç taslak yok durumunda boş duruma 'ERP'den Ürün Çek' CTA'sı koy (bugünkü kuru 'Bekleyen ERP ürünü yok.' yerine).

</details>

<details>
<summary>🟡 Orta — Sync geçmişi tablosu hata anını anlatmıyor: mesaj truncate + tooltip yok, 'Kayıt' başlığı belirsiz, satır detayı yok</summary>

errorMessage hücresi max-w-xs truncate ile kesiliyor ve title/tooltip olmadığı için uzun (muhtemelen teknik İngilizce) hata metninin devamı hiçbir şekilde okunamıyor. 'Kayıt' sütun başlığı syncedRecordCount'u gösteriyor — 'kaç üründen kaçı geldi' bilgisini vermiyor (plan bulgusuna göre skipped zaten hep 0). 'Kısmi Hata' rozeti var ama hangi satırların atlandığını gösteren detay görünümü yok; kurtarma adımı ('tekrar dene', 'ayarları kontrol et') hiçbir durumda önerilmiyor.

**Kanıt:** ERPSyncHistory.tsx:101-103 (max-w-xs truncate, tooltip yok), :78-83 ('Kayıt' başlığı), :20-25 (durum etiketleri var ama aksiyon/detay yok), :59-62 (boş durumda yönlendirme yok)

**Önerilen iş:** ERP-30 (ERP-08/09 backend'i kısmi başarıyı üretmeye başladığında): satıra tıklayınca açılan detay Sheet/Dialog — tam hata metni, eklendi/güncellendi/atlandı kırılımı, atlanan satır listesi (ERP-09 çıktısı) ve 'Tekrar Dene' aksiyonu; 'Kayıt' başlığını 'İşlenen Ürün' yap; Failed satırlara kullanıcı dilinde kurtarma ipucu ekle.

</details>

<details>
<summary>🟢 Düşük — Küçük metin ve düşük kontrast yoğunluğu: 10px uppercase başlıklar, tüm gövde text-xs, 'İptal Et' etiketi belirsiz</summary>

Tablo başlıkları text-[10px], tüm hücreler text-xs (12px) ve çoğu text-muted-foreground — skill rehberi gövde için min 16px/4.5:1 kontrast önerir; tablet kullanan depo çalışanı için okunabilirlik sınırda. Floating bar'daki 'İptal Et' yalnızca seçimi temizliyor ama 'işlemi iptal' gibi okunuyor. Ürün adı hücresi de muted renkte — birincil bilgi ikincil görünüyor.

**Kanıt:** ERPItemsTable.tsx:455-478 (text-[10px] başlıklar), :541-547 (ürün adı text-muted-foreground), :629-639 ('İptal Et'); BulkImportDialog.tsx:640-660 (text-xs grid + 10px başlık)

**Önerilen iş:** ERP-31: Ürün adı hücresini text-foreground yap, gövdeyi text-sm'e çıkar (tablo yoğunluğu korunarak), 'İptal Et' → 'Seçimi Temizle', başlıkları 11-12px'e yükselt; değişiklik ProductTable/VehicleTable ile aynı ölçekte tutulmalı.

</details>

**Açık sorular:** ERP taslakları için 'Yük Grubu' gerçekten zorunlu bir iş kuralı mı, yoksa 'Genel' varsayılanı kabul edilebilir mi? (ERP-22'nin tasarımını belirler; ERP-10 ortak validasyon kararıyla çelişmemeli) · 'Plan onayında otomatik aktar' anahtarı ürün olarak isteniyor mu? ERP-07/ERP-18 kararı verilmeden bu switch kaldırılmalı mı, 'Yakında' olarak mı işaretlenmeli? · İki sync tetiği (items/sync ve sync/run-now) ERP-14 sonrası tek kullanıcı-yüzeyine mi indirilecek — /erp'deki 'ERP ile Sync' butonu mu, settings'teki panel mi kalacak? · ERP yönetimi tek sayfada mı toplanmalı (bağlantı+senkron+taslaklar), yoksa mevcut settings/erp bölünmesi korunup köprülerle mi yetinilmeli? (ERP-16 ölü ERPPage temizliğiyle birlikte karar gerekir) · ERPSyncPanel'deki kategori/depo filtreleri backend items/sync'in categoryFilter/warehouseFilter parametreleriyle birebir eşleşiyor mu (sync-options ucu ERP-16 listesindeki ölü rotalardan)? Eşleşmiyorsa filtre UI'ı tamamen kaldırılmalı mı?

### 13.4 UX — Ayarlar / Bağlantı Formu

Ayarlar yüzeyinin ERP kısmı (UnifiedSettingsPage'in erp-baglanti/erp-senkronizasyon sekmeleri, ERPConnectionForm ve ERPSyncPanel) görsel olarak temiz ve shadcn desenlerine uygun; şifre maskeleme, kayıtlı-şifre-korunuyor notu ve 409 'zaten çalışıyor' mesajı gibi iyi kararlar mevcut. Ancak teknik olmayan persona için form fiilen doldurulamaz durumda: hiçbir alanda 'bu bilgiyi nereden bulacağım' rehberi yok, 'Şirket Kodu' etiketi backend'de doğrudan SQL veritabanı adı (InitialCatalog) olarak kullanılırken placeholder '001' gösteriyor ve alanlar Logo/Netsis'e göre hiç uyarlanmıyor. Test-connection ham SqlException.Message'ı (İngilizce, teknik) kullanıcıya basıyor; 'şifre yanlış' ile 'sunucuya ulaşılamadı' ayrımı yapılmıyor, test etmeden kaydetmeye izin var ve kayıt sonrası 'Bağlı' rozeti gerçek erişilebilirliği değil sadece kayıt varlığını gösteriyor. Senkronizasyon paneli üç ayrı yanlış vaat içeriyor: kategori/depo filtreleri run-now isteğine hiç gönderilmiyor (dekoratif), sync-options ucu backend'de olmadığı için listeler hep boş, ve 'Sonraki senkronizasyon' tarihi gösterilirken zamanlanmış sync hiç çalışmıyor (ERP-20). Ayrıca kayıtlı frekans değeri bir useState başlangıç-değeri hatası yüzünden radio'ya hiç yansımıyor ve 'Plan onayında otomatik aktar' anahtarı şirket ayarı gibi sunulup aslında cihaz-yerel localStorage'da tutuluyor. Riskli değişiklik tarafında mevcut bağlantının üzerine yazma onaysız, bağlantı silme arayüzü yok ve ERP sekmeleri kaydedilmemiş-değişiklik korumasının (DIRTY_TRACKED_TABS) dışında. Bulgular ERP-04/06/14/16/20 ile örtüşen backend köklerinin ÜZERİNE, ayarlar yüzeyine özgü UX işleri olarak ERP-21..ERP-24 şeklinde önerildi.

<details>
<summary>🔴 Kritik — Sync panelindeki kategori/depo filtreleri run-now isteğine hiç gönderilmiyor; seçenek listeleri de hep boş</summary>

Panelde iki Select ile filters state'i tutuluyor ama handleRunNow yalnızca runNow(integrationId) çağırıyor; useRunERPSyncNow POST .../sync/run-now'a hiçbir filtre parametresi eklemiyor. Kullanıcı 'sadece X deposunu senkronize ettim' sanır — tamamen dekoratif kontrol. Üstelik seçenekleri dolduran useERPSyncOptions'ın çağırdığı GET /integrations/sync-options backend'de yok (plandaki 6 eksik rota ailesinden biri) ve safeParse fallback'i her hatada {categories:[], warehouses:[]} döndürdüğünden dropdown'lar sessizce 'Tüm kategoriler/Tüm depolar'dan ibaret kalıyor. Filtreleri gerçekten gönderen useTriggerERPSync hook'u mevcut ama bu panel onu kullanmıyor.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:46-49 (filters state), :67-70 (handleRunNow filtresiz), :167-213 (iki Select); apps/frontend/src/lib/api/useERPIntegration.ts:384-388 (run-now body/param yok), :289-299 (sync-options safeParse→boş fallback), :301-315 (filtre gönderen useTriggerERPSync ayrı duruyor)

**Önerilen iş:** ERP-23: Ya filtreleri gerçekten taşı (run-now yerine filtre destekli sync ucunu kullan / ERP-14 delegasyonunda categoryFilter-warehouseFilter parametrelerini geçir) ya da sync-options ucu ve filtre semantiği hazır olana dek iki Select'i panelden kaldır. Boş seçenek listesi durumunda 'ERP'den kategori/depo listesi alınamadı' hatası göster (ERP-06 ile hizalı).

</details>

<details>
<summary>🟠 Yüksek — Bağlantı formu alanları teknik olmayan kullanıcıya rehberlik etmiyor; 'Şirket Kodu' etiketi yanıltıcı</summary>

Formda yalnızca etiket+placeholder var; hiçbir alanda 'bu bilgiyi IT'nizden/Logo-Netsis danışmanınızdan isteyin' türü yardım metni yok. Kritik olan: backend her iki connector'da companyCode'u SqlConnectionStringBuilder.InitialCatalog'a, yani SQL VERİTABANI ADI'na koyuyor; formdaki placeholder '001' ise Logo'nun firma numarası biçimini çağrıştırıyor. IT'den connection string alan kullanıcı hangi parçayı hangi alana yapıştıracağını bilemez. 'Sunucu Adresi' placeholder'ı ('192.168.1.100 veya erp.sirket.com') named instance (SUNUCU\INSTANCE) ve port (,1433) biçimlerinden hiç bahsetmiyor — MSSQL kurulumlarının çoğunda instance adı zorunludur. Alanlar sağlayıcı seçimine (Logo/Netsis) göre de hiç uyarlanmıyor; iki sistemde aynı beş alan aynı metinlerle gösteriliyor.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:149-151 (Şirket Kodu, placeholder '001'), :213-215 (Sunucu Adresi placeholder); apps/backend/CargoPilot.Infrastructure/Services/ErpConnectors/NetsisErpConnector.cs:23-24 ve LogoErpConnector.cs:23-24 (DataSource=serverAddress, InitialCatalog=companyCode); apps/frontend/src/features/platform/erp/schemas/erpConnectionSchema.ts:3-9 (yardım metni taşıyan describe/meta yok)

**Önerilen iş:** ERP-21: ERPConnectionForm'a alan bazlı FormDescription yardım metinleri ekle ('Veritabanı Adı — IT yöneticinizden alın, örn. NETSIS2024'), 'Şirket Kodu' etiketini gerçek anlamına (Veritabanı/Katalog Adı) göre düzelt veya backend sözleşmesi netleşene dek her iki anlamı açıklayan metin koy, sunucu adresi placeholder'ına 'SUNUCU\INSTANCE veya sunucu,1433' örneği ekle, systemType seçimine göre alan metinlerini/örneklerini koşullu uyarla ve 'IT'nize gönderilecek bilgi listesini kopyala' yardımcısı ekle.

</details>

<details>
<summary>🟠 Yüksek — Test-connection sonucu ham SQL hatası gösteriyor; 'şifre yanlış' ile 'sunucuya ulaşılamadı' ayrılmıyor</summary>

Connector'lar SqlException yakalayıp 'Veritabanına bağlanılamadı: {ex.Message}' üretir — ex.Message İngilizce ve tekniktir ('Login failed for user...', 'A network-related or instance-specific error...'). Teknik olmayan kullanıcı bu metinden hangi alanı düzelteceğini çıkaramaz. SqlException.Number ile ayrım (18456=kimlik hatası, 4060=veritabanı adı hatalı, -2/timeout=sunucu adresi) yapılmıyor. Frontend testResult kutusu mesajı olduğu gibi basıyor; ayrıca test sonucu form alanları değiştirildiğinde sıfırlanmıyor (yalnızca submit/test tıklamasında sıfırlanır), kullanıcı alanı düzelttikten sonra bile bayat 'başarısız' mesajını görmeye devam eder.

**Kanıt:** apps/backend/CargoPilot.Infrastructure/Services/ErpConnectors/NetsisErpConnector.cs:36-43 ve LogoErpConnector.cs:36-43 (SqlException → ex.Message aynen; yalnızca TaskCanceledException'a özel mesaj); apps/backend/CargoPilot.Application/Features/ErpSettings/TestErpConnection/TestErpConnectionCommandHandler.cs:30-32; apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:222-243 (mesaj aynen render), :70-73 ve :86 (testResult yalnızca submit/test anında sıfırlanır)

**Önerilen iş:** ERP-22: Connector'larda SqlException.Number'a göre sınıflandırılmış Türkçe, eyleme dönük mesajlar üret ('Kullanıcı adı veya şifre hatalı — IT yöneticinizle doğrulayın', 'Sunucuya ulaşılamadı — sunucu adresini/VPN bağlantınızı kontrol edin', 'Veritabanı bulunamadı — veritabanı adını kontrol edin'); ham ex.Message'ı yalnızca log'a yaz. Frontend'de form.watch ile herhangi bir alan değişince testResult'ı temizle.

</details>

<details>
<summary>🟠 Yüksek — Test etmeden kaydetmeye izin var; kayıt sonrası 'Bağlı' rozeti gerçek durumu yansıtmıyor</summary>

Kaydet butonu testten tamamen bağımsız; kullanıcı hiç test etmeden hatalı bilgileri kaydedebilir ve 'ERP bağlantı ayarları kaydedildi' başarı toast'ı alır. Formun üstündeki yeşil 'Bağlı' rozeti useERPConnection'dan gelir; bu hook yalnızca bir integration KAYDININ var olup olmadığına bakar, gerçek erişilebilirliği bilmez. Sonuç: yanlış şifreyle kaydeden kullanıcı hem 'kaydedildi' hem 'Bağlı' görür, sorun ancak günler sonra sync başarısızlığında ortaya çıkar — persona için en pahalı hata türü. Son başarılı test zamanı da hiçbir yerde saklanmıyor/gösterilmiyor.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:70-73 (onSubmit test koşulu yok), :110-120 ('Bağlı' rozeti connection varlığına bağlı); apps/frontend/src/lib/api/useERPIntegration.ts:186-199 (useERPConnection sadece listeye bakar), :121-147 (save mutation'da test yok)

**Önerilen iş:** ERP-22 kapsamında: kaydetten önce otomatik test-connection çalıştır (başarısızsa 'Yine de kaydet' onaylı ikincil yol bırak), backend'e lastTestedAt/lastTestResult alanı ekleyip rozetin yanında 'Son başarılı test: <tarih>' göster; test hiç yapılmadıysa rozeti 'Kayıtlı (test edilmedi)' gibi nötr duruma çevir.

</details>

<details>
<summary>🟠 Yüksek — Kayıtlı senkronizasyon sıklığı radio grubuna hiç yansımıyor (useState başlangıç-değeri hatası)</summary>

localInterval, useState başlangıç değeri olarak syncSettings?.syncInterval ?? Daily ile kuruluyor; ilk render'da syncSettings henüz undefined olduğundan değer 'Daily'de kalıyor ve sorgu tamamlandığında useState yeniden çalışmadığı için sunucudaki kayıtlı değer (örn. FourHours) hiçbir zaman ekrana gelmiyor. '4 saatte bir' kaydetmiş kullanıcı sekmeye her girişinde 'Günlük' seçili görür; yanlışlıkla tekrar tıklarsa gerçek ayarını da ezmiş olur.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:51-53 (useState(syncSettings?.syncInterval ?? ErpSyncInterval.Daily)); apps/frontend/src/lib/api/useERPIntegration.ts:336-358 (sync-settings asenkron gelir)

**Önerilen iş:** ERP-23 kapsamında: localInterval'ı kaldırıp RadioGroup value'sunu doğrudan syncSettings.syncInterval'dan türet (mutation sırasında optimistic update veya isSavingSettings ile disabled); alternatif olarak react-hook-form values/reset deseni kullan.

</details>

<details>
<summary>🟠 Yüksek — Frekans ayarı ve 'Sonraki senkronizasyon' tarihi çalışmayan bir özelliği vaat ediyor</summary>

Zamanlanmış otomatik sync'i çalıştıracak Hangfire job'u yok (plandaki bilinen bulgu ERP-20, NextScheduledSyncAt'ı tüketen tüketici yok). Buna rağmen panel frekans seçtiriyor, 'Senkronizasyon sıklığı kaydedildi' başarı toast'ı veriyor ve CalendarClock ikonuyla 'Sonraki senkronizasyon: <tarih>' gösteriyor. Teknik olmayan kullanıcı için bu kesin bir taahhüttür; tarih geçtiği halde sync koşmayınca veri 'güncel sanılır' — sahada bayat ürün ölçüleriyle plan yapılması riski doğar. Sekme açıklaması da ('Otomatik senkronizasyon sıklığını ayarlayın') aynı vaadi kuruyor.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:83-135 (frekans UI + nextScheduledSyncAt gösterimi); apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:92-95 (sekme açıklaması); ERP-GELISTIRME-PLANI.md ERP-20 (NextScheduledSyncAt'ı tüketen RecurringJob yok)

**Önerilen iş:** ERP-23 kapsamında: ERP-20 tamamlanana kadar frekans bölümünü 'Yakında' rozetiyle işaretle veya gizle; 'Sonraki senkronizasyon' satırını yalnızca zamanlayıcı gerçekten aktifken göster. ERP-20 sonrası son çalıştırmanın sonucunu (başarılı/başarısız + tarih) aynı blokta göster.

</details>

<details>
<summary>🟡 Orta — 'Plan onayında otomatik aktar' anahtarı cihaz-yerel bir tercih; şirket ayarı gibi sunuluyor</summary>

Switch, zustand persist ile tarayıcı localStorage'ına ('erp-settings') yazılan autoTriggerOnApproval'ı yönetiyor; backend'e hiç gitmiyor. Aynı kullanıcı başka bilgisayarda veya meslektaşı aynı şirkette farklı davranış görür — 'Bir yükleme planı onaylandığında ERP aktarımı otomatik olarak başlar' cümlesi şirket-geneli bir kural gibi okunuyor. Ayrıca aktarımın kendisi ErpExportService NotImplemented olduğundan zaten ErpFailed'e düşüyor (bilinen bulgu ERP-18); anahtar açıkken kullanıcıya çifte yanlış vaat oluşuyor.

**Kanıt:** apps/frontend/src/lib/store/useErpSettingsStore.ts:9-17 (persist name:'erp-settings'); apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:139-154 (switch metni); apps/frontend/src/pages/plans/LoadingPlanDetailPage.tsx:572,582 (tüketimi client-side)

**Önerilen iş:** ERP-23 veya ayrı ERP-24 alt maddesi: ayarı backend'de entegrasyon/şirket düzeyine taşı (sync-settings ucuna alan ekle), taşınana kadar UI metnine 'yalnızca bu tarayıcı için' notu düş; ERP-18 kapanana dek anahtarı devre dışı bırakıp nedenini söyle.

</details>

<details>
<summary>🟡 Orta — Riskli değişikliklerde koruma yok: üzerine yazma onaysız, bağlantı silme yolu yok, ERP sekmeleri kaydedilmemiş-değişiklik takibinin dışında</summary>

Mevcut bir bağlantı varken sunucu/sağlayıcı/veritabanı değiştirilip Kaydet'e basmak hiçbir onay sormadan üzerine yazar; oysa bu, sync ve sevkiyat akışının veri kaynağını komple değiştirir. Formda bağlantıyı kaldırma/silme aksiyonu hiç yok — yanlış sisteme bağlanan kullanıcı geri dönüş yolu bulamaz. Ayrıca UnifiedSettingsPage'de DIRTY_TRACKED_TABS yalnızca {bolgesel-ayarlar, goruntu-ayarlari}; erp-baglanti sekmesinde formu yarım doldurup başka sekmeye geçen kullanıcı 'Kaydedilmemiş değişiklikler' uyarısı almadan her şeyi kaybeder.

**Kanıt:** apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:118 (DIRTY_TRACKED_TABS ERP içermiyor), :166-174 (uyarı yalnızca izlenen sekmelerde); apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:70-73,247-261 (onaysız kaydet, silme butonu yok)

**Önerilen iş:** ERP-24: (1) existing varken sunucu adresi/sağlayıcı/veritabanı değişmişse AlertDialog ile 'Mevcut ERP bağlantısının üzerine yazılacak; senkronizasyon bu yeni kaynaktan çalışacak' onayı iste; (2) form.formState.isDirty'yi onDirtyChange ile UnifiedSettingsPage'e bağlayıp erp-baglanti'yi DIRTY_TRACKED_TABS'e ekle; (3) bağlantıyı kaldır aksiyonu için ürün kararı al (backend DELETE ucu var mı doğrulanmalı) ve yıkıcı stille + onaylı ekle.

</details>

<details>
<summary>🟡 Orta — Şifre alanı: test için yeniden girme zorunluluğu sürtünme yaratıyor; göz butonu erişilebilir değil</summary>

İyi yanlar mevcut: maskeleme + göster/gizle, kayıtlı şifre varlığında '••••••••' placeholder ve 'Kayıtlı şifre korunuyor' notu, boş şifreyle kaydetmenin şifreyi ezmemesi. Ancak kayıtlı şifre varken test-connection 'Bağlantıyı test etmek için şifrenizi tekrar girin' diyerek engelleniyor — şifreyi IT'den alıp bir kez yapıştırmış persona şifreyi bilmiyor olabilir; kayıtlı ayarların hiç test edilememesi anlamına gelir. Göz butonunda aria-label yok ve tabIndex=-1 klavye kullanıcısına kapalı; ikon-buton için skill'in aria-label kuralına aykırı.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:79-85 (şifre tekrar girme zorunluluğu), :187-194 (button aria-label yok, tabIndex={-1}); apps/frontend/src/lib/api/useERPIntegration.ts:157-166 (test isteği şifresiz gidebilir ama kayıtlı şifre sunucuda kullanılmıyor)

**Önerilen iş:** ERP-22 kapsamında: backend test-connection'ı 'şifre gönderilmediyse kayıtlı şifreyle test et' olacak şekilde genişlet (settings kaydı üzerinden), böylece FE'deki blok kalkar; göz butonuna aria-label='Şifreyi göster/gizle' ekle ve tabIndex=-1'i kaldır.

</details>

<details>
<summary>🟡 Orta — Ayarlar yüzeyinde sessiz hata: sunucu hatasında form 'hiç ayar yok' gibi boş geliyor, geçmiş rozeti yanlış 0 gösteriyor</summary>

useERPSettings tüm hataları catch edip null döndürüyor; backend 500 verdiğinde bağlantı formu default değerlerle bomboş render olur — kullanıcı kayıtlı ayarlarının silindiğini sanıp yeniden girip üzerine yazabilir. useERPSyncLogs safeParse başarısızlığında boş sayfa döndürdüğünden 'Senkronizasyon Geçmişi' sekmesindeki hata rozeti gerçek hataları 0 gösterebilir; rozet zaten yalnızca ilk 20 kaydı sayıyor. Bu ERP-06 (silent failure) ailesinin ayarlar-yüzeyi özelidir; ERP-06 hook'ları düzeltirken bu iki ekranın isError durumlarına açıklayıcı boş-durum/uyarı eklenmezse persona yine sessiz yanlış bilgi görür.

**Kanıt:** apps/frontend/src/lib/api/useERPIntegration.ts:104-119 (useERPSettings catch→null), :417-429 (sync-logs safeParse→boş sayfa); apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:146-156 (syncErrorCount ilk sayfa üzerinden rozet)

**Önerilen iş:** ERP-06 kabul kriterlerine ayarlar yüzeyi maddesi ekle (ERP-21 ile koordineli): useERPSettings 404 dışındaki hatalarda throw etsin, ERPConnectionForm isError'da 'Ayarlar yüklenemedi — yeniden dene' durumu göstersin ve formu düzenlemeye kapatsın; hata rozetini ilk sayfa yerine backend'den toplam hata sayısıyla besle veya 'son 20 kayıtta' ifadesini tooltip'le belirt.

</details>

**Açık sorular:** 'Şirket Kodu' alanının nihai anlamı ürün kararı gerektiriyor: Logo sahasında firma numarası (örn. 001) ile SQL veritabanı adı ayrı kavramlar — backend InitialCatalog olarak kullandığına göre etiket mi düzeltilecek, yoksa ayrı 'Veritabanı Adı' + 'Firma No' alanları mı açılacak (ERP-17 provider-aware fetcher ile birlikte karara bağlanmalı)? · CLAUDE.md 'ERP ayarları için 2FA zorunludur (backend enforce eder)' diyor; erp-baglanti sekmesinde herhangi bir 2FA yeniden-doğrulama akışı görünmüyor — backend gerçekten enforce ediyor mu, ediyorsa UI'da nasıl yüzeye çıkacak? · ERP bağlantısını silme/pasifleştirme için backend'de DELETE ucu var mı; yoksa ERP-24 kapsamına backend işi de eklenmeli mi? · Kategori/depo filtre seçeneklerinin gerçek kaynağı ne olacak (ERP tarafındaki depo tablosu mu, CargoPilot'taki tanımlar mı)? sync-options ucu ERP-16'da ölü kod olarak silinirse ERPSyncPanel'deki filtre UI'ının kaderi buna bağlı.

### 13.5 UI Teknik Test (tsc/vitest/build/eslint + statik denetim)

Mekanik kapıların tamamı temiz: apps/frontend içinde 'npx tsc --noEmit' 0 hata, ERP dosyalarına hedefli 'npx eslint' 0 sorun, 'npx vitest run' 13 dosya / 107 test tamamı geçti ve 'npm run build' başarılı (yalnızca >500kB chunk uyarısı; react-pdf 1.4MB). Yani UI'daki kırıklar derleyici/linter'a yakalanmayan davranışsal kırıklar. Vitest süitinde ERP'ye ait tek bir test yok (testler auth/geometry/scene alanında) — ERP-02'nin gerekliliğini mekanik olarak teyit eder. Rota tarafında ERP'ye giden iki rota var (/erp → lazy ERPItemsPage ve /integrations → /settings?tab=erp-baglanti redirect); import zincirleri sağlam, build geçtiği için tüm lazy hedefler çözülüyor; ERPPage.tsx ise hiçbir rotada değil ve onunla birlikte ERPDraftItems, ERPPendingMatches, ERPItemMatchDialog, ERPUserMapping bileşenleri de yalnızca bu ölü sayfadan erişilebilir durumda. En kritik yeni bulgu: canlı /erp aktarım yolundaki ERPItemsTable, itemMappers'taki kanonik kategori eşlemesinin tersini yapan kopya bir dönüştürücü kullanıyor (0→'koli' ve Box→'varil'); doğru eşlemeyi kullanan ERPDraftItems ise ölü zincirde. ERPSyncPanel'de kategori/depo filtreleri hiçbir isteğe gitmeyen ölü UI ve kayıtlı senkron sıklığı asenkron veriden useState ile init edildiği için ekranda hep 'Günlük' görünüyor. ERP bileşenlerinin hiçbirinde isError kullanımı yok (grep 0 sonuç); bağlantı yokken ERPSyncHistory/ERPShipmentOrders yanıltıcı 'henüz kayıt yok' boş durumu gösteriyor. Tarayıcıda canlı doğrulama bu ortamda yapılamadı; E2E ile doğrulanması gereken maddeler açık sorular bölümünde listelendi.

<details>
<summary>🔴 Kritik — ERP-21: Canlı aktarım yolunda kategori eşlemesi kanonik mapper'ın tersi (koli↔varil değiş tokuşu)</summary>

ERPItemsTable.draftItemToImportRow kendi inline dönüşümünü taşıyor: category===0 → 'koli', category===1 → 'palet', else (Box=2 dahil) → 'varil'. Kanonik itemMappers.fromCategory ise 0'ı (eski kayıtlarda varil) 'varil', 2'yi (Box) 'koli' yapar. Yani /erp sayfasından aktarılan taslakta Package(0) ürün 'koli', Box(2) ürün 'varil' tipiyle BulkImportDialog'a girer — 3D yerleşim ve varil çap mantığı yanlış tip üzerinden çalışır. Doğru merkezi mapper'ı kullanan ERPDraftItems ise yalnızca ölü ERPPage'den erişilebilir; üstelik içindeki yorum 'burada tekrarlanırsa taslak onayında ürün tipi sessizce değişir' diye tam bu tuzağı uyarıyor. Ek olarak inline rotasyon switch'inde case 6 ölü (backend enum 0-5, itemMappers.ts:34-42) ve case 2 default'a düşüyor; fonksiyon başlığındaki '(cm → mm)' yorumu da yanıltıcı — hiçbir birim dönüşümü yapılmıyor.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:48-88 (özellikle 50-52 ve case 6: 83-87) vs apps/frontend/src/lib/api/itemMappers.ts:150-154 (fromCategory) ve 156-175 (fromAllowedRotations); uyarı yorumu apps/frontend/src/features/platform/erp/components/ERPDraftItems.tsx:34-35

**Önerilen iş:** ERPItemsTable.tsx'teki draftItemToImportRow inline dönüşümünü sil; ERPDraftItems.tsx:33-58'deki gibi fromCategory/fromAllowedRotations (itemMappers) çağıran tek draftItemToRow yardımcısına delege et (ERP-10 ortak validasyon factory'siyle birleştirilebilir). Yanıltıcı '(cm → mm)' yorumunu kaldır; dönüşüme mevcut davranışı sabitleyen vitest ekle (category 0/1/2/3 ve rotations 0-5 tablosu).

</details>

<details>
<summary>🟠 Yüksek — ERP-22: ERPSyncPanel kategori/depo filtreleri ölü UI — hiçbir isteğe gitmiyor</summary>

Panel filters state'i topluyor ve iki Select ile kullanıcıya 'Kategori Filtresi'/'Depo Filtresi' sunuyor, ama handleRunNow yalnızca runNow(integrationId) çağırıyor; useRunERPSyncNow POST /sync/run-now'a filtre parametresi hiç eklemiyor. Filtre parametrelerini destekleyen useTriggerERPSync bu panelde kullanılmıyor (yalnızca ERPItemsTable'da, o da filtresiz çağırıyor: ERPItemsTable.tsx:293). Kullanıcı filtre seçip 'Şimdi Senkronize Et'e bastığında seçimi sessizce yok sayılır. Ayrıca sync-options endpoint'i backend'de olmadığından (plan bulgusu) seçenek listeleri her zaman boş gelir — iki katmanlı ölü UI.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:46-49 (filters state), 67-70 (handleRunNow filtresiz), 167-213 (filtre UI); apps/frontend/src/lib/api/useERPIntegration.ts:384-405 (run-now filtre almıyor), 301-334 (filtre destekleyen useTriggerERPSync)

**Önerilen iş:** Karar ver: (a) run-now akışı filtre destekleyecekse useRunERPSyncNow imzasına categoryFilter/warehouseFilter ekle ve backend run-now ucu (ERP-14) bunları kabul etsin; ya da (b) filtre UI'sını ERPSyncPanel'den kaldır. ERP-14 (TriggerSync delege) ve ERP-16 (ölü kontrat temizliği) taskları ile koordine edilmeli; seçenek listeleri ERP'deki sync-options ucuna bağlı olduğundan (a) seçilirse o uç da tanımlanmalı.

</details>

<details>
<summary>🟠 Yüksek — ERP-23: Kayıtlı senkron sıklığı UI'da hiç görünmüyor — useState async veriden init ediliyor</summary>

localInterval, useState başlangıç değeri olarak syncSettings?.syncInterval ?? 'Daily' ile kuruluyor; ancak mount anında syncSettings henüz yüklenmediği için başlangıç hep 'Daily' olur ve useState initializer bir daha çalışmaz. Sunucudaki kayıtlı değer 'FourHours' olsa bile RadioGroup 'Günlük' seçili gösterir; kullanıcı mevcut ayarını yanlış görür ve fark etmeden üzerine yazabilir. ERPConnectionForm aynı problemi useEffect+form.reset ile doğru çözmüş (ERPConnectionForm.tsx:59-68) — desen tutarsızlığı da var.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncPanel.tsx:51-53 (useState init), 97-115 (RadioGroup localInterval'e bağlı); veri asenkron: useERPSyncSettings apps/frontend/src/lib/api/useERPIntegration.ts:336-358

**Önerilen iş:** ERPSyncPanel'de localInterval'i kaldırıp RadioGroup'u doğrudan syncSettings.syncInterval'den türet (controlled: value={syncSettings?.syncInterval ?? localdraft}); kaydetme optimistic update ile ['erp','sync-settings'] cache'ine yazsın. Yükleme bitmeden RadioGroup'u skeleton'da tutan mevcut dal korunmalı. Davranışı RTL testiyle sabitle (ERP-02 altyapısı üstüne).

</details>

<details>
<summary>🟠 Yüksek — ERP-24: Hiçbir ERP bileşeninde isError kullanılmıyor; hata her yerde boş/başarılı ekrana dönüşüyor</summary>

features/platform/erp, pages/erp, pages/settings/UnifiedSettingsPage.tsx ve lib/api/useDraftItems.ts üzerinde 'isError' grep'i sıfır sonuç veriyor. Bu, plan ERP-06'nın hook katmanı bulgusunu bileşen katmanına genişletir: useERPSettings her hatada catch ile null (109-115), useERPShipmentOrders catch ile [] (447-449), useERPSyncLogs safeParse-fallback boş sayfa (422-424) döndürdüğü için bileşenler hata dalı yazsa bile tetiklenemezdi; ama ERPDraftItems/ERPItemsTable gibi düzgün throw eden useDraftItems tüketicileri de isError'ı hiç okumuyor — 500 alan taslak listesi 'Bekleyen taslak ürün yok' olarak görünür.

**Kanıt:** grep -rn isError → 0 sonuç (apps/frontend/src/features/platform/erp, apps/frontend/src/pages/erp, apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx); apps/frontend/src/lib/api/useERPIntegration.ts:109-115, 447-449, 422-424; boş-durum örneği apps/frontend/src/features/platform/erp/components/ERPDraftItems.tsx:196-205 ve ERPItemsTable.tsx:482-497

**Önerilen iş:** ERP-06 kapsamına bileşen listesi olarak ekle: ERPItemsTable, ERPDraftItems, ERPSyncHistory, ERPShipmentOrders, ERPSyncPanel, ERPConnectionForm ve UnifiedSettingsPage badge sorguları için ortak bir <QueryErrorState retry={refetch}/> paterni tanımla; GET hook'larındaki catch/safeParse yutmaları kaldırıldıktan sonra her bileşende isError dalı render edilsin.

</details>

<details>
<summary>🟡 Orta — ERP-25: Bağlantı yokken ERPSyncHistory ve ERPShipmentOrders yanıltıcı 'kayıt yok' boş durumu gösteriyor</summary>

Her iki bileşen de integrationId'siz iken sorgusu enabled:false kalır; TanStack v5'te disabled sorguda isLoading false olduğundan bileşen doğrudan boş-durum dalına düşer: ERPSyncHistory 'Henüz senkronizasyon geçmişi yok', ERPShipmentOrders 'Henüz aktarılmış sevkiyat emri yok' der. Oysa gerçek durum 'ERP bağlantısı yapılandırılmamış'. ERPSyncPanel (72-78) ve ERPItemsTable (488-489) bu durumu doğru mesajla ayırt ediyor — aynı ayar sayfasının iki sekmesi doğru, iki sekmesi yanlış konuşuyor.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncHistory.tsx:41-62 (integrationId guard yok, boş durum 58-62); ERPShipmentOrders.tsx:103-104 ve 162-172; doğru örnekler ERPSyncPanel.tsx:72-78, ERPItemsTable.tsx:488-489; enabled koşulları useERPIntegration.ts:426, 451

**Önerilen iş:** ERPSyncHistory ve ERPShipmentOrders'a ERPSyncPanel'dekiyle aynı erken-dönüş bloğunu ekle: integrationId yoksa 'Önce ERP bağlantısını kaydedin' yönlendirmesi (erp-baglanti sekmesine link ile). Üç bileşendeki guard tek paylaşılan RequiresErpConnection sarmalayıcısına alınabilir.

</details>

<details>
<summary>🟡 Orta — ERP-26: ERPSyncHistory ham <table> + overflow-hidden — konvansiyon ihlali ve dar ekranda kırpılma</summary>

Bileşen shadcn Table yerine ham <table> kullanıyor (CLAUDE.md 'sıfırdan UI bileşeni yazılmaz' kuralına aykırı; aynı dosyanın kardeşleri ERPDraftItems/ERPShipmentOrders shadcn Table kullanıyor). Dış sarmalayıcı 'rounded-xl border overflow-hidden' — overflow-x-auto olmadığı için 5 kolonlu tablo dar ekranda yatay scroll alamaz, hücreler sıkışır/kırpılır; shadcn Table'ın kendi 'relative w-full overflow-auto' sarmalayıcısı (components/ui/table.tsx:7) bu sorunu bedavaya çözerdi. Hata mesajı kolonu max-w-xs truncate ile kesiliyor ve tam metni görmenin (title/tooltip) hiçbir yolu yok — kısmi başarı raporlaması (ERP-08/09) bu ekrana geldiğinde uzun hata mesajları okunamayacak.

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPSyncHistory.tsx:65-66 (overflow-hidden + ham table), 101-103 (truncate, title yok); karşılaştırma: apps/frontend/src/components/ui/table.tsx:7

**Önerilen iş:** ERPSyncHistory'yi shadcn Table primitivlerine geçir (ERPShipmentOrders ile aynı desen), sarmalayıcıyı overflow-x-auto yap; errorMessage hücresine title veya Tooltip ekle. ERP-08/09 UI işleriyle aynı PR'da ele alınması doğal.

</details>

<details>
<summary>🟡 Orta — ERP-27: Ayarlar sayfası hata rozeti magic number kullanıyor ve yalnız ilk 20 kaydı sayıyor</summary>

UnifiedSettingsPage 'erp-gecmis' sekme rozetini l.status === 2 || l.status === 3 ile hesaplıyor; lib/types/erp.ts:137'de SyncLogStatus.PartialFailure=2 / Failed=3 sabitleri zaten var (CLAUDE.md magic number kuralı). Ayrıca sorgu page:1,pageSize:20 ile sınırlı olduğundan rozet en fazla ilk 20 log içindeki hataları sayar — 21+ kayıtlık geçmişte gerçek hata sayısını olduğundan az gösterir. Aynı dosyada erp.ts'te tanımlı ama hiçbir yerde kullanılmayan iki ölü kontrat da tespit edildi: ErpSyncLogStatus (string enum) ve ErpSyncEntityType — SyncLogStatus (int) ile çift kayıt.

**Kanıt:** apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:146-150; sabitler apps/frontend/src/lib/types/erp.ts:137; ölü kontratlar erp.ts:122-135 (grep: ErpSyncLogStatus/ErpSyncEntityType repo genelinde yalnız tanım dosyasında)

**Önerilen iş:** Rozet hesabını SyncLogStatus sabitleriyle yaz; hata sayısı için backend'e küçük bir sayaç ucu (veya sync-logs yanıtına failedCount alanı, ERP-08 zarfına eklenebilir) tanımlayıp pageSize sınırından bağımsızlaştır. erp.ts'teki ErpSyncLogStatus ve ErpSyncEntityType ölü tiplerini ERP-16 temizliğine dahil et.

</details>

<details>
<summary>🟡 Orta — ERP-28: Erişilebilirlik apaçıkları — etiketlenmemiş ikon buton ve Select'e bağlanmayan Label'lar</summary>

ERPConnectionForm şifre göster/gizle kontrolü ham <button> (shadcn Button değil), aria-label'ı yok ve tabIndex={-1} ile klavye odağından tamamen çıkarılmış — ekran okuyucu ve klavye kullanıcısı şifreyi gösteremez. ERPSyncPanel'deki 'Kategori Filtresi'/'Depo Filtresi' Label'ları htmlFor/id olmadan Select tetikleyicisine bağlanmıyor; CreatePlanFromOrdersDialog'daki 'Araç Seçimi' Label'ı da aynı şekilde iliştirilmemiş (aynı dosyada 'Plan Adı' Label'ı htmlFor ile doğru bağlanmış — tutarsızlık).

**Kanıt:** apps/frontend/src/features/platform/erp/components/ERPConnectionForm.tsx:187-194 (ham button, tabIndex=-1, aria-label yok); ERPSyncPanel.tsx:169, 192 (bağsız Label); CreatePlanFromOrdersDialog.tsx:245 (bağsız) vs 235-237 (doğru örnek)

**Önerilen iş:** Şifre toggle'ını Button variant=ghost size=icon + aria-label='Şifreyi göster/gizle' yap, tabIndex=-1'i kaldır; Select tetikleyicilerine id verip Label'lara htmlFor ekle (SelectTrigger id prop'u destekler). Küçük tek PR; ERP-02 sonrası axe-core smoke testi eklenebilir.

</details>

<details>
<summary>🟡 Orta — ERP-29: /erp rotasında rol koruması yok — ayarlar sayfasındaki ERP RBAC'i ile tutarsız</summary>

UnifiedSettingsPage tüm ERP sekmelerini ADMIN_ONLY_TABS + canManageCompany ile gizliyor ve URL ile gelinirse varsayılana düşürüyor; ancak /erp rotası (ERPItemsPage → ERPItemsTable) sadece genel ProtectedRoute arkasında — requiredRole yok. Yetkisiz kullanıcı /erp'e girip 'ERP ile Sync' butonunu görür ve tetikleyebilir (backend guard'ına güvenilir ama UI 'kilitli özellik sessizce başarısız olmamalı' kuralını ihlal eder; ayrıca kullanıcı draft onay/red aksiyonlarını da dener).

**Kanıt:** apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:111-117, 128-135 (RBAC var) vs apps/frontend/src/router.tsx:160, 270-276 (/erp için rol kontrolü yok); sync butonu apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:414-427

**Önerilen iş:** /erp rotasını ProtectedRoute'un requiredRole/izin mekanizmasına bağla veya ERPItemsPage içinde isCompanyAdminRole kontrolüyle açıklayıcı kilit ekranı göster; sidebar'daki /erp linkinin de aynı koşulla gizlendiğini doğrula. ERP-16 ürün kararlarıyla birlikte ele alınabilir.

</details>

<details>
<summary>🟢 Düşük — ERP-30: Ölü zincirin ayrıntılı haritası — kanonik dönüştürücü ölü kodda yaşıyor</summary>

Rota taraması net sonuç verdi: ERPPage hiçbir router kaydında ve lazyPages'te yok; ona bağlı ERPDraftItems, ERPPendingMatches, ERPItemMatchDialog ve ERPUserMapping yalnızca ERPPage'den import ediliyor, yani dördü de ulaşılamaz durumda. Kritik yan etki: itemMappers'ı doğru kullanan tek taslak-aktarım bileşeni (ERPDraftItems) bu ölü zincirde; canlı yol (ERPItemsTable) hatalı kopyayı kullanıyor (bkz. ERP-21). useERPIntegration.ts:608'de 'ERP Items Page hooks' bölüm başlığı altında hiç kod yok — dosya bu başlıkla bitiyor. Plan ERP-16 bu temizliği zaten öngörüyor; bu bulgu implement-veya-kaldır kararında 'ERPDraftItems'in dönüşüm mantığı kaldırılmadan önce canlı yola taşınmalı' şerhini ekler.

**Kanıt:** apps/frontend/src/router.tsx:11, 270-276 (yalnız ERPItemsPage); grep: ERPPage yalnız kendi dosyasında (pages/erp/ERPPage.tsx:92), ERPDraftItems/ERPPendingMatches/ERPUserMapping/ERPItemMatchDialog referansları yalnız ERPPage.tsx:6-14,169-174 ve birbirleri; apps/frontend/src/lib/api/useERPIntegration.ts:608 (boş bölüm başlığı)

**Önerilen iş:** ERP-16 task tanımına ekle: silme sırası 'önce ERPDraftItems'teki draftItemToRow mantığını ERPItemsTable'a taşı (ERP-21), sonra ERPPage zincirini kaldır'; useERPIntegration.ts sonundaki boş bölüm başlığını da temizle.

</details>

<details>
<summary>🟢 Düşük — ERP-31: UnifiedSettingsPage'de seçilemez ölü sekme kimliği 'goruntu-ayarlari'</summary>

'goruntu-ayarlari' TabId union'ında ve DIRTY_TRACKED_TABS kümesinde tanımlı, fakat GENERAL_TABS/ERP_TABS listelerinin hiçbirinde yer almadığı için VALID_TAB_IDS'e girmez; URL ile ?tab=goruntu-ayarlari gelirse varsayılana düşer, navigasyonda hiç görünmez ve render bloğu yoktur. Ölü sekme kimliği kafa karışıklığı dışında zararsız ama dirty-tracking kümesinde durması gelecekte yanlış davranış davet eder.

**Kanıt:** apps/frontend/src/pages/settings/UnifiedSettingsPage.tsx:38 (TabId), 118 (DIRTY_TRACKED_TABS), 51-103 (tab listelerinde yok), 248-262 (render dalı yok)

**Önerilen iş:** 'goruntu-ayarlari' kimliğini TabId ve DIRTY_TRACKED_TABS'tan kaldır (ya da sekme gerçekten planlanıyorsa TabDef olarak ekle); tek satırlık temizlik, ERP-16 PR'ına binebilir.

</details>

<details>
<summary>🟢 Düşük — ERP-32: ERPItemsTable'da sağlayıcı ikonu yalnızca Logo için hardcoded</summary>

Ürün satırında integrationSystemName 'logo' içeriyorsa /icons/erp-logo.png gösteriliyor; Netsis (ve gelecekteki sağlayıcılar) için ikon/etiket dalı yok — Netsis bağlantısında satırlar sağlayıcı kimliği olmadan görünür. img alt='Logo' sabit. providerType enum düzeltmesi (ERP-04) sonrası sağlayıcı ayrımı UI'da da anlamlı hale geleceği için birlikte ele alınmalı.

**Kanıt:** apps/frontend/src/features/data-management/imports/components/ERPItemsTable.tsx:534-539

**Önerilen iş:** Sağlayıcı→ikon eşlemesini küçük bir sabit tabloya al (Logo/Netsis), bilinmeyen sağlayıcıda metin rozeti göster; ERP-04 veya ERP-17 (provider-aware fetcher) PR'ına iliştirilebilir.

</details>

**Açık sorular:** Canlı E2E ile doğrulanmalı (bu ortamda tarayıcı testi yapılmadı): (1) /erp sayfasında 'ERP ile Sync' butonu — backend sync ucu gerçek MSSQL olmadan hangi hatayı veriyor ve toast metni ne gösteriyor; (2) ERPSyncPanel 'Şimdi Senkronize Et' → run-now 500/NotImplemented akışının kullanıcıya yansıması (plan bölüm 2'deki teyitli davranış UI'da gözle doğrulanmalı); (3) ERP-21 kategori ters eşlemesi: Box(2) kategorili bir draft'ın /erp'den aktarımında BulkImportDialog'da 'varil' görünmesi; (4) ERP-23: sunucuda FourHours kayıtlıyken senkronizasyon sekmesinin 'Günlük' göstermesi; (5) sekme rozetlerinin (erp-sevkiyatlar/erp-gecmis) bağlantı yokken ve hata durumunda davranışı; (6) non-admin kullanıcının /erp URL'ine doğrudan girişi. · ERPSyncPanel'deki kategori/depo filtreleri ürün olarak isteniyor mu? Cevaba göre ERP-22 'filtreyi uca taşı' ya da 'UI'ı kaldır' olarak iki zıt işe ayrışır — ERP-14/ERP-16 sahipleriyle karar gerekli. · ERPItemsTable'daki rotasyon switch'inde case 6 hangi eski backend sözleşmesinden kaldı? Backend AllowedRotations 0-5 ise (itemMappers.ts:34) DraftItem yanıtında 6 gelme ihtimali var mı — SyncErpItemsCommandHandler tarafında doğrulanmalı. · Build'deki >500kB chunk uyarıları (react-pdf 1.4MB, index 738kB) ERP kapsamı dışında ama ayrı bir performans task'ı olarak backlog'a alınmalı mı?

---

*Ek tur ultracode çıktısı; ham veri: session scratchpad `erp-ux-analiz.json`. İmplementasyon Opus ile ERP-01→37 bağımlılık sırasına göre yürütülecek.*
