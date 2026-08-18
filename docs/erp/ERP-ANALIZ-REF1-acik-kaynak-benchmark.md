# REF1 — Logo/Netsis ERP Entegrasyon Repoları: Yapılandırılmış Araştırma Özeti

> Kaynak: `C:/Users/ASUS/Downloads/Logo ve Netsis ERP Repoları.md` (deep-research raporu, 198 satır, tamamı okundu).
> Bu dosya diğer agentların referansı için kendi kendine yeterli olacak şekilde hazırlanmıştır.
> **Önemli not:** Kaynak rapor ağırlıklı olarak **Logo** (Tiger/Go/Bulut ERP/J-Platform) ekosistemini analiz etmektedir. Netsis tarafı yalnızca `SmIntegration-dotnet` (StockMount) üzerinden ve NDI/NetOpenX kütüphaneleri düzeyinde geçmektedir; raporda `TBLSTSABIT` gibi Netsis tablo/kolon detayları YER ALMAMAKTADIR. Aşağıda raporda gerçekten geçen bilgiler işlenmiş, raporda olmayan hususlar açıkça işaretlenmiştir. Logo desenlerinin çoğu Netsis entegrasyonuna birebir taşınabilir niteliktedir (ölçüt listesinde bu eşlemeler belirtilmiştir).

## 0. İncelenen Repolar (Raporun Envanteri)

| Repo | Geliştirici | Teknoloji | Hedef ERP | Kapsam |
| --- | --- | --- | --- | --- |
| erpnext-logo-tiger-integration | Logedosoft | Python 3.10+ (Frappe/bench) | Logo Tiger 3 / Enterprise / Wings | ERPNext ↔ Logo çift yönlü stok, cari, sipariş, fatura senkronizasyonu; e-Fatura/e-İrsaliye |
| SmartSheetBulutERPApi | Dogukan Kosan | C# (.NET Framework 4.7.2) | Logo Bulut ERP | Smartsheet gider tabloları → Logo; REST API + dinamik SQL; otomatik token yönetimi; 3 aşamalı onay |
| Logo_J-Platform_Rest_Service | Dogukan Kosan | C# WinForms | Logo J-Platform | REST API ile malzeme yönetimi, Excel toplu aktarım + header validasyonu, AI zenginleştirme (Gemini, Stability AI) |
| UTSLogoEntegrasyon | Dogukan Kosan | C# (RESTful Web API + masaüstü) | Logo Tiger/Go | Sağlık Bakanlığı ÜTS API ↔ Logo; doğrudan SQL; UNO/LOT senkronizasyonu; PTSNOTICE kayıtları |
| logo-tiger-araclar | Canberk Doger | Node.js (TypeScript) | Logo Tiger 3 | 557 tabloluk şema gezgini, LLM/AI uyumlu SQL üretim API'si, placeholder sistemi |
| SmIntegration-dotnet | StockMount | C# .NET | **Netsis**, Logo (Go/Tiger), Mikro | E-ticaret ↔ ERP genel maksatlı Web API haberleşme altyapısı; sipariş/stok köprüsü |

Teknoloji eğilimi: DB seviyesinde yüksek hacimli/düşük gecikmeli işler ve yerel OS kaynakları (donanım lisansı, Excel) → C#/.NET; bulut-ERP'ye veya LLM agent'lara dışa dönük API → Python/Node.js.

---

## 1. Netsis Tarafı: Tablolar, Kütüphaneler ve Raporun Sınırları

**Raporda gerçekten geçenler:**
- Netsis'in geleneksel entegrasyon yolu, doğrudan SQL tablolarını manipüle eden nesne yönelimli sarmalayıcılar (wrapper) üzerindendir: **NDI (Netsis Data Inspector)** ve **NetOpenX** kütüphaneleri.
- `SmIntegration-dotnet` (StockMount), Netsis ile e-ticaret platformları arasında sipariş ve stok köprüsünü **düşük gecikme (low-latency) / doğrudan DB erişim** stratejisiyle kurar; REST serileştirme yükünden kaçınılır.
- Netsis, Logo çatısı altında ayrı bir ürün ailesi olarak konumlanır (Logo Tiger/Go/J-Platform/Bulut ERP yanında).

