# ERP — 5 Fazlı Geliştirme Yol Haritası

**Tarih:** 2026-08-13 · **Branch:** `feat/ERP-toplu-iyilestirme`
**Kaynak:** ERP-SON-DURUM-RAPORU.md §4-5, ERP-GELISTIRME-PLANI.md §11/§13, ERP-DUZELTILECEK.md
**Kural:** Her faz tek başına merge edilebilir. Bir faz bitmeden sonraki başlamaz.

Sıralama ölçütü: **önce sızdıran şeyler, sonra sessizce yanlış veri üretenler, sonra
ölçek, sonra kurulum, en sona yeni yetenek.** Yeni özellik en sonda çünkü altındaki
zemin güvenilir değilken eklenen her yetenek borç büyütüyor.

---

## Faz 1 — Güvenlik ve erişim ✅ TAMAMLANDI

**Commit:** `1479546c` · **Durum:** kodlandı, test edildi, canlı ortamda doğrulandı.

| # | İş | Kanıt |
|---|---|---|
| 1.1 | Bağlantı testinde kayıtlı şifre yalnızca istek kayıtlı bağlantının aynısını hedeflediğinde çözülür | Canlı: farklı `serverAddress` → 400 `PasswordRequiredForNewConfig`, connector hiç çağrılmıyor |
| 1.2 | Test ucuna 10 istek/dk/IP sliding window limiti | Canlı: 10. istekten sonra 429 |
| 1.3 | DraftItems ucu `CompanyAdmin` politikasına bağlandı | Canlı: tokensiz 401, admin 200 |
| 1.4 | `/erp` rotasına rol koruması (kısıt yalnızca kenar menüsündeydi) | `router.tsx` — adres elle yazılınca da kapalı |
| 1.5 | `TrustServerCertificate` varsayılanı `false` | Domain + iki komut sözleşmesi + form; mevcut kayıtlar etkilenmiyor |

**Testler:** backend 166 (+4), frontend 311 (+2), tsc/eslint/prettier temiz.

**Faz 1'de çıkan iki düzeltme:**
- Rapordaki "/erp yalnızca istemci tarafında CompanyAdmin'e kilitli" ifadesi yanlıştı —
  rotada hiç rol kısıtı yoktu, yalnızca menü öğesi gizleniyordu.
- EF `HasDefaultValue(true)` yüzünden `false` değerinin sessizce `true` saklanacağı
  şüphesi **ampirik olarak çürütüldü** (API'den `false` yazıldı, DB'den `0` okundu).
  Migration gerekmedi.

---

## Faz 2 — Senkron güvenilirliği ✅ TAMAMLANDI

**Commit:** `743cb760` · Gerçek MSSQL üzerinde doğrulandı: 4 eş zamanlı sync → 1×200 + 3×409, kilit sonrasında `SyncStatus=Idle`, tekrar sync 27 satır `unchanged`.

**Neden burada:** Faz 1 dışarıdan gelen saldırıyı kesti; Faz 2 içeriden gelen sessiz
veri kaybını kesiyor. Aşağıdaki maddelerin hepsi "kullanıcı başarılı sanıyor ama
kayıt yazılmamış" sınıfında.

