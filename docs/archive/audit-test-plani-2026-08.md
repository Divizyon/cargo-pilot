# Cargo Pilot — Denetim Düzeltmeleri Test Planı

**Son güncelleme:** 2026-08-02 · **Durum:** Arşiv

{% hint style="warning" %}
`chore/AUDIT-test-birlesik` dalının manuel QA planıydı; dal `test` branch'ine merge edildi (PR #914 / #916, 2026-08 başı). Tarihsel kayıt olarak arşivde saklanır.
{% endhint %}

**Test edilecek dal:** `chore/AUDIT-test-birlesik`
**Karşılaştırma tabanı:** `dev`

Bu dal on denetim dalının birleşimidir (AUDIT-01…07, 09, 10, 11). Toplam **376 dosya,
+2.071 / −9.448 satır**.

```bash
git fetch origin
git checkout chore/AUDIT-test-birlesik

cd apps/frontend && npm ci && npm run dev
cd apps/backend  && dotnet run --project CargoPilot.WebAPI
```

> **Not:** `apps/backend/global.json` SDK **8.0.419**'a sabit. Makinende yoksa
> `dotnet --list-sdks` ile kontrol et; farklı bir 8.0.x sürümü varsa `global.json`'ı
> geçici olarak kendi sürümüne çekip **commit etmeden** geri al.

---

## Otomatik kapılar (önce bunlar geçmeli)

| Komut | Beklenen |
| --- | --- |
| `cd apps/frontend && npx tsc --noEmit` | 0 hata |
| `cd apps/frontend && npx eslint . --max-warnings 0` | 0 uyarı |
| `cd apps/frontend && npx vitest run` | **14 dosya / 125 test** geçer |
| `cd apps/frontend && npm run build` | Başarılı |
| `cd apps/backend && dotnet build` | **0 hata** (2076 uyarı normal, hepsi CS1591) |

---

## 0. Genel duman testi

Her rotayı tek tek aç, **boş sayfa / konsol hatası / sonsuz spinner olmamalı**. Sayfalar
artık tembel yükleniyor, ilk açılışta kısa bir yükleniyor durumu **normaldir**.

`/` · `/auth/login` · `/auth/register` · `/auth/forgot-password` · `/auth/reset-password`
`/dashboard` · `/products` · `/products/new` · `/products/:id/edit`
`/vehicles` · `/vehicles/new` · `/vehicles/:id/edit`
`/planning` · `/planning/new` · `/planning/:id` · `/planning/shares`
`/reports` · `/reports/:id` · `/erp` · `/notifications` · `/settings`
`/iletisim` · `/gizlilik` · `/kullanim-kosullari` · `/share/:token`

**Neden:** 32 sayfa dosyası klasör değiştirdi ve 30 rota tembel yüklemeye geçti. Yanlış bir
yol yalnızca o rotaya gidilince patlar, derlemede görünmez.

---

## 1. Kırık API çağrıları — AUDIT-01

Bunların hepsi **daha önce çalışmıyordu**, şimdi çalışmalı.

### 1.1 Bildirim okundu işaretleme
1. Zil ikonuna tıkla, okunmamış bildirim seç.
2. Tek bir bildirime tıkla.

**Beklenen:** Bildirim okundu olur, **rozet sayısı azalır**.
**Önce:** Rozet hiç düşmüyordu, hata da göstermiyordu (sessiz kırık).

### 1.2 Plan onaylama
1. Bir yükleme planı aç.
2. "Onayla" butonuna bas.

**Beklenen:** Plan onaylanır.
**Önce:** Her tıklamada "Plan onaylanamadı" hatası.

### 1.3 Abonelik ve kota
1. `/settings` → Abonelik sekmesi.
2. Kota göstergesine bak.

**Beklenen:** Gerçek plan ve gerçek kullanım/limit değerleri görünür.
**Önce:** Herkes "free" görünüyordu, kota kilitleri sessizce devre dışıydı.

⚠️ **Bilinen açık sorun:** Fiyat tablosundaki limitler ile fiili limitler hâlâ uyuşmuyor
(bkz. Bölüm 10). Bu dalda **düzeltilmedi**, kasıtlı.