**Raporda YER ALMAYAN ama görev bağlamında bilinmesi gereken (rapor-dışı, genel alan bilgisi olarak işaretli):**
- Raporda `TBLSTSABIT` (Netsis stok sabit kartı), `TBLCASABIT` (cari sabit), `TBLFATUIRS` vb. Netsis tablo adları ve kolon açıklamaları **bulunmamaktadır**. Netsis tarafı için tablo-düzeyi benchmark, bu rapordan değil Netsis şema dokümantasyonundan/NetOpenX API sözleşmelerinden çıkarılmalıdır.
- Netsis'te şema mantığı Logo'dan farklıdır: tablolar `LG_XXX_` öneki yerine `TBL...` adlandırmasıyla, firma ayrımı ise ayrı veritabanı/şirket DB'si üzerinden yürür (rapor bunu detaylandırmaz).

**Benchmark açısından çıkarım:** Logo için raporda kanıtlanan desenler (aktiflik filtresi, kart tipi filtresi, placeholder/dinamik şema soyutlaması, pre-flight validasyon, duplicate kontrolü) Netsis'e eşdeğer kavramlarla uygulanmalıdır: `ACTIVE=0` ↔ Netsis'te kilit/pasif bayrakları, `CARDTYPE` ↔ Netsis stok kart tipi/grup kodları, `LG_XXX_` placeholder ↔ Netsis şirket veritabanı seçimi.

---

## 2. Logo Tarafı: Tablolar, Dinamik Şema, Placeholder Mekanizmaları

### 2.1 Dinamik şema — firma/dönem mantığı
- Tüm tablolar `LG_` öneklidir. İki grup:
  1. **Dönemsiz (firma bazlı) tablolar** — master data (stok kartı, cari kartı): `LG_FİRMANO_TABLOADI` → örn. `LG_001_ITEMS`, `LG_001_CLCARD`.
  2. **Dönemli (firma + dönem bazlı) tablolar** — transactional (fatura, sipariş, banka/kasa hareketleri): `LG_FİRMANO_DÖNEMNO_TABLOADI` → örn. `LG_001_01_INVOICE`.
- **Hardcoded tablo adı = mimari çöküş garantisi** (raporun açık yargısı). Firma/dönem her müşteri kurulumunda değişir.

### 2.2 Placeholder mekanizmaları
- `logo-tiger-araclar`: SQL şablonlarında `XXX` (3 haneli firma no) ve `XX` (2 haneli dönem no) yer tutucuları; runtime'da kullanıcının seçtiği aktif firma/döneme göre `LG_XXX_XX_INVOICE` → `LG_001_02_INVOICE` çevirisi.
- `SmartSheetBulutERPApi`: Logo Bulut ERP REST metoduna gömülen dinamik SQL'de `$V(firm)` değişkeni (örn. `U_$V(firm)_ITEMS`, `LG_$V(firm)_01_INVOICE`). Tek kod tabanı, kod değişikliği olmadan çok firma destekler.

### 2.3 Kritik tablolar ve kolonlar

**LG_XXX_ITEMS (stok kartı / ürün master):**

| Kolon | Tip | Anlam | Entegrasyon işlevi |
| --- | --- | --- | --- |
| LOGICALREF | INT | Birincil anahtar | Güncelleme ve diğer tablolara (fatura satırı) JOIN referansı |
| CODE | CHAR(26) | Stok kodu | Dış sistem SKU eşleştirmesi (benzersiz metin anahtar) |
| NAME | CHAR(51) | Stok adı | Okunabilir ad; AI çeviri girdisi |
| CARDTYPE | SMALLINT | Kart türü | **Validasyonun kalbi:** 1=Ticari Mal, 4=Sabit Kıymet, 10=Hammadde, 11=Yarı Mamul, 12=Mamul. Sadece ilgili tür filtrelenerek çekilir |
| ACTIVE | SMALLINT | Durum | 0=Aktif, 1=Pasif. **`WHERE ACTIVE = 0` zorunlu filtre**; yoksa kullanımdan kalkan ürünler hedefe akar |
| VAT | FLOAT | KDV oranı | Vergi oranı aktarımı |
| TRACKTYPE | BYTE | İzleme | 0=Yok, 1=Lot, 2=Seri No. ÜTS gibi projeler 1/2 olanları izler |
| SHELFLIFE | DOUBLE | Raf ömrü | SKT hesaplaması (sağlık/gıda) |
| IMAGEINC | BYTE | Görsel var mı | 1=Evet, 0=Hayır; AI görsel üretim tetikleyicisi |

