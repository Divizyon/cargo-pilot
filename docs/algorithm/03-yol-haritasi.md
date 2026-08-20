# Cargo Pilot Algoritma · Geliştirme Yol Haritası

> **Kalıcı dosya.** Faz durumları burada güncellenir; biten faz silinmez, **durumu işaretlenir**.
> Bir fazın ölçümü [04-olcum-gunlugu.md](04-olcum-gunlugu.md)'de, doğurduğu karar
> [02-kararlar.md](02-kararlar.md)'de durur.


## 0. Özet

- **Ne yapılacak:** Mevcut greedy yerleştirme motorunun yanına, aynı `IOptimizationEngine.Run` imzası altında seçilebilir bir **Wall-Builder + maximal-space** yerleştirici ve onu saran **GWCA** meta-sezgiseli eklenecek; GA/GRASP kıyas için referans olarak kalacak.
- **Neden:** Bugün tek greedy koşusu var; doluluk üst sınırı arama yapılmadan zorlanamıyor (KK-03: +1,0 puan hedefi) ve tek koşu WeightBalance'ta 29,5 sn ile bütçe sınırında (KK-06b).
- **Asıl darboğaz algoritma değil, doğrulama döngüsü:** `apps/algorithm-test-ui` her koşuda canlı backend + login (`cli/runSuiteCli.ts:42-47,118`) + gerçek ürün kataloğu (`cli/runSuiteCli.ts:205-226`) istiyor. Bu hâliyle bir arama algoritması geliştirilemez.
- Bu yüzden **F1 (Loop Test Harness)** kritik yoldadır. Ancak harness'ın çekirdeği TypeScript değil **.NET tarafındadır**: motor C#'tır, TS içinde "in-process motor" kurmak motoru yeniden yazmak demektir. Kritik yol `CargoPilot.Engine.Bench` (auth'suz, DB'siz, loopback motor barındırıcısı) + `dotnet` bench koşucusudur; TS suite bunun üzerine **kabul kapısı** olarak oturur.
- **Faz sırası:** F0 model/şema/sözleşme hazırlığı → F1 loop harness (bench + fixture istemcisi) → F2 Wall-Builder (deterministik, aramasız) → F3 GWCA + sequencer kıyası → F4 hızlandırma/ürünleştirme/CI.
- **En büyük teknik risk:** determinizm. `Parallel.For` + statik modüller (RK-01), tek `Random` örneği (RK-02), unstable sort (RK-09), `double`/`decimal` karışımı (RK-18) — dördü birden KK-02'yi (bit birebir tekrar) sessizce öldürür. Determinizm **`determinismDigest`** üzerinden ölçülür; ham rapor eşitliği aranmaz (süre/kimlik/zaman damgası zaten her koşuda farklıdır).
- **En büyük tasarım riski:** `R-C21` baseline garantisi ile `R-C18` çok terimli fitness çelişiyor (RK-03). Bu bir **tanım borcudur** ve F0 çıkışından önce karara bağlanmalıdır; katsayı **kalibrasyonu** ise F3 çıkış kapısıdır (kanıtı SC-58/SC-59).
- **En büyük ölçek riski:** 60 iter × 30 birey × 500 kutu = 1.800 tam yerleştirme; 20 sn bütçesi mevcut doğrulama maliyetiyle 2-3 mertebe aşılır (RK-12). Uzamsal indeks F2'de opsiyon değil, ön koşuldur.
- **Değişmeyecek olan:** greedy **davranışı** varsayılan kalır, 17 golden snapshot **bayt bayt** aynı kalır; yeni yol yalnız açık strateji bayrağıyla devreye girer. Davranış-koruyan performans iyileştirmesi (uzamsal indeks) serbesttir; kanıtı snapshot eşitliğidir.
- **Ölçüm:** her faz kendi kapısını `algorithm-test-ui` suite'i üzerinden geçer; sert ihlal (13 hard check) hiçbir fazda >0 olamaz — doluluk kazancı bunu asla satın alamaz (KK-01 > KK-03).

---

## 0.1 GÜNCEL DURUM VE REVİZE FAZ PLANI (17 Ağustos 2026)

> Bu bölüm §1'in yerine geçer. §1 ve sonrası **tarihsel kayıt** olarak duruyor; F0/F1'in
> tamamlanma biçimi ve F2/F3'ün gerçek sonuçları aşağıdadır. Revizyonun dayanağı:
> 22 ölçülmüş deneme (`docs/algorithm/04-olcum-gunlugu.md`) + dış araştırma
> (`docs/algorithm/arastirma/2026-08-17-yanit-olu-hava.md`).

### Tamamlananlar

| Faz | Durum | Sonuç |
|---|---|---|
| **F0** Hazırlık | ✅ | Strateji/sequencer/seed sözleşmesi; 17 snapshot bayt bayt aynı; deneysel yollar bayrakla kapalı |
| **F1** Loop harness | ✅ | 1.275 ms → 54 ms; soak kipi + üç teşhis katmanı (planda yoktu) |
| **F2** Wall-Builder | 🔶 | Çekirdek çalışıyor, 0 sert ihlal, KK-06a tuttu (3,4 ms). Doluluk %75,99 — greedy ile başa baş, hedefin 14 puan altında |
| **F3** Arama + kıyas | 🔶 | Üç sequencer yazıldı, 300 senaryoda kıyaslandı. **DR-03 sonucu: GWCA her eksende kaybetti** |

### Araştırmanın değiştirdiği üç şey

**1. Hedef yeniden çerçevelendi.** Literatürün en iyileri BR1-BR7'de **%92-93**; bizim %90-95
hedefimiz *kendi korpusumuzda* konuşuluyordu ve o korpus **yapay derecede kolay** (giyotin bölünmüş
= %100 ulaşılabilir). BR setinde kutular konteynerden bağımsız üretildiği için %100 zaten mümkün
değil (Parreño vd. 2008: ortalama %99,46 hacim, sığma garantisi yok). Yani "%90-95" ancak
**hangi korpusta** dendiği söylenerek anlamlıdır.

**2. Aramanın doyması bir semptom, sebep değil.** Sıra araması +1,5'te doyuyor çünkü
**decoder kararsız**: yerleştirici sıra sinyalini yutuyor. Literatürdeki standart çözüm
yerleştirme kararını da kromozoma taşımak (Gonçalves & Resende BRKGA). Bizim "kazananların hepsi
kaçırılan adayı geri kazanma türünde" gözlemimiz bunu doğruluyor.

**3. %80 destek eşiği mutlak değil.** Rulebook'ta fiziksel/gevşetilemez sayılmıştı; literatür
aksini söylüyor: Hemminki vd. (1989) sarılı paletlerde %70'i yeterli buluyor, Ramos vd. (2016)
statik mekanik denge kriterinin tam destekten **daha iyi** olduğunu ve 15 sınıfın 8'inde
best-in-class'ı geçtiğini gösteriyor. Bu artık bir **politika kararı**, teknik kısıt değil.

### Revize faz planı

| Faz | İçerik | Çıkış eşiği | Dayanak |
|---|---|---|---|
| ~~**F2a** · Destek-farkında defter~~ | ~~Boşluk üretilirken tabanın yalnız **desteklenen** kısmı alınır~~ | **ÖLÇÜLDÜ, REDDEDİLDİ (`DR-17`)** — üç varyant, en iyisi %75,99 → %74,00. Havada duran taban köprü kurmanın tek aday kaynağıymış | Öneri 3 · Parreño 2008 |
| **F2b** · Yerel düzlük terimi | Temas ağırlıklı üst yüzey sapması, sığdırmanın ardında sıralama ölçütü | **KISMİ (`DR-18`)** — doluluk %75,99 → %76,23, en kötü %60,16 → %62,89. Engebe eşiği tutmadı: 56,6 → 56,1 cm (hedef <30), ölü hava %15,2 → %14,9 (hedef <%8) | Öneri 1 · Ojha vd. 2020 |
| **F2a′** · Destek-farkında defter, ikinci deneme | F2b'den sonra yeniden ölçülür: yüzey düzleşince destekli bölgeler büyür | Doluluk taban çizgiyi geçmeli; yan kazanç: 7 kat hız (8,3 ms / 56,4 ms) | `DR-17` |
| **F2c** · BR benchmark geçişi | `BrCorpus` + `br` komutu; 700 örnek, strict/free çift raporlama | **TAMAM (`DR-19`/`DR-20`)** — greedy %75,23 · WB %79,03 · WB+GRASP **%83,50** (strict); free uçta %85,00. Literatür ~%92-93 | Öneri (d) |
| **F3a** · Decoder'ı kromozoma taşı | Vektör düzeni netleşti; ilk gen: duvar derinliği tercihi | **KISMİ (`DR-23`)** — GRASP %85,22 → %85,32, BR1 %83,09 → **%83,92**. Mekanizma kuruldu, sıradaki genler için yer hazır (maximal-space seçim kuralı, düzlük ağırlığı) | Öneri 4 · G&R BRKGA 2012 |
| **F3b** · GWCA emekli, GRASP devralır | Sequencer nullable; çözüm `SequencerSelection.Resolve`'da | **TAMAM (`DR-24`)** — duvar örücü için varsayılan GRASP, greedy Static kalır, kapı korundu | DR-03 · 300 senaryo ölçümü |
| **F4a** · Kule/sütun inşası | Aynı ürünün kalan birimleri yerleşen kutunun üstüne yığılır | **TAMAM** — BR'de %77,00 → **%79,03** (+2,03) ve 2,5 kat hızlı. Giyotin korpusunda +0,07'ydi, yani görünmüyordu | Öneri 2 · Gehring & Bortfeldt 1997 |
| **F4a′** · Blok inşası | Aynı kutudan prizma; asıl değişiklik aday seçiminin blok ADEDİNE bakması | **TAMAM (`DR-22`)** — static %79,03 → %79,86, **GRASP %83,50 → %85,22**, giyotinde regresyon yok. BR1 %81,26 → %83,09 ama merdivenin eğimi hâlâ ters | Eley 2002 · `DR-21` |
| **F4b** · Dinamik duvar derinliği | Sabit kural denendi (derin/yansız/sığ) | **F3a'ya devredildi (`DR-23`)** — sabit hiçbir değer kazanmıyor; derin BR1'i +1,36, sığ BR6'yı +1,45 yükseltiyor. Karar artık kromozomda | Öneri 5 · Pisinger 2002 |
| **F5** · Ürünleştirme | Kalıcılık, migration, frontend, gecelik CI kapısı | **KISMİ** — değişmez kapsaması, ölçülen arama bütçesi (`DR-25`), koşu kimliği + migration (`DR-26`), gecelik kapı (`DR-28`), **greedy kaldırıldı ve duvar örücü üretim yolu oldu (`DR-39`)**. Kalan: bayrağın gerçek yükte doğrulanması | KK-06b, KK-07 |

### Sıra ve gerekçe

**Kritik yol artık F4a.** İki tur ölçüm sırayı iki kez değiştirdi. F2b'nin altı varyantı
engebeyi 56,1 cm'nin altına indiremedi: düzlük skoru **miyop**, yalnız defterin sunduğu adaylar
arasından seçiyor ve o adayların üst yüzü kutunun kendi yüksekliğiyle belirli. Yüzeyi
düzleştirmek "hangi kutular yan yana gelsin" kararıdır — yerleştirme skoru değil **gruplama**.
Kule inşası (F4a) tam olarak bunu yapar: aynı ayak izli kutuları kontrollü yükseklikte bir
sütuna yığıp duvara tek katı birim olarak koyar, yani yüzeyin bitiş yüksekliğini **seçilir**
kılar. F4a bu yüzden artık "koşullu" değil, kritik yol.

**Eski gerekçe (F2b → F2a′), kayıt için.** Plan başta F2a → F2b idi; ölçüm sırayı ters çevirdi. "%72,7
sığıyor / %3,2 destekli" rakamı defterin kusurunu değil **yığın üst yüzeyinin engebesini**
ölçüyormuş: defteri dürüst yapmak boşluk sayısını 72 → 25'e indirdi, engebeyi 56,6 → 62,6 cm'ye
çıkardı ve doluluğu düşürdü (`DR-17`). Önce yüzey düzleşmeli; destekli bölgeler büyüdüğünde
destek-farkında defter hem doğru hem ucuz olabilir.

**F2c paralel yürür.** Ölçüm geçerliliği için: kendi korpusumuzdaki kazanç literatürle
kıyaslanamıyor. BR1-BR7'de <%85 alırsak sorun hâlâ yerleştiricide, >%88 ise decoder/arama
katmanında demektir — bu tek başına bir teşhis aracı.

**F3a ondan sonra.** Yerleştirici düzelmeden decoder'ı zenginleştirmek, kararsız bir decoder'a
daha çok parametre vermek olur.

**F4a bitti, yerini F4a′ (blok inşası) aldı (`DR-21`).** Kule BR'de +2,03 puan verdi ama tek
sütunla sınırlı. Asıl açık şurada: BR1 (üç tip, bol tekrar) literatürde en kolay kümedir, bizde
**en kötüsü**. Tekrarın en yüksek olduğu yerde en az kazanıyoruz. Eski gerekçe (`DR-18`) şuydu: Eski gerekçe "kutu seti zayıf-heterojense değerli,
güçlü-heterojende kule kurmak zorlaşır" idi. F2b ölçümü bunu geçersiz kıldı: engebe yerleştirme
skoruyla düşmüyor ve engebe kayıp hacmin tamamının durduğu yer. Kule kurmanın zorluğu bir maliyet,
engebe ise doğrudan darboğaz. BR8-BR15 ölçümü kararı değil, **kule yüksekliği politikasını**
belirleyecek.

### F9 açıldı (20 Ağustos 2026)