### 1.4 Şirket üyeleri
1. `/settings` → Kullanıcılar.
2. Üye ekle (rol: Admin veya Operator).
3. Bir üyenin rolünü değiştir.
4. Bir üyenin erişimini kapat.

**Beklenen:** Üçü de çalışır. Rol listesinde **yalnızca Admin ve Operator** olmalı.

### 1.5 Paylaşım sayfası salt-okunur ⭐
1. Bir plandan paylaşım linki üret.
2. Linki **gizli sekmede** (oturumsuz) aç.

**Beklenen:**
- 3D sahne **plan verisiyle dolu** görünür.
- **Hiçbir düzenleme aksiyonu yok** — ürün ekleme, silme, sürükleme, yeniden optimize etme.

**Önce:** Public sayfada tam düzenleme arayüzü açılıyordu **ve** sahne boş geliyordu.
Bu ikisi birlikte en kritik bulgulardan biriydi.

---

## 2. Ürün verisi bozulması — AUDIT-02

### 2.1 Palet yüksekliği gidiş-dönüş ⭐
1. Yeni ürün → tip **Palet**, yükseklik **100 cm** gir, kaydet.
2. Aynı ürünü **düzenlemek için aç**.
3. Yükseklik alanına bak.
4. Hiçbir şey değiştirmeden **tekrar kaydet**, tekrar aç.

**Beklenen:** Her seferinde **100 cm**.
**Önce:** Her kaydet/aç turunda 14 cm artıyordu (100 → 114 → 128 …).

### 2.2 Ondalık ayırıcı
1. Ürün formunda ölçü alanına **virgüllü** değer gir: `12,5`.
2. Kaydet, tekrar aç.

**Beklenen:** 12,5 korunur. Nokta (`12.5`) da çalışmalı.
**Önce:** Virgüllü giriş sessizce bozuluyordu.

### 2.3 Rotasyon izinleri
1. Ürün formunda X/Y/Z dönüş izinlerini farklı kombinasyonlarda ayarla, kaydet, tekrar aç.
2. Özellikle **Y+Z açık, X kapalı** ve **X+Y açık, Z kapalı** kombinasyonlarını dene.

**Beklenen:** Kayıt 400 hatası vermez. Bu iki kombinasyonda sistem **yalnızca Y (Yaw)**
iznine düşer — bu **bilinçli** bir daraltmadır, fazladan dönüş vermek kırılgan ürünü
yasak yüzeye yatırabilirdi.

### 2.4 Varil tipi
1. Tip **Varil** olan bir ürün oluştur, kaydet, tekrar aç.

**Beklenen:** Tip Varil kalır, çap değeri korunur.

### 2.5 Toplu içe aktarımda kısıtlar ⭐
1. Excel şablonunu indir.
2. **Uyumsuz grup** ve **kısıt** kolonlarını doldur.
3. İçe aktar, sonra ürünlerden birini aç.

**Beklenen:** Uyumsuz gruplar ve kısıtlar **kaydedilmiş** olmalı.
**Önce:** Toplu aktarımda bu iki alan sessizce düşüyordu.

---

## 3. Güvenlik — AUDIT-03

### 3.1 Pasif kullanıcı girişi ⭐
1. Bir kullanıcıyı pasife al.
2. O kullanıcıyla giriş yapmayı dene.
3. **Ayrıca:** Kullanıcı zaten girişliyken pasife al, sonra sayfayı yenile / token yenilensin.

**Beklenen:** İkisinde de giriş engellenir, oturum devam etmez.
**Önce:** Pasif kullanıcı hem giriş yapabiliyor hem mevcut oturumunu sürdürebiliyordu.

### 3.2 Paylaşım linki süresi ⭐
1. Süresi **dolmuş** bir paylaşım linki aç (veya süreyi geçmişe çek).

**Beklenen:** "Süresi dolmuş" mesajı, **plan verisi görünmez**.
**Önce:** Süresi geçmiş token tam planı döndürüyordu.

### 3.3 Paylaşım linki yönetimi (yeni)
1. `/planning/shares` aç.
2. Linkleri listele, birini **sil**.
3. Silinen linki aç.

**Beklenen:** Liste gelir, silme çalışır, silinen link artık açılmaz.
**Önce:** Link bir kez üretilince **kalıcı olarak public**'ti, iptal yolu yoktu.