Rapor vurgusu: `CARDTYPE` ve `TRACKTYPE` basit veri taşıyıcı değil, **iş mantığı yönlendiricisi** (business logic driver).

**LG_XXX_CLCARD (cari hesap / müşteri-tedarikçi):**

| Kolon | Tip | Anlam / rol |
| --- | --- | --- |
| LOGICALREF | INT | Cari anahtarı; fatura tablosundaki `CLIENTREF` ile JOIN |
| CODE | CHAR(16) | Cari kodu; e-posta veya TCKNO üzerinden bulunan carinin işlem anahtarı |
| CARDTYPE | SMALLINT | 1=Alıcı, 2=Satıcı, 3=Alıcı+Satıcı. Müşteri sync: 1 ve 3; tedarikçi sync: 2 ve 3 |
| EMAILADDR | CHAR(51) | E-posta; dış form verisiyle "email bazlı cari eşleştirme" |
| ACTIVE | SMALLINT | 0=Aktif, 1=Pasif; kapalı hesap filtreleme |

**LG_XXX_XX_INVOICE (fatura başlık) ve LG_XXX_XX_STLINE (fatura kalemleri/stok hareketleri):** dönemli tablolar. Örnek JOIN deseni:

```sql
SELECT CLCARD.CODE AS CARI_KODU,
       INVOICE.FICHENO AS FATURA_NO,
       INVOICE.NETTOTAL AS FATURA_TOPLAM_TUTAR_TL
FROM LG_$V(firm)_01_INVOICE INVOICE
LEFT JOIN LG_$V(firm)_CLCARD CLCARD ON INVOICE.CLIENTREF = CLCARD.LOGICALREF
WHERE INVOICE.TRCODE IN (1, 2, 3)
```

- **TRCODE (işlem kodu) fatura yönünü belirler:** 1=Alış, 2=Perakende Satış, 3=Toptan Satış, 4=Alış İade, 5=Satış İade. Satış senkronizasyonu yalnız TRCODE 2,3; alım aktarımı yalnız TRCODE 1 filtrelemek **zorundadır** — aksi halde hedef ERP'de mali raporlar ters çalışır (ölümcül muhasebe hatası).
- Diğer geçen tablolar: `LG_ORFICHE` (satış siparişi → ERPNext Sales Order), `LG_STFICHE` (fiş başlıkları → Sales Invoice), `LG_XXX_PTSNOTICE` (Paket Takip Sistemi bildirimleri), `U_$V(firm)_ITEMS` (Bulut ERP tarafı ürün görünümü, `BOSTATUS` kolonu ile).
- Değişiklik zamanı alanları: `LASTMODIFIED` / `CAPIBLOCK_CREATEDDATE` benzeri timestamp kolonları (çakışma çözümünde kullanılır).

---

## 3. Bağlantı Mimarileri

Rapor üç bağlantı topolojisi ayırt eder:

### 3.1 Modern REST API + token yaşam döngüsü (bulut / on-prem REST)
- Logo Bulut ERP, Tiger Wings, J-Platform dışa açık RESTful mimari sunar.
- **Token tabanlı yetkilendirme + proaktif yenileme:** `SmartSheetBulutERPApi/BulutERPService.cs` içindeki `EnsureValidTokenAsync()` metodu token süresini arka planda izler; **süre dolmadan 5 dakika önce** refresh isteği gönderir. Gerekçe: binlerce kayıtlık toplu aktarım sırasında token biterse işlem yarıda kesilir (timeout) ve tutarlılık (consistency) kaybolur.
- **Gizli bilgi yönetimi:** ERP kullanıcı şifreleri yerelde düz metin değil, `EncryptionHelper.cs` ile şifrelenmiş saklanır.
- **Donanım lisanslaması:** `MachineIdHelper.cs` makine donanım kimliğini (Hardware ID) hesaplar, `LicenseApiClient.cs` ile lisans sunucusunda doğrulatır — ek izolasyon/yetkilendirme katmanı.