| # | İş | Bulgu kaynağı | Efor |
|---|---|---|---|
| 2.1 | **Satır izolasyonu DB düzeyinde de geçerli olsun.** Bugün satır bazlı `try/catch` var ama tek `SaveChangesAsync` sonda; DB düzeyinde patlayan bir satır (unique index ihlali vb.) hâlâ tüm batch'i düşürüyor. Ayrıca `catch` sonrası DbContext kirli kaldığı için o noktadan sonraki her satır da düşüyor. Çözüm: hatalı entry'yi `Detach` + parti bazlı `SaveChanges`. | SON-DURUM §4 orta | M |
| 2.2 | **Eş zamanlılık kilidi atomik olsun.** Bugünkü kilit mantıksal (`Running` durumu okunup yazılıyor); iki iş aynı anda okursa ikisi de geçiyor, unique index ikinciyi `Sync.Failed`'a düşürüyor. Çözüm: `UPDATE ... WHERE Status <> Running` tek ifadeyle veya `sp_getapplock`. | SON-DURUM §4 orta | S |
| 2.3 | **`RowScreeningPolicy` sınıfı.** Eleme kararları bugün `NetsisProductFetcher.BuildSql` içindeki WHERE ile handler'daki `HashSet` arasına dağılmış. Sayaçlar doğru ama kural tek yerde değil; yeni bir eleme nedeni eklendiğinde muhasebe sessizce bozulur. | ERP-25 alt görevi, yapılmadı | M |
| 2.4 | **Hata zarfı uyumu.** Backend `ValidationErrors{Field,Message}` dönüyor, `BulkImportDialog` hâlâ `validationFailures{propertyName,errorMessage}` bekliyor → 422 hataları satır bazlı hiç gösterilemiyor, kullanıcı genel hata görüyor. | SON-DURUM §4 yüksek | S |
| 2.5 | **Reddedilen bağlantı denemeleri loglansın.** Faz 1'de eklenen SSRF kapısı ve rate-limit reddi hiçbir yere yazılmıyor; saldırı denemesi sessiz. Mevcut audit altyapısına bağlanmalı. | Faz 1 yan çıktısı | S |

**Kabul:** Bilerek bozuk 3 satır içeren 30 satırlık bir senkronda 27 satır yazılır,
3'ü nedeniyle birlikte raporlanır, `SourceTotal == added + updated + unchanged + skipped + ΣDropped`
invariantı tutar; iki paralel senkron tetiklendiğinde ikincisi `Failed` değil "zaten
çalışıyor" döner.

---

## Faz 3 — Veri bütünlüğü ve ölçek ✅ TAMAMLANDI

**Commit'ler:** `dfa88971` (barkod) · `2c34b213` (sunucu taraflı arama/filtre) · `53ea2560` (keyset) · `ee1fd203` (ölçü birimi)

| # | Sonuç |
|---|---|
| 3.1 | 20.029 satırlık ölçek testi: önce 20.000 çekilip 27 satır `RowLimitExceeded`; keyset sonrası 20.027'nin tamamı alındı, `RowLimitExceeded` sıfır, `unaccounted` sıfır, 11 sn |
| 3.2 | ERP barkodu onay yolunda korunuyor |
| 3.3 | Birim bağlantı ayarından; canlıda mm/g → ERP `EN=36` taslakta `3.6` cm |
| 3.4 | Arama ve tip filtresi sorguya girdi; toplam sayaç filtreli kümeyi gösteriyor |
| 3.5 | **Bulgu bayatmış:** 55 migration'ın tamamı gerçek SQL Server 2022'de uygulanmış durumda; unique index, düşürülen kolonlar ve ProviderType doğrulandı |


**Neden burada:** Faz 2 senkronu güvenilir yaptıktan sonra, aynı senkronun gerçek
müşteri hacminde ve tam alan kümesiyle çalıştığını garantilemek gerekiyor.