LIFO kapandı (`DR-69`). Kalan kaybın tamamı kırılganlık (−21,81), istif (−13,69) ve ağırlıkta;
faz planı ve sırası [F9](#f9--kırılganlık-istif-ve-ağırlık-20-ağustos-2026da-açıldı) bölümünde.

### Bekleyen politika kararı

~~**Destek eşiği (Öneri 6).**~~ **ÖLÇÜLDÜ VE KAPATILDI (`DR-16`).** %80'den %60'a kadar iki
puanlık adımlarla tarandı: gerçekçi yükte (BR1-BR7) kazanç duvar örücüde yalnızca **+0,75** puan,
karşılığında en zayıf kutunun desteği %87 → %72 ve azami taşma 11 → 24 cm. "Tek başına en büyük
hamle" beklentisi yanlış çıktı; o beklenti giyotin korpusundan geliyordu ve orada kazanç +3,27,
çünkü o korpusta her kutu benzersiz. Eşik **%80'de kalıyor**; düzenek yerinde, karar istenirse
`--support` ile yeniden ölçülür.

### Bekleyen teknik borç

~~`OPT-15`~~ — **KAPATILDI (`DR-27`).** Aday artık kendi istif/kırılganlık kısıtlarına karşı da
sınanıyor (sekizinci kapı; greedy taraması, Wall-Builder taraması ve blok inşası). Erteleme
gerekçesi "snapshot kaydırır" idi; ölçüldü ve **17 golden snapshot bayt birebir aynı kaldı**,
doluluk da değişmedi — çünkü iki korpusta da kısıtlı kutu yok, kapı yalnızca gerçekten geçersiz
yerleşimleri reddediyor.

---

## 1. Faz Planı

### F0 — Hazırlık: Model, şema, sözleşme, tanım borçları

**Hedef:** Yeni yolun taşıyıcı tipleri (Strategy/Sequencer/Seed/SearchStats) uçtan uca — **API sözleşmesi dâhil** — akar; mevcut davranış **sıfır** kayma yaşar; belirsiz rulebook kuralları *tanım* düzeyinde karara bağlanır.

**İş kalemleri**

| # | İş | Dokunma noktası |
|---|---|---|
| F0-1 | `OptimizationInput`'a sonda default'lu `PlacementStrategy` / `Sequencer` / `Seed` parametreleri | `CargoPilot.Application/Common/Models/OptimizationInput.cs:22-40` |
| F0-2 | `OptimizationResult`'a `SearchStats` (nullable) | `Common/Models/OptimizationResult.cs:5-14` |
| F0-3 | `Run` içinde strateji dallanması iskeleti (imza değişmez, default `Greedy`) | `Common/Optimization/OptimizationEngine.cs:13` |
| F0-4 | **API sözleşmesine bağlama:** `CreatePlan` / `ReOptimizePlan` request DTO'suna `placementStrategy` / `sequencer` / `seed` (opsiyonel, default'lu) + FluentValidation kuralları + Swagger; `BuildInput` genişletilir | `Features/Plans/CreatePlan/CreatePlanCommand(+Validator).cs` · `CreatePlanCommandHandler.cs:230-262` · `Features/Plans/ReOptimizePlan/ReOptimizePlanCommand(+Validator).cs` · `ReOptimizePlanCommandHandler.cs:154-178` |
| F0-4b | Alan yetki/feature-flag ile korunur: yalnız yetkili rol veya `EnableExperimentalStrategies` açıkken kabul edilir; kapalıyken 400 (sessiz düşürme yok) | `Features/Plans/*/Validator` · `lib/config` (backend ayar sınıfı) |
| F0-5 | Golden snapshot şemasına Strategy/Seed alanları, **`JsonIgnoreCondition.WhenWritingDefault`** ile | `Golden/SnapshotPayload.cs:30` (`SnapshotVehicle`), `:121` (`SnapshotOutcome`) |
| F0-6 | `EngineScenario.Input(...)` yeni parametre + default | `Golden/EngineScenario.cs:64` |
| F0-7 | Plan DTO yayılımı: `SearchStats`/`Strategy`/`Seed` **okuma yönünde** DTO'ya çıkar; kalıcılık (migration) F4'e ertelenir, sözleşme ertelenmez | `Features/Plans/GetPlanById/PlanDetailDto.cs:5` · `Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs:317` |
| F0-8 | Test-UI mapper şeması + metrics tipi (request gövdesine strateji alanları eklenir) | `apps/algorithm-test-ui/src/lib/api/loadingPlanMappers.ts:78-100,102-110,201-207` |
| F0-9 | `SUITE_RUN_VERSION` artışı + `scenarioResultSchema`/`aggregateSchema` alanları | `src/algorithm-test/utils/suiteStorage.ts` (`SUITE_RUN_VERSION`, `scenarioResultSchema`, `aggregateSchema`) |
| F0-9b | **`isComparable` anahtarı genişletilir:** `seed + catalogSignature + generatorVersion` yanına `strategy`, `sequencer`, `suiteRunVersion`, `fixtureCatalogVersion`. Farklı strateji = **kıyaslanamaz**, regresyon değil. Strateji karşılaştırması göreli kapıya değil, eşleştirilmiş protokole (KK-03) gider | `utils/suiteStorage.ts` (`isComparable`, `findComparable`) |
| F0-10 | `WallBuilder`/`Gwca` kriter/strateji enum'u ve panel etiketleri | `src/lib/types/loadingPlan.ts:39-45` · `src/algorithm-test/criteria.ts:203-217` · `suite/criteriaEffectiveness.ts:24-27,61,167-172` · `components/CriteriaMatrixPanel.tsx` · `cli/cliOptions.ts:54` |
| F0-11 | **Tanım borcu (bloklayıcı):** RK-03 — baseline garantisi FillRate üzerinden mi, fitness üzerinden mi? `R-C21`/`R-D04` metni netleştirilir | `docs/algorithm/01-kurallar.md` (doğrulanacak: dosya kökte, henüz commit edilmemiş) |
| F0-12 | **Tanım borcu (bloklayıcı):** RK-05 — `WallCount==0` tanımı, `AvgWallFlushness`'in **tanım kümesi** ve NaN yasağı (`double.IsFinite` assert'i). *Formül katsayısı F3'e taşınır* | `R-C14` |
| F0-13 | **Tanım borcu (bloklayıcı):** RK-14 sanal duvar semantiği (`positionZ` mi, `[z, z+length)` ayak izi mi) | `R-C13` |
| F0-14 | **Kalibrasyon borcu — F0'da değil, F3 çıkışında kapanır:** RK-16 fitness katsayıları (1 büyük vs 5 küçük unplaced), RK-05 flushness ağırlığı. Kanıt: SC-58/SC-59 | `R-C18` (F3 kapısı) |

> **Karar borcu ayrımı (eleştiri #7):** *Tanım* borcu kanıt gerektirmez, yazılabilir ve bloklayıcıdır (F0-11…F0-13). *Kalibrasyon* borcu duvar dağılımı ve fitness manzarası olmadan kapatılamaz; F0'da uydurma sayıyla mühürlenmez, F3 çıkış kapısına bağlanır (F0-14).

**Çıkış kriteri**
- 17 mevcut snapshot dosyası **diskte değişmeden** deserialize olur, aynı çıktıyı üretir (RK-17 testi).
- `dotnet test` yeşil, `UPDATE_SNAPSHOTS` kullanılmadan.
- Strateji alanları API'de: `POST /api/v1/loading-plans` `placementStrategy: "WallBuilder"` ile 202/200 döner (flag açıkken), flag kapalıyken 400 döner; suite bu alanı gönderebiliyor.
- Test-UI: `npm run typecheck && npm run lint && npm test` yeşil; şema sürümü artışı ve genişletilmiş `isComparable` sonrası eski baseline'lar "kıyaslanamaz" der, sessizce eşleşmez.
- F0-11…F0-13 tanım kararları rulebook'a yazılı. (F0-14 açık borç olarak F3'e devreder.)

**Süre:** 4-5 gün · **Bağımlılık:** yok

---

### F1 — Loop Test Harness *(kritik yol)*

**Hedef:** Canlı API'ye, kimlik doğrulamaya, veritabanına ve değişken kataloğa bağımlı olmayan; tek komutla dakikalar içinde tekrarlanabilen deterministik bir doğrulama döngüsü. Kapsam **bilinçli olarak dar** tutulur: F2/F3 geri bildirimi için gereken minimum.

**İş kalemleri**

| # | İş | Dokunma noktası |
|---|---|---|
| **F1-0** | **`dotnet` bench koşucusu (asıl geliştirme döngüsü):** xUnit dışı konsol koşucusu; `OptimizationInput` fixture'larını doğrudan motora verir, `--repeat` / `--seed-range` / `--concurrency 1` destekler, `determinismDigest` ve süre dağılımı basar | **yeni:** `tests/CargoPilot.Engine.Bench.Runner/` (`CargoPilot.Engine.Tests` fixture'larını paylaşır) |
| **F1-1a** | **`CargoPilot.Engine.Bench` barındırıcısı:** `dotnet run` ile kalkan, **auth yok / DB yok / EF yok**, tek uçlu (`POST /engine/run`: `OptimizationInput` → `OptimizationResult`) minimal host. Suite'in offline hedefi budur — "ağ yok" değil, **"loopback, auth yok, DB yok"** | **yeni:** `src/CargoPilot.Engine.Bench/` |
| **F1-1b** | `fixtureClient.ts` — `SuiteClient` arayüzünün bench uca konuşan uyarlaması; plan DTO'su yerine motor çıktısını `loadingPlanMappers` şemasına eşler (`createPlan` → çalıştır+belleğe koy, `getPlanDetail` → eşlenmiş çıktı, `deletePlan` → no-op) | **yeni:** `src/algorithm-test/suite/fixtureClient.ts` (arayüz: `suite/suiteClient.ts` `SuiteClient`; `runSuite.test.ts:105` sahte istemcisi kalıp) |
| F1-2 | Sentetik katalog: `FragilityType=1`, `IsStackable=false`, `MaxWeightOnTop>0`, `MaxStackCount>0`, `AllowedRotations∈{1,2,4,5}`, kontaminasyon/uyumsuzluk etiketi **garanti** içeren ürün seti (R-D08) | **yeni:** `src/algorithm-test/fixtures/syntheticCatalog.ts` |
| F1-3 | Standart araç fixture'ları (V-TIR / V-MINI / V-CUBE / V-MIRROR / V-MIX / V-LIGHT) | **yeni:** `src/algorithm-test/fixtures/syntheticVehicles.ts` |
| F1-4 | Elle kurgulanmış senaryolar (SC-01…SC-07, SC-50…SC-65) — jeneratörden **çıkarılır** | **yeni:** `src/algorithm-test/fixtures/curatedScenarios.ts` |
| F1-5 | Senaryo dosya formatı + yükleyici (`.scenario.json`, sürümlü) | `src/algorithm-test/utils/scenarioIo.ts` (bugün tek senaryo + localStorage; dosya G/Ç eklenir) |
| **F1-6** | **CLI çekirdeği (yalnız üç yeni bayrak):** `--fixtures`, `--repeat N`, `--seed-range a..b`. `--fixtures` **içkin olarak**: login atlanır, sentetik katalog yüklenir, curated senaryo dosyaları okunur, istekler bench uca gider (ayrı `--scenarios` / `--catalog` / `--dry-run` bayrağı **yok**). Alternatif katalog yolu ortam değişkeniyle verilir ve imzaya katılır | `src/algorithm-test/cli/cliOptions.ts:49-69,107-139,147-150` · `cli/runSuiteCli.ts:42-47,118,205-226` |
| **F1-7** | **`determinismDigest(run)`:** yerleşimlerin `(itemId, rotation, positionX, positionY, positionZ)` listesi + `unplaced (itemId, reason)` + check `id/status` üzerinden, **kanonik sıralı** SHA-256. Süre, `runId`, plan kimliği, zaman damgası, `SearchStats.DurationMs` **hariç**. `--repeat` ve SC-45 yalnız bu digest'i karşılaştırır | **yeni:** `src/algorithm-test/suite/determinismDigest.ts` · `suite/suiteReport.ts` (süreler ayrı "performans dağılımı" bölümünde, kapı dışı) |
| F1-8 | `wallOrder` soft check'i (R-D07) — hazır bırakılır, F2'de aktifleşir | `src/algorithm-test/verification/checks.ts` · `verification/types.ts` (`CHECK_IDS`) · `verification/runChecks.ts` · `checkLabels.ts` |
| F1-9 | README düzeltmesi: "13 check" → **"15 kural denetimi (13 hard / 2 soft)"** (`wallOrder` eklendikten sonra; öncesinde 14 → 13 hard / 1 soft). **README:38'deki "13 dal" kısıt kapsamı dallarıdır (`catalogCoverage.ts`) — dokunulmaz** | `apps/algorithm-test-ui/README.md:15` |
| F1-10 | Kapı eşikleri CLI'dan **override edilemez** kuralı korunur; `--fixtures` modunda kapı ayrı, kod içinde sabit profil kullanır | `src/algorithm-test/suite/regressionGate.ts:43-51` |