### 3.2 Hibrit model: REST tüneli üzerinden dinamik SQL
- Hazır endpoint'ler yetersizse, özel SQL sorgusu REST API üzerinden (`executeSelectQuery`) ERP veritabanına iletilir.
- Kazanım: **bant genişliği optimizasyonu** — filtreleme istemci tarafında değil SQL Server'da yapılır, yalnızca filtrelenmiş küçük JSON payload döner.
- `$V(firm)` placeholder'ı bu dinamik SQL içinde çok-firma izolasyonu sağlar.

### 3.3 Doğrudan SQL Server bağlantısı (on-prem)
- Gerçek zamanlı hız kritikse ve REST gecikmesi tolere edilemiyorsa: `UTSLogoEntegrasyon` doğrudan SQL Server 2016+'ya `SQLCrud.cs` üzerinden bağlanır (ADO.NET / Entity Framework).
- Kullanım örneği: binlerce LOT numarasının `LG_XXX_YY_STLINE`'dan anlık okunup ÜTS'ye bildirilmesi, dönen tarihlerin `LG_XXX_PTSNOTICE`'a milisaniyeler içinde yazılması (I/O-intensive).
- **Netsis eşdeğeri:** `SmIntegration-dotnet` aynı düşük gecikme stratejisini NDI/NetOpenX sarmalayıcılarıyla uygular.
- Genel çıkarım: on-prem yüksek hacim → doğrudan DB; bulut/SaaS → REST + token; ikisinin arası → REST tünelli SQL. Rapor ayrıca bulut SaaS ürünün on-prem DB'ye erişimi için ara katman (middleware/agent) ihtiyacına işaret eder (repolar masaüstü/servis aracı yazılımlar olarak bu köprü rolünü üstlenir).

---

## 4. Senkronizasyon Desenleri

- **Tek yönlü vs çift yönlü:** Çoğu repo tek yönlü köprüdür (Smartsheet→Logo, Logo→ÜTS). `erpnext-logo-tiger-integration` Türkiye pazarındaki nadir **çift yönlü (two-way)** açık kaynak örnektir: stok, cari, sipariş, fatura.
- **Alan haritalama (field mapping):** `LG_ITEMS` → ERPNext Item; `LG_CLCARD` → Customer/Supplier; `LG_ORFICHE` → Sales Order; `LG_STFICHE` → Sales Invoice. Eşlemeler açık ve belgelidir.
- **Çakışma çözümü (conflict resolution):** İki sistemde aynı kayıt eşzamanlı değişirse, "otomatik çakışma çözümü" — endüstride tipik uygulama **timestamp kıyaslaması** (`LASTMODIFIED` / `CAPIBLOCK_CREATEDDATE` benzeri alanlar): en son değiştirilen kazanır (last-write-wins), diğerinin üzerine yazılır. (Rapor kod düzeyinde detayın verilmediğini not eder; proje bunun için hata yönetimi/log sistemini yol haritasında tutar.)
- **Tetikleyiciler:** Zamanlanmış görevler (cron) ile tam otonom + komut satırından manuel tetikleme: `bench --site yoursite.com execute tiger_integration.sync.sync_items`. Manuel tetikleme, bakım pencereleri için yöneticiye kontrol sağlar.
- **Idempotency / mükerrer önleme:** `CheckInvoiceExistsAsync()` — fiş no (`SLIPNR`) + cari referans (`ARPREF`) ikilisi hedefte zaten varsa satır **mükerrer** işaretlenip atlanır, sonraki kayda geçilir. Retry senaryolarında (bağlantı kopması) çift kayıt oluşumunu engeller. Ek olarak yerel SQLite cache (bkz. §6) başarılı gönderimlerin tekrarını önler.
- **Delta/incremental:** Rapor açık bir rowversion/changetracking mekanizması betimlemez; delta yaklaşımı (a) timestamp alanları ve (b) yerel cache'te "zaten gönderilmiş kayıtlar" listesi (`UTSCekimKayitlari`) üzerinden dolaylı sağlanır. Full-sync yerine yerel state ile filtreleme deseni açıkça belgelidir.
- **Batch/sayfalama:** Rapor açık sayfalama detayı vermez; "binlerce kayıtlık toplu aktarım" senaryolarını token-refresh ve Excel toplu aktarım bağlamında ele alır. Filtrelemenin sunucu tarafında (SQL) yapılması payload'u küçültme deseni olarak geçer.
- **Yön ayrımı zorunluluğu:** TRCODE filtresi olmadan yapılan fatura sync'i yön karışmasına ve ters mali kayıtlara yol açar (bkz. §2.3).