| # | İş | Bulgu kaynağı | Efor |
|---|---|---|---|
| 3.1 | **Satır limiti / keyset sayfalama.** Bugünkü çekim tek sorguda tüm tabloyu alıyor. Gerçek Netsis kurulumunda 20 bin+ satır normal; bellek ve timeout riski. `SIRA`/`STOK_KODU` üzerinden keyset ilerleme. | GELISTIRME-PLANI §13 | L |
| 3.2 | **Barkodun ızgarada taşınması.** `BulkImportDialog` satır modelinde barkod alanı yok → onay öncesi `UpdateDraftItem` barkodu `null`'a çekiyor, ürüne `NULL` yazılıyor, senkron ise ERP barkodunu taslağa geri yazıyor. Sonuç: taslak ile ürün arasında **kalıcı fark** (test verisinde 24 taslağın 19'unda). Karar gerekli: onayda barkodu ürüne taşı, ya da senkron onaylanmış taslakta barkoda dokunmasın. | DUZELTILECEK #6, açık bırakıldı | S |
| 3.3 | **Ölçü birimi desteği.** Netsis'te birim `TBLSTSABIT` dışında; bugün cm/kg varsayılıyor. Farklı birim kullanan müşteride ölçüler sessizce 100 kat yanlış olur. | GELISTIRME-PLANI §13 | M |
| 3.4 | **Arama/filtre sunucu tarafına.** Arama yalnız ilk 100 kayıtta çalışıyor, kategori filtresi yalnız görünen sayfayı kapsıyor, "Toplam" sayacı filtreden habersiz — kullanıcı "ürün yok" sanıyor. | UX taraması, yüksek | M |
| 3.5 | **Migration'ların gerçek MSSQL'de kuru koşusu.** Hiçbir migration gerçek bir MSSQL'e uygulanmadı — özellikle drop-column, DraftItem duplicate temizleme + unique index ve ProviderType veri düzeltme migration'ları. Deploy öncesi zorunlu. | SON-DURUM §4 yüksek | S |

**Kabul:** 20.000 satırlık sahte Netsis tablosunda senkron bellek patlaması olmadan
tamamlanır; barkod taslak↔ürün arasında tutarlı; arama tüm kayıt kümesinde çalışır.

---

## Faz 4 — İlk kurulum ve saha kullanımı ✅ TAMAMLANDI

**Commit:** `a20990e8`

| # | Sonuç |
|---|---|
| 4.1 | Varsayılan sağlayıcı Netsis |
| 4.2 | Ağ ön koşulları kurulum ekranında + IT listesinde salt-okunur SQL login şablonu |
| 4.3 | **Gerçek müşteri ağında koşulmadı.** Yerelde üç hata senaryosu doğrulandı; ulaşılamayan sunucu 15 sn'de doğru mesaj veriyor. Bu sırada SQL kodu 0'ın yanlış sınıflandığı bulundu ve düzeltildi |
| 4.4 | Otomatik çekim "Kapalı" seçeneğiyle durdurulabiliyor |
| 4.5 | "Satır Ekle" ERP akışında gizlendi, dosya bırakma çalışıyor, TLS etiketi düzeltildi |


**Neden burada:** Motor doğru çalıştıktan sonra sıra "müşteri bunu kendi kendine
kurabiliyor mu" sorusunda. Bu fazın tamamı, ilk kurulumda takılan gerçek adımlar.

| # | İş | Bulgu kaynağı | Efor |
|---|---|---|---|
| 4.1 | **Sağlayıcı varsayılanı Logo değil Netsis olsun.** Form varsayılanı Logo; Logo ürün çekimi henüz yok (Faz 5). Kullanıcı varsayılanla ilerleyip "desteklenmiyor" hatasına çarpıyor. | UX taraması | XS |
| 4.2 | **Ağ ön koşulları kurulum ekranında.** Backend→müşteri 1433, VPN/allowlist, salt-okunur SQL hesabı şablonu bugün yalnızca dokümanda. Bağlantı formunda ön koşul kontrol listesi. | ERP-23 devamı | M |
| 4.3 | **Gerçek WAN üzerinden doğrulama.** Bugüne kadar tüm testler aynı Docker ağında koştu. Gerçek gecikme altında timeout değerleri, yeniden deneme ve kullanıcıya dönen süre ölçülmeli. | SON-DURUM §4 | M |
| 4.4 | **Otomatik senkronu kapatma anahtarı.** Hangfire 15 dk'da bir tarıyor; kapatmanın UI karşılığı yok. Müşteri iş saatleri dışında çalıştırmak isterse çaresiz. | UX taraması | S |
| 4.5 | **UX kalanları:** "Satır Ekle" ile eklenen satır `draftItemIds` eşlemesi olmadığı için sessizce kayboluyor; "sürükleyip bırakın" vaadi var ama drop handler yok; TLS anahtarının etiketi davranışla ters okunuyor. | UX taraması, orta | S |

