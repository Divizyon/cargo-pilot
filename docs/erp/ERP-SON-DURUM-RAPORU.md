# ERP Geliştirme Turu — Son Durum Raporu

Branch: `feat/ERP-toplu-iyilestirme` (push yapılmadı, dev'e alınmayı bekliyor)
Tarih: 2026-08-12

## 1. Yönetici Özeti

**Önce:** ERP entegrasyonu; ölü UI zincirleri (ERPPage, ERPUserMapping, ERPPendingMatches), backend'i olmayan hook'lar, çalışmayan/yanıltıcı sync akışı (NotImplemented handler'lar), yanlış enum eşlemesi (ERP-04: Logo/Netsis kayması), sessizce yutulan hatalar, eş zamanlılık koruması olmayan sync, eksik ölçülü ürünlerin sessizce elenmesi, ERP aktarımının hiç yazmadığı sahte bir "aktarıldı" arayüzü ve test altyapısı sıfır (ne backend xUnit, ne frontend RTL, ne E2E) durumundaydı.

**Sonra:** 37 ERP task'ının tamamı işlendi (33'ü tam, 2 grup — ERP-18 ve ERP-30/31/32 — kısmen tamamlandı, bilinçli ürün kararlarıyla veya ortam kısıtıyla sınırlı). Ölü zincirler tamamen kaldırıldı (K1), gerçek satır bazlı hata izolasyonu ve senkronizasyon muhasebesi (kaynak toplam → eklenen/güncellenen/filtrelenen/hatalı mutabakatı) eklendi, eş zamanlılık kilidi + unique index ile çift kayıt engellendi, reddedilen taslaklar kalıcı reddediliyor (K2), eksik ölçülü satırlar artık elenmiyor ve "eksik alan" işaretiyle taslağa düşüyor (K4), Netsis gerçek sipariş aktarımı yazıldı ama flag kapalı (K3), backend test projesi (144 xUnit testi) ve frontend RTL/vitest altyapısı (26 dosya, 244 test) sıfırdan kuruldu, Playwright E2E ortamı (sahte Netsis MSSQL + 7 senaryo, hepsi yeşil) eklendi. Nihai doğrulama turunda ek olarak 2 gerçek kusur (ölü "Organik" filtre, "Sıvı İçerir"/"Sıvı" etiket bölünmesi) ve prettier format sapmaları giderildi. Bu turun sonunda ayrı bir UX taraması yapıldı ve 2 kritik + çok sayıda orta/düşük önem bulgu tespit edildi (bkz. Bölüm 4) — bunlar KOD DEĞİŞİKLİĞİ OLMADAN raporlandı, düzeltilmedi.

**En kritik açık kalan riskler:** (1) UX taramasında bulunan 2 kritik hata (Güncellemeler sekmesinde "Tümünü seç" yanlış kayıt kümesini hedefliyor; ERP güncelleme onayında mevcut-SKU kontrolü akışı kilitliyor) henüz düzeltilmedi. (2) Hiçbir migration gerçek bir MSSQL'e uygulanmadı (ortamda DB yok). (3) `infra/env/.env.test` içinde sızmış bulunan gerçek bir Resend API anahtarının rotate edilmesi gerekiyor — kod dışı, acil bir aksiyon. (4) Playwright E2E CI job'u commit'lendi ama gerçek CI ortamında hiç koşmadı.

## 2. Task Bazında Tamamlanma Tablosu

| Task | Durum | Özet | Commit(ler) |
|---|---|---|---|
| ERP-01 | Tamam | Backend xUnit test projesi + CI test kapısı zorunlu | e24f9aa7 |
| ERP-02 | Tamam | Frontend RTL/jsdom test altyapısı + zod/enum kontrat testleri | 12460b2b, 41000ea8 |
| ERP-03 | Tamam | Playwright E2E + sahte Netsis MSSQL + CI e2e-smoke job'u | 5c570084, 8ee515e7, 141bf046, d099c5e8, f9f376c8, 7b7ebcd5 |
| ERP-04 | Tamam | Provider enum kayması (Logo/Netsis) düzeltildi + veri migration | d22900fd |
| ERP-05 | Tamam | Ortak `getApiErrorMessage` yardımcısı, backend Result zarfından okuma | f17916e4 |
| ERP-06 | Tamam | GET hook'larında sessiz fallback kaldırıldı, hata kutuları eklendi | 746afc92 |
| ERP-07 | Tamam | Plan onayında ERP aktarımı feature-flag arkasına alındı (FE+BE) | 4d6aa5ae (+ önceki 4d01c2a2) |
| ERP-08 | Tamam | Sync satır bazlı hata izolasyonu + kısmi başarı (PartialFail) | f714cdc5 |
| ERP-09 | Tamam | Eksik ölçülü satırlar elenmiyor, "eksik alan" işareti (K4) | 01c4dd72 |
| ERP-10 | Tamam | Ürün kurulum/doğrulama tek ortak `ItemFactory`/`ItemSpec` altında | 383991f8 |
| ERP-11 | Tamam | Yük Grubu zorunlu iş kuralı taslak onay zincirinde (K6) | 827c5403 |
| ERP-12 | Tamam | Toplu aktarımda satır bazlı kısmi onay, tek approve-bulk yolu | fa4c9556 |
| ERP-13 | Tamam | Sync eş zamanlılık kilidi + DraftItem unique index | 598ed111 |
| ERP-14 | Tamam | run-now, SyncErpItems'a delege ediliyor (NotImplemented kaldırıldı) | d69d00a2 |
| ERP-15 | Tamam | Reddedilen taslak kalıcı ret (K2) + geri alma (reinstate) ucu | 94e59d13 (önceki ajan), doğrulandı |
| ERP-16 | Tamam | K1: ölü ERPPage/ERPUserMapping/PendingItemMapping zinciri tamamen kaldırıldı | 0b8af64a, b5a5bd5d |
| ERP-17 | Tamam | Netsis ürün çekimi sağlayıcı-başına fetcher stratejisine ayrıldı | 0adfa5c4 (önceki ajan), doğrulandı |
| ERP-18 | **Kısmen** | Netsis TBLSIPAMAS/TBLSIPATRA gerçek aktarım yazıldı, flag kapalı (K3); plan detayında aktarım durumu/hata nedeni gösterimi eklendi | 425f92d1, c488c382, c724859a, 724842cb |
| ERP-19 | Tamam | Kısıt/yük grubu sözlükleri Excel şablonuyla tekilleştirildi | afd9f02f (+ önceki 98c34921) |
| ERP-20 | Tamam | Zamanlanmış sync (Hangfire, 15 dk tarama) + null frekans göstergesi | 43d72f2f (+ önceki 88d64892 vd.) |
| ERP-21 | Tamam | Connector'lar tekilleştirildi, ürün satırlarında sağlayıcı kimliği | 600e0cad (+ önceki f987c557) |
| ERP-22 | Tamam | TLS/sertifika ayarı + parola çözülemez hatasının açık hataya çevrilmesi | 5e669f6f (+ önceki 94fada22) |
| ERP-23 | Tamam | ADR + veri modeli dokümanı koda göre güncellendi | c912cc02 (+ önceki 4e517a93) |
| ERP-24 | Tamam | Sync satır muhasebesi (SourceTotal/Fetched/Dropped/Unaccounted) | 8977279b (önceki ajan), doğrulandı |
| ERP-25 | Tamam | Neden bazlı eleme sayımı (satır limiti, batch-içi tekrar dahil) | 07025150 (+ önceki 5c26935d) |
| ERP-26 | Tamam | Sync toast/geçmiş neden kırılımı + erişilebilir tooltip | 00669a03 (+ önceki 0c9a7260) |
| ERP-27 | Tamam | Kategori/rotasyon dönüşümü tek kanonik yardımcıya (`draftItemToRow`) | d4427775 |
| ERP-28 | Tamam | Senkronizasyon paneli optimistic update + açıklama düzeltmesi | a3870362 (+ önceki 6dac1639) |
| ERP-29 | Tamam | /erp ekranı CompanyAdmin yetkisine bağlandı | ab257004 |
| ERP-30 | **Kısmen** | Erişilebilirlik/shadcn button geçişleri yapıldı; BulkImportDialog'daki ham `<table>` bilinçli olarak dönüştürülmedi (sticky header riski) | 5d71a5c4 (+ önceki dae5baf0 vd.) |
| ERP-31 | Tamam | Boş durum CTA'ları, K9 popup köprüsü, üç bos-durum varyantı | 0a4b32bb (önceki ajan), doğrulandı |
| ERP-32 | **Kısmen** | Toast terminolojisi, "Genişlik" etiketi hizalandı; kırılganlık 0-2 kısıtlaması plan-kod çelişkisi nedeniyle uygulanmadı | c69027b8, d6f3e9fc |
| ERP-33 | Tamam | Sütun bazlı toplu doldurma (Yük Grubu, Kırılganlık) | eeed208e |
| ERP-34 | Tamam | Toplu ret teyit diyaloğu (AlertDialog) + geri alma testleri | dc7beb4a |
| ERP-35 | Tamam | "Şirket Kodu" → "Veritabanı Adı" (K7) + alan rehberliği | b54dc17c |
| ERP-36 | Tamam | SQL hata sınıflandırması (Türkçe) + son test durumu kaydı | 5f51e13a |
| ERP-37 | Tamam | Üzerine yazma teyidi, kirli-form koruması, backend DELETE ucu (K10) | f4a4995f |

**Nihai doğrulama turu ek commit'leri:** `ef70c13e` (prettier sapmaları), `9fbb709b` (ölü "Organik" filtre kaldırıldı + "Sıvı" etiket birleştirildi).

**Özet sayım:** 35/37 tam, 2/37 kısmen (ERP-18, ERP-30, ERP-32 — not: G20 raporu ERP-30/31/32'yi birlikte "kısmen" işaretledi, ERP-31 kendi içinde kriterleri tam karşılıyor). Hiçbir task "yapılmadı" durumunda değil.

## 3. Test Durumu

**Backend:** `dotnet build cargo-pilot.sln` → 0 hata (1965 önceden var olan CS1591/CA1716 uyarısı, bu turda artmadı). `dotnet test cargo-pilot.sln` → **144/144 başarılı**, 0 atlanan (CargoPilot.Application.Tests, net8.0). Not: `CargoPilot.slnx` bu ortamdaki SDK'nın MSBuild'i tarafından desteklenmiyor (MSB4068); tüm build/test komutları proje/sln bazlı koşuldu — ortam kısıtı, koddan kaynaklanmıyor.

**Frontend:** `npx tsc --noEmit` → temiz. `npm run lint` (eslint, max-warnings 0) → temiz. `npm run build` → başarılı. `npm run test:ci` (vitest) → **26 dosya / 244 test, hepsi geçti**. `npx prettier --check` → bu branch'te değişen dosyalarda temiz (repo genelindeki 259 dosyalık CRLF/LF gürültüsü Windows checkout artefaktı, Linux CI'da sorun değil — `.gitattributes` eksikliği ayrı, dokunulmayan bir bulgu olarak raporlandı).

**E2E (Playwright):** `npx playwright test` → **7/7 geçti** (yerel Docker ortamında, sahte Netsis MSSQL + gerçek backend/frontend derlemesiyle koşuldu). CI'daki `e2e-smoke` job'u commit'lendi ama gerçek GitHub Actions ortamında hiç tetiklenmedi/gözlemlenmedi — ilk PR'da bir kez doğrulanması gerekiyor.

## 4. Çözülmemiş Sorunlar ve Nedenleri

### Kritik / Aksiyon Gerektiren
- **UX taraması — Güncellemeler sekmesinde "Tümünü seç" yanlış statüyü hedefliyor** (`ERPItemsTable.tsx:219-232, 284-291`): başlık checkbox'ı her zaman `DRAFT_PENDING` kaydını çekiyor; Güncellemeler sekmesinde toplu ret/onay ekranda görünmeyen Bekleyen taslakları etkileyebilir. Düzeltilmedi.
- **UX taraması — ERP güncelleme onayında mevcut-SKU kontrolü akışı kilitliyor** (`BulkImportDialog.tsx:452-470`): `mode='update'` için de SKU çakışma kontrolü çalışıyor; UpdatePending taslağının SKU'su zaten kayıtlı olduğundan tüm satırlar hatalı işaretlenip "Güncelle" butonu hiç etkinleşmiyor. Testlerde `fetchAllItems` boş mock'landığı için yakalanmamış. Düzeltilmedi.
- **Sızmış Resend API anahtarı** (`infra/env/.env.test`, .gitignore kapsamında, kod tarafında düzeltilemez): rotate edilmesi gerekiyor, hem bu makinede hem sunucuda.

### Yüksek Önem
- Hiçbir migration gerçek MSSQL'e uygulanmadı (özellikle: olu tablo drop migration'ları, DraftItem duplicate temizleme + unique index, ProviderType veri düzeltme migration'ı) — deploy öncesi gözden geçirilmeli.
- ERP-25'in "eleme kararlarını tek `RowScreeningPolicy` sınıfına topla" alt görevi ayrı bir sınıf olarak yapılmadı (mantık `NetsisProductFetcher.BuildSql` + handler'daki `HashSet` içinde); sayaç kapsaması kriteri karşılanıyor ama plana birebir uyum yok.
- ERP-32'nin "kırılganlıkta 0-2 dışı değer üretimi kalktı" kriteri backend `FragilityType` enum'unun (0-9) kodla çelişmesi nedeniyle uygulanmadı; plan tarafının güncellenmesi gerekiyor.
- Backend hata zarfı uyumsuzluğu: backend `ValidationErrors{Field,Message}` dönerken `BulkImportDialog` hâlâ `validationFailures{propertyName,errorMessage}` bekliyor — 422 hataları satır bazlı gösterilemiyor.
- Kategori filtresi/arama sunucu sayfalamasıyla tutarsız (UX taraması, `ERPItemsTable.tsx:245-268, 207-208`): arama yalnız ilk 100 kayıt içinde çalışıyor, kategori filtresi yalnızca görünen sayfayı kapsıyor ama "Toplam" sayacı filtreden habersiz.