---

## 5. Validasyon Stratejileri

1. **Zorunlu satır filtreleri (kaynaktan çekerken):**
   - `ACTIVE = 0` (aktif kart) — hem ITEMS hem CLCARD için zorunlu.
   - `CARDTYPE` filtresi — yalnızca hedef senaryoya uygun kart türleri (örn. ürün sync'inde ticari mal/mamul; müşteri sync'inde CARDTYPE 1,3).
   - `TRCODE` filtresi — fatura yönü.
   - `TRACKTYPE` filtresi — lot/seri takibi gereken senaryolarda (ÜTS).
   - `BOSTATUS <> 1` (Bulut ERP) — iptal/kilitli kart aktarıma alınmaz.
2. **Pre-flight check (yazmadan önce hedefte doğrulama):** `GetMalzemeCardTypeAsync()` — dış sistemden gelen ürün kodu Logo'da sorgulanır (`SELECT CARDTYPE FROM U_$V(firm)_ITEMS WHERE BOSTATUS<>1 AND CODE='MAL001'`). Kart kilitliyse aktarım durdurulur. Dönen `CARDTYPE`'a göre fiş türü otomatik seçilir: satırlarda en az bir ticari mal (CARDTYPE=1) varsa "Satınalma Fişi" (Type 1), tamamı hizmet kartıysa "Hizmet Fişi" (Type 4). İnsansız aktarımda muhasebe hatası riskini sıfırlayan endüstriyel benchmark.
3. **Mükerrer kontrolü:** `CheckInvoiceExistsAsync()` (SLIPNR + ARPREF) — bkz. §4.
4. **İnsan merkezli onay zinciri:** 3 katmanlı onay (Muhasebe / Yönetici / Supervisor) tamamlanmadan veri ERP'ye yazılmaz; kayıt sahibi **e-posta bazlı cari eşleştirme** (`GetCariKoduByEmailAsync()`) ile bulunur.
5. **Dosya/format validasyonu (toplu import):** `ExcelHeaderValidator.cs` — Excel başlıkları ERP'nin beklediği kolon yapısıyla örtüşmüyorsa işlem **başlamadan** reddedilir.
6. **Hatalı satır yönetimi ve görünürlük:** satır bazlı durum renklendirmesi — Yeşil (başarılı), Sarı (veri modifiye edilerek uyumlandırıldı / uyarı), Kırmızı (bağlantı veya validasyon hatası). Binlerce satırlık yığında hatalı kaydın anında tespiti. Hatalı satır tüm aktarımı düşürmez; satır bazında işaretlenir/atlanır.

---

## 6. Hata Yönetimi, Retry, Loglama, Yerel Önbellek