### 3.4 Hız sınırı
1. Bir paylaşım linkini arka arkaya hızlıca **60+ kez** yenile.

**Beklenen:** Bir noktadan sonra 429 döner.

### 3.5 Ödeme — kart numarası ⭐
1. Abonelik yükseltme ekranını aç, kart formunu doldur.
2. Tarayıcı **Ağ (Network)** sekmesinde isteğin gövdesine bak.

**Beklenen:** Gövdede **ham kart numarası olmamalı**; yalnızca `tok_<son4>` gibi
tokenlanmış değer gitmeli.

### 3.6 Refresh token saklama (kod incelemesi)
Veritabanındaki `RefreshTokens` tablosunda token'lar artık **SHA-256 özet** olarak
tutuluyor, düz metin değil. Elle test edilemez; DB'ye bakılarak doğrulanabilir.

---

## 4. Yanıltıcı bilgi — AUDIT-04

### 4.1 Rapor filtresi ⭐
1. `/reports` aç.
2. **Minimum doluluk oranı** filtresine `%50` gir.

**Beklenen:** Doluluk oranı %50 üstü planlar listelenir.
**Önce:** `%2` bile girilse **her zaman sıfır satır** dönüyordu.

### 4.2 ERP senkronizasyonu artık dürüst ⭐
1. `/settings` → ERP sekmesi → "Şimdi senkronize et".

**Beklenen:** **Açık bir "desteklenmiyor" hatası** döner.
**Önce:** Hiçbir şey yapmadan durumu "Tamamlandı" yapıp tarih damgalıyordu — sahte başarı.

### 4.3 ERP'ye aktarım
1. Bir planı onayla, ERP'ye aktarmayı dene.

**Beklenen:** Açık hata mesajı.
**Önce:** Hiçbir şey gönderilmeden "aktarıldı" deniyor ve plan işaretleniyordu.

### 4.4 İçe aktarım sayacı
1. Excel ile ürün içe aktar.

**Beklenen:** "N ürün aktarıma hazır" — **"X atlandı" ifadesi görünmemeli** (o sayı her zaman 0'dı).

### 4.5 İletişim formu
1. `/iletisim` → formu doldur ve gönder.

**Beklenen:** Gerçekten gönderilir.
**Önce:** Form hiçbir yere gitmiyordu.

### 4.6 Saat dilimi ayarı
1. `/settings` → Bölgesel → saat dilimini değiştir.
2. **Sayfayı yenile.**

**Beklenen:** Seçim korunur.
**Önce:** Yenileyince sıfırlanıyordu.

### 4.7 Rapor doluluk oranları
1. Bir rapor detayı aç.

**Beklenen:** "Ağırlık Doluluk Oranı" ve "Hacim Doluluk Oranı" **ayrı ayrı ve doğru
yüzdelerle** görünür (ör. %78, %0,78 değil).

---

## 5. Rol ve yetki — AUDIT-05

Test için **en az iki hesap** gerekir: bir **şirket yöneticisi**, bir **düz üye**.

### 5.1 Ayar sekmelerinin gizlenmesi ⭐
Düz üye ile giriş yap:
1. `/settings` aç → yönetici sekmeleri **görünmemeli**.
2. Adres çubuğuna elle `/settings?tab=erp-baglanti` yaz.
3. `/settings?tab=abonelik` dene.

**Beklenen:** İkisinde de **varsayılan sekmeye düşer**, ERP bağlantı formu veya abonelik
ekranı açılmaz.
**Önce:** Düz üye URL'yi elle yazarak ERP bağlantı formunu açabiliyordu.

### 5.2 Rol adları
1. Yönetici ile `/settings` → Kullanıcılar.

**Beklenen:** Roller doğru görünür ve yönetici aksiyonları yalnızca yöneticide aktif.

### 5.3 ERP kullanıcı eşleştirme
1. Yönetici ile ERP eşleştirme ekranını aç.

**Beklenen:** Yazma aksiyonları yalnızca yöneticide açık.

---

## 6. Performans — AUDIT-06

### 6.1 İlk yükleme boyutu ⭐
1. Tarayıcı **Ağ** sekmesi → önbelleği devre dışı bırak.
2. `/` (landing) sayfasını aç.

**Beklenen:** İlk JS yükü **~238 KB gzip** civarı.
**Önce:** ~990 KB gzip. Ziyaretçi 3D motorunu ve Excel kütüphanesini de indiriyordu.

`three.module`, `xlsx` ve `react-pdf` chunk'ları **yalnızca ilgili sayfaya girilince**
inmeli — landing'de inmemeli.

### 6.2 Panel istekleri
1. Ağ sekmesi açıkken `/dashboard` aç.
2. Başka sekmeye geç, geri dön.

**Beklenen:** Aynı plan listesi isteği **iki kez gitmez**; geri dönünce hemen yeniden
istek atılmaz (60 sn tazelik süresi).

### 6.3 Optimizasyon üst sınırı ⭐
1. Yeni plan oluştur, toplam **500'den fazla** kutu ekle (ör. 6 üründen 100'er adet).
2. Optimize et.