### Orta / Düşük — Bilinçli Kapsam Dışı Kararlar
- K3 gereği ERP-18 export flag'i (`Erp:ExportEnabled`) varsayılan kapalı; Netsis'e gerçek yazma hiç canlı test edilmedi. Şema varsayımları (FTIRSIP fiş tipi, KAPATILMIS='H', INCKEYNO identity mi, cari kod sabiti) müşteri kurulumunda doğrulanmalı.
- K12 gereği Logo ürün fetcher'ı yok; Logo seçili entegrasyonda sync açık "desteklenmiyor" hatası dönüyor.
- Yük grubu zorunluluğu (K6) yalnızca taslak onay yolunda; `CreateItem`/bulk-create ortak kural setine eklenmedi (mevcut tekil ürün formu kırılırdı).
- Satır izolasyonu tek `SaveChangesAsync` sonda olduğu için DB düzeyinde patlayan bir satır (örn. unique index ihlali) hâlâ tüm batch'i düşürebilir.
- Eş zamanlılık kilidi mantıksal (Running durumu) seviyede, DB satır kilidi yok; unique index ikinci yarışı `Sync.Failed`'a düşürerek veri bütünlüğünü koruyor.
- BulkImportDialog.tsx ve VehicleBulkImportDialog.tsx'te ham `<table>` kaldı (ERP-30) — shadcn Table'ın sticky header'ı bozma riski nedeniyle, görsel QA imkânı olmadan dönüştürülmedi.
- Test dosyaları `tsconfig.json`'da exclude edilmiş; `tsc --noEmit` test dosyalarını tip denetlemiyor (önceden var olan durum, bu turda 6 dosyada 15+ tip hatası tespit edilip düzeltilmeden bırakıldı).
- `npm install` sırasında 10 güvenlik uyarısı (1 low, 9 high) raporlandı, kaynağı doğrulanmadı, `npm audit fix` koşulmadı (kilit dosyasını genişçe değiştirir).

