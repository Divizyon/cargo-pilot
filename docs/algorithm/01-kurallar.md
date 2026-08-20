# Cargo Pilot · Yükleme Algoritması Rulebook (Algoritma PRD)

> **Kalıcı dosya — bağlayıcı kurallar (`R-*`).** Yeni bir kural doğduğunda buraya yeni bir `R-`
> kimliğiyle eklenir; kimlikler yeniden numaralandırılmaz çünkü kod yorumları onlara atıf verir.
> Kararlar → [02-kararlar.md](02-kararlar.md) · terimler → [00-sozluk.md](00-sozluk.md) ·
> dizin → [README.md](README.md)


**Sürüm:** 1.0 · **Tarih:** 16 Ağustos 2026
**Kapsam:** Mevcut greedy motorun bağlayıcı sözleşmesi + yeni hibrit mimarinin (Sıralama: GWCA · Yükleme: Wall-Builder) tasarım kuralları, entegrasyon planı, test/kabul kriterleri ve karar kayıtları.
**Kaynaklar (birleştirilen üç doküman):**
1. *GWCA + Wall-Builder Araştırma Raporu* (web/GitHub taraması, 16 Ağu 2026)
2. *Modern Algoritmik Yaklaşımlar: GWCA ve Wall-Building Heuristic Raporu* (ikinci agent araştırması)
3. *Rulebook Temel Raporu* (motorun bugünkü hâli, artifact özetleri, test aracı, açık borç)

**Nasıl okunmalı:** Bölüm A "bugün ne var ve dokunulmaz", Bölüm B "GWCA/Wall-Builder nedir ve literatür ne diyor", Bölüm C "yeni sistem nasıl tasarlanacak (kural kural)", Bölüm D "nasıl test edilecek, kabul kriteri ne", Bölüm E "karar kayıtları, açık sorular, yol haritası" (ayrı dosya: [02-kararlar.md](02-kararlar.md)). Her kural bir kimlik taşır (`R-xx`) ve PR açıklamalarında bu kimlikle referans verilir.

---

## Yönetici Özeti

- Motor bugün **greedy + 7 sert kapı + terim toplamlı maliyet skoru** ile çalışıyor; deterministik, golden-snapshot ile kilitli, `apps/algorithm-test-ui` ile gecelik regresyon kapısına bağlı. Bu sözleşme (Bölüm A, §A5) yeni algoritma girse de **değişmez**.
- Yeni mimari iki katmanlıdır: **dış katman GWCA** (Great Wall Construction Algorithm, Guan vd. 2023 — genel amaçlı meta-sezgisel) kutu **sırasını + yönelimini** optimize eder; **iç katman Wall-Builder** (George & Robinson 1980 duvar inşa heuristiği) bu sırayı fiziksel yerleşime çevirir ve doluluk/ceza içeren **fitness** döndürür.
- **Kritik doğrulama:** GWCA'nın 3D konteyner yükleme / bin packing'e uygulandığı **yayımlanmış hiçbir çalışma veya repo yoktur** (16 Ağu 2026). GWCA sürekli optimizasyon için tasarlanmıştır; ayrık probleme **random-key kodlaması** ile uyarlanacaktır. Bu projede yapılan iş **özgün/deneysel** kabul edilir; GA/GRASP karşılaştırma zorunludur (bkz. `R-C22`, `KK-05`).
- İki araştırma raporu birbirini tamamlar: 1. rapor "GWCA ↔ CLP bağı yok, GA/GRASP olgun" derken 2. rapor GWCA'nın matematiksel modelini (mühendis/asker/işçi denklemleri), OBL uyarlamasını, maximal-space + sanal duvar mekanizmalarını ve K-Means ön kümelemeyi getirir. Rulebook ikisini de içerir; çelişen yerlerde temkinli olan kazanır ve DR ile işaretlenir.
- Determinizm, tek kaynaklı sert kapılar, koordinat standardı ve golden korpus disiplini yeni sistemin **giriş bileti**dir (Bölüm C §C1).

---

# BÖLÜM A — Bugünkü Motor: Bağlayıcı Sözleşme

## A0. Artifact'lerden bugüne değişenler (rulebook bu tabloyu esas alır)