**Kabul:** Temiz bir ortamda, ERP'yi hiç bilmeyen bir kullanıcı yalnızca ekrandaki
yönlendirmeyle bağlantıyı kurup ilk senkronu tamamlayabilir.

---

## Faz 5 — Logo desteği ve ERP'ye geri yazma

**Neden en sonda:** İkisi de yeni yetenek ve ikisi de müşteri ortamında doğrulama
gerektiriyor. Altındaki 4 faz oturmadan buraya girmek, hata yüzeyini iki katına çıkarır.

| # | İş | Bulgu kaynağı | Efor |
|---|---|---|---|
| 5.1 | **`LogoProductFetcher`.** Bugün Logo seçiliyken sync açık "desteklenmiyor" hatası dönüyor (K12). Logo'nun `LG_ITMUNITA` tablosunda Netsis'in aksine **açık `WIDTH`/`LENGTH`/`HEIGHT` kolonları var** — Netsis'teki `EN`/`BOY`/`GENISLIK` anlam belirsizliği burada yok. | K12 | L |
| 5.2 | **Firma/dönem numarası.** Logo tablo adları `LG_<firma>_<dönem>_ITEMS` biçiminde; firma ve dönem numarası bağlantı ayarlarına alan olarak eklenmeli, yoksa tablo adı kurulamaz. | Logo şeması | S |
| 5.3 | **`KAPATILMIS` semantiği ve `SIRA` offset'i.** Netsis tarafında pasif kayıt filtresi ve satır sırası varsayımları müşteri kurulumunda doğrulanmadan sabitlenmemeli. | GELISTIRME-PLANI §13 | S |
| 5.4 | **Export flag'inin ön koşulları.** `Erp:ExportEnabled` varsayılan kapalı; Netsis'e gerçek yazma **hiç canlı test edilmedi**. Açılmadan önce doğrulanacaklar: `FTIRSIP` fiş tipi, `KAPATILMIS='H'`, `INCKEYNO` identity mi, cari kod sabiti. | K3 / ERP-18 kısmen | M |
| 5.5 | **CI'da `e2e-smoke` doğrulaması.** Job commit'lendi ama gerçek GitHub Actions ortamında hiç koşmadı (aynı runner'da iki MSSQL konteynerinin bellek davranışı belirsiz). | SON-DURUM §4 | S |

**Kabul:** Logo bağlantısıyla ürün çekimi Netsis'le aynı muhasebe invariantını
sağlar; export flag'i yalnızca dört şema varsayımı müşteri ortamında doğrulandıktan
sonra açılır.

---

## Fazların dışında — kod değişikliği değil, operasyon

Bunlar hiçbir faza bağlı değil, **bugün** yapılmalı:

1. **Sızmış Resend API anahtarını rotate et** — `infra/env/.env.test` içinde gerçek bir
   anahtar bulundu. Hem bu makinede hem sunucuda.
2. **Production MSSQL internete açık ve `sa` ile erişiliyor** — ağ seviyesinde
   kapatılmalı; uygulama tarafında yapılabilecek bir şey yok.
3. **DataProtection key ring korumasız** — ERP şifreleri bu anahtarlarla şifreleniyor;
   key ring'in kendisi korunmazsa şifreleme etkisiz.

---

## Bu turda kapanan, listede olmayan maddeler

Raporlarda "açık" görünen ama bu branch'te zaten düzeltilmiş olanlar — tekrar
planlanmasın diye:

- Güncellemeler sekmesinde "Tümünü seç" yanlış statüyü hedefliyordu → `411b1b82`
- ERP güncelleme onayında kendi SKU'su çakışma sayılıp akışı kilitliyordu → `94dfdceb`
- Ölü "Organik" filtre + "Sıvı İçerir"/"Sıvı" etiket bölünmesi → `9fbb709b`
- Tip sütunu gerçek kategoriden okunuyor → `4e1de419`