**Beklenen:** Anlaşılır bir **doğrulama hatası** ("en fazla 500 kutu").
**Önce:** Sınır yoktu; istek sunucuyu uzun süre meşgul edebiliyordu.

### 6.4 Optimizasyon iptali
1. Büyük ama sınır altı bir plan optimize etmeye başla.
2. İşlem sürerken **sekmeyi kapat / sayfadan çık**.

**Beklenen:** Sonradan "Optimizasyon başarısız" bildirimi **gelmemeli**.

### 6.5 Denge iyileştirmesi — istiflenebilirlik ⭐
1. **İstiflenemez** işaretli en az bir ürün oluştur.
2. Bu ürünü içeren bir plan optimize et.
3. 3D sahnede o ürünün **üstünü** kontrol et.

**Beklenen:** İstiflenemez kutunun üzerinde **hiçbir kutu olmamalı**.
**Önce:** Denge iyileştirme aşaması istiflenebilirliği atlıyor ve ilk aşamanın reddedeceği
bir yerleşim üretebiliyordu.

### 6.6 Araç dışa aktarımı
1. `/vehicles` → dışa aktar.

**Beklenen:** Tüm araçlar gelir, **tek istekle** (Ağ sekmesinde sayfa sayfa istek olmamalı).

---

## 7. Klasör yeniden yapılandırma — AUDIT-07

**Bu adımda hiçbir davranış değişmedi.** 67 ölü dosya silindi, 142 dosya taşındı.
Amaç: **hiçbir şeyin bozulmadığını** doğrulamak.

Bölüm 0'daki tüm rotaları gez, ayrıca:

1. Ürün oluştur / düzenle / sil
2. Araç oluştur / düzenle / sil
3. Plan sihirbazını uçtan uca çalıştır — **3D sahne render oluyor mu**
4. **Plan PDF'i indir** ⭐ (dinamik import; yanlış yol yalnızca burada patlar)
5. **Excel dışa aktar** (ürün + araç + plan)
6. Ayar sekmelerini tek tek gez
7. Paylaşım linki üret ve `/share/:token` aç

### Kaldırılan geliştirici araçları
- Giriş ekranındaki **"[DEV] Hızlı Giriş"** butonu kaldırıldı — artık görünmemeli.
- Plan panelindeki **"Stres Testi (500)"** butonu kaldırıldı.
- Yanındaki **"Temizle"** butonu **duruyor** (dev modunda görünür).

---

## 8. Backend doğrulama pipeline'ı — AUDIT-09 ⭐

36 handler'daki kopya doğrulama bloğu tek bir MediatR pipeline'ına taşındı.
**Doğrulama davranışı her endpoint'te aynı kalmalı** — ama dört yerde **yenidir**.

### 8.1 Genel doğrulama regresyon testi
Aşağıdaki formların her birine **kasıtlı hatalı veri** gir (boş zorunlu alan, negatif ölçü,
çok uzun metin) ve hata mesajının hâlâ geldiğini doğrula:

- Ürün oluştur / güncelle
- Araç oluştur / güncelle
- Plan oluştur / yeniden optimize et
- Grup oluştur / güncelle
- Şifre değiştir
- Profil güncelle
- Paylaşım linki oluştur

**Beklenen:** Hepsinde 400 ve anlaşılır hata. Yanıt gövdesinde `validationErrors` listesi olur.