- **Yerel durum yönetimi (stateful buffer):** Üç projede ortak `SQLiteCrud.cs` + yerel `Settings.db`. Örnek: ÜTS'ye başarıyla bildirilen her LOT/ürün yerel `UTSCekimKayitlari` SQLite tablosuna yazılır → uygulama yeniden açıldığında geçmiş kayıtlar ERP'ye/dış API'ye tekrar sorulmaz; API trafik maliyeti dramatik düşer, retry'da mükerrer bildirimi engeller.
- **Metin loglama:** `TextLog.cs` ile genel olay günlüğü.
- **Ham payload loglama (JSON):** başarılı/hatalı fatura paketlerinin **raw JSON** çıktıları yerel `JSONLog/` dizininde saklanır → hata anında geliştirici JSON'u Postman'a yapıştırıp sorunun ERP kaynaklı mı format kaynaklı mı olduğunu anında ayırt eder (reproducibility).
- **Downtime dayanıklılığı:** ERP/API yanıt vermediğinde tampon (buffer/cache) katmanı sayesinde senkronizasyon asenkron ve mükerrersiz devam eder; rapor bunu en güçlü tasarım desenlerinden biri olarak niteler.
- **Token timeout önleme:** proaktif refresh (bkz. §3.1) uzun toplu işlerde yarıda kesilmeyi önler.
- **Retry:** rapor açık bir backoff algoritması betimlemez; retry güvenliği idempotency (duplicate check + yerel cache) üzerinden sağlanır. Çift yönlü ERPNext projesi "hata yönetimi ve log sistemi"ni aktif yol haritasında tutar.
- **UI düzeyinde hata görünürlüğü:** grid renk kodlaması (bkz. §5.6).

---

## 7. AI/LLM Katmanı (ikincil bulgular)

- `logo-tiger-araclar`: Logo Tiger 3'ün 557 tablosunu indeksleyen şema gezgini; `/api/schema/relationships?table=x` endpoint'i ve `.well-known/ai-plugin.json` keşif dosyası ile LLM agent'ların FK/JOIN ilişkilerini hatasız öğrenmesi; doğal dil → doğru SQL üretimi.
- `Logo_J-Platform_Rest_Service`: eksik veri zenginleştirme — `GeminiTranslator.cs` (çok dilli çeviri), `ImageCreateAI.cs` (IMAGEINC=0 ise Stability AI ile ürün görseli üretimi).

---

## 8. ÖLÇÜT LİSTESİ — SaaS Ürünün Netsis/Logo Entegrasyonu İçin Benchmark Kriterleri

Her kriter tek tek koda karşı denetlenebilir şekilde yazılmıştır. "Kaynak" sütunu raporun hangi bulgusuna dayandığını gösterir.

### A. Şema ve Sorgu Soyutlaması
- **A1.** Tablo adları kodda hardcoded olmamalı; firma/dönem (Logo: `LG_XXX_XX_`) veya şirket veritabanı (Netsis) seçimi konfigürasyondan/parametreden gelmeli, placeholder/şablon mekanizmasıyla runtime'da çözülmeli. (Kaynak: §2.2)
- **A2.** Çok firma / çok dönem desteği tek kod tabanıyla, kod değişikliği gerektirmeden sağlanmalı. (Kaynak: §2.2)
- **A3.** Ürün eşleştirme anahtarı olarak ERP'nin benzersiz kod alanı (Logo `CODE`, Netsis stok kodu) SKU eşlemesinde kullanılmalı; iç sayısal PK (LOGICALREF vb.) yalnızca ERP-içi JOIN/güncelleme referansı olmalı. (Kaynak: §2.3)
- **A4.** Alan uzunluk/tip kısıtlarına (örn. Logo CODE CHAR(26), NAME CHAR(51)) uyum kontrol edilmeli; taşan veriler kesilmeden önce uyarı/uyumlandırma davranışı tanımlı olmalı. (Kaynak: §2.3, §5.6)