| Konu | Artifact'te yazan (12–15 Ağu) | Bugünkü gerçek |
| --- | --- | --- |
| OPT-01 / OPT-02 düzeltmeleri | yalnız yerel commit | **Merge edildi** — OPT-01 → PR #989, OPT-02 → PR #990 + #1002; `dev` ve `test`'te |
| Motor dosya/satır | 7 dosya · 915 satır | **9 dosya · 1.195 satır** (`DoorSetFactory.cs`, `LoadingCorner.cs` eklendi) |
| Motor testleri | 33 test · 16 snapshot | **42 `[Fact]`/`[Theory]` · 17 snapshot** (11 dosya) |
| LIFO bölgesi | yalnız `LoadingType.Rear` | **Kapı listesinden bağımsız** — OPT-10 kapandı |
| Yükleme yönü | sabit `(0,0,0)` | **Kapıya göre türetiliyor** (`FillFromMaxX`, aynalanmış yükleme) |
| Test aracı | yok | **`apps/algorithm-test-ui`** (PR #996) + 2 CI iş akışı |

## A1. Dosya haritası

> Bu bölüm **yürürlükteki** mimariyi tanımlar. Duvar örücü ve arama katmanı eklendikten sonra
> yeniden yazıldı (2026-08-18); önceki hâli yalnız greedy'yi kapsıyordu.
>
> **Kökeni:** klasör düzeni 12 Ağustos 2026 modülerleştirmesinden geliyor (PR #935 → #936 → #937) —
> 583 satırlık tek dosya `Infrastructure/Services/`'ten `Application/Common/Optimization/`'a taşındı
> ve iş modülü başına bir dosyaya bölündü. O raporun metni [`arsiv/2026-08-12-mimari-raporu.md`](arsiv/2026-08-12-mimari-raporu.md) satır
> 1-134'te; **sayıları bayattır**, bu bölüm güncel olandır.

Motor tek bir klasörde: `apps/backend/CargoPilot.Application/Common/Optimization/`

### Ortak çekirdek — her iki yerleştiricinin paylaştığı

| Dosya | Satır | Sınıf | Rol |
| --- | --- | --- | --- |
| `PlacementValidator.cs` | 370 | **kapatılamaz — fizik** | **Sekiz** sert kapının tek kaynağı + rotasyon üretimi. Sekizinci kapı `ViolatesLoadAbove`: adayın KENDİ istif/kırılganlık kısıtları (`DR-27`). Destek eşiği burada tek yerde durur |
| `PlacedBox.cs` | 17 | veri | Modüllerin ortak dili |
| `ItemOrdering.cs` | 71 | **kapatılamaz** | Yerleştirme sırası (kriterle parametreli, grup kümelemeli) |
| `PlanResultBuilder.cs` | 59 | ortak | Yerleşim listesi → sonuç sözleşmesi: doluluk, ağırlık, CoG, denge sapması, sebepli yerleşemeyenler. **İki yerleştirici de buradan geçer**, metrikler tek yerde hesaplanır |
| `LoadingCorner.cs` | 50 | ortak | Kapı listesinden başlangıç köşesi |
| `DoorSetFactory.cs` | 37 | ortak | Eski `LoadingType` → kapı listesi köprüsü |
| `SequencerSelection.cs` | 33 | ortak | Belirtilmemiş sequencer'ı çözer (`DR-24`) |
| `OptimizationEngine.cs` | 69 | çekirdek | Sequencer dallanması (tek nokta) |
| `LifoPlacement.cs` | 31 | ortak | Boşaltma sırası yön semantiği (tek karşılaştırma). Bölge modeli `DR-67` ile kaldırıldı |

> Greedy yerleştirici ve ona ait üç puanlama modülü (`BalanceScoring`, `VolumeScoring`,
> `LifoPlacement`'ın bölge yarısı) kaldırıldı (`DR-39`, `DR-67`).

### Duvar örücü — `WallBuilder/`

| Dosya | Satır | Rol |
| --- | --- | --- |
| `WallBuilderPlacement.cs` | 750 | Duvar disiplini, aday taraması, kule/blok/bileşik blok inşası (`R-C08`, `R-C09c`, `R-C09d`) |
| `SpaceLedger.cs` | 158 | Maximal-space defteri; boşluklar **maksimaldir** (ölçüldü, `DR-34`) |
| `FreeSpace.cs` | 42 | Prizmatik boş bölge; kutuyla aynı konum sözleşmesi |
| `DecoderKeys.cs` | 61 | Plan düzeyindeki kararlar (duvar derinliği, yedek kademe sırası) — aramaya açık (`R-C15a`) |
| `SequencedItem.cs` | 25 | Sıradaki kutu + yönelim anahtarı |

### Arama katmanı — `Search/`

| Dosya | Satır | Rol |
| --- | --- | --- |
| `GraspSequencer.cs` | 135 | **Varsayılan** (`DR-13`). Sabitleri ölçülerek seçildi (`DR-30`) |
| `GaSequencer.cs` | 145 | Referans — kıyas için kodda kalır |
| `GwcaSequencer.cs` | 294 | Emekli (`DR-13`) — referans olarak kodda kalır |
| `SearchEvaluation.cs` | 82 | Üç aramanın **ortak** değerlendirmesi ve fitness'ı (`R-C22`) |
| `RandomKeySequence.cs` | 132 | Vektör düzeninin tek kaynağı: `[0,N)` sıra · `[N,N+4)` decoder · `[N+4,2N+4)` yönelim |
| `SearchRandom.cs` | 46 | Aramanın **tek** rastgelelik kaynağı (mulberry32) — determinizmin dayanağı |
| `GammaDensity.cs` | 58 | GWCA'nın adım küçültmesi; yalnız GWCA kullanır |

### Ölçüm düzeneği — `apps/backend/CargoPilot.Engine.Bench/` *(üretime girmez)*

| Dosya | Rol |
| --- | --- |
| `Program.cs` · `BenchOptions.cs` | Dört kip: `bench` · `soak` · `br` · `serve` |
| `EngineHost.cs` | Motorun tek çağrı noktası; üretim akışının **yalnız hesap** kısmını tekrarlar |
| `BrCorpus.cs` · `data/br0..15.txt` | **Birincil korpus** — BR1-BR7, 700 örnek (`DR-19`); BR0 ve BR8-BR15 opt-in (`DR-50`) |
| `VolumeCorpus.cs` | Giyotin korpusu — regresyon |
| `BenchCatalog.cs` · `BenchCorpus.cs` | Sabit sentetik korpus |
| `BrCommand.cs` · `SoakCommand.cs` · `BenchCommand.cs` | Koşum kipleri |
| `BrBaseline.cs` | Gecelik kapının karşılaştırması (`DR-28`) |
| `BenchServer.cs` | Test arayüzünün konuştuğu loopback ucu |
| `DeterminismDigest.cs` | Koşunun anlamlı izdüşümü — tek hex dizesi |
| `DiagnosticPlacements.cs` | Plan çıktısı → motorun iç tipi; teşhisler motorun **kendi** yüklemlerini çağırabilsin diye |
| `WasteDiagnostics.cs` | Kayıp hacmin ayrışımı: ölü hava / iç boşluk / engebe |
| `SpaceDiagnostics.cs` | Kalan boşluklar; "sığan ama desteksiz" oranı |
| `RejectionDiagnostics.cs` | Yerleşemeyenlerin ret sebebi dağılımı |
| `CorpusDiagnostics.cs` | Korpusun şekli — tekrar var mı (`DR-19`'un dayanağı) |
| `SupportDiagnostics.cs` | Destek dağılımı; eşik kararının bedel tarafı (`DR-16`) |
| `MaximalityDiagnostics.cs` | Boşluklar maksimal mi (`DR-34`) |

Zincirin dışındaki parçalar: `Common/ContaminationFilter.cs` (motor **öncesi**, handler'da:
`CreatePlanCommandHandler.cs`, `ReOptimizePlanCommandHandler.cs`),
`Common/Models/OptimizationInput.cs` (girdi + `OptimizationModules` bayrakları + `SearchBudget` +
`SupportThreshold`).

**Korunan tasarım kararı:** tüm modüller `static`; sıcak döngüde arayüz/delegate/DI üzerinden sanal
çağrı bilinçli olarak yok.

**Klasör kuralı:** duvar örücüye ait her şey `WallBuilder/`, aramaya ait her şey `Search/`, ikisinin
paylaştığı her şey `Optimization/` kökünde. Yeni bir yerleştirici gelirse kendi alt klasörünü açar;
sert kapılar **hiçbir koşulda kopyalanmaz**, `PlacementValidator` tek kaynak kalır (`R-C01`).

## A2. Plan üretim akışı (bugün)

1. Bayrak çözümü — `OptimizationModules.Resolve`; verilmezse kriterden türetilir.
2. Genişletme — adetli ürünler tek tek kutuya açılır.
3. Sıralama — `ItemOrdering.SortForGroupPlacement`: gruplu ürünler `UnloadingOrder` DESC → kriter anahtarı (WeightBalance → ağırlık, diğerleri → hacim) → eşitlik bozucu `ItemId`.
4. Tohumlama — `(startX,0,0)`; WeightBalance'ta 4 zemin köşesi; LIFO'da her bölge başlangıcı.
5. Kutu döngüsü — araç ağırlık limiti aşılırsa kutu denenmez (`WeightLimitExceeded`).
6. Aday tarama — her aday nokta × her izinli yönelim → 7 sert kapı → skor.
7. İki kademeli seçim — `best = bestInZone ?? best`.
8. İkinci geçiş — yalnız WeightBalance: `BalanceScoring.ImproveBalance` (≤3 tur, O(n²)).
9. Sonuç — doluluk, toplam ağırlık, 3 eksen CoG, X/Z denge sapma %, sebepli yerleşemeyenler.

## A3. Yedi sert kapı (sıra = eleme gücü)

| # | Kapı | Kural |
| --- | --- | --- |
| 1 | Araç sınırları | `ex/ey/ez + boyut` iç ölçüyü aşamaz; `ex < 0` elenir |
| 2 | `HasOverlap` | AABB kesin eşitsizlik — **temas çakışma değildir** |
| 3 | `HasSupport` | `y == 0` destekli; aksi hâlde taban alanının **≥ %60'ı** alttaki kutuların üst yüzeyinde (`SupportThreshold`) |
| 4 | `ViolatesStackability` | Alttaki `IsStackable=false` ise ret; LIFO'da geç inecek, erken inecek olanın üstüne konamaz |
| 5 | `ViolatesStackCount` | Altta kalan **her** kutunun `MaxStackCount`'u; `<=0` sınırsız; aday için `+1` |
| 6 | `ViolatesStackWeight` | Altta kalan **her** kutunun `MaxWeightOnTop`'u; sütun geneli toplam |
| 7 | `ViolatesFragility` | `FragilityType.Fragile` üstüne **hiçbir** yük konmaz |

Ret sebebi: hiçbir aday geçemezse `InsufficientSpace`; yalnızca kırılganlıktan elenen aday varsa `FragilityOrHandlingConstraint`. Takas geçişi ayrıca **yukarı bakan** kısıtları sorar (`ViolatesLoadAbove`).

## A4. Puanlama — terim toplamı

Skor **maliyettir**, düşük kazanır. Toplama sırası sabit: `yerçekimi → uzunluk → denge → genişlik → bölge`.

| Terim | Sahibi | Katsayı | İşlev |
| --- | --- | --- | --- |
| Yerçekimi | çekirdek | **1.000.000** | Alçak nokta her zaman tercih; kapatılamaz |
| Denge (WeightBalance) | `BalanceScoring` | 900.000 | Normalize CoG sapması (X+Z) |
| Bölge | `LifoPlacement` | 2.000 / cm | Yalnız yedek kademede anlamlı |
| Uzunluk | `VolumeScoring` | 1.000 | Küçük `z` tercih (uzak yüzden kapıya) |
| Denge (VolumeFirst) | `BalanceScoring` | 500 | Hafif düzeltici |
| Genişlik | `VolumeScoring` | 1 | Beraberlik bozucu; yön farkında |

Kriter formülleri: `VolumeFirst: ey·1e6 + ez·1e3 + denge·500 + genişlik (+bölge)` · `WeightBalance: ey·1e6 + denge·900.000 (+bölge)` · `Lifo: ey·1e6 + ez·1e3 + genişlik (+bölge)`.
Bölge terimi iki kademeli seçim sayesinde sert kısıt gibi davranır; katsayı küçüklüğü disiplini zayıflatmaz. **Bayraklar arayüze açık değildir** (16 kombinasyon, yalnız 3 kalibre).

## A5. Koordinat ve yön sözleşmesi

- Origin: referans kapıdan bakınca uzaktaki sol-alt köşe `(0,0,0)`. `x`=width, `y`=height, `z`=length; kapı yüzü `z=length`. Right-handed, Three.js ile birebir; ayna/telafi dönüşümü yasak.
- Kutu pozisyonu **min köşe**; birim **cm**; dönüşüm yalnız API sınırında.
- Kapılar `small`/`big` + `face` ile **liste**.
- **Yükleme kapının bulunduğu yüzden başlamaz.** `LoadingCorner.FillFromMaxX`: big door yalnız `x=0` yüzündeyse başlangıç `(width,0,0)`; `z` yönü sabit.
- Aynalanmış modda eşitlik bozucular da döner (`OrderByDescending(p=>p.x)`, `WidthTerm` = `vehicleWidth-(ex+boxWidth)`).
- Çelişkide `docs/COORDINATE_STANDARD.md` kazanır.

## A6. LIFO uzaysal modeli — **çıkarılabilirlik** (`DR-67`)

- Kural: bir kutu, kendi iniş sırası geldiğinde **hâlâ araçta olan** hiçbir kutuyu oynatmadan
  kapıya çıkabilmeli. Uygulaması `PlacementValidator.ViolatesUnloadPath`.
- Yol, kutunun ayak izinin kapıya doğru (`+z`) süpürdüğü koridordur. Daha geç inecek bir kutu bu
  koridoru kesiyorsa aday reddedilir.
- Kural **iki yönlüdür**: aday, daha geç inecek bir kutunun arkasında kalamayacağı gibi, daha erken
  inecek bir kutunun önünü de kapatamaz. Tek yönlü sürüm 145 ihlal bırakmıştı.
- **Gruplar uzayda iç içe geçebilir.** Bant (bölge) kavramı yoktur.
- Boşaltma sırası atanmamış ürün **serbesttir**: ne kısıtlanır ne kısıtlar (`DR-68`).
- Dikey eksen bu kuralın konusu değildir; üstteki yük `ViolatesStackability`'nin LIFO dalındadır.
- Modül `UseLifo` ile açılır; kapalıyken kural hiç uygulanmaz.

## A7. Artifact özetleri

**Artifact 1 — Mimari Raporu (12 Ağu, PR #935→#937):** 583 satırlık tek dosya Application katmanına taşınıp 6 statik modüle bölündü; 16 snapshot ile davranış kilitlendi; 7 adımda snapshot kaymadı. Kazanım: kural tek başına test edilebilir (0→33 test), çift yazılmış kurallar birleşti, test projesi altyapıdan koptu (~21 sn).

**Artifact 2 — Adli İnceleme (15 Ağu, OPT-01·OPT-02):**
- **OPT-01:** `ImproveBalance` destek taramasını `if (a.H != b.H)`'a hapsetmişti; eşit yükseklikli takasta kutu havada kalıyordu (500 kutuda 1 kutu, destek 0,667). Düzeltme: koşul kaldırıldı, `othersA/othersB` ayrımı, `ViolatesLoadAbove`. Bedel: WeightBalance +%43 (20,6→29,5 sn).
- **OPT-02:** LIFO bölge cezası yerçekiminden 500× zayıftı (1 cm yükselme 500 cm taşmayı affediyordu; P1 4/8, P2 2/5 ihlal). `GroupZoneTests.cs:46` sert kısıt iddia ediyordu ama tesadüfen geçiyordu. Çözüm: iki kademeli seçim. Reddedilenler: katsayı 2.000.000, koşulsuz sert eleme. Sonuç: 0 ihlal, 0 kayıp, FillRate sabit, LIFO −%17.

## A8. Bağlayıcı maddeler (yeni sistem de uyar)

**Fizik (kapatılamaz):**
`R-A01` Kutular çakışamaz (temas çakışma değildir).
`R-A02` Havada kutu olmaz — taban alanının **≥ %60'ı** destekli. *(Eşik bir fizik kanunu değil
POLİTİKA'dır; `DR-16` bunu kaydetti ve "müşteri kararı sayı olmadan verilemez" dedi. Sayılar
19 Ağu 2026'da sunuldu ve **%80 → %60 seçildi** — bkz. ölçüm günlüğü `G-5`. Değer
`PlacementValidator.SupportThreshold`'da tek noktada durur.)*
`R-A03` `IsStackable=false` üstüne kutu konamaz.
`R-A04` `MaxStackCount` ve `MaxWeightOnTop` **sütun geneli**.
`R-A05` Kırılgan ürünün üstüne hiçbir yük konmaz.
`R-A06` Rotasyon yalnız `AllowedRotations` kümesinden.
`R-A07` Araç iç ölçüsü ve ağırlık kapasitesi aşılamaz.
`R-A08` Her kutu ya `placements` ya `unplaced`'te — **kutu korunumu**.
**Geometri:** `R-A09` Koordinat standardı; `R-A10` pozisyon = min köşe, cm; `R-A11` yükleme kapı yüzünden başlamaz.
**Determinizm:** `R-A12` aynı girdi → bit birebir aynı çıktı; katı `<` ve `ItemId` eşitlik bozucu; `R-A13` skor toplama sırası sabit.
**Süreç:** `R-A14` taşıma commit'i ile davranış değiştiren commit birleşmez; `R-A15` hata önce kırmızı testle ispatlanır; `R-A16` snapshot kayması ya sıfır ya senaryo bazında gerekçeli; `R-A17` her bozuk vaka golden fixture olur.

---

# BÖLÜM B — GWCA ve Wall-Builder: Literatür, Kod Ekosistemi, Doğrulama

## B1. GWCA — ne olduğu ve doğrulama

**Great Wall Construction Algorithm (GWCA)** — Ziyu Guan, C. Ren, J. Niu, P. Wang, Y. Shang, *Expert Systems with Applications* 233 (2023) 120905. DOI 10.1016/j.eswa.2023.120905. https://www.sciencedirect.com/science/article/abs/pii/S0957417423014070
Resmi kod (MATLAB): https://github.com/guangian/Great-Wall-Construction-Algorithm-a-novel-meta-heuristic-algorithm-for-global-optimization (3 yıldız; `main.m/GWCA.m/EngineerProblem.m/fobj.m` sonradan silinmiş/taşınmış görünüyor — commit 2c958ff, d3d6992; kod MathWorks File Exchange "An Opposition-Based GWCA for the FS problem" ID 159728 üzerinden edinilebilir).

**Doğrulama sonucu (16 Ağu 2026):** GWCA'nın 3D konteyner yükleme, bin packing, palet/tır yüklemeye uygulandığı **hiçbir yayın, tez veya repo yok**. Türev çalışmalar GWCA'nın "ağırlıklı olarak sürekli optimizasyona odaklı, ayrık problemlerde daha az etkili" olduğunu açıkça yazar. Orijinal makalede test edilen NP-zor problemler TSP/lojistik dağıtım/elektrik besleme hattı tipindedir; paketleme yoktur (kaynaklar 5 mi 6 mı problem konusunda çelişir).

**Kavram karmaşası (arama gürültüsü — elenmeli):**
- **PS-GWCA** = Particle Swarm–Grey Wolf Cooperation; Docker/mikroservis konteynerlerinin sunuculara dağıtımı (cloud scheduling). Fiziksel yükleme ile ilgisi yok; ancak çok amaçlı ağırlıklandırma fonksiyonları denge modülü için ilham olabilir.
- **GWCA C++ Guild Wars istemci API'si** (GregLando113, dfarley1, gwdevhub/GWToolboxpp) — tamamen ilgisiz.

**Bilinen GWCA varyantları (hepsi başka alanlarda):** PGWCA (paralel, görüntü eşikleme, IEEE 2025), OBL-GWCA + Gauss mutasyonu (öznitelik seçimi, IEEE Access 2024, 856 boyuta kadar), GGC-GWCA (iyi nokta kümesi + Gauss + Cauchy, çoklu-İHA görev tahsisi, MDPI Drones 2025), LGWGCA (GWO konum güncelleme + Lévy uçuşu, PV MPPT, Sci. Rep. 2024), kiTS21 tıbbi görüntüleme hiperparametre optimizasyonu.

## B2. GWCA matematiksel modeli (2. rapordan; uygulama referansı)

Popülasyon her iterasyonda fitness'a göre sıralanır; en iyi üç birey lider: $X_{w1}$ (başmühendis), $X_{w2}$ (komutan), $X_{w3}$ (usta işçi); her bireyin kişisel en iyisi $P_i(t)$. Her bireye her iterasyonda **rastgele** üç rolden biri atanır (orijinal makalenin ifadesi: "randomly assigns a single predefined motion model to each worker in every iteration"). Döngü sonunda proje yöneticisi verimsiz işçileri eler.

- **Mühendis (global keşif):**
  $X_i(t+1) = X_{w1}(t) + (-1)^r\,(X_{w1}(t) - X_i(t)) \odot rand + X_i(t) \odot v_i(t)$, $r\in\{0,1\}$; $v_i$ momentum.
- **Asker (komşuluk öğrenmesi):**
  $X_i(t+1) = X_i(t) + sign(f(X_j)-f(X_i))\,(X_j - X_i)\odot v_i + (X_{w2} - X_i)\odot rand$; $j$ rastgele birey.
- **İşçi (yerel iyileştirme):**
  $X_i(t+1) = X_i(t) + 2\,(X_{w3} - X_i)\odot rand + (P_i - X_i)\,gampdf(t,P,Q)$; Gama pdf adım boyutunu iterasyonla küçültür.
- Diğer parametreler: θ (eğim açısı, [0,80] rastgele), Gama şekil parametresi P; çözüm vektörü $X=[r_1T_1,\dots,r_DT_D]$.

**CLP karşılığı:** mühendis = radikal farklı sıralamalar; asker = benzer sıralamalar arası bilgi alışverişi; işçi = birkaç kutunun swap'ı gibi mikro mutasyon.

## B3. Wall-Builder — tanım ve varyantlar

**George & Robinson (1980)**, *Computers & OR* 7(3):147-156, DOI 10.1016/0305-0548(80)90001-5. Konteyner derinlik boyunca ardışık **dikey duvarlar** hâlinde doldurulur; duvar derinliği = duvara giren ilk kutunun derinliği (ya da "paketlenmemiş kutuların en küçük boyutlarının en büyüğü" kuralı); duvar yatay **şeritlere** bölünür, her şerit 0-1 knapsack/greedy ile doldurulur; artık boşluklar sonraki duvara devredilir. Boyut indirgeme (3D → 2D katmanlar) sayesinde işçilerin "duvar duvar örme" pratiğine birebir uyar — mevcut projedeki "çıktı sahadaki yükleme pratiğine uymuyor" şikâyetine doğrudan cevap.

**Yapıcı heuristik aileleri (Pisinger 2002; Zhao vd. 2016):** wall building (dikey katman, derinlik), layer building (yatay katman, yükseklik), stack/tower building (Gehring & Bortfeldt 1997; Yap 2012), block building (Eley 2002, homojen bloklar), guillotine cutting (Morabito & Arenales 1994).

**Geliştirenler:** Pisinger (2002, EJOR 141:382-392) — wall building + tree search + 27 ranking fonksiyonu; Bischoff & Ratcliff (1995, Omega 23(4)) — pratik kısıtlar + BR1–BR7 benchmark (ORLib: https://people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html); Bischoff & Marriott (1990) — compound approach (14 kural); Modified Wall Building-Based Compound Approach — 6 konteyner rotasyonu × 3 ranking × 2 öncelik = 36 varyant.

**Modern uygulama biçimi — Maximal Space temsili (2. rapor):** başlangıçta tek devasa boşluk (`SpaceList`); köşeye (en derin-en alt) mesafe fonksiyonuyla (Öklid/Chebyshev) boşluk seçilir; sıradaki kutulardan katman kurulur; yerleşim sonrası eski boşluk silinir, etrafında yeni prizmatik **maximal spaces** doğar; kısıtı karşılamayan/dar alanlar `rejected` olur, isteğe bağlı **amalgamation** ile birleştirilir.

**Sanal Duvar (Virtual Wall) — multi-drop için:** müşteri C1 bitince `x_wall` (bizim eksenimizde `z_wall`) çekilir; C2'nin hiçbir kutusu C1 bölgesine giremez (Junqueira vd.). Mevcut LIFO bölge modelinin literatürdeki karşılığıdır — fark: literatürde sınır **yüklenen hacme göre dinamik**, bizde eşit bölme.

**WallE stabilite skoru (Ojha vd. 2020, arXiv:2007.00463):**
$S = -\alpha_1 G_{var} + \alpha_2 G_{high} + \alpha_3 G_{flush} - \alpha_4(i+j) - \alpha_5 h_{i,j}$ — yüzey düzlüğü, komşu duvarla aynı yükseklik, duvara temas ödüllendirilir. WallE geleneksel heuristikleri geçer; üzerine kurulan DRL PackMan 1,29 rekabet oranı. Ders: wall-building eğilimi yumuşak skor olarak da ifade edilebilir; α katsayıları GWCA'nın öğrenebileceği bir yerdir.

## B4. Sıralama (sequencing) kriterleri — literatür özeti

Hacme göre azalan (en yaygın), taban alanına göre azalan (LAFF, stabilite), en küçük boyutun en büyüğü (G&R katman derinliği), ağırlık/yük taşıma kapasitesine göre (py3dbp `loadbear`, `level`), teslimat sırasına göre (multi-drop LIFO). Pratikte kanıtlanmış mimari: **sıralama (meta-sezgisel/GRASP/GA) + yerleştirme (wall/layer) ayrımı** (Renault/ESICUP 2015; Correcher vd. 2020 — 12 pratik kısıtın formülasyonu). K-Means ile kutuları boyuta göre ön kümeleyip Wall-Builder'a vermek 2. rapora göre 30–35× hızlanma ve %15'e varan doluluk artışı sağlamıştır — **ÖLÇÜLDÜ VE REDDEDİLDİ (`DR-33`)**: doluluk her küme sayısında düştü (BR %79,86 → %79,34-79,86, giyotin %76,29 → %72,46-74,85), hızlanma ise 30-35× değil ~2× ve sebebi kayıp (daha az boşluk hayatta kalıyor).

## B5. Makale listesi

| Başlık | Yazar | Yıl | Link | Bulgu |
| --- | --- | --- | --- | --- |
| A heuristic for packing boxes into a container | George, Robinson | 1980 | https://www.sciencedirect.com/science/article/abs/pii/0305054880900015 | Wall-building orijini |
| Issues in the development of approaches to container loading | Bischoff, Ratcliff | 1995 | https://www.semanticscholar.org/paper/4aefcbf2e5cc21921036cef8bcc2cea1893517df | Pratik kısıtlar, BR1–7 |
| Heuristics for the container loading problem | Pisinger | 2002 | https://www.sciencedirect.com/science/article/abs/pii/S0377221702001327 | Wall building + tree search, 27 ranking |
| A genetic algorithm for solving the CLP | Gehring, Bortfeldt | 1997 | https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1475-3995.1997.tb00095.x | Tower building + GA |
| Constraints in container loading – SOTA review | Bortfeldt, Wäscher | 2013 | https://www.sciencedirect.com/science/article/abs/pii/S037722171200937X | Kısıt taksonomisi (stabilite %37,3, yönelim %70,9 makalelerde) |
| A comparative review of 3D CLP algorithms | Zhao vd. | 2016 | https://onlinelibrary.wiley.com/doi/abs/10.1111/itor.12094 | Yöntem karşılaştırması |
| Solving CLP by block arrangement | Eley | 2002 | https://www.sciencedirect.com/science/article/abs/pii/S0377221702001339 | Blok inşa |
| Practical constraints in the CLP | Correcher vd. | 2020 | https://www.sciencedirect.com/science/article/pii/S0305054820303038 | 12 pratik kısıt formülasyonu |
| Great Wall Construction Algorithm | Guan vd. | 2023 | https://www.sciencedirect.com/science/article/abs/pii/S0957417423014070 | GWCA orijini |
| WallE / PackMan (online 3D-BPP, DRL) | Ojha vd. | 2020 | https://arxiv.org/pdf/2007.00463 | Stabilite skoru |
| OBL-GWCA + Gaussian mutation (feature selection) | Zitouni vd. | 2024 | https://www.researchgate.net/publication/378328588 | Ayrık uyarlama, OBL |
| GGC-GWCA (UAV task assignment) | — | 2025 | https://www.mdpi.com/2504-446X/9/2/113 | İyi nokta kümesi başlatma |
| PGWCA (parallel) | — | 2025 | https://ieeexplore.ieee.org/abstract/document/10988772/ | Adalar/diferansiyel değişim |
| A Modified Wall Building-Based Compound Approach | — | — | https://www.researchgate.net/publication/268685795 | 36 varyant compound |

Açık erişim doğrulama kaynakları: SciELO çok-başlangıçlı yapıcı heuristik, IntechOpen hibrit metodoloji (https://cdn.intechopen.com/pdfs-wm/30297.pdf), Bortfeldt & Wäscher çalışma raporu (OVGU FEMM 2012/07).

## B6. GitHub / paket ekosistemi

| Repo / paket | Dil | Yıldız (16 Ağu 2026) | Ne yapar / bize değeri |
| --- | --- | --- | --- |
| davidmchapman/3DContainerPacking | C# | 477 | EB-AFIT (Baltacıoğlu 2001/2006), tam rotasyon, paralel; **.NET için en doğrudan referans** |
| skjolber/3d-bin-container-packing | Java | ~514 | LAFF + brute force; "büyük taban önce, yüksekliği level olur"; üretim kalitesinde layer mantığı |
| jerry800416/3D-bin-packing | Python | 280 | py3dbp + yerçekimi, `loadbear`, `level`, `support_surface_ratio=0.75`, `binding`; **kısıt entegrasyonu referansı** |
| enzoruiz/3dbinpacking | Python | orta | `bigger_first`, `distribute_items` |
| @cratefit/pack (npm) | TS | — | Konfigüre edilebilir `'wall-building'`, `'layer-building'`, `'extreme-point'`; hızlı prototip |
| lotuc/bin-pack, wknechtel/3d-bin-pack | C++ | düşük | Yüksek performans maximal-space referansı |
| Nivedha-Ramesh/Container-Loading-Problem | Python | düşük | Hibrit GA |
| c8121/bin-packing | Java | düşük | "footprint'e göre sırala, sonra LAFF" — sıralama/yerleştirme ayrımı örneği |
| guangian/GWCA (resmi) | MATLAB | 3 | GWCA referansı; paketleme yok |

Not: GitHub'da adı birebir "wall-building" olan popüler CLP reposu nadirdir; mantık LAFF/layer/level tabanlı repolara gömülüdür. LLM-güdümlü heuristik keşfi (EoH, 2024-25) wall-building'i baştan icat edemez ama hacim/yüzey/stabilite kombinasyon skorlarını iyi üretir — ceza formülasyonu için ileride kullanılabilir.

## B7. İki araştırma raporunun uzlaştırılması

| Konu | Rapor 1 | Rapor 2 | Rulebook kararı |
| --- | --- | --- | --- |
| GWCA'nın CLP'de kullanımı | Yok, deneysel | "Kanıtlanmış hibrit strateji" gibi anlatır | **Rapor 1 kazanır**: yayın yok; deneysel; GA/GRASP kıyası zorunlu (`R-C22`) |
| GWCA ayrık uyarlama | Random-key kodlaması | Transfer fonksiyonu / OBL | İkisi de: **random-key temel**, OBL Faz 3'te opsiyon (`R-C15`) |
| Wall-Builder içi | G&R şerit/knapsack | Maximal-space + sanal duvar | Maximal-space temsil + duvar disiplini birlikte (`R-C05`) |
| Fitness | Doluluk + ceza | Doluluk + WallE stabilite skoru + marjinal fayda | Ceza tabanlı, stabilite terimi opsiyonel katsayı (`R-C18`) |
| Hızlandırma | — | K-Means ön kümeleme, PGWCA adalar | Faz 3 deneyi, iddia ölçülmeden kabul edilmez |

---

# BÖLÜM C — Yeni Hibrit Mimari: Tasarım Kuralları

## C1. Giriş bileti — yeni sistemin uyması zorunlu ön koşullar

`R-C01` **Sert kapılar tek kaynaktan.** Wall-Builder her aday yerleşimi `PlacementValidator` üzerinden doğrular; kural kopyalanmaz, sarmalanmaz. Yeni kısıt gerekiyorsa `PlacementValidator`'a eklenir, `CHECK_IDS` aynasına yansıtılır.
`R-C02` **Determinizm tohumla.** GWCA rastgeleliği tek `Random(seed)` kaynağından beslenir; seed `OptimizationInput.Seed`'dir (verilmezse `0`). Aynı seed + aynı girdi → bit birebir çıktı. `Random.Shared`, `Guid`, `DateTime.Now`, paralel iterasyon sırasına bağlı toplama **yasak**. Paralel değerlendirme yapılacaksa sonuçlar bireyin indeksine göre deterministik sırada birleştirilir.
`R-C03` **Koordinat standardı aynen.** Duvarlar `z` boyunca örülür; `z=0` (uzak yüz) → kapı yüzü. Aynalanmış modda (`FillFromMaxX`) `x` eşitlik bozucuları döner. Ayna dönüşümü yasak.
`R-C04` **Kutu korunumu + sebepli ret.** Wall-Builder çıktısında her kutu `placements` ya `unplaced` (sebep dolu). Yeni ret sebepleri (`NotStackable`, `GeometryConstraint`) bu fırsatta **üretilir** (açık borç kapanır).
`R-C05` **Yerleştirici arayüz sözleşmesi.** Sıralama ve yerleştirme birbirinden bağımsız statik giriş noktaları olarak tasarlanır (`ItemSequencer` ↔ `WallBuilderPlacement`). Sıcak döngüde sanal çağrı yok (A1 kararı korunur); GWCA yalnız Wall-Builder'ı fitness fonksiyonu olarak çağırır.
`R-C06` **`static`, `CancellationToken`, analyzer temiz, `!` yok, yorum yok.** Kod standardı `csharp-clean-code` skill'i; dosya adı = sınıf adı; hata metinleri `ErrorKeys`.
~~`R-C07`~~ **GEÇERSİZ (`DR-39`)** — greedy kaldırıldı, tek yerleştirici kaldı. Özgün kural: **Bayrak değil, kriter.** Yeni yerleştirici `OptimizationModules` bayrağı olarak değil, **yeni bir kriter** (`PlacementStrategy.WallBuilder` + `Sequencer.Gwca`) olarak açılır; greedy motor olduğu gibi kalır (yan yana). Bayrak kombinasyon patlaması (16→32) kabul edilmez. *(Karar noktası 1 cevabı — bkz. DR-01)*

## C2. Genel akış (yeni kriter seçildiğinde)

```
Girdi → ContaminationFilter (handler'da, değişmez)
      → Genişletme (adet → kutu)
      → [opsiyonel] Ön kümeleme (K-Means boyut kümeleri; Faz 3)
      → GWCA
           popülasyon başlat (random-key + sezgisel tohumlar)
           for iter in 1..MaxIter:
               her birey: decode → sıra + yönelim tercihleri
               fitness = WallBuilder(sıra, yönelim, ct)   ← 7 sert kapı içeride
               liderleri seç, rol ata (mühendis/asker/işçi), konum güncelle, ele
               erken durdurma / bütçe kontrolü
           en iyi birey → nihai plan
      → Sonuç metrikleri (doluluk, CoG, denge %, unplaced+sebep, duvar sayısı, arama istatistikleri)
```

## C3. Wall-Builder (yerleştirme) kuralları

`R-C07a` **Katman (layer) inşası YASAK — müşteri kararı.** Yatay katman yaklaşımı projenin ilk
algoritmasıydı ve **müşteri tarafından reddedildi**: konteynerin tüm kesitini kaplayan bir katmanı
kurup üstüne çıkmak sahada uygulanabilir bir yükleme değil. İşçi kapıdan girer ve duvar duvar örer;
uzak uçtaki bir katmanı yakın uç dolduktan sonra tamamlayamaz. Bu yüzden doluluk kazancı ne olursa
olsun katman inşası bir seçenek değildir — çıktı **fiziksel olarak yüklenebilir** olmak zorundadır.
Wall-Builder tam da bu gerekçeyle seçildi (bkz. B3: "işçilerin duvar duvar örme pratiğine birebir
uyar").

`R-C08` **Duvar tanımı.** Duvar = `[zStart, zEnd)` aralığında, tüm `x`/`y` boyunca yerleşen kutular kümesi. `zEnd - zStart` = duvara ilk yerleştirilen kutunun `z` boyutu (G&R kuralı). Alternatif derinlik kuralı ("kalan kutuların en küçük boyutunun en büyüğü") `WallDepthRule` parametresi ile seçilir; **varsayılan G&R**.
`R-C09` **Duvar içi doldurma.** Duvar yatay şeritlere bölünür (şerit yüksekliği = şeride ilk giren kutunun `y`'si). Şerit `x` boyunca greedy doldurulur; knapsack-optimal şerit Faz 2 opsiyonudur. Şerit ve duvar artıkları **maximal-space** listesine devredilir; sonraki kutular önce mevcut duvarın boşluklarını, sonra yeni duvarı dener.
`R-C09a` ~~**Destek-farkında boşluk (F2a).**~~ **ÖLÇÜLDÜ VE REDDEDİLDİ — bkz. `DR-17`.**
Öneri şuydu: boşluk üretilirken tabanın yalnız **desteklenen** kısmı alınsın, kısmen havada kalan
taban düşülsün. Üç varyant ölçüldü (tam destek / %80 eşik / boşluktan bağımsız birleşik zemin),
üçü de taban çizginin altında kaldı: %75,99 → %73,85 / %74,00 / %73,65.
**Havada duran taban bir kusur değil, mekanizmadır:** destek kuralının komşu yığın üzerine
**köprü** kurmasına izin verdiği tek aday kaynağıdır. Kırpma köprüyü siliyor, boşluk sayısı
72 → 25'e iniyor ve üst yüzey engebesi 56,6 → 62,6 cm'ye **çıkıyor** — duvar örücü sessizce
kule örücüye dönüşüyor. "%72,7 sığıyor ama desteksiz" rakamı defterin değil **yüzey engebesinin**
ölçüsüdür. Bu yüzden `R-C09b` (düzlük) F2a'nın **ardılı değil öncülüdür**; yüzey düzleştikten
sonra destek-farkında defter yeniden ölçülecektir (varyant 7 kat da hızlıydı: 8,3 ms / 56,4 ms).

`R-C09b` **Yerel düzlük terimi (F2b).** **UYGULANDI, KISMİ — bkz. `DR-18`.** Yerleştirme skoru
yerel bir düzlük bileşeni taşır: adayın üst yüzünün, **temas eden ve aynı dikey banttaki**
kutuların üst yüzlerinden ortalama sapması (temas uzunluğuyla ağırlıklı). Komşuluk yereldir —
küresel hizalama denendi ve kaybetti (−0,55 puan).
Terim **sığdırma ölçütünün ardında** durur; önüne alınması (%75,30), ikili bayrak olarak öne
alınması (%76,06) ve normalize ağırlıklı toplam (α=0,75 → %75,99) ölçüldü ve hepsi kaybetti.
Seçilen biçim %75,99 → **%76,23**, en kötü senaryo %60,16 → %62,89 verdi.
WallE'nin tam skoru (`−α₁·G_var + α₂·G_high + α₃·G_flush − α₄(i+j) − α₅·h`, Ojha vd. 2020)
**uygulanmadı**: ağırlıklı toplam denendi ve sözlükbilimsel sıranın altında kaldı; α'lar
F3a'da kromozoma taşınana kadar kalibrasyon borcu açmaya değmiyor.

`R-C09c` **Blok inşası (F4a′).** Yerleşen kutunun çevresine, aynı üründen bir prizma örülür.
Büyüme `x` ve `y`'de serbest, `z`'de **duvar bandıyla** sınırlıdır (`R-C08`); bandı aşmak sonraki
duvarın içine taşmak olurdu. Kritik olan büyütme değil **aday seçimidir**: skor "bu boşluğa kaç
kutu sığar" diye sorar, "bir kutu ne kadar sıkı oturur" diye değil — ölçülen fark budur (büyütme
tek başına %79,03 → %79,04, ölçüt değişince %79,86; GRASP ile %83,50 → %85,22). Ölçü **adet**tir,
hacim değil (`DR-22`). Kaynak: Eley 2002 blok inşası; Gehring & Bortfeldt 1997 kule.

`R-C15a` **Decoder genleri (F3a).** Kromozom yalnız sırayı değil, **plan düzeyindeki kararları** da
taşır. Vektör düzeni tek yerde yazılıdır: `[0, N)` sıra anahtarları · `[N, N+G)` decoder genleri ·
`[N+G, 2N+G)` yönelim anahtarları (opsiyonel). `G = 4` sabittir ve gen eklendiğinde vektör düzeni
kaymasın diye baştan bol tutulmuştur. Bugün iki gen kullanılır: yeni duvar açılırken derinlik
tercihi (derin / yansız / sığ) ve yedek kademe sırası (cep önce mi, yeni duvar önce mi, `DR-29`). Tohum bireyler **yansız** başlar, yani sezgisel sıralamalar
bugünkü davranışı temsil eder ve sapmayı arama keşfeder (`R-C21`). Sabit derinlik kuralının neden
kazanamadığı `DR-23`'te.

`R-C09d` **Bileşik blok (Zhu vd. 2012).** Sütun aynı ürünle dolduktan sonra tepede kalan yükseklik
**başka bir üründen** kutuyla tamamlanır. Şart: üst kat, taban katın ayak izini en az **%85**
oranında kapatmalı — aksi hâlde blok prizma olmaktan çıkar ve yüzeyin geri kalanı ölü havaya
döner (`DR-35`, kısıtsız hâli ölçüldü ve kaybetti). Yedi kapı ve sekizinci kapı
`PlacementValidator`'dan sorulur; bileşik blok kendi kural tanımını yazmaz.

`R-C10` **Aday nokta seçimi.** Boşluk listesi içinde köşeye (uzak-alt-başlangıç köşesi) Chebyshev mesafesi en küçük olan önce; eşitlikte `y` küçük, sonra `z` küçük, sonra `x` (aynalı modda ters), sonra boşluk yaratılış sırası. Bu sıra determinizmin parçasıdır.
`R-C11` **Boşluk güncelleme.** Yerleşim sonrası kesişen boşluklar silinir, yerine ≤6 yeni prizmatik boşluk üretilir; kalan kutuların en küçük boyutuna sığmayan boşluk `rejected`; `rejected` boşlukların komşuyla birleştirilmesi (amalgamation) **ÖLÇÜLDÜ VE KAPATILDI (`DR-34`)**: defterdeki boşlukların %0,0'ı maksimal değil — hepsi altı yönde de bir kutuya ya da araç duvarına dayanıyor, dolayısıyla birleştirilecek bir şey yok.
`R-C12` **Sert kapılar.** Her aday `PlacementValidator` 7 kapısından geçer (`R-C01`). Wall-Builder kendi "destek" tanımı yazmaz; eşik (`SupportThreshold`, bugün `%60`) oradadır.
`R-C13` **Multi-drop = çıkarılabilirlik.** Bir kutu, kendi iniş sırası geldiğinde hâlâ araçta olan hiçbir kutuyu oynatmadan kapıya çıkabilmelidir. Gruplar uzayda **iç içe geçebilir**; bant/bölge kavramı yoktur. Kural iki yönlüdür ve `PlacementValidator.ViolatesUnloadPath`'te tek noktada durur. *Bu kural bant modelinin yerini aldı (`DR-67`): bant, operasyonel gereksinimi hiç ifade etmiyordu — bandın içinde kalan bir kutu da başka bir kutunun arkasında sıkışmış olabilir. Ölçüldü: bant modeli 5.148 kutuyu çıkarılamaz hâlde bırakıyordu.* Reddedilenler: eşit bölme, hacme orantılı bölme, dinamik `zWall`.
`R-C13a` **Yol tanımı.** Yol, kutunun ayak izinin (`x`, `y` kesiti) kapıya doğru (`+z`) süpürdüğü koridordur. Bir kutu bu koridoru **kısmen** kesse bile engeldir; tam kaplama aranmaz. Yandan geçen kutu (ayak izi kesişmeyen) engel değildir. Teşhis tarafı bu tanımı **bağımsız olarak** uygular — kuralı üretim kodundan çağırmak, kural bozulduğunda dedektörü de bozar ve bir kez yaşanmıştır (`L-3`).

`R-C14` **Kalite metrikleri (yerleştirici çıktısında).** `FillRate`, `WallCount`, `AvgWallFlushness` (duvar ön yüzü düzlüğü — WallE `G_flush` analoğu), `CoG(x,y,z)`, `BalanceDeviationX/Z`, `UnplacedCount`, `ZoneViolations` (LIFO), `WallBuilderMs`.

`R-C14a` **`AvgWallFlushness` tanım kümesi (DR-11, geçici).** Değer `[0,1]` aralığındadır ve `double.IsFinite` assert'i ile korunur; **NaN yasaktır**. `WallCount == 0` (hiç kutu yerleşmedi) durumunda değer `1.0`'dır — fitness'taki `(1 - AvgWallFlushness)` terimi 0 olur, yani "duvar yoksa düzlük cezası da yok". Boş plan zaten `UnplacedCount` terimiyle cezalandırılır; ikinci kez cezalandırmak iki terimi çakıştırır ve "tek kutu yerleşti" ile "hiç yerleşmedi" arasındaki farkı bozardı.

## C4. GWCA (sıralama) kuralları

`R-C15` **Kodlama.** Birey = `double[2N]`: ilk N eleman random-key (sıralayınca permütasyon), ikinci N eleman yönelim anahtarı (`[0,1)` → `AllowedRotations` içinde indeks). GWCA denklemleri bu sürekli vektör üzerinde çalışır (B2). Sınır dışı değerler `[0,1)`'e katlanır (`reflect`), kırpılmaz (kırpma çeşitliliği öldürür). OBL (karşıt birey `1 - x`) başlangıçta ve her K iterasyonda popülasyonun %P'sine uygulanır — Faz 3 parametresi, varsayılan kapalı.
`R-C15a` **Decoder kromozomda (F3a).** Kromozom yalnız sırayı değil **yerleştirme kararını** da
kodlar: maximal-space seçim kuralı seçici anahtarı ve düzlük/derinlik ağırlıkları (`R-C09b`
α'ları). Gerekçe ölçülmüştür: sıra araması +1,5 puanda doyuyor ve 10 kat bütçe yalnız +0,73
getiriyor — bu **decoder kararsızlığının** klasik belirtisidir, yerleştirici sıra sinyalini
yutuyor. Kaynak: Gonçalves & Resende 2012 mp-BRKGA (doi:10.1016/j.cor.2011.03.009).

`R-C16` **Başlangıç popülasyonu.** En az 3 birey sezgisel tohumdur: (a) hacim-azalan, (b) taban-alanı-azalan, (c) ağırlık-azalan (WeightBalance'ta) — LIFO'da grup kümelemesi korunarak. Kalanı seedli rastgele; iyi nokta kümesi (good point set) başlatma Faz 3 opsiyonu.
`R-C17` **Roller ve güncelleme.** B2 denklemleri; rol ataması seedli rastgele; liderler fitness sırasına göre; eleme oranı `EliminationRate` (varsayılan %10, elenenler yeniden başlatılır). Hız $v_i$ ilk iterasyonda 0.
`R-C18` **Fitness (maliyet, düşük kazanır) — terim toplamı, sabit sırada:**
`cost = (1 - FillRate)·1e6 + UnplacedCount·1e5 + ZoneViolations·1e4 + BalanceDev·wBal + (1 - AvgWallFlushness)·wFlush`
`wBal` kriter WeightBalance ise 5e4, değilse 5e2; `wFlush` varsayılan 1e2. Katsayılar `ScoringWeights.Gwca` altında tek yerde; **sıralı toplama** (`R-A13` analoğu). Sert kapı ihlali fitness'a giremez — Wall-Builder onları zaten yerleştirmez, `Unplaced`'e düşürür.
`R-C19` **Grup (LIFO) invariantı.** Random-key'ler grup içinde sıralanır; gruplar arası sıra `UnloadingOrder` DESC ile **sabit** — meta-sezgisel gruplar arası sırayı bozamaz. Böylece kromozom düzeyinde kümeleme garanti edilir.
`R-C20` **Durdurma.** `MaxIterations` (varsayılan 60), `PopulationSize` (varsayılan 30), `MaxDurationMs` (varsayılan 20.000; toplam plan bütçesi 120.000'in içinde), `StallIterations` (varsayılan 15 iterasyon iyileşme yoksa dur). Bütçe aşımında **o ana kadarki en iyi** döner; sonuç asla boş dönmez.
`R-C21` **Baseline garantisi (DR-09, geçici).** Nihai plan, tohum bireylerin (R-C16) en iyisinden **kötü olamaz** — GWCA sadece iyileştirir; iyileştiremediyse tohum planı döner ve `SearchImproved=false` raporlanır. Ölçü **iki katmanlıdır**:
1. **Seçim fitness üzerinden yapılır** (`R-C18`): `bestCost <= min(tohum cost)`. Böylece denge/bölge/düzlük terimleri işlevsiz kalmaz.
2. **FillRate ayrı bir kilitle korunur:** `Gwca.FillRate >= max(tohum FillRate) - 0.5 puan`. Katsayılar kalibre edilmeden doluluk sessizce feda edilemesin diye. İki eşik de `R-D04` testine girer.
`R-C22` **Kıyas zorunluluğu.** GWCA "üretime uygun" ilan edilmeden önce aynı Wall-Builder üzerinde **GA (random-key)** ve **GRASP** sequencer'ları aynı bütçeyle koşulur; GWCA en az birini doluluk **ve** süre açısından geçemezse Faz 3'e alınmaz, olgun alternatif kalır (DR-03).
`R-C23` **Paralellik.** Bireylerin fitness'ı `Parallel.For` ile hesaplanabilir; sonuçlar indeks sırasına yazılır (`R-C02`). Adalar modeli (PGWCA) Faz 3.

## C5. Ön kümeleme (opsiyonel, Faz 3)

`R-C24` K-Means (k = küme sayısı, seedli) ile kutular boyut/ağırlık vektörüne göre kümelenir; küme sırası GWCA'nın optimize ettiği düzeye çıkarılır (küme içi sıra sabit). Kabul: 500 kutuda süre ≥ %30 azalır **ve** doluluk düşmez; aksi hâlde kapalı kalır.

## C6. Kısıt eşleme tablosu (nerede çözülür)

| Kısıt | GWCA (sıralama) | Wall-Builder (yerleştirme) | Sert kapı |
| --- | --- | --- | --- |
| Hacim maks. | fitness ana terim | köşeye yakın maximal space, homojen duvar | — |
| Multi-drop / LIFO | grup içi sıra, gruplar arası sabit (`R-C19`) | sanal duvar (`R-C13`) | kapı 4 (LIFO dikey) |
| Taşıma dayanımı | ağır kutuya küçük key eğilimi (tohum) | yalnız `MaxWeightOnTop` uygun boşluk | kapı 5-6 |
| Kırılganlık | — | üstüne yerleşim denenmez | kapı 7 |
| Yönelim | yönelim anahtarı (`R-C15`) | boşluğa sığma kontrolü döndürülmüş ebatla | kapı 1 + `AllowedRotations` |
| Ağırlık dengesi | ⚠ **üretimde hiçbir yerde** — `SearchEvaluation.Cost`'taki denge terimini yalnız GRASP/GWCA okur, üretim varsayılanı **beam** (`DR-56`) onu çağırmaz. `WeightBalance` kriterinin tek etkisi ağırlık-azalan sıralama | — (takas geçişi `DR-39` ile silindi) | kapı 7 (araç ağırlık tavanı) |
| Kontaminasyon | — | — | `ContaminationFilter` (motor öncesi) |
| Stabilite/düzlük | fitness `AvgWallFlushness` | şerit/duvar disiplini | kapı 3 (%60 destek) |

## C7. API ve model değişiklikleri

- `OptimizationInput`: `+Seed:int`, `+Strategy:PlacementStrategy {Greedy, WallBuilder}`, `+Sequencer:SequencerKind {Static, Gwca, Ga, Grasp}`, `+SearchBudget {MaxIterations, PopulationSize, MaxDurationMs, StallIterations}`.
- `OptimizationResult`: `+WallCount`, `+AvgWallFlushness`, `+ZoneViolations`, `+SearchStats {Iterations, Evaluations, BestCostHistory[], SearchImproved, DurationMs}`.
- `UnplacedReason`: `NotStackable`, `GeometryConstraint` artık üretilir.
- `SnapshotItem`: `+FragilityType` (açık borç kapanır); `SnapshotPayload`: `+Seed`, `+Strategy`, `+Sequencer`.
- Read/Create/Update DTO ayrımı korunur; hiçbir motor katsayısı API'den dışarı açılmaz.

---

# BÖLÜM D — Test, Ölçüm ve Kabul

## D1. Mevcut test altyapısı

**Backend motor testleri** — `apps/backend/CargoPilot.Engine.Tests/`: 11 dosya, 42 test, 17 snapshot. `VolumeFirst/Lifo/WeightBalance GoldenMaster`, `LifoBolgeKisiti`, `Kirilganlik`, `PlacementValidatorSupport`, `ModulBayraklari`, `BalanceSwapSupport`, `Determinizm`, `Invariant` (`PhysicalInvariants`), `PerformansTabanCizgisi` (500 kutu · 10 tip · üst sınır 120.000 ms). Snapshot girdi+çıktı birlikte; `PlacementId` dışarıda, `Order` içeride; `FillFromMaxX` snapshot'a eklendi.

**Sena'nın algoritma test aracı** — `apps/algorithm-test-ui` (PR #996). İki sayfa: **Toplu Koşu** (regresyon kapısı, kriter etkinliği, kısıt kapsamı, eğilim) ve **Senaryo İnceleme** (form, 3 ortografik projeksiyon, kural denetimi). Plan üretmez; gerçek backend'i çağırır. `verification/checks.ts` 14 kural (`conservation, bounds, overlap, support, stackable, stackCount, weightOnTop, fragility, rotation, lifoVertical, totalWeight, cogMismatch, lifoZone, loadingCorner`), her biri `sourceRef` ile motor satırına bağlı; `pass/fail/skipped`; `hard/soft`. `goldenCrossCheck.test.ts` aynayı fixture'lara karşı kanıtlar. Regresyon kapısı: mutlak (sert ihlal, hata, kriter etkinliği) + göreli (ort. doluluk 0,5 p, en kötü 1 p, yerleşen oran 0,5 p, yeni bozulan 0). Eşikler CLI ile değiştirilemez. Karşılaştırılabilirlik: tohum + katalog imzası + `GENERATOR_VERSION` (2). `CONSTRAINED_SCENARIO_PERCENT=60`. Katalog bağımlılığı: kısıt katalogda ürün yoksa dal test edilemez. CI: `algorithm-test-ui-ci` (her push, ~1 dk, offline) + `Algoritma Regresyon Koşusu` (gecelik 02:00 UTC, canlı ortam, 10–30 dk; baseline yalnız geçen koşudan sonra güncellenir; secret'lar `ALGO_SUITE_API_URL/EMAIL/PASSWORD`).

## D2. Motor değişince araçta ne bozulur

| Motorda değişen | Araçta yapılacak | Uyarır mı |
| --- | --- | --- |
| Kural eşiği/mantığı | `checks.ts` | Evet — golden çapraz kontrol |
| Yeni sert kısıt | `CHECK_IDS` + `checkLabels.ts` + `checks.ts` + `runChecks` | **Hayır — elle** |
| Ürüne yeni kısıt alanı | `catalogCoverage.ts` + `Item` | Kısmen |
| Yeni kriter (WallBuilder/GWCA) | `criteria.ts` + `suiteStorage` şeması | Evet — şema reddeder |
| Plan API gövdesi (`Seed`, `SearchStats`) | `loadingPlanMappers.ts` | Evet — `error` |
| Koşu kaydı alanı | `SUITE_RUN_VERSION` + `suiteRunSchema` | Evet |
| Yerleşim kalitesi | — | Evet — kapı |

## D3. Yeni sistem için test kuralları

`R-D01` **Determinizm ilk test.** `DeterminizmTests`'e `WallBuilder+Gwca` senaryosu; aynı seed iki koşu → bit birebir; farklı seed → farklı olabilir ama her ikisi de invariant geçer.
`R-D02` **İkinci golden korpus.** Yeni strateji tüm eski snapshot'ları kaydıracağından **ayrı korpus** açılır: `Snapshots/WallBuilder/*.json`. Eski korpus greedy'yi korumaya devam eder (DR-04). Yeni korpus **çok katmanlı LIFO** ve **kırılganlık** senaryolarını bilinçli içerir (eski korpusun yapısal kör noktaları).
`R-D03` **Sequencer kıyas testi.** `SequencerBenchmarkTests`: BR1–BR7 alt kümesi + 500 kutuluk gerçekçi senaryo; `Static/Gwca/Ga/Grasp` aynı bütçe; doluluk ve süre tablo hâlinde raporlanır (test geçme kriteri: `R-C21` baseline garantisi).
`R-D04` **Baseline garantisi testi.** Her senaryoda `Gwca.FillRate >= max(tohum FillRate)`.
`R-D05` **Bütçe testi.** `MaxDurationMs=2000` ile 500 kutuda süre ≤ 2.500 ms ve sonuç boş değil.
`R-D06` **Sanal duvar testi.** Çok gruplu, çok katmanlı senaryoda `ZoneViolations == 0` **ve** yerleşen kutu sayısı greedy'den az değil.
`R-D07` **Test aracı yeni kriteri tanır**; `checks.ts`'e `wallOrder` (duvar sırası z-monoton) `soft` kuralı eklenir; `SUITE_RUN_VERSION` artar; `ignore_baseline` ile ilk koşu.
`R-D08` **Katalog kapsamı.** Seed kataloğa `FragilityType=1`, `IsStackable=false`, `MaxWeightOnTop` dolu ürünler eklenir; kapsam paneli hepsini yeşil göstermeden yeni strateji "test edildi" sayılmaz.
`R-D09` **Süre ölçümü.** Performans iddiaları yalnız `PerformansTabanCizgisiTests` (+ `SearchStats.DurationMs`) ile; aracın `durationMs`'i uçtan uca olduğu için delil değildir.

## D4. Kabul kriterleri (Definition of Done)

| ID | Kriter | Eşik |
| --- | --- | --- |
| KK-01 | Sert ihlal | 0 (araç kapısı + `Invariant`) |
| KK-02 | Determinizm | Aynı seed → sıfır delta |
| KK-03 | Doluluk (VolumeFirst eşdeğeri) | 100 senaryoda ortalama greedy'den ≥ +1,0 puan; hiçbir senaryoda −1,0'dan kötü |
| KK-04 | LIFO | `ZoneViolations=0`, yerleşen oran greedy'den düşük değil |
| KK-05 | Sequencer kıyası | GWCA ≥ GA veya GRASP (doluluk **ve** süre); aksi hâlde DR-03 uygulanır |
| KK-06 | Süre | 500 kutu ≤ 30.000 ms varsayılan bütçede; senkron uç ≤ 120.000 ms |
| KK-07 | Denge | WeightBalance eşdeğerinde CoG sapması greedy'nin ±10 % bandında veya iyi |
| KK-08 | Kapsam | Kısıt kapsamı panelinde `skipped` sert kural yok |
| KK-09 | Dokümantasyon | Bu rulebook, `COORDINATE_STANDARD.md`, test aracı README güncel (14 kural → 15) |

---

**Bölüm E (karar kayıtları, açık borç, yol haritası) ayrı dosyadadır:**
[02-kararlar.md](02-kararlar.md). Terimler için [00-sozluk.md](00-sozluk.md).