### 8.2 YENİ uygulanan kurallar ⭐⭐
Bu dört doğrulama **daha önce yazılmış ama hiç çalışmıyordu**. Artık çalışıyor:

| Test | Beklenen |
| --- | --- |
| Şirket kullanıcısı ekle, şifre **7 karakter** | **Reddedilir** (en az 8) |
| Şirket kullanıcısı ekle, rol **Admin/Operator dışında** | **Reddedilir** |
| Şirket kullanıcısı ekle, e-posta formatı bozuk | Reddedilir |
| ERP bağlantısını **boş sunucu adresi** ile test et | Reddedilir |
| ERP ayarlarını **boş şirket kodu** ile kaydet | Reddedilir |
| Plan onayla, **boş PlanId** ile | Reddedilir |

**Önce:** Bunların hiçbiri uygulanmıyordu — tek karakterlik şifreyle veya keyfi rolle
şirket kullanıcısı oluşturulabiliyordu.

⚠️ **Dikkat:** Eğer ekipte **8 karakterden kısa şifreyle** oluşturulmuş kullanıcılar veya
Admin/Operator dışında rolü olan kayıtlar varsa, bu kayıtlar **güncellenirken** artık
reddedilebilir. Test sırasında özellikle bunu kontrol et.

### 8.3 Toplu ürün işlemleri (kapsam dışı bırakıldı)
1. Excel ile **hatalı satırlar içeren** ürün dosyası aktar.

**Beklenen:** Hata mesajları **satır numarası ile** gelir (`[3].SKU` gibi). Bu iki uç
bilinçli olarak eski yönteminde bırakıldı, davranış değişmemeli.

### 8.4 Raporlama ayarları — yanıt şekli değişti
1. `/settings` → Raporlama → **hatalı** veri ile kaydet (ör. çok büyük logo).

**Beklenen:** Hata gelir. **Değişen:** Hata mesajı artık üst seviyedeki `message` alanı
yerine `validationErrors` listesinde. Arayüzde mesaj görünmüyorsa **bunu bildir**.

---

## 8A. Kullanılmayan kod temizliği — AUDIT-10

**Davranış değişmedi.** 56 kullanılmayan export ve bunlarla öksüz kalan 14 yardımcı silindi
(net 584 satır). Amaç: hiçbir canlı akışın etkilenmediğini doğrulamak.

### 8A.1 ERP ekranları
1. `/settings` → ERP sekmesi: bağlantı ayarları, senkron ayarları, senkron geçmişi.
2. ERP ürün alım kuyruğu (`/erp`).
3. ERP eşleştirme ekranı — **bekleyen** bir eşleştirmeyi onayla.
4. **Kayıtlı** bir eşleştirmeyi düzenle.

**Beklenen:** İkisi de çalışır. Onaylamada "Eşleştirme kaydedildi", düzenlemede
"Eşleştirme güncellendi" mesajı çıkar.

**Değişen:** Bu iki işlem aynı isteği atan iki ayrı hook'tu, tek hook'a indirildi.
Düzenleme sonrası artık bekleyen eşleştirme listesi de tazeleniyor — fazladan bir
yenileme, kaydetme zaten böyle çalışıyordu.

### 8A.2 Bildirimler
1. Bildirim listesi, okundu işaretleme, tekil silme.

**Beklenen:** Hepsi çalışır. Toplu silme arayüzü zaten yoktu, kodu da kaldırıldı.

### 8A.3 Ürün ve araç formları
1. Ürün oluştur/düzenle, araç oluştur/düzenle.

**Beklenen:** Ölçü birimleri, kırılganlık seçimi ve dingil doğrulaması aynı çalışır.

---

## 8B. lib/ klasör düzeni — AUDIT-11

**Davranış değişmedi.** 39 dosya taşındı, içerikleri aynı. Yalnızca **import yolları** ve
bir ESLint kuralının kapsamı değişti.

Doğrulama için Bölüm 0 + Bölüm 7'yi tekrarlamak yeterli. Ek olarak özellikle şunlar:

| Alan | Neden riskli |
| --- | --- |
| **3D sahne** (`/planning/new`) | `BoxWrapper`, `LandingWireframe` ve Three.js kaynak yönetimi taşındı |
| **Plan PDF indirme** | PDF yardımcıları `utils/export/` altına taşındı |
| **Excel dışa aktarım** (ürün, araç, plan) | Aynı klasöre taşındı |
| **Ödeme formu** | Kart biçimleme ve Luhn doğrulaması billing feature'ına taşındı — kart numarası maskesi ve geçersiz kart uyarısı çalışmalı |
| **Araç dingil alanları** | Dingil doğrulaması vehicles feature'ına taşındı |
| **Panel karşılama ve istatistik kartları** | Selamlama metni ve değişim yüzdesi biçimleyicileri taşındı |

⚠️ **3D sahnede kutular render olmuyorsa** bu taşımayla ilgilidir, öncelikli bildir.

---

## 9. Ölü kod silme kontrolü

Silinen dosyaların gerçekten kullanılmadığını doğrula — aşağıdakiler **hâlâ çalışmalı**:

| Ekran | Not |
| --- | --- |
| Araç listesi ve filtreleri | 17 eski araç bileşeni silindi, canlı olanlar kaldı |
| Ürün kartları / tablosu | |
| Panel istatistik kartları ve grafikleri | 5 ölü bileşen silindi |
| Üye ekleme diyaloğu | İki farklı sürümden ölü olan silindi |
| Ödeme diyaloğu | `PaymentCheckout` (ölü) silindi, `PaymentCheckoutDialog` (canlı) kaldı |
| Raporlama ayarları sekmesi | Aynı adlı iki dosyadan ölü olan silindi |

---

## 10. ⚠️ Bilinen açık sorunlar — bu dalda DÜZELTİLMEDİ

Bunlar test sırasında görülecek, **yeni hata olarak raporlanmasın**.

### 10.1 Abonelik limitleri dört yerde farklı ⭐
Free plan için sistem dört farklı şey söylüyor:

| Kaynak | plan | araç | ürün |
| --- | --- | --- | --- |
| Fiili engelleme | 10 | 10 | 50 |
| Kota göstergesi | 10 | 10 | 50 |
| `plans` API ucu | 1000 | 1000 | 1000 |
| **Kullanıcının gördüğü fiyat tablosu** | **3 / ay** | **1** | 50 |

Ayrıca:
- `GET /api/v1/subscriptions/plans` ucu **frontend'de hiç çağrılmıyor**; fiyat tablosu koda gömülü.
- Frontend **Starter (₺499)** planı satıyor ama backend'de böyle bir kademe **yok**.
- Plan kotası **ömür boyu**, arayüzde yazdığı gibi **aylık değil**.

Bu bir ürün kararı gerektirdiği için bilinçli olarak ertelendi.

### 10.2 Optimizasyon hâlâ istek içinde senkron
Üst sınır ve iptal eklendi ama hesap hâlâ HTTP isteği içinde çalışıyor. Arka plan işine
taşınması ayrı bir iş.

### 10.3 Backend'de test yok
Test projesi yok, CI yalnızca `restore` + `build` çalıştırıyor. Bölüm 8'deki elle testler
bu yüzden **kritik**.

---

## Bulduğun hatayı nasıl bildir

```
Bölüm    : (ör. 2.1 Palet yüksekliği)
Rota/Ekran:
Adımlar  : 1. ... 2. ... 3. ...
Beklenen :
Gerçekleşen:
Konsol/Ağ: (hata mesajı, istek + yanıt gövdesi)
Ekran görüntüsü:
```

## Öncelik sırası (zaman kısıtlıysa)

1. **Bölüm 0** — tüm rotalar açılıyor mu (en geniş regresyon riski)
2. **Bölüm 8.2** — yeni uygulanan doğrulama kuralları (davranış değişikliği)
3. **Bölüm 1.5** — paylaşım sayfası salt-okunur
4. **Bölüm 2.1 / 2.5** — ürün verisi bozulması
5. **Bölüm 6.5** — istiflenemez ürünün üstüne kutu konmaması
6. **Bölüm 8B** — 3D sahne render'ı ve plan PDF indirme (en çok dosya taşınan alan)
7. **Bölüm 8A.1** — ERP eşleştirme onaylama ve düzenleme
8. Kalanlar