### B. Zorunlu Sorgu Filtreleri
- **B1.** Ürün çekme sorgularında aktiflik filtresi zorunlu: Logo `ACTIVE = 0` (Netsis eşdeğeri pasif/kilit bayrağı). Pasif kartlar hedefe akmamalı. (Kaynak: §5.1)
- **B2.** Kart türü filtresi zorunlu: yalnızca senaryoya uygun `CARDTYPE` değerleri çekilmeli (ürün sync'inde ticari mal/mamul vb.). (Kaynak: §2.3, §5.1)
- **B3.** Cari çekmede rol filtresi: müşteri için CARDTYPE 1,3; tedarikçi için 2,3 (veya Netsis eşdeğeri). (Kaynak: §2.3)
- **B4.** Fatura/hareket sync'inde yön filtresi (Logo `TRCODE`; Netsis fiş tipi eşdeğeri) zorunlu; yön karışması engellenmiş olmalı. (Kaynak: §2.3)
- **B5.** Kilitli/iptal kart filtresi (Logo Bulut `BOSTATUS <> 1` eşdeğeri) yazma öncesi uygulanmalı. (Kaynak: §5.2)

### C. Bağlantı, Kimlik Doğrulama, Gizli Bilgi
- **C1.** REST tabanlı bağlantıda token yaşam döngüsü yönetilmeli: süre takibi + **proaktif yenileme** (süre dolmadan önce refresh), uzun toplu işlerde oturum kesintisi olmamalı. (Kaynak: §3.1)
- **C2.** ERP kimlik bilgileri (kullanıcı/şifre/connection string) hiçbir yerde düz metin saklanmamalı; şifrelenmiş saklama veya secret store kullanılmalı. (Kaynak: §3.1)
- **C3.** Bağlantı topolojisi veri hacmine/dağıtım modeline göre bilinçli seçilmeli ve gerekçelendirilebilir olmalı: on-prem yüksek hacim → doğrudan DB; SaaS/bulut → REST; ara ihtiyaç → sunucu tarafında filtreleyen sorgu (payload küçültme). (Kaynak: §3.1–3.3)
- **C4.** Filtreleme mümkün olduğunca DB/ERP tarafında yapılmalı; tüm listeyi çekip istemcide filtreleme (bant genişliği israfı) bulunmamalı. (Kaynak: §3.2)
- **C5.** SaaS üründen müşteri on-prem Netsis DB'sine erişim modeli (agent/tünel/doğrudan) açıkça tanımlı ve güvenlik sınırları belirli olmalı. (Kaynak: §3 genel çıkarım)

### D. Senkronizasyon Doğruluğu
- **D1.** Sync yönü (tek/çift) açıkça tanımlı olmalı; çift yönlüyse alan haritalama (field mapping) belgeli ve merkezi olmalı. (Kaynak: §4)
- **D2.** Çakışma çözüm stratejisi tanımlı olmalı (örn. timestamp bazlı last-write-wins) ve değişiklik zamanı alanları okunmalı. (Kaynak: §4)
- **D3.** Idempotency: aynı sync komutunun tekrarı (retry dahil) mükerrer kayıt üretmemeli — hedefte doğal anahtar (fiş no + cari ref benzeri kombinasyon) ile varlık kontrolü yapılmalı, mükerrer satır atlanıp raporlanmalı. (Kaynak: §4, §5.3)
- **D4.** Tetikleme hem zamanlanmış (otomatik) hem manuel (operatör kontrollü) olabilmeli. (Kaynak: §4)
- **D5.** Tam sync yerine değişen/gönderilmemiş kayıtları ayırt eden bir mekanizma (timestamp ve/veya "başarıyla işlenmiş kayıtlar" state'i) bulunmalı; her seferinde tüm veri yeniden sorgulanmamalı. (Kaynak: §4, §6)

### E. Yazma Öncesi Validasyon (Pre-flight)
- **E1.** ERP'ye yazmadan önce hedef kaydın varlığı ve durumu sorgulanmalı (pre-flight check); kilitli/pasif hedefe yazma girişimi engellenmeli. (Kaynak: §5.2)
- **E2.** ERP'den okunan tür bilgisi (CARDTYPE vb.) yazılacak belgenin türünü otomatik belirlemeli; tür seçimi kullanıcı hatasına açık bırakılmamalı. (Kaynak: §5.2)
- **E3.** Toplu import dosyalarında (Excel/CSV) başlık/format validasyonu, aktarım **başlamadan** yapılmalı; format uyuşmazlığında işlem reddedilmeli. (Kaynak: §5.5)
- **E4.** Satır bazlı hata izolasyonu: hatalı satır tüm batch'i düşürmemeli; her satır başarılı / uyumlandırıldı-uyarı / hatalı olarak ayrı ayrı işaretlenmeli ve kullanıcıya gösterilmeli. (Kaynak: §5.6)
- **E5.** Dış kimlik eşleştirme kuralları (e-posta → cari, SKU → stok kodu) deterministik ve tek noktada tanımlı olmalı. (Kaynak: §5.4, §2.3)

### F. Dayanıklılık, Loglama, İzlenebilirlik
- **F1.** ERP/API erişilemezliğinde veri kaybı olmamalı; yerel tampon/state (queue, cache, işlenmiş-kayıt tablosu) ile işlem sonra mükerrersiz tamamlanabilmeli. (Kaynak: §6)
- **F2.** Başarıyla işlenen kayıtların kimlikleri kalıcı state'te tutulmalı; yeniden başlatmada geçmiş kayıtlar ERP'ye tekrar sorulmamalı. (Kaynak: §6)
- **F3.** Genel olay logu tutulmalı (sync başlangıç/bitiş, sayılar, hatalar). (Kaynak: §6)
- **F4.** Hatalı (ve tercihen başarılı) isteklerin **ham payload'ları** (request/response) saklanmalı; hata tekrar-üretilebilir (reproducible) olmalı. (Kaynak: §6)
- **F5.** Sync geçmişi (log kayıtları) kullanıcı/operatör tarafından görüntülenebilir olmalı; satır düzeyi hata detayına inilebilmeli. (Kaynak: §5.6, §6)
- **F6.** Retry davranışı idempotency garantileriyle birlikte tasarlanmalı; retry'ın mükerrer üretmediği kanıtlanabilir olmalı. (Kaynak: §4, §5.3, §6)

### G. İş Akışı ve Yetki
- **G1.** ERP'ye veri yazan akışlarda (SaaS → ERP yönü varsa) onay adımı/insan kontrolü konfigüre edilebilir olmalı; onaysız otomatik yazma bilinçli bir tercih olarak belgelenmiş olmalı. (Kaynak: §5.4)
- **G2.** Muhasebeyi etkileyen aktarımlarda (fatura/fiş) tür ve yön hataları çift kontrolle (filtre + pre-flight) engellenmiş olmalı. (Kaynak: §2.3, §5.2)

### H. Netsis'e Özgü Denetim Notları (raporun sınırları dahilinde)
- **H1.** Netsis erişimi doğrudan tablo manipülasyonu yerine mümkünse resmi sarmalayıcılar (NetOpenX/NDI) veya iyi izole edilmiş salt-okunur SQL üzerinden olmalı; yazma işlemleri ERP iş kurallarını bypass etmemeli. (Kaynak: §1)
- **H2.** Raporda Netsis tablo/kolon detayı (TBLSTSABIT vb.) bulunmadığından, Netsis tablo eşlemeleri koddan denetlenirken bu rapor değil Netsis şema dokümantasyonu esas alınmalı; bu rapor **desen** (filtre, placeholder, idempotency, pre-flight) denetimi için kullanılmalı. (Kaynak: §1)

---

## 9. Raporun Nihai Yargıları (özet)
1. **Dinamik veritabanı bilinci:** hardcoded tablo adı = çöküş; placeholder esnekliği başarı önkoşulu.
2. **Oturum ve güvenlik bekçiliği:** token refresh zorunluluk; CARDTYPE/ACTIVE pre-flight validasyonu muhasebe hatalarını tamamen durdurur.
3. **Yerel tampon stratejisi:** SQLite + JSON tabanlı buffer, asenkron ve mükerrersiz sync'in en güçlü deseni.
4. **AI odaklı değişim:** gelecekte sync yalnız taşımaz; eksik veriyi (görsel, çeviri, SQL) LLM/GenAI ile zenginleştirir.

## 10. Kaynakça (rapordan)
1. DECE Global — Logo ERP Veritabanı Tabloları Rehberi
2. raporbilen.com — Logo ERP SQL Tabloları: En Çok Kullanılan 20 Tablo (2025)
3. github.com/logedosoft/erpnext-logo-tiger-integration
4. github.com/dogukankosan/SmartSheetBulutERPApi
5. github.com/dogukankosan/Logo_J-Platform_Rest_Service
6. github.com/dogukankosan/UTSLogoEntegrasyon
7. github.com/StockMount/SmIntegration-dotnet
8. github.com/canberkdoger/logo-tiger-araclar
9. ugurozpinar.github.io/Logo — LG_ITEMS tablo açıklamaları
10. logoisortagim.com.tr — Logo ERP Veritabanı Tabloları