**F1'den çıkarılan, F4'e taşınan kalemler (eleştiri #12):** `--shard i/n`, `--until-fail`, `--watch` / `watchLoop.ts`, `reports/manifest.json`, otomatik baseline seçimi. Hiçbiri F2/F3 geri bildirimi için gerekli değil; `--baseline` bayrağı zaten mevcut.

**Çıkış kriteri**
- `npm run suite -- --fixtures --repeat 20 --concurrency 1` **dış ağ ve kimlik doğrulama olmadan, yalnız loopback** (`CargoPilot.Engine.Bench`) üzerinde çalışır ve 20 turun 20'sinde **aynı `determinismDigest`** üretir (SC-45).
- `dotnet run --project CargoPilot.Engine.Bench.Runner -- --repeat 20 --seed-range 1..5` aynı digest'i üretir; TS suite ile digest **birbirini tutar** (aynı algoritma, iki koşucu).
- Katalog imzası fixture'dan türetilir; `empty-catalog` yolu (`runSuite.ts:281`) fixture modunda tetiklenmez.
- SC-01…SC-07 curated fixture olarak koşar ve hiçbiri exception atmaz.
- Tam tur süresi (50 senaryo) ≤ 60 sn — geliştirici döngüsü için üst sınır.

**Süre:** 3-4 gün (TS harness) + 2 gün (`Engine.Bench` + bench koşucusu) · **Bağımlılık:** F0-4, F0-9, F0-9b, F0-10

---

### F2 — Wall-Builder (deterministik, aramasız)

**Hedef:** `PlacementStrategy=WallBuilder` ile greedy'ye eşit veya üstün doluluk; **sıfır** sert ihlal; tam determinizm. Henüz meta-sezgisel yok.

**İş kalemleri**

- Duvar/şerit yapıları: `R-C08` (derinlik = ilk kutunun `z`'si), `R-C09` (şerit `y` = ilk girenin `y`'si, artık maximal-space'e devrolur) — **yeni:** `Common/Optimization/WallBuilder/` (doğrulandı ve uygulandı; güncel dosya haritası `docs/algorithm/01-kurallar.md` §A1)
- Maximal-space defteri: `R-C11`; **containment pruning zorunlu** (RK-11), `≤6 yeni boşluk` + "hiçbir boşluk başkasını kapsamaz" invariantı.
- Aday nokta sırası: `R-C10` Chebyshev → `y`,`z`,`x` → yaratılış sırası; aynalı modda `x` ters (SC-56).
- **Destek adayları boşluk köşeleriyle sınırlı olamaz** (RK-10): iki kutunun üstüne binen birleşik destek ≥%80 konumları aday üretilmeli.
- Duvar ↔ boşluk defteri tekliği (RK-15): her yerleşim tam olarak bir duvara ait, `[zStart,zEnd)` dışına taşmaz.
- Kısıt mantığı **kopyalanmaz** — tümü `PlacementValidator` üzerinden: `HasOverlap:35`, `HasSupport:60`, `ViolatesStackability:92`, `ViolatesStackCount:120`, `ViolatesStackWeight:147`, `ViolatesFragility:188`, `ViolatesLoadAbove:226`, `GetOrientations:268` (`Common/Optimization/PlacementValidator.cs`).
- **Uzamsal indeks / artımlı doğrulama (RK-12, KK-06a ön koşulu):** `HasOverlap`/`HasSupport`'un O(n) taraması F3'ün 1.800 değerlendirmesini kaldıramaz. Değişiklik **davranış-koruyandır**; tek kabul kanıtı 17 golden snapshot'ın bayt bayt aynı kalmasıdır.
- Sanal duvar / multi-drop: `R-C13`, F0-13 kararına göre.
- **LIFO bölge modeli kırılması (RK-13, eleştiri #11) — seçilen şık:** dinamik `zWall` tabanlı bölge hesabı **yalnız `strategy === 'WallBuilder'` sonuçlarına** uygulanır; greedy yolu bugünkü eşit bölmeyi kullanmaya devam eder. Böylece greedy baseline serisi anlamını yitirmez ve `SUITE_RUN_VERSION` ikinci kez artırılmak zorunda kalmaz. (Alternatif şık — tüm baseline'ları yeniden üretmek — bilinçli olarak reddedildi.)
- Yeni golden korpus: `*GoldenMasterTests.cs` (`VolumeFirstGoldenMasterTests.cs:19` kalıbı) → `UPDATE_SNAPSHOTS=1`.
- Test-UI: `wallOrder` check'i aktifleşir (toplam 15 denetim: 13 hard / 2 soft); `lifoZone` çakışması `goldenCrossCheck.test.ts`'te motor `ZoneViolations` ile karşılaştırılır.

**Çıkış kriteri**
- 17 eski snapshot **değişmemiş** (greedy default) — uzamsal indeks dâhil tüm performans işi bu kanıtla kabul edilir.
- `lifoZones.test.ts` **mevcut vakaları değişmeden geçer** (greedy bölge hesabı sabit).
- `DeterminizmTests`: paralel açık/kapalı `determinismDigest` eşit; 100 tekrar aynı digest.
- `InvariantTests`: `placements.Count + unplaced.Count == inputBoxes.Count`, her `unplaced` sebebi dolu.
- Fixture suite: sert ihlal 0, soft `wallOrder` 0; ortalama FillRate ≥ greedy.
- **KK-06a:** tek Wall-Builder değerlendirmesi (500 kutu, medyan, `--concurrency 1`) **≤ 11 ms**. Tutmazsa F3 başlamadan `iter × pop` bütçesi aşağı çekilir ve KK-03 hedefi bu bütçeyle yeniden değerlendirilir.
- SC-50…SC-56, SC-52 (şerit artığı), SC-54 (boşluk patlaması), SC-63 (`ClusterGroups`) yeşil.

**Süre:** 12-16 gün · **Bağımlılık:** F0, F1

---

### F3 — GWCA + GA/GRASP kıyası

**Hedef:** `Sequencer=Gwca` ile `R-C21` baseline garantisi altında doluluk kazancı; GA ve GRASP referans uygulamaları ile istatistiksel olarak tanımlı kıyas (`R-C22`, KK-05).

**İş kalemleri**

- Random-key kodlama (`R-C15`): permütasyon anahtarları + **kutu kimliğine bağlı** yönelim anahtarları (RK-08). Sıralama **kararlı**, eşitlik bozucu `ItemId` ASC (RK-09, `R-A12`).
- `AllowedRotations` sırası **kanonik** (enum değerine göre), `(int)(key*count)` clamp'li, `reflect` `[-5,5]` aralığında property-test'li (RK-06, RK-07).
- RNG: `rng(seed, iter, individualIndex)` türetilmiş alt-üreteç; **tüm** rastgele kararlar paralel bölge dışında önceden çekilir (RK-02, `R-C02`).
- Paralel fitness: her birey kendi arena/durum nesnesiyle; **statik mutable tampon yasak** (RK-01, `R-C23` ↔ `R-C05`).
- Tohum bireyler bütçe dışında değerlendirilir; en az bir tam değerlendirme garantili (RK-04, `R-C20`/`R-C21`).
- Fitness `R-C18`: sıralı toplam, `double.IsFinite` assert'i, kalibre edilmiş katsayılar; sert ihlal **fitness'a girmez** (`A8` kapatılamaz).
- `gampdf` lgamma tabanlı uygulama + referans tablo testi; eşit fitness'ta `sign()=0` çöküşüne karşı eşitlik bozucu (RK-25, `R-C17`).
- GA ve GRASP: aynı fitness, aynı bütçe, aynı seed protokolü.
- **Eşleştirilmiş kıyas altyapısı:** aynı koşu içinde her senaryo hem `Greedy` hem `WallBuilder+Gwca` (ve SC-61'de GA/GRASP) ile çalıştırılır; delta senaryo bazında eşleştirilmiş hesaplanır. Farklı koşular arası `meanFill` karşılaştırması kıyas kanıtı sayılmaz.
- Yayılım: `SearchStats` → `PlanDetailDto` → test-UI (`loadingPlanMappers.ts:201-207`) → `suite/runSuite.ts:229-255` → `suiteReport.ts` → `components/RunSummary.tsx`.
- `BestCostHistory` golden snapshot'a **girmez** (RK-19).

**Çıkış kriteri**
- **F0-14 kalibrasyon borcu kapanır:** fitness katsayıları ve `AvgWallFlushness` ağırlığı rulebook'a yazılı, SC-58/SC-59 ile kanıtlı.
- SC-44: `Gwca.FillRate >= max(tohum FillRate)` — tüm fixture senaryolarında.
- SC-45: aynı seed → aynı `determinismDigest`.
- SC-43: `MaxDurationMs=2000` altında sonuç boş değil, invariantlar pass.
- SC-61: GWCA ≥ GA **veya** GRASP (doluluk **ve** süre), KK-03 ile aynı eşleştirilmiş protokol (10 seed, işaret testi p<0.05).
- KK-03 eşleştirilmiş protokolü sağlanır (aşağıda §5).
- Kültür testi: `tr-TR` altında snapshot bozulmaz (RK-19).
- SC-64 (iptal) ve SC-60 (grup içi random-key kilidi) yeşil.

**Süre:** 12-18 gün · **Bağımlılık:** F2

---

### F4 — Hızlandırma / ürünleştirme / CI

**Hedef:** Bütçe içinde kalmak, kalıcılık, gecelik kapı ve geliştirici ergonomisi.

**İş kalemleri**

- Profil → sıcak nokta: kalan `HasOverlap`/`HasSupport` maliyeti, artımlı destek haritası (F2'de başlayan işin tamamlanması).
- `decimal`→`double` sınırının tek noktaya çekilmesi; eşit maliyette `individualIndex` eşitlik bozucusu (RK-18).
- Çapraz mimari determinizm: linux-x64 ve ARM CI job'ında `determinismDigest` + `BestCostHistory` hash karşılaştırması (RK-18).
- Kalıcılık: `LoadingPlan` entity + migration + `SaveWithResultAsync` (`CreatePlanCommandHandler.cs:212`) ile Seed/Strategy/SearchStats saklanır. **Kabul kriteri SC-65:** kalıcı seed+strategy ile yeniden optimize edilen plan aynı `determinismDigest`'i üretir.
- Frontend yayılımı: `apps/frontend/src/lib/api/loadingPlanMappers.ts` (zod `:46`, `:161`; map `:406`).
- **F1'den taşınan ergonomi kalemleri:** `--shard i/n`, `--until-fail`, `--watch` (`cli/watchLoop.ts`), `reports/manifest.json`, otomatik baseline seçimi (manifest'ten aynı imzalı en son yeşil koşu).
- Gecelik kapı: `ignore_baseline` koşusundan sonra **aynı commit'te** ikinci koşu zorunlu, delta 0 (RK-24) — CI adımı.
- SC-41/SC-42 ölçek kapıları: 500 kutu ≤30 s, 1000 kutu ≤120 s (`--concurrency 1`).

**Çıkış kriteri:** KK-06b (uçtan uca süre) ve KK-07 (gecelik kapı) kapanır; iki mimaride determinizm kanıtlı; frontend'de strateji/seed görünür; SC-65 yeşil.

**Süre:** 8-11 gün · **Bağımlılık:** F3

---

### F6 — Blok tabanlı aramaya geçiş *(18 Ağustos 2026'da açıldı)*

**Kaynak:** [arastirma/2026-08-18-yanit-blok-arama.md](arastirma/2026-08-18-yanit-blok-arama.md).

**Hedef:** BR1-BR7 strict %86,2 → **%90+**, 2 saniyelik bütçe içinde.

**Teşhis neyi söyledi.** Araştırma paradigma değişimini tek bir ölçüme bağlamıştı: 60 saniyede
skor +0,3 puandan az artıyorsa sıra araması bitmiştir. Ölçüldü — 30 kat bütçe **0,04 puan**
getirdi ([ölçüm günlüğü](04-olcum-gunlugu.md)). Doygunluk kesin; sıra düzeyinde yapılacak her şey
aynı duvara çarpıyor. Bu, sıradaki işlerin önceliğini doğrudan belirledi.

| # | İş | Araştırmadaki karşılığı | Durum |
|---|---|---|---|
| F6-0 | **Teşhis: doygunluk** — 2 sn / 60 sn / frenler açık | (c)4 | ✅ **Doymuş** (+0,04 puan) |
| F6-1 | **Teşhis: duvar yüzü kaplama** + ölü havanın kenar/tavan ayrışması | (c)1, (c)2, (c)3 | ✅ Ölçüldü — `WallDiagnostics` |
| F6-1′ | **Duvar sınırı tahminden ölçüme** (`OptimizationResult.Walls`) | — | ✅ Yapıldı; `DR-45`'i ortaya çıkardı |
| ~~F6-P~~ | ~~Ürün kararı: GRASP kutuların %45'ini duvara koymuyor~~ | — | ✅ Kapandı — sorun değil (`DR-45`) |
| F6-P′ | **Cep yolunu azami açma denemesi** | — | ❌ Reddedildi — biçim bozuluyor (`DR-46`) |
| ~~F6-6′~~ | ~~Tekdüzelik: fazla kutu doluluğu düşürmemeli~~ | `DR-48` | ✅ **Çözüldü** — beam tekdüze; C aracında +13,0 puan (`DR-56`) |
| ~~F6-5′~~ | ~~Kısmi dolulukta yoğunlaşma~~ | ✅ `DepthSlack` üretimde (`DR-57`); LIFO'da devre dışı |
| ~~F6-5′~~ *(özgün)* | **Kısmi dolulukta yoğunlaşma** — çeyrek yükte yük 1,73 kat derine yayılıyor | `DR-12`'nin ölçülebilir hâli | **Yeni, açık** |
| F6-2 | **Yönelim eşlemesi:** `011` → dört yönelim (`NoVerticalWidth`) | (d) | Uygulandı |
| ~~F6-3~~ | ~~Duvar yüzü 2B tam kaplama~~ | Öneri 3 | ❌ **Kapsam dışı** — gerekçe çürüdü (`DR-57`): doluluk arttıkça kaplama düşüyor |
| F6-4 | **Blok yerleştirme beam search / greedy-lookahead**, aktif duvar kısıtlı, VCS değerlendirme | Öneri 1 | **En yüksek kaldıraç** |
| F6-5 | **Space defragmentation** — kutuları iterek parçalanmış boşluğu birleştir | Öneri 2 | Sonra |
| F6-6 | **VNS post-optimizasyon** — son ~0,5 sn | Öneri 5 | Sonra |
| F6-7 | Reactive GRASP + path relinking + elite havuz | Öneri 4 | **En alt** — doygunluk kanıtlandı, tavanı kaldırmaz |
| — | LLM/DRL sezgisel keşfi | Öneri 6 | Kapsam dışı; offline araştırma |

**Bağlayıcı kısıt değişmedi:** duvar disiplini korunur (`DR-12`). Beam yalnız aktif duvar diliminin
(`z`-frontier) boşluklarına blok koyar; duvar dolunca bir sonraki `z`'ye geçilir. Defragmentation'ın
itme yönü kapıya doğru olamaz — yüklenebilirlik bozulursa o hamle devre dışı kalır.

**Dürüst hedef:** literatürün %94-95'i örnek başına 240-320 saniyeyle alınmıştır; 2 saniyede %94
beklenmiyor. Araştırmanın 2 sn için verdiği tahmin %90-92 ve bu bir **varsayım** — yayımlanmış
küçük bütçe eğrisi yok.

**Süre:** açık uçlu · **Bağımlılık:** yok (F4'ten bağımsız ilerler)

---

### F7 — Blok tabanlı beam search (BSG) *(18 Ağustos 2026'da açıldı)*

**Kaynak:** Araya/Guerrero/Nuñez BSG-VCS · `rilianx/Metasolver` deposu üzerinde yapılan inceleme
ve yerel koşu. F6-4'ün ayrıntılandırılmış hâlidir.

#### Neden: dört ayrı ölçüm aynı yeri gösteriyor

| Kayıt | Bulgu | İşaret ettiği yer |
|---|---|---|
| `DR-43` | 30 kat arama bütçesi +0,04 puan | Sıra araması bitti |
| `DR-44` | Duvarların %91'i %95 kaplamanın altında | Duvar yüzü döşenmiyor |
| `DR-47` | Hedef derinlik kazancı yığın yüksekliğinde takılıyor | Katı platform üretilemiyor |
| `DR-48` | Daha çok kutu doluluğu **düşürüyor** | Tek geçişli karar geri alınamıyor |

Dördü de tek bir mimari sınırdan çıkıyor: **karar birimi kutudur, duvar değil.**

#### Kusurun tam mekanizması

Ana döngü kutu kutu ilerliyor (`WallBuilderPlacement.cs`, `for (var index = 0; ...)`). Sıradaki
kutu için önce **bütün açık duvarlar** taranıyor — duvarlar kapanmıyor, bu kısım doğru ve `R-C09`
bunu zaten söylüyor. Ama hiçbir açık duvara sığmayan **ilk** kutu, sırası geldiği anda yeni bir
duvar açıyor.

Sonuç: listede daha aşağıda duran ve 1. duvarı tamamlayacak kutular varken 1. duvar yarım
kalmışken derinlik cephesi ilerliyor. O kutular sonradan gelip 1. duvara girebiliyor ama artık
cephede kule ve bloklar örülmüş oluyor. Ölçüm doğruluyor: yüz kaplama %86,2, duvarların %91'i
eşiğin altında.

Doğru çözüm sırayı zorlamak **değil** — sıra zaten GRASP'ın işi ve o doydu (`DR-43`). Çözüm
**karar birimini değiştirmek**: "sıradaki kutu nereye" yerine **"bu boşluğa hangi blok"**.

#### BSG'nin parçaları ve bizdeki karşılıkları

| Parça | Ne yapar | Bizde |
|---|---|---|
| Blok kataloğu | Her üründen `nx×ny×nz` diziler + bileşik bloklar, `min_fr` doluluk eşiğiyle, üst sınır ~10.000 | **Yok** — bloğu yerleştikten *sonra* büyütüyoruz (`RaiseBlock`), önceden üretmiyoruz |
| Boşluk kümesi | Maximal space listesi | `SpaceLedger` ✅ |
| Aksiyon | (blok, boşluk) çifti | **Yok** |
| Değerlendirme (VCS) | `hacim^δ · (1−kayıp)^β · temas^α · (1/kutu sayısı)^γ`; kayıp terimi kalan kutularla knapsack tahmini | Kısmen — `OrientationFit` sözlükbilimsel anahtar, ağırlıklı çarpım değil |
| Beam search | Her düğümde `w` aday üret, her birini greedy tamamla, en iyi `beams` kadarını tut | **Yok** — GRASP sıra permütasyonu arıyor |
| DoubleEffort | Süre bitene kadar ışın genişliğini `√2` ile büyüt | Kısmen — GRASP tur sayısıyla |

Çekirdek küçük: BSG döngüsü ~90 satır. Taşınacak asıl kütle `clpState` + blok üretici + VCS,
toplam ~2.000 satır. **Bullet fizik bağımlılığı algoritmaya değil görselleştirmeye aittir**,
taşınmaz.

#### Duvar disiplini BSG'de yok — biz koyacağız

BSG'nin duvar kavramı yoktur; boşluk kümesinin tamamına blok koyar. Duvar disiplini (`DR-12`,
pazarlıksız) şöyle korunur:

- Boşluk kümesi **aktif duvar bandıyla** filtrelenir: yalnız `[wallStart, wallEnd)` içindeki
  boşluklar aday olur.
- Aktif duvar hiçbir blok alamıyorsa duvar **kapanır** ve cephe ilerler.
- Bandı taşan blok tamamen elenmez, **cezalandırılır**: VCS'ye bir taşma terimi eklenir. Böylece
  "ikinci duvarın alanına geçilecekse doluluk pahasına bunu tercih et" davranışı, taşmayı yasak
  değil **fiyat** yaparak kurulur.
- `DepthSlack` hedef derinliği (`DR-47`) beam'in üst `z` sınırı olarak aynen geçerlidir.

#### Referans sayıların dürüst okunması ⚠

Yerel koşuda ölçülen (2 sn, sınıf başına ilk 8 örnek): BR1 %93,8 · BR4 %94,7 · BR7 %94,7.

**Bunlar bizim sayılarımızla kıyaslanamaz.** `Space.cpp:58`'de blok yalnız `FSB`/`bottom_up`
açıkken tabana ankrajlanıyor; varsayılan modda blok tavana da yaslanabiliyor ve **destek kısıtı
yoktur**. Ölçülen şey *cutting* varyantıdır. `--fsb` bayrağı segfault verdiği için tam destekli
hâli o depoda koşturulamadı.

Literatürdeki tam-destek maliyeti BR1-BR7'de ~0,8 puan (Fanslau & Bortfeldt). Buna göre 2
saniyede tam destekli gerçekçi referans **~%93**; bugünkü %87,73 ile arası ~5 puan.

**Gerçekçi hedef %90-92 ve bu bir tahmindir.** Küçük bütçeli beam için yayımlanmış eğri yok.

#### Adımlar

| # | İş | Kapı |
|---|---|---|
| ~~F7-0~~ | ~~Ucuz sonda: duvar-öncelikli seçim~~ | ❌ **Reddedildi** — sıfır kazanç, `DR-49`. Teşhisi keskinleştirdi: sorun sıralama değil geometri |
| ~~F7-0~~ *(özgün)* | **Ucuz sonda:** duvar-öncelikli seçim. Açık duvara sığmayan kutu geldiğinde yeni duvar açmadan önce sırada ileriye bakıp o duvara sığan ilk kutuyu öne çek. Beam değil, tek adımlık ileri bakış | Static BR1-BR7 **+0,5 puan** *veya* duvar yüzü kaplama **+3 puan**. Tutmazsa geri alınır, doğrudan F7-2'ye geçilir |
| ~~F7-1~~ | ~~BR0-BR15 veri seti~~ | ✅ **Yapıldı** — `DR-50`. BR1-BR7 bit birebir korundu |
| ~~F7-1~~ *(özgün)* | **BR0-BR15 veri seti** — `problems/clp/benchs/BR/` alınır, `DR-38`'in BR8-15 boşluğu kapanır. İlk 7 setin `thpack1-7` ile birebir olduğu doğrulanır | BR1-BR7 sayıları **değişmez** |
| ~~F7-2~~ | ~~Blok kataloğu üretici~~ | ✅ **Yapıldı** — `DR-51`. Azami 2,7 ms / 1946 blok |
| ~~F7-2~~ *(özgün)* | **Blok kataloğu üretici** — basit bloklar (tek ürün, tek yönelim, `nx×ny×nz`) + bileşik bloklar (`min_fr` eşiği), üst sınırlı | Katalog süresi < 50 ms |
| ~~F7-3~~ | ~~VCS değerlendirme~~ | ✅ **Yapıldı** — `DR-52`. Kapı "gerileme yok"tu; static +0,65 / GRASP +0,37 geldi |
| ~~F7-3~~ *(özgün)* | **VCS değerlendirme** — mevcut greedy'ye takılıp **beam olmadan** ölçülür; yalnız aday seçim ölçütü değişir | Static'te gerileme yok |
| ~~F7-4a~~ | ~~Altyapı: kopyalanabilir durum + devam edebilen yerleştirici + ışın döngüsü~~ | ✅ **Yapıldı** — `DR-54`. Beam %87,66; GRASP hâlâ önde |
| ~~F7-4b~~ | ~~Aksiyon uzayını (blok, boşluk) yap~~ | ✅ **Yapıldı** — `DR-55`. %89,42; kapı geçildi, GRASP +1,08 geçildi |
| ~~F7-4b~~ *(özgün)* | **Aksiyon uzayını (blok, boşluk) yap** — `BlockCatalog` beam'e bağlanacak; bugün beam yalnız yerleştirici ayarları üzerinde dallanıyor | Static BR1-BR7 **≥ %89** |
| ~~F7-4~~ *(özgün)* | **Beam search çekirdeği**, aktif duvar kısıtlı. ⚠ `DR-49`: ana döngüde yerleşen birimler de `consumed` işaretlenmeli — bugün yalnız blok inşasının yuttukları işaretli ve bu, döngünün tek yönde ilerlemesine dayanıyor. Beam sırayı serbest bıraktığı anda kutu iki kez yerleşir | Static BR1-BR7 **≥ %89** |
| **F7-5** | **DoubleEffort** — bütçe bitene kadar ışın `√2` ile büyür | 2 sn bütçede **≥ %90** |
| **F7-6** | **Sekiz sert kapı beam içinde** + değişmezler + determinizm | 17 snapshot · `PhysicalInvariants` · `R-C02` |

#### Riskler

| Risk | Etki | Karşılık |
|---|---|---|
| Referans sayılar destek kısıtsız ölçüldü | Hedef fazla iyimser olur | Hedef %90-92 yazıldı; %94 beklenmiyor |
| `DoubleEffort` duvar saatine bağlı | GRASP'takiyle **aynı** sorun: kapı gürültüden kalır | Static yol saf hesap kalır, kapı static'i ölçmeye devam eder (`DR-28`) |
| Blok kataloğu şişer | 2 sn bütçe blok üretimine gider | Katalog süresi F7-2'de kapıya bağlandı |
| ~2.000 satır taşıma | `TreatWarningsAsErrors` + XML doküman zorunluluğu | Adım adım, her adımda yeşil |
| Beam duvar disiplinini eritir | `DR-12` ihlali — kabul edilemez | Boşluk kümesi aktif duvarla filtrelenir; `WallDiagnostics` duvar dışı oranını zaten ölçüyor |
| Bileşik blok GRASP'ta ±0 çıkmıştı | Blok zenginliği tek başına kazandırmaz | Beklenen: Fanslau & Bortfeldt'te basit→jenerik blok farkı yalnız 0,3 puan. **Kazanç arama şemasında** |

#### Ne yapılmayacak

- **Metasolver'ı olduğu gibi taşımak** — C++, Bullet bağımlılığı, birim testi yok. Taşınan fikirdir.
- **Destek kısıtını gevşetmek** — `DR-16`'da ölçüldü ve korundu; referansa yetişmek için fizik bozulmaz.
- **GRASP'ı erken silmek** — F7-4 kapısı geçilene kadar üretim varsayılanı GRASP kalır.

**Süre:** F7-0 yarım gün · F7-1 yarım gün · F7-2…F7-6 açık uçlu (kaynakta 2-4 hafta)

---

---

### F9 — Kırılganlık, istif ve ağırlık *(20 Ağustos 2026'da açıldı)*

**Kaynak:** [arastirma/2026-08-20-yanit-kirilganlik-istif-agirlik.md](arastirma/2026-08-20-yanit-kirilganlik-istif-agirlik.md)
· ölçüm günlüğü `K-1`

#### Neden: kalan kaybın tamamı burada

LIFO kapandı (`DR-69`, üretim maliyeti −3,79). Sırada duran üç kısıt, üretim yolunda ölçüldü:

| Kısıt | Beam | Maliyet |
|---|---|---|
| Kısıtsız | %91,91 | — |
| LIFO | %88,11 | −3,79 |
| İstif ≤ 2 | %78,22 | **−13,69** |
| **Kırılganlık** | **%70,10** | **−21,81** |

#### Araştırmayla çelişkimiz — ve fazın buradan başlaması

Araştırmanın **Öncelik 1**'i iki yarımdan oluşuyor ve ikisi aynı şey değil:

| Yarım | Ne öneriyor | Bizde durum |
|---|---|---|
| **1(i)** geometrik | Sütun geneli → doğrudan temas; köprüleme serbest | ✅ **KAPANDI — iki ayrı korpusta.** `K-1`'de (tip düzeyi) +0,39; `F9-0`'ın birim düzeyli korpusunda +0,18…+0,29. Kırılganları yüke dağıtmak köprüleme fırsatını artırmadı |
| **1(ii)** kategorik→dereceli | Kırılgan = 0 kg yerine kırılgan = **düşük taşıma dayanımı** (lbs) | ⬜ **Denenmedi.** Bambaşka bir mekanizma: kırılganın üstüne *hafif* bir kutu konabilir |

Yani araştırmanın *"kaybın çoğunu geri kazandırır"* iddiası **geometrik yarım için çürüdü**;
dereceli yarım için hâlâ açık. Faz oradan ve daha ucuz olan **Öncelik 2**'den başlar.

**Kritik ayrım:** 1(i) bir *modelleme* düzeltmesiydi — kırılgana dokunmayan yükü serbest bırakmak.
1(ii) bir *iş kuralı değişikliğidir* — kırılgan kutunun üstüne gerçekten yük binmesine izin vermek.
`DR-16`'nın destek eşiğinde yaptığı gibi: **önce sayı üretilir, sonra müşteriye sorulur.**

#### F9-0 — Ölçüm düzeneği borcu *(önkoşul, motor kodu değişmez)*

Araştırmanın üç sorusu bugün **ölçülemez**; düzenek düzeltilmeden ilerlemek `DR-69`'un tekrarı olur.

| Borç | Bugünkü hâli | Yapılacak |
|---|---|---|
| Kırılgan payı ürün **TİPİ** düzeyinde | Bir tipin bütün birimleri birden kırılgan; "%5 kırılgan" ifade edilemiyor, eğri N ≥ 6'da düzleşiyor | ✅ Payı **birim** düzeyine indir; %5 / %10 / %20 / %33 eğrisi |
| Suit'te kırılganlık ailesi yok | Görüntüleyicide gözle bakılamıyor | ✅ `SuiteCorpus`'a `kirilganlik` ailesi (480 senaryo) — sekme şeridi zaten veriden türüyor |
| Ağırlık tavanı 1.000.000 kg | `R-A07` hiçbir koşuda bağlamıyor, F9-5 ölçülemez | ✅ `--real-weight`: ROADEF tablosundaki gerçek kapasite (24-25 t) bağlar |
| `MaxWeightOnTop` / `IsStackable=false` hiçbir korpusta yok | `DR-38`'in açık kalan yarısı | ⏭ **F9-3'e taşındı** — istif ekseninin korpus çalışması zaten orada; ikisini ayrı ayrı yapmak aynı dosyayı iki kez elden geçirmek olurdu |

**Kapı:** düzenek değişikliği doluluğu değiştirmemeli; mevcut iki kapı bayt bayt aynı kalır.

#### F9-1 — Fragile-on-top sıralaması *(en ucuz, hiç denenmedi)*

Araştırmanın **Öncelik 2**'si. Krebs-Ehmke DBLF sıralaması: *"1. fragility flag (non-fragile first)
2. volume 3. length 4. width"*.

- **Mekanizma:** `ItemOrdering.ApplyCriteriaSort` bugün yalnız hacim-azalan. Kırılganı sona almak,
  yerleştirme sırayla yukarı doğru ilerlediği için kırılganı **yığının tepesine** taşır ve
  mühürlediği hacmi ölü olmaktan çıkarır.
- **Maliyet:** tek koşul. Arama bütçesine etkisi sıfır.
- **Risk:** hacim-azalan ilkesiyle çatışır — büyük kutu geç kalırsa yer bulamayabilir. Bu yüzden
  **iki biçim de** ölçülür: kırılganlık birincil anahtar vs hacim birincil + kırılganlık eşitlik
  bozucu.
- **Eşik:** üretim yolunda **+2 puandan az** kazandırırsa mekanizma kapanır, F9-2'ye geçilir.

> ✅ **KABUL EDİLDİ — üretim varsayılanı.** Üretim yolunda (beam) %5 → +0,71 · %10 → **+2,78**
> · %20 → **+5,20** · %33 → **+4,94**; eşik üç payda aşıldı. Static'te kazanç üç kat büyük
> (+3,60…+17,06) — arama yerleştirme sezgisinin kazancını yutuyor (`DR-53`).
>
> Kural gevşetilmedi, ihlal sıfır kaldı; kırılgan kutu yokken sıralama anahtarı sabit olduğu için
> davranış **birebir aynı** (ölçüldü ve testle kilitlendi). Bu yüzden `F9-2`'den farklı olarak
> müşteri kararı gerektirmedi. Kısıtlı kapı referansı %50,50 → %50,55 tazelendi.
> Ayrıntı ölçüm günlüğünde `F9-1`.

#### F9-2 — Dereceli taşıma dayanımı *(Öncelik 1'in açık yarısı)*

- **Mekanizma:** `FragilityType.Fragile` → kategorik "0 kg" yerine bir **taşıma dayanımı**
  (kg/alan). Bizde dereceli eksen zaten var (`MaxWeightOnTop`, `ViolatesStackWeight`); eksik olan
  kırılganlığın o eksene **bağlanması**.
- **İki alt adım:**
  1. **Eşleme** — kırılgan kutuya küçük ama sıfır olmayan bir taşıma dayanımı ver, kategorik kapıyı
     kaldır. Ölçüm düğmesiyle, varsayılan kapalı.
  2. **Yük dağıtım modeli** — bugün ayak izi gölgesi; literatürdeki *complete selection* yükü yalnız
     **doğrudan destek zinciri** boyunca dağıtır. `K-1` köprülemenin ~0 kazandırdığını gösterdi, o
     yüzden bu adım **yalnızca 1 kazandırırsa** yapılır.
- **Bu bir iş kuralı değişikliğidir.** Sayı üretilir, `DR-16` deseniyle müşteriye sorulur:
  *"kırılgan ürünün üstüne N kg'a kadar yük binmesi kabul edilebilir mi?"*
- **Eşik:** araştırmanın kendi eşiği — yeni model doluluğu **≥ %85**'e çıkarırsa Öncelik 1
  doğrulanmış sayılır.

#### F9-3 — İstif sınırı dağılımı *(korpus, kod değil)*

Araştırma bu kısıtta *"modelleme doğru, kazanç küçük; en yüksek getirili adım korpusu gerçekçi bir
dağılımla yeniden parametrelemek"* diyor. Bugün **her ürün** `MaxStackCount = 2` alıyor; gerçekte
sınır ürüne özgüdür ve çoğu üründe **yoktur**.

- Senaryolar: tümü=2 (bugünkü) · karışık {1, 2, 3, 4, sınırsız} · kısıtsız.
- **Eşik:** karışık dağılımda −13,69'un yarısından fazlası geri gelirse yeniden parametreleme
  kalıcılaşır ve `−13,69` bir korpus artefaktı olarak kayda geçer.
- **F9-0'dan devralınan borç:** `MaxWeightOnTop` ve `IsStackable = false` hiçbir korpusta
  ölçülmüyor (`DR-38`'in açık kalan yarısı). İkisi de istif ekseninde; aynı korpus çalışmasında
  kapatılır.

> ✅ **ÖLÇÜLDÜ.** Suit'e istif ailesi eklendi (480 senaryo). Üretim yolunda taban `IST2` −11,05;
> gerçekçi seyrek dağılım `ISTKAR` **−6,19**, yani kaybın **%44'ü** geri geldi. Eşik "yarısından
> fazlası"ydı, **tutmadı** — `MaxStackCount = 2` katı bir korpus seçimiydi ama kısıt gerçekten
> pahalı; modelleme doğru.
>
> `DR-38`'in yarısı kapandı: `MaxWeightOnTop` **−6,66**, `IsStackable = false` (%20) **−9,27**.
> İkincisi `DR-70`'i genişletti — ölçüt kırılganlık değil *"üstüne yük alamamak"* oldu:
> üretimde %80,79 → **%84,93** (+4,14, maliyet −5,13), static'te %64,91 → **%80,00** ve en kötü
> senaryo %22,77 → **%68,03**. Ayrıntı ölçüm günlüğünde `F9-3`.

#### F9-4 — Ağırlık dengesi: onarım post-pass *(Öncelik 3)*

**Açık borç:** denge üretim yolunda **hiç optimize edilmiyor.** `DR-39` `BalanceScoring`'i silerken
gerekçesi *"GRASP üretim varsayılanı olduğu için denge sıra düzeyinde optimize edilmeye devam
eder"* idi; `DR-56` varsayılanı beam'e çevirince o gerekçe sessizce geçersizleşti. Bugün
`WeightBalance` kriterinin üretimdeki tek etkisi ağırlık-azalan sıralamadır.

- **Mekanizma:** beam amacına üçüncü leksikografik terim **eklenmez** (dallanmayı büyütür, doluluğu
  tehdit eder). Silinen takas geçişi **yerleştirme sonrası onarım** olarak geri gelir.
- **Literatür dayanağı:** Ramos, Silva & Oliveira (2018) CoG'u sert kısıt yapıp doluluğu
  bozmadığını ölçmüş.
- **Eşik:** post-pass doluluğu **0,5 puandan fazla** düşürürse zarf gevşetilir.

#### F9-5 — Ağırlık-farkında kutu seçimi *(Öncelik 4, F9-0'a bağımlı)*

Bugün ağırlık tavanı **sıra düzeyinde** uygulanıyor: kalan kapasiteye sığmayan kutu düşer. Hangi
kutunun düşeceğini yerleştirme sırası belirliyor; "kalan kapasiteye en çok hacmi sığdır" diye bir
seçim yok.

- **Tetikleyici:** F9-0'ın gerçekçi tavan senaryosunda araçlar hacimden **önce ağırlıkla** dolarsa
  bu adım derhal devreye alınır; dolmuyorsa ertelenir.
- **Mekanizma:** hacim-değerli, ağırlık-kapasiteli knapsack ön-seçimi.

#### F9-6 — Ayrışım *(Öncelik 5, iş kuralı kararı)*

`ContaminationFilter` bugün bir **ön elemedir**: en yüksek hacimli grup geçer, çakışan diğerleri
tamamen düşer. Literatürde (Eley 2003) bunun karşılığı yok; uyumsuz gruplar aynı araçta ayrı
bölgelere konur.

- Önce **maliyeti ölçülür** (bugün hiç bilinmiyor), sonra müşteriye sorulur.

#### Sıra ve gerekçe

| # | Adım | Neden burada |
|---|---|---|
| 1 | **F9-0** düzenek | Önkoşul: ölçülemeyeni ölçülebilir yapar |
| 2 | **F9-1** sıralama | En ucuz, hiç denenmedi, kural değiştirmiyor |
| 3 | **F9-3** istif korpusu | Kod değil korpus; −13,69'un ne kadarının artefakt olduğunu söyler |
| 4 | **F9-2** dereceli LBS | İş kuralı kararı gerektirir; sayı önce üretilir |
| 5 | **F9-4** CoG onarımı | Doluluktan bağımsız açık borç |
| 6 | **F9-5** ağırlık seçimi | Yalnız F9-0 tavanı bağlarsa |
| 7 | **F9-6** ayrışım | En son; önce maliyeti ölçülür |

F9-1 ve F9-3 önce çünkü ikisi de **kural değiştirmiyor** — biri sıralama, diğeri korpus. İkisi
bittiğinde kırılganlığın ve istifin gerçek maliyeti bilinir ve F9-2'nin iş kuralı sorusu doğru
sayılarla sorulur.

#### Riskler

| Risk | Etki | Karşılık |
|---|---|---|
| Araştırmanın sayıları **VRP amaç fonksiyonunda** (araç sayısı, mesafe) | Bizim doluluk yüzdemize çevrilemez; beklenti şişer | Her adımın kendi eşiği var; literatür yön gösterir, hedef koymaz |
| Kırılganlığı gevşetmek gerçek hasara yol açabilir | Müşteri zararı | F9-2 **varsayılanı değiştirmez**; ölçüm düğmesi üretir, karar müşterinin |
| Düzenek değişikliği ölçüleni değiştirir | `DR-69`'un tekrarı | F9-0 kapısı: iki kapı da bayt bayt aynı kalmalı |
| Sıralama değişikliği hacmi bozar | Kırılgan olmayan yükte gerileme | F9-1 kısıtsız korpusta da ölçülür; gerileme varsa yalnız kırılgan yük içeren planda açılır |
| Adımlar static'te ölçülür | `DR-69` | **Kararlar beam'de verilir**; static yalnız kapı |

#### Ne yapılmayacak

- **Layer building** — `DR-12`, müşteri kararı. Araştırma da önermiyor.
- **Beam amacına üçüncü leksikografik terim** — araştırma açıkça karşı çıkıyor, dallanmayı büyütür.
- **Kırılganlık varsayılanını ölçmeden değiştirmek** — `DR-16` deseni: politika değeri, müşteri kararı.


## 2. Loop Test Harness Tasarımı

### 2.1 Problem

Bugünkü zincir: CLI → login (`cli/runSuiteCli.ts:42-47,118`) → canlı API'den katalog (`cli/runSuiteCli.ts:205-226`) → `generateSuite` → canlı plan oluşturma → kural denetimleri → kapı. Her tur ağ, kimlik doğrulama, veritabanı ve **değişken** bir kataloğa bağımlı. Katalogdan bir ürün silinince `catalogSignature` değişir, tüm baseline serisi kopar (`suiteStorage.ts:283-289`, SC-48).

### 2.2 İki katmanlı harness (motor C#, suite TypeScript)

TS içinde "in-process motor" kurmak motoru yeniden yazmak olurdu; ölçülen şey motor olmazdı. Bu yüzden harness iki katmandır:

```
Katman 1 (hızlı döngü, .NET):
  CargoPilot.Engine.Bench.Runner  →  motoru doğrudan çağırır
  --repeat / --seed-range / --concurrency 1 / determinismDigest
  Geliştirme sırasında saniyeler mertebesinde geri bildirim.

Katman 2 (kabul kapısı, TS):
  npm run suite -- --fixtures
    → HTTP (loopback) → CargoPilot.Engine.Bench  (POST /engine/run)
    → fixtureClient.ts → loadingPlanMappers → 15 kural denetimi → regressionGate
```

`CargoPilot.Engine.Bench`: auth yok, DB yok, EF yok, tek uç. "Ağ erişimi kapalı" iddiası **"dış ağ ve kimlik doğrulama olmadan, yalnız loopback"** olarak tanımlanır.

### 2.3 Katalog bağımlılığını kırma

Sentetik katalog, gerçek kataloğun **yerine** değil, **yanına** konur. Fixture modu ayrı bir imza uzayı kullanır; canlı mod olduğu gibi kalır.

```
src/algorithm-test/fixtures/
  syntheticCatalog.ts     # ürün fixture'ları (R-D08 kapsam garantisi)
  syntheticVehicles.ts    # V-TIR / V-MINI / V-CUBE / V-MIRROR / V-MIX / V-LIGHT
  curatedScenarios.ts     # SC-01..SC-07, SC-50..SC-65 elle kurgu
  index.ts                # FIXTURE_CATALOG_VERSION + imza üretimi
```

```ts
// src/algorithm-test/fixtures/syntheticCatalog.ts
export const FIXTURE_CATALOG_VERSION = 1;

export interface FixtureItem {
  readonly id: string;              // 'FX-FRAGILE-01'
  readonly name: string;
  readonly width: number;           // cm
  readonly height: number;          // cm
  readonly length: number;          // cm
  readonly weight: number;          // kg
  readonly isStackable: boolean;
  readonly maxStackCount: number;   // 0 = sınırsız
  readonly maxWeightOnTop: number;  // 0 = sınırsız
  readonly fragilityType: 0 | 1 | 2;
  readonly allowedRotations: 0 | 1 | 2 | 3 | 4 | 5;
  readonly contaminationClass: string | null;  // UseContamination dalı (SC-62)
  readonly groupId: string | null;
  readonly unloadingOrder: number | null;
}

/** R-D08: her kısıt dalı en az bir üründe temsil edilmeli. */
export const SYNTHETIC_CATALOG: readonly FixtureItem[] = [ /* ... */ ];
```

```ts
// src/algorithm-test/fixtures/syntheticVehicles.ts
export type DoorType = 'small' | 'big';
export type DoorFace = 'z=0' | 'z=length' | 'x=0' | 'x=width';

export interface FixtureDoor {
  readonly type: DoorType;
  readonly face: DoorFace;
}

export interface FixtureVehicle {
  readonly code: 'V-TIR' | 'V-MINI' | 'V-CUBE' | 'V-MIRROR' | 'V-MIX' | 'V-LIGHT';
  readonly width: number;
  readonly height: number;
  readonly length: number;
  readonly maxCargoWeight: number;
  readonly doors: readonly FixtureDoor[];   // liste modeli — front/rear yok
}
```

Koordinat standardı bağlayıcı: `x`=width, `y`=height, `z`=length; `z=length` referans kapı yüzü; kutu pozisyonu `(min x, min y, min z)`. Fixture'larda `depth`/`w`/`h`/`d`/`l` terimleri kullanılmaz.

### 2.4 Deterministik generator

`utils/suiteGenerator.ts:176-193` saf ve mulberry32 tohumlu (`utils/seededRandom.ts:241`) — **korunur**. Fixture modu yalnız girdi kaynağını değiştirir:

- `generateSuite(seed, count, SYNTHETIC_VEHICLES, SYNTHETIC_CATALOG)` → üretilmiş senaryolar (SC-08…SC-49 sınıfı).
- `curatedScenarios.ts` → jeneratörün üretemeyeceği dejenere vakalar. Sebep: `totalBoxes = max(targetBoxes, chosen.length)` ve `MIN_TARGET_FILL = 0.25` (`suiteGenerator.ts:38-39`) sıfır kutuyu, araçtan büyük tek kutuyu ve tam-sığan paketi imkânsız kılıyor.
- `GENERATOR_VERSION` (`:32`) semantiği aynen korunur; fixture modu ek olarak `FIXTURE_CATALOG_VERSION`'ı imzaya katar (SC-47, SC-48).
- **Katalog değişimi RNG akışını kaydırır ve bu beklenen davranıştır:** `chooseItems` ilk iş olarak `rng.shuffle(catalog)` çağırıyor (`suiteGenerator.ts:113`); Fisher-Yates katalog boyutu kadar çekim tüketir. Ürün eklemek/silmek kura sırasını **değiştirir**. Kararlılık "kura sırası bozulmaz" varsayımıyla değil, **kataloğun sabit ve sürümlü olmasıyla** sağlanır.
- Alternatif katalog kullanılırsa (ortam değişkeni yolu) `FIXTURE_CATALOG_VERSION` **ve** katalog içerik hash'i imzaya katılır; aksi hâlde farklı katalogla üretilen koşular varsayılanla eşleşir görünür.
- `groupCount` üst sınırı bugün 3 (`rng.int(2, min(3, chosen.length))`). 4+ grup gerekirse `GENERATOR_VERSION` 3'e çıkar.

### 2.5 Senaryo dosya formatı

```ts
// src/algorithm-test/utils/scenarioIo.ts (genişletilir)
export interface ScenarioFile {
  readonly schemaVersion: 1;
  readonly id: string;                 // 'SC-10'
  readonly title: string;
  readonly source: 'curated' | 'generated';
  readonly generatorVersion?: number;  // source==='generated' ise zorunlu
  readonly seed?: number;
  readonly catalogVersion: number;
  readonly vehicle: FixtureVehicle;
  readonly items: ReadonlyArray<{ itemId: string; quantity: number }>;
  readonly criteria: number;           // loadingPlan.ts:39-45 enum
  readonly strategy?: 'Greedy' | 'WallBuilder';
  readonly sequencer?: 'Static' | 'Gwca' | 'Ga' | 'Grasp';
  readonly expect: {
    readonly hardChecksPass: true;                 // pazarlık dışı
    readonly softAllowFail?: readonly string[];    // ör. ['lifoZone'] (SC-19)
    readonly mustNotSkip?: readonly string[];      // KK-08 kapsam kilidi
    readonly minPlacedRatio?: number;
    readonly maxDurationMs?: number;
    readonly requireSerialRun?: boolean;           // --concurrency 1 zorunlu (SC-41..43)
  };
}
```

Disk düzeni: `src/algorithm-test/fixtures/scenarios/SC-10.scenario.json` (doğrulanacak: klasör konumu tercihi).

### 2.6 Bench istemcisi

```ts
// src/algorithm-test/suite/fixtureClient.ts
export interface FixtureClientOptions {
  /** CargoPilot.Engine.Bench adresi; varsayılan http://127.0.0.1:5099 */
  readonly engineEndpoint: string;
  readonly catalog: readonly FixtureItem[];
}

/** SuiteClient'ı login/DB olmadan, loopback motor ucu üzerinden karşılar. */
export function createFixtureSuiteClient(opts: FixtureClientOptions): SuiteClient;
```

- Arayüz sözleşmesi `suite/suiteClient.ts` içindeki `SuiteClient`'tır (`createPlan` / `getPlanDetail` / `deletePlan`); `runSuite.test.ts:105` sahte istemcisi kalıp olarak alınır.
- `createPlan(body)` → `POST /engine/run`, sonucu bellekte tutar ve sentetik bir kimlik döner; `getPlanDetail(id)` → motor çıktısının `loadingPlanMappers` şemasına eşlenmiş hâli; `deletePlan` → bellekten düşürme.
- `--fixtures` login'i (`runSuiteCli.ts:42-47,118`) atlar; `empty-catalog` yolu (`runSuite.ts:281`) tetiklenmez.
- Worker havuzu (`runSuite.ts:297-311`) değişmez; ölçüm senaryolarında `--concurrency 1` zorunludur.

### 2.7 Determinizm izdüşümü

```ts
// src/algorithm-test/suite/determinismDigest.ts
export function determinismDigest(run: SuiteRun): string;
```

Digest'e **giren**: senaryo kimliği; yerleşimlerin `(itemId, rotation, positionX, positionY, positionZ)` listesi (kanonik sıralı); `unplaced` `(itemId, reason)` listesi; her check'in `(id, status)` değeri.
Digest'e **girmeyen**: `durationMs`, `SearchStats.DurationMs`, `runId`, plan kimliği, `PlacementId`, zaman damgası, makine adı, `BestCostHistory`.

`--repeat N`, SC-45 ve `DeterminizmTests` yalnız digest'i karşılaştırır. Süreler `suiteReport.ts` içinde ayrı bir **performans dağılımı** bölümünde (medyan/p95) raporlanır ve **kapıya girmez** — KK-06a/KK-06b hariç, onlar da medyan üzerinden ayrı ölçülür.

### 2.8 CLI

Mevcut bayraklar (`cli/cliOptions.ts:49-69`): `--seed --count --criteria --engine-version --baseline --out --concurrency --page-size --base-url --email --no-gate --help/-h`. **F1'de eklenen üç bayrak:**

| Bayrak | Anlam |
|---|---|
| `--fixtures` | Sentetik katalog + curated senaryolar + bench istemcisi; login, canlı katalog ve plan kalıcılığı devre dışı (ayrı `--dry-run` / `--scenarios` / `--catalog` bayrağı yok) |
| `--repeat N` | Aynı konfigürasyonu N kez koş, `determinismDigest` deltası 0 bekle (SC-45) |
| `--seed-range a..b` | Çok tohumlu koşu (SC-46, KK-03/KK-05 protokolü) |

**F4'te eklenecekler:** `--shard i/n`, `--until-fail`, `--watch`.

Exit kodları `cliOptions.ts:12-19,147-150` semantiğini korur (0 geçti / 1 kapı kırmızı / 2 çalıştırma hatası).

### 2.9 Kapı kararı

Fixture modunda iki katmanlı:

1. **Mutlak katman** (`regressionGate.ts:101-129`): `allowHardFailures=false`, `allowErrors=false`, `requireCriteriaEffectiveness=true`. Fixture modunda ek olarak her senaryonun `expect.mustNotSkip` listesi zorunlu — bir check `skipped`'a düşerse **kırmızı** (KK-08 delinmesin, R-D08).
2. **Göreli katman** (`:135-169`): `meanFillDropPt 0.5` · `worstFillDropPt 1` · `placedRatioDropPt 0.5` · `maxNewlyFailingScenarios 0`. **Yalnız `isComparable` koşuları arasında** çalışır; farklı `strategy`/`sequencer` kıyaslanamaz sayılır (F0-9b), dolayısıyla WallBuilder'ın ilk koşusu greedy baseline'ına karşı sahte regresyon üretmez.

Eşikler CLI'dan değiştirilemez (README:98) — bu kural korunur; fixture profili kod içinde ayrı sabit olarak tanımlanır.

### 2.10 Dosya özeti

**Yeni**
- `src/CargoPilot.Engine.Bench/` (minimal host, `POST /engine/run`)
- `tests/CargoPilot.Engine.Bench.Runner/` (dotnet bench koşucusu)
- `src/algorithm-test/fixtures/{syntheticCatalog,syntheticVehicles,curatedScenarios,index}.ts`
- `src/algorithm-test/fixtures/scenarios/*.scenario.json`
- `src/algorithm-test/suite/fixtureClient.ts`
- `src/algorithm-test/suite/determinismDigest.ts`
- *(F4)* `src/algorithm-test/cli/watchLoop.ts` · `reports/manifest.json`

**Değişen**
- `src/algorithm-test/cli/cliOptions.ts:49-69,107-139` · `cli/runSuiteCli.ts:42-47,118,205-226,307-309`
- `src/algorithm-test/utils/scenarioIo.ts` · `utils/suiteStorage.ts` (`SUITE_RUN_VERSION`, `scenarioResultSchema`, `aggregateSchema`, `isComparable`, `findComparable`)
- `src/algorithm-test/suite/runSuite.ts:229-255,281` · `suite/regressionGate.ts:43-51` · `suite/criteriaEffectiveness.ts:24-27,61,167-172` · `suite/suiteReport.ts`
- `src/algorithm-test/verification/{checks.ts,types.ts (CHECK_IDS),runChecks.ts,checkLabels.ts,lifoZones.ts}`
- `src/algorithm-test/criteria.ts:203-217` · `src/lib/types/loadingPlan.ts:39-45` · `src/lib/api/loadingPlanMappers.ts:78-100,102-110,201-207`
- `src/algorithm-test/components/{CriteriaMatrixPanel,SuitePanel,RunSummary}.tsx`
- `src/algorithm-test/hooks/useAlgorithmTestRun.ts:102,132-183`
- `apps/algorithm-test-ui/README.md:15` (README:38 **değişmez**)

> **Not (eleştiri #10):** Bu doküman satır numaralarıyla çürür. Yeni referanslar mümkün olduğunca **sembol adıyla** verilir (`CHECK_IDS`, `isComparable`, `SUITE_RUN_VERSION`); satır numarası yalnız halihazırda doğrulanmış noktalarda bırakılmıştır.

---

## 3. Test Senaryo Kataloğu

**Varsayılanlar** (aksi yazılmadıkça): `IsStackable=true`, `MaxStackCount=0`, `MaxWeightOnTop=0`, `FragilityType=0`, `AllowedRotations=0`, `GroupId=null`, `UnloadingOrder=null`, `ContaminationClass=null`. Notasyon: `Ad W×H×L cm / kg × adet`. Her senaryo varsayılan olarak `conservation` + `bounds` + `overlap` + `support` PASS bekler.

**Araçlar:** V-TIR `240×245×1360 / 24000 / [{big,z=length}]` · V-MINI `180×180×300 / 1500 / [{small,z=length}]` · V-CUBE `100×100×100 / 1000 / [{small,z=length}]` · V-MIRROR = V-TIR + `[{big,x=0}]` → `FillFromMaxX` · V-MIX = V-TIR + `[{big,z=length},{small,x=0}]` · V-LIGHT = V-TIR ama `800` kg.

### (a) Dejenere / uç vakalar — curated fixture

| SC | Ad | Amaç | Fake seed özeti | Beklenen invariant | Tuzak |
|---|---|---|---|---|---|
| SC-01 | Sıfır kutu | R-A08 | V-TIR, kutu yok | `conservation` skipped, plan boş, `FillRate=0`, hata yok | 0/0 bölme; `averageItemVolume=0`; UI'da NaN |
| SC-02 | Tek kutu | Başlangıç köşesi | V-TIR, `A 120×100×80/30 ×1` | `loadingCorner` pass; pozisyon `(0,0,0)` | Merkez-mi-köşe-mi karışması |
| SC-03 | Araçtan büyük kutu | R-A07 | V-CUBE, `BIG 120×80×80/50 ×1` | 0 yerleşim, `unplaced=1`, sebep `InsufficientSpace` | Rotasyonla zorla sığdırma; sessiz kaybolma |
| SC-04 | Mükemmel paket | %100 doluluk | V-CUBE, `Q 50×50×50/10 ×8` | 8/8, `FillRate=1.0` | Epsilon; temasın çakışma sayılması |
| SC-05 | Araçla birebir | Sınır eşitliği | V-CUBE, `EXACT 100×100×100/200 ×1` | 1 yerleşim `(0,0,0)` | `<=` yerine `<`; `CONTACT_EPSILON_CM` işareti |
| SC-06 | %250 taşma | Kısmi yerleşim | V-MINI, `M 60×60×60/20 ×120` | Kalan `unplaced`, `conservation` pass | `backendPlacedQuantity != placements.length` |
| SC-07 | Sıfır boyut savunması | Bozuk girdi | V-MINI, `Z 0×50×50/5 ×3` | Validation reddi ya da `unplaced`; asla `footprint=0` desteği | `checkSupport` `footprint===0`'da continue → havada yeşil kutu |

### (b) Yedi sert kapının izolasyonu

| SC | Ad | Kapı | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-08 | Sınır zorlaması | #1 sınırlar | V-MINI, `L 170×170×290/100 ×3` | `bounds` pass, 1 yerleşen 2 unplaced | Rotasyon takasında `ex<0` |
| SC-09 | Temas ≠ çakışma | #2 `HasOverlap` | V-CUBE, `T 50×100×100/20 ×2` yan yana | `overlap` pass, 2/2 | `<=` ile temas çakışma sayılır, doluluk yarılanır |
| SC-10 | %80 destek | #3 `HasSupport` | V-CUBE, `BASE`+`WIDE 100×50×100/40` + `EDGE 40×50×40/5 ×4` | Oranı <%80 hiçbir yerleşim yok | %79'un yuvarlanması; çoklu destek toplamının atlanması |
| SC-11 | İstiflenemez taban | #4 `ViolatesStackability` | V-MINI, `NS 90×60×100/60 ×4` (`IsStackable=false`) + `TOP 60×40×60/10 ×20` | `stackable` pass, **skipped değil**, NS üstünde 0 kutu | Katalogda kısıtlı ürün yoksa `skipped` → dal test edilmez (R-D08) |
| SC-12 | İstif adedi | #5 `ViolatesStackCount` | V-MINI, `SC2 90×40×100/30 ×2` (`MaxStackCount=2`) + `FILL ×10` | SC2 üstünde ≤2 | Motor "+1" ekler, ayna eklemez; sütun geneli yerine tek üst |
| SC-13 | Üst ağırlık | #6 `ViolatesStackWeight` | V-MINI, `WB /20 ×2` (`MaxWeightOnTop=25`) + `HEAVY ×10` | WB üstü toplam ≤25 kg | Toplam yerine maksimum; kayıt eksikse `skipped` |
| SC-14 | Kırılgan üstü boş | #7 `ViolatesFragility` | V-MINI, `FR ×3` (`FragilityType=1`) + `NORM ×25` | FR üstünde hiçbir kutu (temas dahil) | Kuralın çift yönlü sanılması; `FragilityType=2`'nin kırılgan sanılması |
| SC-15 | Yalnız kırılganlıktan ret | Ret sebebi ayrımı | V-CUBE, `FR ×1` + `NORM ×3` | Kalan 2'nin sebebi `FragilityOrHandlingConstraint` | Sebebin hep `InsufficientSpace` dönmesi |

### (c) LIFO — çok grup / çok katman

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-16 | 3 grup tek katman | A6, `zoneSize=L/3` | V-TIR+Lifo, G1/G2/G3 `120×110×120/40 ×9` | `lifoZone` pass; G1 kapıya en yakın, G3 `zStart=0` | Sıranın ters kurulması; son bölge `ZStart≠0` |
| SC-17 | 3 grup × 2 katman | R-D02 kör noktası | V-TIR+Lifo, her grup ×18 | `lifoZone` + `lifoVertical` pass | Katman 2'de bölge disiplininin gevşemesi (OPT-02) |
| SC-18 | Dikey LIFO baskısı | A3-#4 | V-MINI+Lifo, `EARLY(1) ×6` + `LATE(3) ×6` | order=3 asla order=1 üstünde | Kriter Lifo değilse `skipped`; eşit yükseklikte "üstünde" sayılmaması |
| SC-19 | Dengesiz grup hacmi | A6 eşit bölme borcu | V-TIR+Lifo, `BIG 200×200×200(1) ×12` + `TINY 40×40×40(2) ×6` | `lifoZone` soft-fail ölçülür; yerleşen oran düşmez | Eşit bölme → gereksiz `unplaced`; R-C13 dinamik `zWall` kıyas noktası |
| SC-20 | Tek distinct order | A6 "distinct ≤1" | V-TIR+Lifo, hepsi `order=2` | `lifoZone` **skipped**, doluluk kayıpsız | Tek gruba bölge kurup boşuna kısıt |
| SC-21 | 3 grup + grupsuz | Karışık girdi | V-TIR+Lifo, G1/G2/G3 + `FREE ×10` | Grupsuz kutular taşma sayılmaz | Grupsuzun bir bölgeye atfedilmesi |

### (d) Kırılganlık + istiflenemezlik

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-22 | Kırılgan **ve** istiflenemez | İki kapı kesişimi | V-MINI, `FN ×6` (`Fragile=1`,`Stackable=false`) + `NORM ×20` | İkisi de pass, ikisi de skipped değil | Bir kapının diğerini maskelemesi |
| SC-23 | Tamamı kırılgan | Tek katman zorunluluğu | V-TIR, `FR 100×100×100/20 ×60` | Tüm `positionY=0`; kalan `unplaced` | Doluluk uğruna kırılganı istifleme |
| SC-24 | Kırılgan + üst ağırlık | #6 ve #7 birlikte | V-MINI, `FR(Fragile=1, MaxWeightOnTop=50) ×3` + `H ×8` | `fragility` pass, limit ne olursa olsun 0 yük | `MaxWeightOnTop>0` görüp kırılganlığı gevşetme |
| SC-25 | Kırılgan geç-inen grupta | LIFO + kırılganlık | V-TIR+Lifo, `G1 NORM(1) ×20`, `G2 FR(2,Fragile) ×20` | Üç check de pass | Bölge baskısının kırılganı istifletmesi |
| SC-26 | İstiflenemez + tavan boşluğu | Doluluk-kural gerilimi | V-TIR, `NS 240×120×120/200 ×20` | Üst 125 cm boş, ihlal 0 | "Doluluk düştü" diye kural gevşetme (KK-01 > KK-03) |

### (e) Ağırlık dengesi / CoG

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-27 | Ağır/hafif ikili | WeightBalance, CoG X | V-TIR+WB, `HEAVY/400 ×8`, `LIGHT/12 ×8` | `cogMismatch` pass (<0.5 cm) | Ağırların tek tarafa yığılması; backend/istemci formül ayrışması |
| SC-28 | Ağırlık tavanı | R-A07 ağırlık | V-LIGHT(800), `H/120 ×20` | `totalWeight` ≤800, ~6 yerleşen | Ağırlığa yalnız hacimden sonra bakılması |
| SC-29 | CoG çapraz kontrol | Offset doğruluğu | V-TIR+WB, 5 tip, kg/hacim 0.5×–20× | Sapma ≤ yuvarlama | Yarım açıklık normalizasyonunun tam açıklıkla yapılması |
| SC-30 | Denge takası destek koruması | OPT-01 nüksü | V-TIR+WB, 500 kutu, eşit yükseklikli 2 tip, `--concurrency 1` | `support` pass, süre ≤30 s | `ImproveBalance` eşit yükseklikte destek taramasını atlar → havada kutu |
| SC-31 | Ağır alt / hafif üst | #6 + CoG-Y | V-TIR, `H/200 ×20` (`MaxWeightOnTop=15`) + `L/10 ×20` | CoG-Y alt yarıda | Sütun geneli yerine tek katman toplamı |

### (f) Kapı konfigürasyonu & aynalı yükleme

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-32 | Aynalı yükleme | A5, `FillFromMaxX` | V-MIRROR, `A 100×100×100/30 ×30` | En az bir kutu `x+width == width`; `z` yönü **değişmez** | `z`'nin de aynalanması; `scale.x=-1` tipi gizli telafi (yasak) |
| SC-33 | Normal kapı (kontrol) | Ayna karşıtı referans | V-TIR, aynı yük | En az bir kutu `x=0` | Ayna düzeltmesinin normal moda sızması |
| SC-34 | Karışık kapı listesi | Kapı listesi modeli | V-MIX | `FillFromMaxX=false`, `loadingCorner` = `x=0` | Herhangi bir kapının `x=0`'da olmasının aynayı tetiklemesi |
| SC-35 | Ayna + LIFO | Etkileşim | V-MIRROR+Lifo, 3 grup × 12 | İkisi birlikte pass | Bölge hesabının kapı listesine bağlanması (A6: yalnız `UseLifo`) |
| SC-36 | Kapısız araç | Savunma | V-TIR türevi, `doors=[]` | `FillFromMaxX=false`, `x=0`, hata yok | Boş listede exception |

### (g) Rotasyon kısıtları

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-37 | Sabit yönelim | `AllowedRotations=2` → `{0}` | V-MINI, `FIX 90×40×120/25 ×12` | Tüm `rotation==0` | Sessiz döndürme; `3=NoYaw` vs `2=Fixed` kayması |
| SC-38 | Dikey dönüş yasak | `=1` → `{0,1}` | V-MINI, `NV 60×140×80/30 ×10` | `height` korunur | Yükseklik takasının Yaw sanılması |
| SC-39 | Pitch/Roll karışık | `4={0,2}`, `5={0,3}` | V-TIR, `P(=4) ×15` + `R(=5) ×15` | Küme dışı enum yok | `ALLOWED_ROTATION_SET` aynasının motorla ayrışması (elle güncelleniyor) |
| SC-40 | Rotasyon + kırılganlık + LIFO | Kapsam paneli | V-TIR+Lifo, her grupta bir kısıt tipi | Üçü pass, hiçbiri `skipped` (KK-08) | Çok kısıtta birinin `skipped` düşüp yeşil sayılması |

### (h) Ölçek / performans

> Bu grubun tamamında **`--concurrency 1` zorunludur**; işçi havuzu paralel koşarken ölçülen süre delil değildir.

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-41 | 500 kutu · 10 tip | KK-06a/KK-06b | V-TIR, 10 tip × 50, %30 kısıtlı, seri koşu | Uçtan uca ≤30.000 ms, tek değerlendirme medyanı ≤11 ms, sert ihlal 0, `SearchStats.DurationMs` raporlanır | Aracın uçtan uca `durationMs`'inin delil sayılması (R-D09); paralel koşuda ölçüm |
| SC-42 | 1000 kutu | Senkron uç sınır | V-TIR, 12 tip, seri koşu | ≤120.000 ms, sonuç boş değil | Bütçe aşımında boş plan (R-C20 ihlali) |
| SC-43 | Dar bütçe | R-D05 | V-TIR, 500 kutu, `MaxDurationMs=2000`, seri koşu | ≤2.500 ms, sonuç boş değil | Yarım/tutarsız plan |
| SC-44 | Baseline garantisi | R-C21/R-D04 | SC-41 girdisi, `Static` vs `Gwca`, aynı koşu içinde eşleştirilmiş | `Gwca.FillRate >= max(tohum FillRate)` | Tohumun altına düşüp "iyileştirildi" raporlama |

### (i) Determinizm & tohum tekrarı

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-45 | Aynı tohum iki koşu | R-A12/R-D01/KK-02 | Aynı seed, `WallBuilder+Gwca`, `--repeat 20` | **`determinismDigest` eşit** (süre/kimlik/zaman damgası digest dışı) | `Parallel.For` sırası; `Dictionary` iterasyonu; `DateTime`/`Guid` sızıntısı; ham rapor eşitliği aranarak sahte kırmızı |
| SC-46 | Farklı tohum, aynı invariant | Tohum bağımsızlık | 20 seed × 50 senaryo | Tüm sert check'ler pass | Tek tohumla "yeşil" ilanı |
| SC-47 | Jeneratör sürüm kilidi | Karşılaştırılabilirlik | `GENERATOR_VERSION` değişik baseline | `findComparable` eşleşme vermez | Sürüm artırılmadan üretim mantığı değişimi |
| SC-48 | Katalog imzası değişimi | Aynı tohum, farklı katalog | Katalogdan 1 ürün silinir | **RNG akışı kayar — beklenen davranış budur.** Kilit: `catalogSignature` farkı `findComparable`'ı **sessiz eşleşmeden** korur; kıyas reddedilir | "Kura sırası bozulmaz" varsayımı (`chooseItems` `rng.shuffle(catalog)` ile katalog boyutu kadar çekim tüketir); alternatif katalogla üretilen koşunun varsayılanla eşleşir görünmesi |
| SC-49 | Skor toplama sırası | R-A13 | Terim sırası değiştirilmiş build | Çıktı kayarsa **kırmızı** | Float toplama sırasının önemsiz sayılması |

### (j) Wall-Builder'a özel — curated fixture

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-50 | Duvar derinliği | R-C08 | V-TIR, `D1 120×110×200/60 ×6` sonra `D2 120×110×80/20 ×30` | Duvar 1 `[0,200)`; `wallOrder` pass | En büyük `z`'nin alınması → dev duvar |
| SC-51 | Alternatif derinlik kuralı | `WallDepthRule=MinMax` | SC-50 girdisi | Farklı bölünme, ihlal 0, ikisi de deterministik | Parametrenin snapshot'a yazılmaması |
| SC-52 | Şerit artığı devri | R-C09 | V-TIR, `S 100×80×100 ×12` + `FILL 35×80×100 ×30` | 40 cm artığa FILL girer, `support` pass | Artığın ölü hacme dönmesi |
| SC-53 | Şerit yüksekliği | R-C09 | V-TIR, `T 80×160×100 ×3` sonra `SH 80×40×100 ×30` | Kısa kutular havada kalmaz | Şerit yüksekliğinin destek yerine geçmesi |
| SC-54 | Boşluk parçalanması | R-C11 | V-TIR, 8 boyut × 200 kutu (37/53/71) | Boşluk listesi patlamaz, ≤30 s | Üstel büyüme; `rejected` filtresinin geçerli boşluğu atması |
| SC-55 | Amalgamation aç/kapa | R-C11 | SC-54, bayrak iki durumda | İkisi de ihlalsiz; açıkken `FillRate` ≥ kapalı; determinizm korunur | Birleştirmenin çakışan boşluk üretmesi |
| SC-56 | Aday nokta sıra kilidi | R-C10 | Eşit mesafeli 4 boşluk kurgusu | Her koşuda aynı digest; aynalı modda `x` ters | Eşitlik bozucu eksikliği → KK-02 fail |
| SC-57 | Sanal duvar (multi-drop) | R-C13/R-D06 | V-TIR+Lifo, 3 grup × 2 katman, dengesiz hacim | `ZoneViolations == 0` **ve** yerleşen ≥ greedy | Eşit bölmeye geri düşme; `zWall` erken çekilmesi |
| SC-58 | Duvar ön yüzü düzlüğü | R-C14/R-C18 | V-TIR, `z` 78/80/82 karışık 150 kutu | Metrik raporlanır, sert kapıyı ezmez; `WallCount==0` durumunda değer tanımlı ve sonlu | Düzlük uğruna `unplaced`; `wFlush` 1e2 dışına kaçması; NaN |
| SC-59 | Fitness terim izolasyonu | R-C18 (kalibrasyon kanıtı) | `wBal`/`wFlush` tek tek sıfırlanmış; 1 büyük vs 5 küçük unplaced kurgusu | Her terim ölçülebilir; maliyet sıralaması iş kuralıyla monoton; sert ihlal hiçbir konfigürasyonda >0 | İhlalin "kabul edilebilir maliyet" sayılması (A8) |
| SC-60 | Grup içi random-key kilidi | R-C19 | Lifo, 3 grup, GWCA 60 iterasyon | Gruplar arası sıra `UnloadingOrder` DESC sabit | Meta-sezgiselin gruplar arası sırayı karıştırması |
| SC-61 | Sequencer kıyası | R-C22/R-D03/KK-05 | BR1–BR7 alt kümesi + SC-41; dört sequencer **aynı koşuda, aynı bütçe, aynı senaryo** üzerinde eşleştirilmiş; 10 seed | GWCA ≥ GA **veya** GRASP (doluluk **ve** süre); işaret testi p<0.05 | Farklı bütçelerle kıyas; tek senaryodan/tek seed'den genelleme; ayrı koşuların `meanFill`'lerinin karşılaştırılması |

### (k) Modül dalları, iptal ve yeniden optimizasyon — curated fixture

| SC | Ad | Amaç | Fake seed özeti | Beklenen | Tuzak |
|---|---|---|---|---|---|
| SC-62 | Kontaminasyon izolasyonu | `UseContamination` modülü | V-TIR + `UseContamination`, `FOOD(class=food) ×20` + `CHEM(class=chemical) ×20` | Uyumsuz sınıflar komşu/üst-alt konumlanmaz; ilgili check pass ve **skipped değil** | Modülün hiç test edilmemesi; katalogda sınıf etiketi olmayınca sessiz `skipped` |
| SC-63 | `ClusterGroups` aç/kapa | Kümeleme dalı | V-TIR+Lifo, 3 grup; `ClusterGroups` true ve false | İki dal da ihlalsiz; false dalında geç-inen erken-inenin üstüne konmaz — mevcut golden (`Lifo_KumelemeKapali_GecInenErkenIneninUstuneKonamaz.json`) ile **çapraz doğrulama** | Wall-Builder'ın kümeleme kapalı dalını sessizce kırması |
| SC-64 | Arama ortasında iptal | RK-20 / `CancellationToken` | SC-41 girdisi, GWCA, ~%50 ilerlemede iptal | Ya tam ve geçerli bir plan ya da boş sonuç; **asla kısmi/tutarsız plan**, `conservation` pass veya sonuç yok | İptal anındaki yarım bireyin sonuç sayılması; `unplaced` listesinin eksik dönmesi |
| SC-65 | Kalıcı seed ile re-optimize | F4 kalıcılığının kabul kriteri | Plan kaydedilir (Seed+Strategy+Sequencer), sonra `ReOptimizePlan` aynı girdiyle | Yeni sonucun `determinismDigest`'i orijinaliyle **eşit** | Seed'in kaydedilmemesi/okunmaması; re-optimize yolunun farklı default'la koşması |

---

## 4. Risk Kaydı

| ID | Risk | Etki | Erken uyarı testi | Azaltma | Faz |
|---|---|---|---|---|---|
| **RK-01** | Statik modüller + `Parallel.For` paylaşılan mutable durum (`R-C23` ↔ `R-C05`/A1) | Koşudan koşuya farklı, hatta fiziksel olarak geçersiz plan | `DeterminizmTests.WallBuilder_ParalelVeSeriAyniSonuc`; 100 tekrar aynı digest | Her birey kendi arena nesnesi; statik mutable alan yasağı lint/review kuralı | F2 |
| **RK-02** | Tek `Random(seed)`, tüketim sırası koda bağlı (`R-C02`) | Bir `if` sırası değişince tüm akış kayar; paralelde determinizm ölür | İterasyon başına `Random` çağrı sayacı testi | `rng(seed, iter, individualIndex)` alt-üreteç; rastgele kararlar paralel bölge dışında önceden | F3 |
| **RK-03** | `R-C21` baseline garantisi ↔ `R-C18` çok terimli fitness çelişkisi | `R-D04` tasarım gereği kırmızı | `wBal=5e4` ile tohumdan düşük FillRate'li ama daha iyi maliyetli birey kurgusu | **F0 tanım borcu:** garanti FillRate üzerinden mi, fitness üzerinden mi | F0 |
| **RK-04** | Bütçe/erken durdurma baseline'ı garanti edemez (`R-C20` ↔ `R-C21`) | 2 sn bütçede boş veya tohum-altı sonuç | SC-43'ü `MaxDurationMs=1` ile koş | Tohumlar bütçe dışı; en az bir tam değerlendirme garantisi kurala yazılır | F3 |
| **RK-05** | `AvgWallFlushness` tanımsız → NaN (`R-C14`) | `NaN` her karşılaştırmada `false`; lider seçimi sessizce yanlış | `double.IsFinite(cost)` assert'i; elle NaN enjeksiyonu; SC-58 | **F0 tanım borcu:** `WallCount==0` tanımı + NaN yasağı. **F3 kalibrasyon borcu:** ağırlık katsayısı | F0 (tanım) / F3 (katsayı) |
| **RK-06** | `AllowedRotations` numaralandırma sırası runtime'a bağlı (`R-C15`) | Aynı seed farklı makinede farklı yönelim | Kanonik sıra birim testi; iki OS'ta yönelim dizisi eşitliği | Enum değerine göre sıralı kanonik dizi | F3 |
| **RK-07** | `(int)(key*count)` sınırı ve `reflect(1.0)=1.0` | `IndexOutOfRange` veya yönelim dağılımı bozulması | `[-5,5]` aralığında 10.000 değerle property test | Clamp + `reflect` tanım aralığı yazılı | F3 |
| **RK-08** | Yönelim anahtarı sıralanmış pozisyona bağlanırsa (`R-C15`/`R-C19`) | Fitness manzarası kalıtımsız, GWCA yakınsamaz | İlk N anahtarda swap → diğer kutuların yönelimi değişmemeli | Yönelim anahtarı **kutu kimliğine** bağlanır | F3 |
| **RK-09** | Unstable sort ile eşit anahtarlar (`R-C15`/`R-A12`) | Aynı seed farklı permütasyon | Tüm anahtarlar `0.5` → permütasyon `ItemId` ASC | Kararlı sıralama + `ItemId` eşitlik bozucusu decode'a taşınır | F3 |
| **RK-10** | Köşe adayları birleşik destek ≥%80 konumlarını bulamaz (`R-C10`/`R-C11` ↔ kapı 3) | Greedy'den düşük doluluk; KK-03 ulaşılamaz | `WallBuilderSupportSpanTests`: iki kutunun üstüne oturan üçüncü kutu | Destek yüzeyi birleşiminden aday üretimi | F2 |
| **RK-11** | Boşluk güncellemede containment pruning eksik (`R-C11`) | Boşluk listesi katlanır, bütçe patlar, yol-bağımlılık | `SpaceList.Count ≤ 20·n` + "hiçbir boşluk başkasını kapsamaz" invariantı | Maximality/containment temizliği kurala yazılır ve uygulanır | F2 |
| **RK-12** | Performans bütçesi aritmetiği tutmuyor (`R-C20`, KK-06a/b) | 20 sn bütçe 2-3 mertebe aşılır | `PerformansTabanCizgisiTests`: tek değerlendirme medyanı ≤11 ms, `--concurrency 1` | Uzamsal indeks + artımlı doğrulama F2'de ön koşul; tutmazsa `iter × pop` aşağı çekilir | F2/F4 |
| **RK-13** | Dinamik `zWall` ile aracın eşit-bölmeli `lifoZone`'u çakışır (`R-C13`/DR-02); **ayrıca greedy ölçümlerini de kaydırma riski** | Gecelik kapı sürekli kırmızı, kural `skipped`'a alınır (KK-08 delinir) veya tüm baseline serisi sessizce anlam değiştirir | `goldenCrossCheck.test.ts`'e Wall-Builder fixture'ı; `lifoZones.test.ts` mevcut vakaları **değişmeden** geçer | Dinamik bölge hesabı **yalnız `strategy===WallBuilder`** sonuçlarına uygulanır; greedy bugünkü eşit bölmeyi kullanır; `wallOrder` eklenir (R-D07) | F2 |
| **RK-14** | Sanal duvar semantiği tanımsız — `positionZ` mi tüm ayak izi mi (`R-C13`) | LIFO boşaltma fiilen bozulur | Grup-1 üstüne taşan grup-2 kutusu senaryosu | **F0 tanım borcu** | F0/F2 |
| **RK-15** | Duvar (`R-C08`) ve maximal-space (`R-C11`) iki ayrı defter | Aynı hacim iki kez tahsis; `WallCount`/flushness anlamsızlaşır | "Her yerleşim tam bir duvara ait, `[zStart,zEnd)` dışına taşmaz" invariantı | Tek otorite: duvar z sınırını belirler, boşluklar kırpılır | F2 |
| **RK-16** | Fitness ölçekleri iş kuralıyla monoton değil (`R-C18`) | 1 büyük kutuyu dışarıda bırakan plan tercih edilir | 1 büyük vs 5 küçük unplaced maliyet sıralaması testi (SC-59) | **F3 kalibrasyon borcu:** katsayılar SC-59 kanıtıyla F3 çıkışında mühürlenir | F3 |
| **RK-17** | Snapshot şeması değişimi "sıfır kayma" kriterini kırar (`R-C07`, `R-A16`) | 17 snapshot bayt farkı; eski dosyalarda `Strategy` default'u sessiz kayma | Eski 17 dosya **değişmeden** deserialize + aynı çıktı | `JsonIgnoreCondition.WhenWritingDefault`; default `Greedy` | F0 |
| **RK-18** | `double` fitness ↔ `decimal` geometri; FMA/JIT/mimari farkı | "Bit birebir" iddiası makineler arası tutmaz; eşit maliyette bozucu yok | linux-x64 ve ARM CI'da `determinismDigest` + `BestCostHistory` hash kıyası | Dönüşüm tek noktada; `individualIndex` eşitlik bozucusu | F4 |
| **RK-19** | Kültür/format duyarlılığı (`R-A12`, `loadingPlanMappers.ts`) | TR ondalık virgülü snapshot/JSON'u bozar; round-trip kaybı | `[UseCulture("tr-TR")]` snapshot testi | Invariant culture + "R" formatı; `BestCostHistory` snapshot'a **girmez** | F3 |
| **RK-20** | Kutu korunumu arama boyunca sızar (`R-C04`/`R-A08`) | Unplaced sebepleri karışır; iptalde kısmi plan döner | `placements.Count + unplaced.Count == inputBoxes.Count` + SC-64 iptal senaryosu | Kazanan bireyin setleri; `CancellationToken`'da kısmi sonuç dönmez | F3 |
| **RK-21** | `R-C19` grup invariantı ↔ OPT-14 `UnloadingOrder ?? -1` sentineli | Hayalet grup; arama uzayı sessizce daralır | `GroupId=null, UnloadingOrder=3` kutuların permütasyonu iterasyonlarda değişmeli | Sentinel yerine açık nullable ayrımı | F3 |
| **RK-22** | Rotasyon yön-bağımlı kısıtlarla ilişkilendirilmemiş (`R-A06`, kapı 5/6) | Fiziksel olarak saçma ama kapılardan geçen planlar | `MaxWeightOnTop` dolu ürünle yan yatırma testi | Yönelime bağlı kısıt kuralı rulebook'a yazılır | F2/F3 |
| **RK-23** | Amalgamation yol-bağımlı determinizm (`R-C11`) | Bayrak açıldığı gün determinizm testi kayar, sebep aylar sonra aranır | `DeterminizmTests` bayrağı theory parametresi olarak koşar (SC-55) | Birleştirme sırası kanonik ölçütle sabitlenir | F2 |
| **RK-24** | `SUITE_RUN_VERSION` artışı + `ignore_baseline` ilk koşu | Gecelik kapı en az bir gece koruma sağlamaz | `ignore_baseline` sonrası **aynı commit'te** ikinci koşu, delta 0 | CI adımı olarak zorunlu; `ignore_baseline` kullanım yetkisi tanımlanır | F0/F4 |
| **RK-25** | `gampdf` elle uygulama + `sign()` eşit fitness'ta 0 (`R-C17`) | Platformlar arası son-bit farkı; asker adımı çöker | Eşit fitness'lı iki bireyle ilerleme testi; `gampdf` referans tablosu 1e-12 | lgamma tabanlı ortak uygulama; eşitlikte deterministik bozucu | F3 |
| **RK-26** | `R-C22`/KK-05/KK-03 kıyas ifadesi istatistiksel olarak tanımsız | Tek seed gürültüsünden yanlış sonuç; eşleştirilmemiş koşulardan sahte kazanç | Eşleştirilmiş protokol olmadan kıyas raporu üretilmez | Tek ortak protokol (§5) rulebook'a yazılır; KK-03 ve KK-05 aynı protokolü kullanır | F3 |
| **RK-27** | Rapor gövdesi determinizm ölçümüne uygun değil (süre/kimlik/zaman damgası) | `--repeat` ilk turda sahte kırmızı; ekip `--no-gate` alışkanlığı edinir | `determinismDigest` birim testi: aynı yerleşim + farklı süre → aynı digest | Digest tanımı §2.7'de sabit; süreler kapı dışı performans bölümünde | F1 |
| **RK-28** | Strateji alanı API sözleşmesine bağlanmazsa suite WallBuilder'ı hiç koşamaz | KK-03, SC-41…SC-65 ölçülemez; faz kapıları boşa çıkar | F0 çıkış kriteri: `placementStrategy` ile plan oluşturma smoke testi | F0-4 request DTO + validator + Swagger; flag/yetki koruması | F0 |

---

## 5. Kabul Kriterleri ve Ölçüm

### 5.1 Eşleştirilmiş kıyas protokolü (KK-03 ve KK-05 için ortak)

> **Aynı koşu içinde** her senaryo, karşılaştırılan her yapılandırmayla (`Greedy` ve `WallBuilder+Gwca`; SC-61'de ayrıca `Ga`, `Grasp`) **aynı girdiyle, aynı bütçeyle, `--concurrency 1` ile** çalıştırılır. Delta senaryo bazında eşleştirilmiş hesaplanır; ayrı koşuların `meanFill` farkı kıyas kanıtı sayılmaz.
>
> **Örneklem:** 10 seed × ≥50 senaryo.
> **Kabul:** eşleştirilmiş farkın ortalaması hedef eşiği aşar **ve** %95 güven alt sınırı > 0 **ve** işaret testi p<0.05 **ve** hiçbir senaryoda −2,0 puandan kötü düşüş yok.

### 5.2 Kriterler

| KK | Kriter | Ölçüm | Kapandığı faz |
|---|---|---|---|
| **KK-01** | Sert kural ihlali 0 — doluluk bunu asla satın alamaz | 13 **hard** check (`verification/types.ts` `CHECK_IDS`, `severity==='hard'`; toplam 15 denetim: 13 hard + `lifoZone` ve `wallOrder` soft), `allowHardFailures=false` (`regressionGate.ts:43-51`) | F2 (Wall-Builder), F3'te korunur |
| **KK-02** | Aynı seed → aynı `determinismDigest` | SC-45, `DeterminizmTests`, `npm run suite -- --fixtures --repeat 20 --concurrency 1`, dotnet bench koşucusu | F2 (aramasız), F3 (GWCA), F4 (çapraz mimari) |
| **KK-03** | Doluluk ≥ greedy + 1,0 puan | §5.1 eşleştirilmiş protokol: 10 seed × ≥50 senaryo, ortalama fark ≥ +1,0 pt, %95 GA alt sınırı > 0, işaret testi p<0.05, hiçbir senaryoda < −2,0 pt | F3 |
| **KK-04** | Kutu korunumu — `placed + unplaced == requested`, her ret sebebi dolu | `InvariantTests` + `conservation` check + SC-64 (iptal) | F2 (temel), F3 (iptal) |
| **KK-05** | GWCA ≥ GA **veya** GRASP (doluluk **ve** süre) | SC-61, §5.1 ile **aynı** protokol (10 seed, işaret testi, tek bütçe) | F3 |
| **KK-06a** | Tek Wall-Builder değerlendirmesi ≤ 11 ms | 500 kutu, medyan, `--concurrency 1`, `PerformansTabanCizgisiTests` · tutmazsa `iter × pop` bütçesi F3 öncesi düşürülür | **F2 çıkış kriteri** |
| **KK-06b** | Uçtan uca: 500 kutu ≤ 30 s; GWCA bütçesi ≤ 20 s | SC-41, SC-43, `SearchStats.DurationMs` (R-D09: aracın uçtan uca süresi delil değil), `--concurrency 1` | F4 |
| **KK-07** | Gecelik regresyon kapısı güvenilir | `ignore_baseline` sonrası aynı commit ikinci koşu, delta 0 (CI adımı) | F4 |
| **KK-08** | Hiçbir check `skipped` ile yeşil görünmez | `expect.mustNotSkip`; sentetik katalog R-D08 kapsam garantisi (kontaminasyon dâhil); `criteriaEffectiveness.ts:42,48` | F1 |
| **KK-09** | Mevcut greedy davranışı sıfır kayma | 17 golden snapshot dosya olarak bayt bayt değişmez — uzamsal indeks dâhil tüm performans işinin tek kabul kanıtı; ayrıca `lifoZones.test.ts` mevcut vakaları değişmeden geçer | F0 (şema), F2 (performans işi) |
| **KK-10** | Strateji seçimi uçtan uca çalışır | `placementStrategy` ile plan oluşturma smoke testi; flag kapalıyken 400; suite fixture modunda WallBuilder koşabiliyor | F0 |
| **KK-11** | Kalıcı seed ile yeniden optimizasyon tekrarlanabilir | SC-65: kaydedilmiş Seed+Strategy ile re-optimize → `determinismDigest` eşit | F4 |

---

## 6. Yapılmayacaklar / Kapsam Dışı

- **Greedy motorun davranışsal yeniden yazımı.** Greedy varsayılan yol olarak kalır ve **davranışı değişmez**; 17 golden snapshot bayt bayt sabittir. Buna karşılık `PlacementValidator` ile çakışma/destek taraması **davranış-koruyan uzamsal indeksleme** ile hızlandırılabilir — bu bir yeniden yazım değil, KK-06a'nın ön koşuludur ve tek kabul kanıtı snapshot eşitliğidir.
- **`IOptimizationEngine.Run` imza değişikliği.** Strateji seçimi `OptimizationInput` üzerinden, sonda default'lu parametrelerle. Çağıranlar (`CreatePlanCommandHandler.cs:172`, `ReOptimizePlanCommandHandler.cs:100`) bozulmaz.
- **`OptimizationModules`'ün API sözleşmesine bağlanması.** `OptimizationInput.cs:44-51`'deki bilinçli politika korunur. **Bu politika strateji bayrağını kapsamaz:** `PlacementStrategy` / `Sequencer` / `Seed` **API sözleşmesine bağlanır** (CreatePlan/ReOptimize request DTO + validator + Swagger), aksi hâlde suite yeni yolu hiç koşamaz. Bağlama F0'da yapılır, F3'e ertelenmez ve yetki/feature-flag ile korunur; kapalıyken istek sessizce düşürülmez, 400 döner.
- **Kısıt mantığının Wall-Builder içinde yeniden uygulanması.** Yedi kapının tamamı `PlacementValidator` üzerinden çağrılır; kopyalanan tek satır kural kabul edilmez.
- **`verification/checks.ts` kurallarının gevşetilmesi.** Yeni algoritma bir check'i kırıyorsa hata algoritmadadır. Tek istisna: RK-13 kapsamında `lifoZone`'un dinamik `zWall`'a uyarlanması — bu bir gevşetme değil, model düzeltmesidir; **yalnız WallBuilder sonuçlarına uygulanır**, greedy bölge hesabı değişmez ve `goldenCrossCheck` + `lifoZones.test.ts` ile kanıtlanır.
- **Kapı eşiklerinin CLI'dan override edilebilir yapılması.** README:98 kuralı korunur; fixture profili kod içinde sabittir.
- **TypeScript içinde motor uygulaması.** `fixtureClient` motoru taklit etmez; `CargoPilot.Engine.Bench` ucuna konuşur. Motorun ikinci bir implementasyonu hiçbir koşulda yazılmaz.
- **Frontend 3D sahnesinde değişiklik.** `lib/config/scene-config.ts` ve koordinat eşlemesi bu yol haritasının kapsamı dışındadır. Eksen aynalaması / gizli telafi dönüşümü (`scale.x=-1`, `rotation.y=Math.PI`, `length - z`) her koşulda yasaktır.
- **Asenkron/kuyruklu optimizasyon.** Senkron `Run` sınırı korunur; SC-42 (1000 kutu) yalnız üst sınır ölçümüdür, mimari değişiklik gerekçesi değildir.
- **F1'de geliştirici ergonomisi.** `--shard`, `--until-fail`, `--watch`, `manifest.json` ve otomatik baseline seçimi kritik yolda değildir; F4'e taşınmıştır.
- **Yeni üst düzey klasör / barrel export / toplu dosya taşıma** — test-UI tarafında mevcut sub-domain düzeni korunur; yalnız `fixtures/` alt klasörü açılır. Backend'de yalnız `CargoPilot.Engine.Bench` projesi eklenir.
- **Rulebook'un yeniden yapılandırılması.** F0-11…F0-13 (tanım) ve F3 kalibrasyon kararları dışında rulebook'a dokunulmaz; çelişki hâlinde `docs/COORDINATE_STANDARD.md` kazanır.