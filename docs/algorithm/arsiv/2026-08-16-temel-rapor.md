# Cargo Pilot · Yükleme Algoritması — Rulebook Temel Raporu

**Tarih:** 16 Ağustos 2026
**Kapsam:** Optimizasyon motorunun bugünkü hâli, iki mimari/adli artifact'in özeti,
Sena'nın algoritma test aracı ve test süreci, açık borç ve karar noktaları.
**Amaç:** Yeni algoritma sistemleri (metasezgisel / katman tabanlı / hibrit
yerleştirme vb.) entegre edilmeden önce, üzerine yazılacak **rulebook'un taban
metni** olmak. Bu dosya "bugün ne var" sorusunu yanıtlar; "ne olacak" bölümleri
bilinçli olarak boş bırakılmıştır.

**Kaynaklar:** iki artifact (Mimari Raporu + Adli İnceleme, `ALGORITMA.md`),
`origin/dev` ve `feat/koordinat-standardi-uyumu` üzerindeki gerçek kod,
`apps/algorithm-test-ui` kaynakları ve `.github/workflows`.
Bu raporda **`dotnet test` koşulmadı**; sayısal performans/başarı iddiaları
artifact'lerden alıntıdır ve öyle işaretlenmiştir. Kod yapısına ilişkin her sayı
bugünkü çalışma ağacından sayılmıştır.

---

## 0. Yönetici özeti — artifact'lerden bugüne ne değişti

Artifact'ler **12–15 Ağustos** tarihli. O tarihten bu yana üç şey değişti ve
rulebook yazılırken artifact metnine değil buraya bakılmalı:

| Konu | Artifact'te yazan | Bugünkü gerçek |
| --- | --- | --- |
| OPT-01 / OPT-02 düzeltmeleri | "yalnız yerel commit, push yok, PR yok, dev'e alınmadı" | **Merge edildi.** OPT-01 → PR #989, OPT-02 → PR #990 + #1002. İkisi de `dev` ve `test` üzerinde. Birleşik motor durumu **artık mevcut** |
| Motor dosya sayısı / satır | 7 dosya · 915 satır | **9 dosya · 1.195 satır** (`DoorSetFactory.cs`, `LoadingCorner.cs` eklendi) |
| Motor testleri | 33 test · 16 snapshot | **42 `[Fact]`/`[Theory]` · 17 snapshot** (11 test dosyası) |
| LIFO bölgesi | yalnız `LoadingType.Rear` (OPT-10 borcu) | **Kapı listesinden bağımsızlaştı** — OPT-10 kapandı |
| Yükleme yönü | sabit; hep `(0,0,0)` köşesinden | **Kapıya göre türetiliyor** (`FillFromMaxX`, aynalanmış yükleme) |
| Test aracı | yok | **`apps/algorithm-test-ui`** merge edildi (PR #996) + 2 CI iş akışı |

Bunun rulebook'a etkisi: artifact'lerdeki "bilinen borç" tablosu **kısmen
kapanmıştır**; §6'daki güncel liste esas alınmalıdır.

---

## 1. Motorun bugünkü mimarisi

### 1.1 Dosya haritası

`apps/backend/CargoPilot.Application/Common/Optimization/`

| Dosya | Satır | Sınıf | Rol |
| --- | --- | --- | --- |
| `PlacementValidator.cs` | 314 | **kapatılamaz — fizik** | 7 sert kapının tek kaynağı + rotasyon üretimi + `ViolatesLoadAbove` |
| `OptimizationEngine.cs` | 300 | **çekirdek** | Greedy döngü, aday tarama, iki kademeli seçim, skor toplamı, sonuç metrikleri |
| `BalanceScoring.cs` | 220 | bayraklı (`UseWeightBalance`) | CoG cezası + takas tabanlı ikinci geçiş |
| `LifoPlacement.cs` | 131 | bayraklı (`UseLifo`) | Grup bölgeleri, bölge cezası, `IsInsideZone`, boşaltma sırası semantiği |
| `ItemOrdering.cs` | 71 | **kapatılamaz** | Yerleştirme sırası (kriterle parametreli, grup kümelemeli) |
| `VolumeScoring.cs` | 55 | bayraklı (`UseVolume`) | Uzunluk + genişlik terimleri (yön farkında) |
| `LoadingCorner.cs` | 50 | **yeni** | Kapı listesinden yükleme başlangıç köşesini türetir |
| `DoorSetFactory.cs` | 37 | **yeni** | Eski `LoadingType` enum'ından kapı listesi üretir (geçiş köprüsü) |
| `PlacedBox.cs` | 17 | veri | Modüllerin ortak dili |

Motorun **dışında** ama zincirin parçası:

- `Common/ContaminationFilter.cs` — motor çağrılmadan **önce** handler içinde
  çalışır (`CreatePlanCommandHandler.cs:163`, `ReOptimizePlanCommandHandler.cs:94`).
- `Common/Models/OptimizationInput.cs` — girdi + `OptimizationModules` bayrakları.

Tasarım kararı (korunmalı): tüm modüller `static`; sıcak döngüde arayüz/delegate/DI
üzerinden sanal çağrı **bilinçli olarak** kullanılmıyor.

### 1.2 Bir planın üretim akışı

1. **Bayrak çözümü** — `OptimizationModules.Resolve`; verilmezse kriterden türetilir.
2. **Genişletme** — adetli ürünler tek tek kutulara açılır.
3. **Sıralama** — `ItemOrdering.SortForGroupPlacement`: kümeleme açıksa gruplu ürünler
   `UnloadingOrder` DESC, sonra kriter anahtarı (WeightBalance → ağırlık, diğerleri → hacim),
   eşitlik bozucu `ItemId`.
4. **Tohumlama** — başlangıç köşesi `(startX, 0, 0)`; WeightBalance'ta 4 zemin köşesi;
   LIFO'da her bölgenin başlangıcı.
5. **Kutu döngüsü** — araç ağırlık limiti aşılıyorsa kutu hiç denenmez
   (`WeightLimitExceeded`).
6. **Aday tarama** — her aday nokta × her izinli yönelim → **7 sert kapı** → skor.
7. **İki kademeli seçim** — `best = bestInZone ?? best`.
8. **İkinci geçiş** — yalnız WeightBalance: `BalanceScoring.ImproveBalance` (en fazla 3 tur, O(n²)).
9. **Sonuç** — doluluk, toplam ağırlık, üç eksende CoG, X/Z denge sapma yüzdeleri,
   sebepli yerleşemeyenler.

### 1.3 Yedi sert kapı (sıra = eleme gücü)

| # | Kapı | Kural |
| --- | --- | --- |
| 1 | Araç sınırları | `ex/ey/ez + boyut` iç ölçüleri aşamaz; `ex < 0` elenir |
| 2 | `HasOverlap` | AABB kesin eşitsizlik — **temas çakışma değildir** |
| 3 | `HasSupport` | `y == 0` her zaman destekli; aksi hâlde taban alanının **≥ %80'i** tam olarak alttaki kutuların üst yüzeyinde |
| 4 | `ViolatesStackability` | Alttaki `IsStackable=false` ise ret. LIFO'da ayrıca: geç inecek, erken inecek olanın üstüne konamaz |
| 5 | `ViolatesStackCount` | Altta kalan **her** kutunun `MaxStackCount`'u; `<=0` sınırsız; aday için `+1` |
| 6 | `ViolatesStackWeight` | Altta kalan **her** kutunun `MaxWeightOnTop`'u; sütun geneli toplam |
| 7 | `ViolatesFragility` | `FragilityType.Fragile` kutunun üstüne **hiçbir** yük konmaz |

**Ret sebebi seçimi:** hiçbir aday geçemezse `InsufficientSpace`; ancak bir aday
diğer altı kapıyı geçip yalnızca kırılganlıktan elendiyse
`FragilityOrHandlingConstraint` raporlanır.

Takas geçişi ayrıca **yukarı bakan** kısıtları da sorar
(`PlacementValidator.ViolatesLoadAbove`) — bir kutu yığının altına taşınabildiği
için gereklidir.

### 1.4 Puanlama — terim toplamı (switch değil)

Skor **maliyettir**, düşük olan kazanır. Toplama sırası sabittir (decimal
yuvarlaması aday seçimini kaydırmasın diye):
`yerçekimi → uzunluk → denge → genişlik → bölge`

| Terim | Sahibi | Katsayı | İşlev |
| --- | --- | --- | --- |
| Yerçekimi | çekirdek | **1.000.000** | Alçak nokta her zaman tercih edilir. Kapatılamaz |
| Denge (WeightBalance) | `BalanceScoring` | 900.000 | Normalize CoG sapması (X + Z) |
| Bölge | `LifoPlacement` | 2.000 / cm | **Yalnız yedek kademede** anlamlı |
| Uzunluk | `VolumeScoring` | 1.000 | Küçük `z` tercih edilir (uzak yüzden kapıya doldur) |
| Denge (VolumeFirst) | `BalanceScoring` | 500 | Hafif düzeltici |
| Genişlik | `VolumeScoring` | 1 | Beraberlik bozucu; yön farkında |

Kriter başına aktif terimler:

- `VolumeFirst` : `ey·1e6 + ez·1e3 + denge·500 + genişlik` (+ bölge)
- `WeightBalance`: `ey·1e6 + denge·900.000` (+ bölge)
- `Lifo` : `ey·1e6 + ez·1e3 + genişlik` (+ bölge)

**Kritik nüans:** bölge terimi artık diğerlerinin akranı değildir. Aday seçimi iki
kademelidir; bölge içi geçerli aday varsa seçim yalnızca onlar arasından yapılır
(o skorların bölge terimi zaten 0'dır). Katsayının küçük olması bu yüzden bölge
disiplinini zayıflatmaz.

**Bayraklar arayüze açık değildir.** 4 bayrak 16 kombinasyon üretir; katsayılar
yalnızca mevcut 3 kriter için kalibre edilmiştir. Hiçbir API sözleşmesine
bağlanmaz — yalnız motor içinden ve testlerden kullanılır.

### 1.5 Koordinat ve yön sözleşmesi (bağlayıcı)

- Origin: referans kapıdan bakıldığında uzaktaki sol-alt köşe `(0,0,0)`, uzak yüzde.
- `x` = width, `y` = height, `z` = length; kapı yüzü `z = length`. Right-handed,
  Three.js ile birebir. Ayna/telafi dönüşümü yasak.
- Kutu pozisyonu **köşedir** (`min x, min y, min z`), mesh merkezi değil.
- Birim **cm**; dönüşüm yalnız API sınırında.
- Kapılar `small`/`big` + `face` ile **liste** olarak modellenir.
- **Yükleme kapının bulunduğu yüzden başlamaz.** `LoadingCorner.FillFromMaxX`:
  big door yalnızca `x = 0` yüzündeyse başlangıç köşesi `(width, 0, 0)` olur ve
  doldurma kapıya doğru ilerler. `z` yönü sabittir (`z = 0`'dan kapıya).
- Aynalanmış modda eşitlik bozucular da döner (`OrderByDescending(p => p.x)`,
  `WidthTerm`'de `vehicleWidth - (ex + boxWidth)`) — aksi hâlde ayna simetrisi bozulur.
- Çelişkide `docs/COORDINATE_STANDARD.md` kazanır.

### 1.6 LIFO bölge modeli

- `ComputeGroupZones` yalnız `UseLifo` bayrağına bakar; **kapı listesinden bağımsızdır**.
  (Önceden small door aranıyordu; yan kapılı araçta bölge sessizce kurulmuyordu.)
- Yalnız `GroupId` **ve** `UnloadingOrder` birlikte dolu olan ürünler bölge üretir;
  distinct sayısı ≤ 1 ise bölge uygulanmaz.
- `zoneSize = vehicleLength / orders.Count`; **eşit** bölme (grup hacmine duyarsız).
- `UnloadingOrder` küçük = ilk inecek = kapıya en yakın bölge (`z = length` ucu).
- Son bölgenin `ZStart`'ı decimal kalıntısı yüzünden sert kısıt kaybolmasın diye
  `0m`'e sabitlenir.

---

## 2. İki artifact'in özeti

### 2.1 Artifact 1 — Mimari Raporu (12 Ağustos 2026, PR #935→#936→#937)

583 satırlık tek dosya, Infrastructure'dan **Application** katmanına taşındı ve
6 modüle bölündü. Bölme biçimi arayüz/plugin değil, doğrudan çağrılan statik
fonksiyonlar — sıcak döngüye tek dolaylı çağrı eklenmedi. Bölmeden önce mevcut
davranışı kilitleyen 16 snapshot yazıldı; 7 geçiş adımının hiçbirinde snapshot kaymadı.

Kazanımlar: kural tek başına test edilebilir hâle geldi (0 → 33 test), yeni kural
tek dosyaya indi (kırılganlık kuralı canlı denemesiydi), çift yazılmış kurallar
(`HasOverlap`/`BoxesOverlap`, %80 destek) birleştirildi, test projesi altyapıdan
tamamen koptu (~21 sn).

### 2.2 Artifact 2 — Adli İnceleme (15 Ağustos 2026, OPT-01 · OPT-02)

Motor üretimde **fiziksel olarak geçersiz** planlar üretiyordu. İki hata; ikisi de
önce kırmızı testle ispatlandı, sonra düzeltildi. Her iki düzeltmede de golden
master snapshot'ları **tek bayt kaymadı**.

**OPT-01 — denge takasında atlanan destek doğrulaması.**
`BalanceScoring.ImproveBalance`, destek taramasını `if (a.H != b.H)` bloğuna
hapsetmişti; eşit yükseklikli takaslarda kutu havada kalıyordu. Destek kaybının
koşulu yükseklik farkı değil **taban alanı farkıdır**. Üç kör nokta kapandı:
(1) eşit yükseklik koşulu kaldırıldı, (2) `othersA`/`othersB` ayrımıyla a↔b
ilişkisi altı kısıtın tamamında test edilir oldu, (3) `ViolatesLoadAbove`
eklenerek yukarı bakan kısıtlar kapandı.
Ölçüm (artifact): 500 kutuluk gerçekçi WeightBalance yükünde **1 kutu havadaydı**
(destek oranı 0,6667 < 0,80). Bedel: WeightBalance **+%43** (20.562 → 29.453 ms).

**OPT-02 — LIFO bölge cezası yerçekiminden 500× zayıftı.**
`taşma_cm × 2.000 < yükselme_cm × 1.000.000` olduğu sürece motor bölge ihlalini
seçiyordu: 1 cm yükselme 500 cm taşmayı affediyordu. P1 senaryosunda yerleşim tam
ters çıkıyordu (4/8 ihlal), P2'de 2/5.
En güçlü dayanak: kod tabanının **kendi testi** (`GroupZoneTests.cs:46`) sert kısıt
iddia ediyordu; üretim kodu yumuşak ceza uyguluyordu. O assert tesadüfen geçiyordu
çünkü testte araç yüksekliği kutu yüksekliğine eşitti — bölge/yerçekimi çatışması
hiçbir testte tetiklenmiyordu.
Çözüm: **iki kademeli seçim** (`best = bestInZone ?? best`). Reddedilenler:
katsayıyı 2.000.000 yapmak (P2'de 1/5 ihlal bırakıyor — eşik kaydırma, garanti
değil) ve koşulsuz sert eleme (FillRate 0,5 → 0 düşürüyordu).
Sonuç (artifact): P1 ve P2'de 0 ihlal, 0 kutu kaybı, FillRate değişmedi, LIFO
**−%17** hızlandı.

> Bu iki artifact'in "dal durumu" bölümleri **bayattır** — bkz. §0.

---

## 3. Test süreci

### 3.1 Backend motor testleri — kalıcı regresyon koruması

`apps/backend/CargoPilot.Engine.Tests/` · 11 dosya · 42 `[Fact]`/`[Theory]` · 17 snapshot

| Dosya | Ne pinler |
| --- | --- |
| `VolumeFirstGoldenMasterTests` (6) | 6 snapshot |
| `LifoGoldenMasterTests` (6) | 6 snapshot |
| `WeightBalanceGoldenMasterTests` (5) | 5 snapshot |
| `LifoBolgeKisitiTests` (6) | OPT-02 bölge sert kısıtı |
| `KirilganlikTests` (5) | Kırılganlık kuralı |
| `PlacementValidatorSupportTests` (5) | %80 destek |
| `ModulBayraklariTests` (3) | Bayrak açık/kapalı davranışı |
| `BalanceSwapSupportTests` (2) | OPT-01 |
| `DeterminizmTests` (2) | Aynı girdi → aynı çıktı |
| `InvariantTests` (1) | Fiziksel değişmezler (`PhysicalInvariants`) |
| `PerformansTabanCizgisiTests` (1) | 500 kutu · 10 tip · üst sınır 120.000 ms |

Snapshot içeriği (`SnapshotPayload`): girdi **ve** çıktı birlikte saklanır — bir
farkın senaryo verisinden mi motor davranışından mı geldiği ayırt edilebilsin diye.
`FillFromMaxX` snapshot'a **eklendi** (aynalanmış yol golden kapsamına girdi).
`PlacementId` bilinçli olarak dışarıda (Guid deterministik değil), yerine `Order`.

### 3.2 Sena'nın algoritma test aracı — `apps/algorithm-test-ui`

**Konum:** repo içinde ayrı uygulama · PR #996 (`chore/algoritma-test-araci`) →
`dev`/`test`. `apps/frontend`'den hiçbir şey import etmez, kendi `package-lock.json`'ı
vardır; kod tekrarı bilinçli kabul edilmiştir.

**Amaç:** kapalı döngü — *koştur → ölç → gerilemeyi yakala → bozuk vakayı incele →
düzelt → tekrar koştur.*

**İki sayfa:**

| Sayfa | Soru | İçerik |
| --- | --- | --- |
| **Toplu Koşu** (açılış) | "Motor bir önceki sürüme göre ilerledi mi?" | Tohumlu senaryo seti, regresyon kapısı, kriter toplamları, kriter etkinliği, bozuk senaryolar, eğilim, kısıt kapsamı |
| **Senaryo İnceleme** | "Düşen senaryoda hangi kutu hangi kuralı kırdı?" | Form, 2D üç ortografik projeksiyon, kural denetimi, kriter karşılaştırması |

Araç **plan üretmez** — gerçek backend'i çağırır ve sonucu denetler. Motor
deterministik olduğu için aynı senaryoyu tekrar koşmak bilgi üretmez; anlamlı olan
çok sayıda **farklı** senaryoyu iki motor sürümüne **birebir aynı** girdiyle koşmaktır.

**Kural denetimi (`verification/checks.ts`)** — motorun sert kısıtlarının istemci
aynası. Bugün **14 kural** (`CHECK_IDS`):
`conservation, bounds, overlap, support, stackable, stackCount, weightOnTop,
fragility, rotation, lifoVertical, totalWeight, cogMismatch, lifoZone, loadingCorner`
Her kural motordaki kaynak satırına referans verir (`sourceRef`, ör.
`PlacementValidator.cs:120-142`). Üç durum vardır: `pass` / `fail` / **`skipped`** —
senaryoda o kısıtı taşıyan ürün yoksa kural hiç koşmamıştır ve "hiç koşmamış bir
yeşil, kırmızıdan daha yanıltıcıdır". Ağırlık: `hard` (motor reddeder) ve `soft`
(motor cezalandırır ama yasaklamaz — bugün yalnız `lifoZone`).

**Aynanın doğruluğu kanıtlanır:** `verification/goldenCrossCheck.test.ts`,
backend'in `CargoPilot.Engine.Tests/Snapshots/*.json` fixture'larını okur ve tüm
denetleyicilerin `pass` ya da `skipped` vermesini bekler. Bir `fail` çıkarsa ya
ayna motordan sapmıştır ya fixture gerçek bir motor hatası pinliyordur — ikisi de
bilinmelidir.

**Regresyon kapısı (`suite/regressionGate.ts`)** — iki tür kural:

| Tür | Kural | Varsayılan eşik |
| --- | --- | --- |
| **Mutlak** (geçmiş gerekmez) | sert kural ihlali | `allowHardFailures: false` |
| | koşulamayan senaryo | `allowErrors: false` |
| | kriter etkinliği iddiası düştü | `requireCriteriaEffectiveness: true` |
| **Göreli** (referans gerekir) | ortalama doluluk düşüşü | 0,5 puan |
| | en kötü senaryo düşüşü | 1 puan |
| | yerleşen kutu oranı düşüşü | 0,5 puan |
| | önce temizken şimdi bozulan senaryo | 0 |

Eşikler `DEFAULT_GATE_THRESHOLDS`'ta ve **CLI bayrağıyla değiştirilemez** — bir eşik
gevşetmesi kod incelemesinden geçsin diye.

**Kriter etkinliği (`suite/criteriaEffectiveness.ts`)** — "toplamlar makul" ile
"kriter işini yapıyor" farklı sorulardır. Üç iddia:

- Hacim Önceliği → ortalama doluluğu en yüksek olan o olmalı
- Ağırlık Dengesi → denge sapması en düşük olan o olmalı
- LIFO → dikey boşaltma kuralı hiç bozulmamalı (mutlak)

Örneklem < 5 senaryo ise iddia kurulmaz (`inconclusive`); tolerans 0,5 puan.

**Karşılaştırılabilirlik** üç şeye bağlıdır: **tohum**, **katalog imzası**,
**`GENERATOR_VERSION`** (bugün 2). Biri değişirse karşılaştırma hiç gösterilmez.
Senaryo üreticisi kısıtlı ürünleri kasten senaryolara sokar
(`CONSTRAINED_SCENARIO_PERCENT = 60`); aksi hâlde kritik dallar neredeyse hiç
koşulmuyordu.

**Katalog bağımlılığı (önemli sınır):** `CreatePlanCommand` yalnızca
`itemId/quantity/groupId` taşır; kısıtlar `Item` kaydından gelir. Yani motorun bir
dalını test edebilmek **katalogda o kısıtı taşıyan ürün bulunmasına** bağlıdır.
"Kısıt kapsamı" paneli bunu görünür kılar ("kırılganlık dalı test edilemiyor,
katalogda `FragilityType=1` ürün yok").

**CLI:**

```bash
npm run suite -- --seed 1 --count 100 --engine-version "$(git rev-parse --short HEAD)"
npm run suite -- --seed 1 --count 100 --baseline reports/suite-seed1-....json
```

Çıkış kodu: `0` geçti · `1` kapı düştü · `2` kullanım/bağlantı hatası.

**CI/CD — iki iş, ayrımın sebebi maliyet:**

| İş | Ne zaman | İhtiyaç | Süre |
| --- | --- | --- | --- |
| `algorithm-test-ui-ci` (`ci.yml`) | her push / PR | yok, tamamen offline | ~1 dk |
| `Algoritma Regresyon Koşusu` (`algorithm-suite.yml`) | gecelik 02:00 UTC + elle | canlı test ortamı + kimlik | ~10–30 dk |

Referans (baseline) GitHub cache'inde ve **yalnızca geçen koşudan sonra** güncellenir
— gerileyen bir koşuyu referans yapmak gerilemeyi yeni normal hâline getirirdi.
Gereken secret'lar: `ALGO_SUITE_API_URL`, `ALGO_SUITE_EMAIL`, `ALGO_SUITE_PASSWORD`;
tanımsızsa iş sessizce başarılı biter.

**İş bölümü:** araç **keşif** içindir; kalıcı koruma backend testlerindedir. Döngünün
kapanma noktası: toplu koşu bozuk vaka bulur → "İncele" ile tek senaryoya aktarılır →
sebep anlaşılır → düzeltme sonrası o vaka `Snapshots/`'a golden fixture olarak eklenir.

**Aracın ölçmediği:** `durationMs` uçtan uca istek süresidir (ağ + plan kalıcılığı
dahil), motor süresi değil. Performans iddiaları için `PerformansTabanCizgisiTests`
kullanılmalıdır.

**Aracın bilinçli olarak dışında bıraktıkları:** senaryo dosyası dışa/içe aktarma,
senaryo önizleme, ayrı ölçüm serisi, kullanılmayan model alanları. Yeni panel
eklemeden önce sorulacak soru: *bu, motorun bir sürümünü diğerinden ayırmaya
yarıyor mu?*

---

## 4. Motor değişirse test aracında ne bozulur

| Motorda değişen | Araçta yapılacak | Uyarır mı? |
| --- | --- | --- |
| Mevcut kuralın eşiği/mantığı | `verification/checks.ts` | **Evet** — golden çapraz kontrol kırmızı |
| Yeni sert kısıt eklendi | `CHECK_IDS` + `checkLabels.ts` + `checks.ts` + `runChecks` | **Hayır** — elle takip |
| Ürün üzerinde yeni kısıt alanı | `catalogCoverage.ts` + `Item` tipi | Kısmen |
| Yeni optimizasyon kriteri | `criteria.ts` + `suiteStorage` şeması | **Evet** — şema reddeder |
| Plan API gövdesi | `loadingPlanMappers.ts` | **Evet** — satır `error` |
| Koşu kaydına yeni alan | `SUITE_RUN_VERSION` + `suiteRunSchema` | **Evet** — eski kayıt atlanır |
| Yerleşim iyileşti/kötüleşti | hiçbir şey | **Evet** — kapı |

**İki uç durum (rulebook'a aynen taşınmalı):**

1. **Determinizm kaybolursa araç anlamını yitirir.** Yeni sürümde ilk kontrol bu
   olmalı: aynı tohumu iki kez koş, tüm deltalar sıfır çıkmalı.
2. **Kasıtlı büyük değişiklikte referansı sıfırlayın.** Yeni bir yerleştirme
   stratejisi profili tümüyle değiştirir; eski referansa karşı ölçmek "gerileme"
   gürültüsü üretir (`ignore_baseline` girdisi ya da `--baseline` vermemek).

> **Yeni algoritma sistemleri için doğrudan sonuç:** metasezgisel/rastgele bileşenli
> bir yerleştirici eklenecekse **tohumu sabitlenmiş determinizm sözleşmesi** korunmak
> zorundadır; aksi hâlde hem `DeterminizmTests` hem toplu koşu ölçümü çöker.

---

## 5. Bugünkü sözleşmenin bağlayıcı maddeleri (rulebook'un çekirdeği)

Aşağıdakiler yeni algoritma girse de **değişmemesi gereken** maddelerdir. Yeni
sistem entegre edilirken her biri ya korunmalı ya da bilinçli bir kararla
gevşetilip gerekçesi yazılmalıdır.

**Fizik (kapatılamaz):**

1. Kutular çakışamaz (temas çakışma değildir).
2. Havada kutu olmaz — taban alanının ≥ %80'i destekli.
3. `IsStackable=false` ürünün üstüne kutu konamaz.
4. `MaxStackCount` ve `MaxWeightOnTop` **sütun geneli** uygulanır, yalnız bir alttaki değil.
5. Kırılgan ürünün üstüne hiçbir yük konmaz.
6. Rotasyon yalnızca `AllowedRotations`'ın izin verdiği kümeden seçilir.
7. Araç iç ölçüleri ve ağırlık kapasitesi aşılamaz.
8. Her kutu ya `placements` ya `unplaced` listesindedir — **kutu korunumu**.

**Geometri:**

9. Koordinat standardı (§1.5) — ayna/telafi dönüşümü yasak.
10. Pozisyon = min köşe, birim cm.
11. Yükleme kapının bulunduğu yüzden başlamaz.

**Determinizm:**

12. Aynı girdi → aynı çıktı, bit birebir. Eşitlikte katı `<` ve `ItemId` eşitlik bozucu.
13. Skor toplama sırası sabit (decimal yuvarlaması).

**Süreç:**

14. Taşıma commit'i ile davranış değiştiren commit birleştirilmez.
15. Bir hata önce **kırmızı testle** ispatlanır, sonra düzeltilir.
16. Snapshot kayması ya sıfırdır ya da gerekçesi senaryo bazında yazılır.
17. Bulunan her bozuk vaka golden fixture'a dönüşür.

---

## 6. Açık borç — güncel liste

Artifact'lerin listesinden **kapananlar çıkarıldı**, bugünkü kodda doğrulananlar bırakıldı.

| ID | Konu | Yer | Durum / Etki |
| --- | --- | --- | --- |
| OPT-14 | `item.UnloadingOrder ?? -1` sentinel'i `GroupId` kontrolü yapmıyor; bölge sözlüğü `GroupId + UnloadingOrder` ile kuruluyor ama arama anahtarı yalnız `UnloadingOrder` | `OptimizationEngine.cs` (bölge arama) | **açık** · semantik, bugün zararsız |
| — | **Eşit bölme kusuru:** `zoneSize = vehicleLength / orders.Count` grup hacmini görmez; bölge kutudan dar kalınca yedek kademe devreye girer | `LifoPlacement.ComputeGroupZones` | **açık** · ihlal sürebilir |
| — | **Sessiz yedek kademe:** `bestInZone` null kalıp yedeğe düşen yerleşim hiçbir yere raporlanmıyor; kullanıcı planın bölge dışına taştığını göremiyor | `OptimizationEngine` | **açık** · görünürlük yok |
| — | **Snapshot'lar kırılganlığı kaydetmiyor** — `SnapshotItem`'da `FragilityType` alanı yok | `Golden/SnapshotPayload.cs` | **açık** · doğrulandı |
| — | `ViolatesLoadAbove` için kırılganlık / `MaxWeightOnTop` odaklı **doğrudan takas testi yok**; kapsam dolaylı | `PlacementValidator.cs` | **açık** · test boşluğu |
| OPT-05 | `FragilityType`'ın 10 üyesinden 9'u motorda etkisiz; ayrışım kuralı `stackGroup`/`incompatibleGroups` üzerinden `ContaminationFilter`'da işler | `ContaminationFilter.cs` | **kısmen** · `PlacementValidator` yorumu artık doğru sözleşmeyi yazıyor, ama enum hâlâ yanıltıcı |
| — | **İki ret sebebi hiç üretilmiyor** — "istiflenemez" ve "geometri kısıtı" enum'da var, motor raporlamıyor | `UnplacedReason` | **açık** |
| — | **Denge kriteri yavaş** — OPT-01 sonrası WeightBalance 500 kutuda ~29,5 sn (limit 120 sn) | `BalanceScoring.ImproveBalance` | **açık** · kabul edildi |
| — | Test aracı README'si **13 kural** diyor, `CHECK_IDS` **14** taşıyor (`loadingCorner` sonradan eklendi) | `apps/algorithm-test-ui/README.md` | **açık** · doküman bayat |
| — | `checks.ts` `lifoZone` yorumu "bölge dışına çıkmak skor cezasıdır, yasak değil" diyor; motor OPT-02'den beri **iki kademeli sert kısıt** uyguluyor | `verification/checks.ts:529` | **açık** · ifade bayat; yedek kademe yine de `soft` sınıfını haklı çıkarıyor |
| — | `checks.ts` `sourceRef` değerleri **satır numarası** taşır; motor dosyaları büyüdükçe kayar (golden çapraz kontrol semantiği korur, referansı korumaz) | `verification/checks.ts` | **açık** · bakım maliyeti |
| — | `dotnet build CargoPilot.slnx` yerel SDK 8.0.419 ile çalışmıyor (MSB4068); koşular proje düzeyinde | ortam | **açık** |

**Yapılmayacaklar olarak kilitlendi** (artifact 2, hakem kararı K4):
bölge katsayısını 2.000.000 yapmak · `ScoringWeights.Zone > Gravity` sıra testi ·
hacme orantılı bölge bölme · koşulsuz sert eleme.

---

## 7. Ölçüm kapsamının sınırları

Rulebook yazılırken "kanıtlanmış" ile "gözlenmiş" ayrımı korunmalı:

- **OPT-02 iki senaryoda (P1, P2) ölçüldü.** 400 senaryoluk tarama yapılmadı. Yön
  kesindir (0 ihlal, 0 kutu kaybı), büyüklük genellemesi değildir. Greedy yol
  bağımlılığının genel olarak zararsız olduğu **kanıtlanmadı**.
- **OPT-01'in denge kalitesi bedeli ölçülemedi.** Snapshot korpusu ağırlıkla tek tip
  küplerden ibaret; CoG kaybının büyüklüğü görünmüyor.
- **Golden korpus çok katmanlı LIFO senaryosu içermiyordu** (5/5 tek katmanlı,
  yapısal neden: araç yüksekliği = kutu yüksekliği). Zone-vs-gravity çatışması
  hiçbir testte tetiklenmiyordu. Bu tür **yapısal kör noktalar** yeni korpusta
  bilinçli olarak aranmalı.
- **Toplu koşunun süre ölçümü uçtan uçadır**, motor süresi değil.
- **Bu rapor `dotnet test` koşmadı**; §3.1'deki dosya/test sayıları koddan
  sayılmıştır, geçti/kaldı durumu doğrulanmamıştır.

---

## 8. Yeni algoritma entegrasyonu için karar noktaları *(rulebook'ta doldurulacak)*

Aşağıdakiler **soru** olarak bırakılmıştır; cevapları yeni sistemin rulebook'unu
oluşturacak.

1. **Yeni yerleştirici mevcut greedy'nin yerine mi geçecek, yanına mı?**
   Yanına ise: kriter mi olacak, `OptimizationModules` bayrağı mı? Bayraksa 16
   kombinasyonun kalibrasyon sorunu nasıl çözülecek?
2. **Determinizm sözleşmesi (§5.12) nasıl korunacak?** Rastgelelik varsa tohum
   nereden gelecek ve API sözleşmesinin parçası mı olacak?
3. **7 sert kapı yeni yerleştiricide de tek kaynaktan mı çağrılacak?**
   (Artifact 1'in "aynı kural iki kere yazılmıyor" kazanımı korunmalı.)
4. **Skor terim toplamı mı kalacak, çok amaçlı (Pareto) bir hedefe mi geçilecek?**
   Geçilirse "düşük olan kazanır" + sabit toplama sırası sözleşmesi ne olacak?
5. **Golden master korpusu ne olacak?** Yeni strateji tüm snapshot'ları kaydırır.
   Yeniden üretim mi, ikinci korpus mu? (`FragilityType` alanı bu fırsatta eklenmeli.)
6. **Regresyon kapısı eşikleri yeniden kalibre edilecek mi?** Yeni strateji
   doluluğu artırıyorsa eski referans anlamsızlaşır (`ignore_baseline`).
7. **Performans bütçesi ne?** Bugünkü tavan 120.000 ms / 500 kutu; en yavaş kriter
   ~29,5 sn. Metasezgisel bir arama bu bütçeye sığar mı, yoksa asenkron mu olacak?
8. **Kısıt kapsamı problemi:** test aracı katalogdaki kısıtlı ürünlere bağımlı.
   Yeni kısıtlar için seed katalog mu genişletilecek?
9. **Bölge modeli:** eşit bölme kusuru yeni sistemde de kalacak mı, hacme orantılı
   bölme kararı (bugün kilitli) yeniden açılacak mı?
10. **Sessiz yedek kademe** raporlanacak mı — plan çıktısında "bölge ihlali var"
    uyarısı üretilecek mi?

---

## 9. Kaynak dosya indeksi

- **Motor:** `apps/backend/CargoPilot.Application/Common/Optimization/*.cs`
- **Filtre:** `apps/backend/CargoPilot.Application/Common/ContaminationFilter.cs`
- **Girdi/çıktı:** `apps/backend/CargoPilot.Application/Common/Models/Optimization*.cs`
- **Motor testleri:** `apps/backend/CargoPilot.Engine.Tests/`
- **Test aracı:** `apps/algorithm-test-ui/` (`README.md` en iyi giriş noktası)
- **CI:** `.github/workflows/ci.yml` (`algorithm-test-ui-ci`), `.github/workflows/algorithm-suite.yml`
- **Koordinat standardı:** `docs/COORDINATE_STANDARD.md`
- **Artifact metinleri:** `ALGORITMA.md`
