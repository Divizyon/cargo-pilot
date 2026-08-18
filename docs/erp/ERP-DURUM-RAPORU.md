# CargoPilot — ERP Feature Durum Raporu ve Tamamlama Planı

**Rapor Tarihi:** 2026-08-08
**Task:** ERP entegrasyonunu tüm sub-feature'larıyla uçtan uca çalışır hale getirmek
**Yöntem:** 5 paralel araştırma ajanı (kod-kanıtlı inceleme) + mimari sentez + rapor

---

## Yönetici Özeti

ERP entegrasyonu uçtan uca **ÇALIŞIR DEĞİL** durumdadır; tahmini tamamlanma **~%45-50** seviyesindedir. Sağlam çekirdek altyapı mevcuttur: ERP bağlantı ayarları (CRUD + test-connection + DataProtection ile şifre saklama), ERP'den ürün çekip DraftItem'a yazan item sync (`POST /items/sync`), sync ayarları ve sync-log geçmişi çalışmaktadır. Ancak kritik sub-feature'lar eksik veya kopuktur: plan/sevkiyatın ERP'ye geri yazılması (`ErpExportService` NotImplemented), manuel sync tetikleme (`TriggerSync` NotImplemented), pending-item-mapping onay zinciri (ölü — sync bu akışı kullanmıyor), ERP kullanıcı eşleştirmesi (backend handler'ları yok), sevkiyat emirlerinin çekilmesi (GET endpoint yok) ve büyük bir UI-backend kontrat boşluğu (frontend'in çağırdığı 10+ endpoint backend'de hiç yok). Frontend'deki silent-failure kalıpları bu boşlukları gizlediği için UI "boş ama hatasız" görünmektedir. Ne backend'de ne frontend ERP katmanında tek bir test vardır; regresyon riski yüksektir.

---

## Sub-Feature Durum Tablosu

| Sub-Feature | Durum | Eksik Özeti |
|---|---|---|
| ERP bağlantı ayarları (kaydet/getir/test-connection, şifre koruma) | ✅ Büyük ölçüde tamam | `ErpSettingsController` + handler'lar çalışır; DataProtection şifreleme aktif. Hiç test yok; frontend `useERPSettings` tüm hataları `null`'a çevirip yutuyor. |
| Ürün senkronu ERP → DraftItem (`POST /items/sync`) | ✅ Büyük ölçüde tamam | `SyncErpItemsCommandHandler` gerçek çalışıyor (upsert + Approved/Rejected mantığı + SyncLog). Eksik: `SqlServerErpProductFetcher` sağlayıcı-farksız, sabit TBLSTSABIT/Netsis şemasına kilitli; Diameter ve ErpConstraints doldurulmuyor. |
| Sync ayarları + sync-log geçmişi | ✅ Tamam | GET/PUT sync-settings ve sayfalı GET sync-logs handler'ları mevcut, frontend tüketiyor. Yalnızca test eksiği. |
| Taslak ürün onay ekranı (`/erp` → ERPItemsPage + DraftItemsController) | ✅ Büyük ölçüde tamam | Rota mevcut, `DraftItemsController` var. DraftItem → Item dönüşüm akışı uçtan uca izlenmedi (doğrulanacak). |
| Manuel sync tetikleme (`POST /sync/run-now`) | ⚠️ İskelet | Endpoint ve frontend hook'u (409 özel mesajıyla) hazır ama `TriggerSyncCommandHandler` NotImplemented dönüyor. Gerçek sync mantığı zaten `/items/sync`'te; ikili giriş noktası tutarsız. |
| Pending item mapping (sync → eşleştirme onayı zinciri) | ⚠️ İskelet (ölü akış) | Entity + EF config + 3 endpoint + frontend bileşenler hazır; tabloyu dolduran kod YOK (grep teyit: `new PendingItemMapping(` hiçbir yerde çağrılmıyor). Sync bunun yerine DraftItem yazıyor. |
| ERP sevkiyat emirleri + emirden plan oluşturma | ⚠️ Yarım | Frontend tam (`ERPShipmentOrders`, `CreatePlanFromOrdersDialog`); backend'de `GET /{id}/shipment-orders` endpoint'i HİÇ yok. Silent fallback yüzünden sekme hep boş-hatasız görünüyor. |
| Plan/sevkiyatın ERP'ye geri yazılması (export) | ❌ İskelet | Boru hattı kurulu (ApprovePlan enqueue → Hangfire → `ErpExportJob`) ama `ErpExportService` NotImplemented dönüyor; **her onaylanan plan MarkErpFailed oluyor**. |
| ERP kullanıcı eşleştirme (user mapping + rol çakışma logu + sahipsiz veri) | ❌ İskelet | Domain entity + migration + frontend (7 hook) var; Application katmanında 0 handler, backend'de rotalara 0 eşleşme, UI bileşeni rotasız `ERPPage`'e hapsolmuş. |
| Sync seçenekleri (`GET /integrations/sync-options`) | ❌ Yok | Frontend çağırıyor, backend endpoint yok; safeParse fallback hatayı gizliyor. |
| Test kapsamı (backend + frontend ERP) | ❌ Yok | `cargo-pilot.sln`'de test projesi yok; frontend'deki 13 vitest dosyasının hiçbiri ERP değil. |

---

## Detaylı Bulgular

### Frontend UI

- 🔴 **`ERPPage.tsx` orphan:** Router'da tanımlı değil, hiçbir yerden import edilmiyor. `ERPUserMapping` ve `ERPPendingMatches` bileşenlerine kullanıcı hiçbir rotadan ulaşamıyor.
- 🟡 **Silent-failure kalıpları:** `useERPSettings` (satır 109-115), `useERPShipmentOrders` (438-449) try/catch ile null/boş-dizi dönüyor; safeParse fallback'leri hata gizliyor. Backend sözleşme kayarsa UI boş görünür, error state tetiklenmez.

### Frontend Veri Katmanı

**Çalışan:** `lib/api/useERPIntegration.ts` içinde 23 hook, tümü kullanımda (ölü hook yok); Zod boundary parse + tuple query key'ler; `useErpSettingsStore` yalnızca UI tercihi tutuyor (SSOT kuralına uygun); sync çalışırken 5 sn polling.

**Eksikler:**
- 🟡 ERP veri katmanı için hiç vitest yok (CLAUDE.md kuralına aykırı).
- 🟡 Parse hataları sessizce yutulup null/boş dönülüyor.
- 🟢 `erpSavedMatchSchema` (erp.ts:50) boundary parse'ta kullanılmıyor; `useERPSavedMatches` elle map ediyor.
- 🟢 `useERPIntegration.ts:608` ölü yorum.

### Backend

**Çalışan:** ERP ayarları CRUD + DataProtection şifreleme; Logo/Netsis connector'ları gerçek SqlConnection ile bağlantı testi; `SyncErpItemsCommandHandler` item çekme + DraftItem upsert + SyncLog; sync ayarları GET/PUT.

**Eksikler:**
- 🔴 **`ErpExportService.cs:12-19` NotImplemented:** Her çağrıda `Erp.ExportNotImplemented` dönüyor; `ApprovePlanCommandHandler.cs:48` job'ı her onayda kuyrukladığı için **her onaylanan plan ERP-Failed işaretleniyor** (üretimde kullanıcı güveni riski).
- 🔴 **Pending-item-mapping ölü akış:** Entity + API var; tabloyu dolduran kod yok.
- 🟠 **`TriggerSyncCommandHandler.cs:41-47` NotImplemented** ("PR #463 bekleniyor" yorumuyla).
- 🟠 **`ErpUserMapping` backend'de işlevsiz:** Entity var, hiçbir handler kullanmıyor.
- 🟠 **Ürün çekici sağlayıcı-farksız:** `SqlServerErpProductFetcher.cs:19-27` sabit TBLSTSABIT/Netsis şemasına kilitli; Logo için item çekme fiilen çalışmaz. Connector'lar yalnızca TestConnection içeriyor.
- 🟡 ErpConstraints ve Diameter doldurulmuyor (satır 82-83); DraftItem sabit varsayılan alıyor (NonFragile, isStackable:true).
- 🟠 Backend test projesi hiç yok.

### API Kontratı & Veritabanı

- 🔴 **Kontrat boşluğu:** Frontend'in çağırdığı `sync-options`, `{id}/shipment-orders`, `erp-users`, `user-mappings`, `role-conflict-log`, `unassigned-data` rotalarının **hiçbiri** backend'de yok (`IntegrationsController`'da yalnızca sync-logs, sync-settings, sync/run-now, items/sync, pending-item-mappings var). Silent fallback'ler 404'leri gizliyor.
- **Ölü tablolar:** `pending_item_mappings` ve `erp_user_mappings` migration'ları var ama koddan hiç yazılmıyor.

---

## Tamamlama Planı (bağımlılık sıralı, her adım ~1 PR)

| # | Adım | Kapsam | Efor | Bağımlılık |
|---|---|---|---|---|
| 1 | **Frontend silent-failure'ları görünür yap** | `useERPIntegration.ts`'deki try/catch→null ve safeParse-fallback kalıplarını error state'e düşürecek şekilde değiştir; `erpSavedMatchSchema`'yı boundary parse yap | Küçük (~4s) | Yok — teşhis önkoşulu |
| 2 | **Ölü kod temizliği + tek sync giriş noktası kararı** | Ürün kararı: SSOT DraftItem mi PendingItemMapping mi? (öneri: DraftItem). Karara göre PendingItemMapping zincirini kaldır veya ERPPage'i router'a bağla | Orta (~6s) | Adım 1 + ürün kararı |
| 3 | **run-now'u gerçek sync'e delege et** | `TriggerSyncCommandHandler`'da NotImplemented yerine `SyncErpItemsCommand` mantığını çağır; 409 davranışını koru | Küçük (~3s) | Adım 2 |
| 4 | **Ürün çekiciyi provider-aware yap** | `IErpConnector`'a FetchProductsAsync ekle; TBLSTSABIT sorgusunu Netsis connector'a taşı, Logo şeması sorgusu yaz; Diameter/ErpConstraints'i gerçek kolonlardan doldur | Büyük (~12s) | Adım 3 + ERP şema dokümanı |
| 5 | **Test altyapısı + kritik ERP testleri** | sln'e xUnit projesi; SyncErpItems/TriggerSync/UpsertErpSettings birim testleri; frontend'de erp.ts + store vitest | Orta (~8s) | Adım 3-4 |
| 6 | **`GET /{id}/shipment-orders` endpoint'i** | Query handler + controller endpoint; provider-aware connector ile ERP'den sevkiyat emirleri; frontend şemasına uygun DTO | Büyük (~10s) | Adım 4 |
| 7 | **`ErpExportService` implementasyonu (plan → ERP)** | NotImplemented'ı gerçek yazma ile değiştir. **Öncesinde bağımsız küçük PR: export hazır olana kadar ApprovePlan'daki enqueue'yu feature-flag arkasına al** (her plan Failed görünmesin) | Büyük (~14s) | Adım 4, 6 |
| 8 | **Kullanıcı eşleştirme backend'i + UI erişimi** | `ErpUserMapping` CRUD handler'ları + endpoint'ler (frontend kontratına uygun); `ERPUserMapping` bileşenini routed sayfaya taşı; unassigned-data implemente et veya kaldır. 2 PR'a bölünebilir | Büyük (~14s) | Adım 5 + öncelik kararı |
| 9 | **sync-options endpoint'i veya kaldırma** | Backend'de küçük query olarak implemente et VEYA frontend'den çıkar; enum eşlemelerini (PROVIDER_TYPE_TO_INT vb.) bu PR'da doğrula | Küçük (~2s) | Adım 2 |

Toplam kaba efor: **~63 saat** (feature-flag geçici PR'ı hariç).

---

## Riskler

1. **Üretimde güven kaybı:** Her plan onayı ERP export job'ı kuyrukluyor ve job her seferinde Failed üretiyor — kullanıcılar sürekli ERP hatası görüyor olabilir. Feature-flag PR'ı geciktirilmemeli.
2. **Silent-failure kalıpları** kontrat boşluğunu bugüne kadar gizlemiş; Adım 1 yapılmadan backend değişiklikleri UI'dan doğrulanamaz.
3. **Logo şeması bilinmiyor:** Fetcher Netsis'e kilitli; Logo müşterisi varsa Adım 4/6/7 şema dokümantasyonu olmadan tamamlanamaz.
4. **DataProtection key ring:** Container yeniden oluşumunda key ring kalıcı değilse tüm ERP şifreleri çözülemez hale gelir — infra'da doğrulanmalı.
5. **PendingItemMapping kaldırma geri dönüşsüz** — Adım 2 kararı ürün onayına bağlanmalı.
6. **Test olmadan büyük backend PR'ları** (4, 6, 7, 8) riskli; Adım 5 öne çekilmezse her PR manuel doğrulamaya muhtaç.
7. **"PR #463 bekleniyor" yorumu** paralel iş ima ediyor; koordinasyon yapılmazsa çakışan implementasyon riski var.
8. **İnceleme kapsam notu:** 5 araştırma ajanından 2'si (frontend-ui, kontrat-veri) geçersiz çıktı döndürdü; bu alanlar sentez aşamasında dosyalara bakılarak elle doğrulandı, ancak UI davranış detayları (form akışları, edge-case'ler) derinlemesine incelenmedi.

---

## Doğrulanması Gerekenler

1. **Ürün kararı:** Item eşleştirmede SSOT DraftItem akışı mı, PendingItemMapping onay zinciri mi? (Adım 2'nin yönü buna bağlı.)
2. **ERP şema dokümantasyonu:** `apps/backend/docs/erp-integration/erp-schema-divizyon.md` — TBLSTSABIT Netsis'e mi Divizyon'a mı özel? Logo/Netsis gerçek şemaları için güncel doküman nerede?
3. **Kullanıcı eşleştirme + unassigned-data** bu fazın kapsamında mı, sonraki faza mı? (Adım 8 önceliği.)
4. **PR #463'ün akıbeti** — açık bir branch var mı?
5. **DraftItem → Item onay/dönüşüm akışının** uçtan uca çalıştığı (yalnızca DraftItem yazımı doğrulandı).
6. **Frontend enum eşlemeleri** (PROVIDER_TYPE_TO_INT: Logo=0, Netsis=1; SYNC_FREQUENCY_TO_INT) backend enum sıralarıyla birebir aynı mı?
7. **Production'da DataProtection key ring** kalıcı depoya bağlı mı? (`PRODUCTION_DEPLOYMENT_INFO.md` / infra.)