## 5. UX Taramasından Kalan Bulgular (Özet)

Ayrı bir salt-okunur UX taraması yapıldı (ERPItemsPage, ERPItemsTable, BulkImportDialog, ERPConnectionForm, ERPSyncPanel, ERPSyncHistory, UnifiedSettingsPage ERP sekmeleri). Genel değerlendirme olumlu: tek terminoloji sözlüğü, ayrık error/empty state'ler, K5/K7/K9 doğru uygulanmış. **2 kritik bulgu** (yukarıda Bölüm 4'te), ayrıca:

- **Yüksek:** kategori filtresi/arama sunucu sayfalamasıyla tutarsız (yukarıda).
- **Orta:** "Satır Ekle" ile eklenen taslak satırı draftItemIds eşlemesi olmadığı için sessizce kayboluyor; TLS switch etiketi ("Sunucu sertifikasını doğrulama") davranışla ters anlam veriyor (açıkken doğrulanmıyor); "sürükleyip bırakın" vaadi var ama drop handler yok.
- **Düşük:** boş durumdaki "Dosya Ekle" butonu aslında manuel satır açıyor; kategori filtre paneli el yapımı popover (klavye/ARIA eksik, shadcn Popover'a geçilebilir); skeleton kolon sayısı sekmeye göre değişmiyor (hafif yerleşim zıplaması); RequiresErpConnection yüklenirken tam boş ekran gösteriyor.
- **İyileştirme önerileri:** "Tümünü seç" kapsamı için bilgi bandı (Gmail deseni); elle çekim butonunun devam eden otomatik çekimi görmesi; Bekleyenler/Güncellemeler sekmelerine de sayı rozeti; istif kapalıyken Kat Sayısı hücresinin disabled gösterilmesi; eksik-ayar diyaloğu buton etiketinin bağlama duyarlı olması ("Ayarları Tamamla" vs "ERP Bağlantısı Kur").

Tüm bulgular kod değiştirilmeden raporlandı; hiçbiri bu turda düzeltilmedi.

## 6. Önerilen Sonraki Adımlar

1. **Acil, kod dışı:** Sızmış Resend API anahtarını rotate et (bkz. Bölüm 4).
2. **Merge öncesi kritik düzeltme:** UX taramasındaki 2 kritik bulguyu (yanlış "Tümünü seç" kapsamı, SKU kontrolü akış kilidi) küçük, izole commit'lerle düzelt — her ikisi de dar kapsamlı, tek dosyalık değişikliklerle çözülebilir.
3. **CI doğrulaması:** İlk PR'da `e2e-smoke` job'unun GitHub Actions üzerinde gerçekten yeşile döndüğünü gözlemle (özellikle aynı runner'da iki MSSQL konteynerinin bellek davranışı).
4. **Migration gözden geçirme:** Deploy öncesi tüm migration'ları (özellikle drop/unique-index/veri-düzeltme migration'ları) staging DB'de kuru çalıştır; G04'ün önerdiği gibi `SELECT ProviderType FROM ErpSettings` ile tek satırlık teyit yap.
5. **PR bölme önerisi (`feat/ERP-toplu-iyilestirme` → `dev`):** Tek commit'te 60+ commit'lik bir branch'i merge etmek yerine, mantıksal küme bazlı 4-5 PR'a bölünmesi önerilir:
   - **PR-1 (Test altyapısı):** ERP-01, ERP-02, ERP-03 — backend xUnit + frontend RTL + Playwright/CI. Bağımsız, risk düşük, önce merge edilmeli ki sonraki PR'lar CI'da gerçek doğrulama alsın.
   - **PR-2 (Ölü kod temizliği + K1):** ERP-16, ERP-27, ERP-29, ERP-30/31/32 — büyük silme, davranış değişikliği yok, review kolay.
   - **PR-3 (Sync çekirdeği):** ERP-04, ERP-05, ERP-06, ERP-08, ERP-09, ERP-13, ERP-14, ERP-15, ERP-17, ERP-20, ERP-21, ERP-24, ERP-25, ERP-26 — enum düzeltmesi, hata izolasyonu, eş zamanlılık, muhasebe. En riskli grup, en dikkatli review gerekir (özellikle ERP-04'ün veri migration'ı).
   - **PR-4 (Ürün/onay akışı):** ERP-10, ERP-11, ERP-12, ERP-19, ERP-33, ERP-34.
   - **PR-5 (Bağlantı/ayarlar + ERP-18 export):** ERP-07, ERP-18, ERP-22, ERP-23, ERP-28, ERP-35, ERP-36, ERP-37 — ERP-18'in export flag'i kapalı kalacağı için düşük risk, ancak DELETE ucu (K10) ve bağlantı testi değişiklikleri dikkatli izlenmeli.
   - Her PR öncesi bu branch'teki ilgili commit aralığı `git cherry-pick` veya `git rebase -i` ile ayrıştırılabilir; commit mesajları zaten mantıksal task bazında tek tek yazıldığı için bölme mekanik bir iş.
6. **Sonraki tur için backlog:** UX taramasındaki orta/düşük bulgular, `.gitattributes` ile CRLF/LF gürültüsünün kalıcı giderilmesi, backend hata zarfı ↔ FE `validationFailures` uyumsuzluğunun giderilmesi, `RowScreeningPolicy` soyutlamasının plana uydurulması (veya planın güncellenmesi).
