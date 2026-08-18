# ADR-0005 — Modül Bayraklarının API'ye ve Arayüze Açılmaması

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-11 *(karar tarihi; ADR 2026-08-17'de geriye dönük yazıldı)*
- **Kapsam:** ALG-01…ALG-07 · PR #935 (`caab495d`) · **İlgili:** ADR-0002
- **Etkilediği kod:** `CargoPilot.Application/Common/Models/OptimizationInput.cs`,
  `.../Features/Plans/CreatePlan/`, `.../Features/Plans/ReOptimizePlan/`

> **Geriye dönük kayıt.** Karar 2026-08-11'de motorun modülerleştirilmesiyle birlikte alındı;
> bu ADR sonradan, kodun üzerinden doğrulanarak yazıldı.

## Bağlam

ADR-0002 ile motor modüllere bölününce, modülleri tek tek açıp kapatan dört `bool` bayrak
ortaya çıktı (`OptimizationInput.cs:52-56`):

```csharp
public sealed record OptimizationModules(
    bool UseVolume, bool UseWeightBalance, bool UseLifo, bool UseContamination)
```

Bayraklar motorun içinde gerçekten kullanılıyor: `OptimizationEngine.cs:17-19` bunları sıcak
döngüden önce çözüp yerel `bool`lere okuyor, `ComputeScore` hangi terimin toplanacağını bu
bayraklarla belirliyor, ikinci geçiş `OptimizationEngine.cs:202-207`'de `useWeightBalance` ile
koşullu.

Yani mekanizma hazır. Doğal beklenti, bunu bir API alanı ve arayüzde dört onay kutusu olarak
kullanıcıya açmaktır — "hacim terimini kapat", "kontaminasyon filtresini atla" gibi. Bu ADR
bunun **neden yapılmadığını** kayıt altına alır.

## Karar

### 1. Bayraklar hiçbir API sözleşmesine bağlanmaz

`OptimizationModules` hiçbir request DTO'sunda, komutta, validator'da veya Swagger şemasında
görünmez. Kaynak kod bunu tipin kendi XML dokümantasyonunda yazılı hale getirir
(`OptimizationInput.cs:46-50`):

> *"Bilinçli olarak dışarıya kapalıdır: skor katsayıları yalnızca mevcut üç kriter için kalibre
> edilmiştir, dört bayrağın ürettiği on altı kombinasyonun çoğu kalibre edilmemiştir. Bu yüzden
> hiçbir API sözleşmesine (request DTO, komut, validator, Swagger şeması) bağlanmaz; yalnızca
> motorun içinden ve testlerden kullanılır."*

Gerekçe:

- **4 bayrak = 16 kombinasyon.** Skor katsayıları (`GravityCoefficient = 1_000_000`,
  `LengthCoefficient = 1_000`, `WeightBalanceCoefficient = 900_000`, `VolumeFirstCoefficient = 500`,
  `ZoneOverflowPenaltyPerCm = 2_000`) yalnızca mevcut **üç** kriterin ürettiği üç kombinasyon
  için kalibre edildi. Kalan 13 kombinasyonun hiçbiri ölçülmedi.
- Kalibre edilmemiş bir kombinasyon derleme hatası ya da çalışma zamanı hatası vermez —
  **anlamsız ama geçerli görünen bir plan üretir.** Operatör bunu ancak sahada fark eder.
- Katsayıların büyüklük farkı (1 000 000 ile 500 arasında 2 000× fark) terimlerin birbirini
  bastırma sırasına dayanır. Bir terimi kapatmak, kalanların göreli ağırlığını kalibre edilmemiş
  bir orana taşır; bu, ADR-0003'te ölçülen "500× zayıf terim" sorununun aynısını başka bir yerde
  üretir.

Sonuçları:

- Bayraklar `internal` erişimle sınırlı: `FromCriteria` ve `Resolve` fonksiyonları
  (`OptimizationInput.cs:64,72`) `internal static`. Testler bunlara `InternalsVisibleTo`
  üzerinden erişiyor (`AssemblyInfo.cs:8`).
- Kullanıcıya görünen tek kaldıraç `LoadingPlanOptimizationCriteria` enum'ıdır (VolumeFirst /
  WeightBalance / Lifo) — yani kalibre edilmiş üç kombinasyon.

### 2. Komut işleyicileri bayrak vermez; varsayılan kriterden türetilir

Her iki üretim çağrı yolu bayrağı açıkça `null` geçer:

- `CreatePlanCommandHandler.cs:259` → `Modules: null,`
- `ReOptimizePlanCommandHandler.cs:184` → `Modules: null,`

Motor bunu `OptimizationModules.Resolve(input)` ile çözer (`OptimizationEngine.cs:17`);
`Modules` null olduğunda `FromCriteria(input.Criteria)` devreye girer
(`OptimizationInput.cs:64-69`) ve türetme, kodun daha önce hangi modülü hangi koşulda
çalıştırdığının birebir aynısıdır:

| Bayrak | Türetme | Karşılığı |
|---|---|---|
| `UseVolume` | `criteria != WeightBalance` | hacim terimleri WeightBalance dışında |
| `UseWeightBalance` | `criteria != Lifo` | denge katsayısı Lifo dışında |
| `UseLifo` | `criteria == Lifo` | bölge hesabı yalnızca Lifo'da |
| `UseContamination` | `true` | kontaminasyon filtresi her zaman |

Gerekçe:

- Modülerleştirme bir **davranış değişikliği değildi**; bayrak mekanizmasının eklenmesi üretim
  planlarını değiştirmemeliydi. `Modules: null` bunu garanti eder.
- Bu, ADR-0002'nin 16 snapshot testinin bölme boyunca yeşil kalabilmesinin de ön koşuluydu.

Sonuçları:

- **Üretim davranışı değişmedi.** Bayraklar kodda mevcut olduğu hâlde üretimde hiçbir zaman
  varsayılandan farklı bir değer almadı.
- Mekanizma testlerde kullanılıyor ve orada değerini kanıtlıyor:
  `ModulBayraklariTests.AcikBayraklar_VarsayilanTuretmeyle_AyniPlaniUretir` türetmenin doğruluğunu,
  `DengeKapali_WeightBalanceKriterinde_DahaDengesizPlanUretir` ve
  `LifoKapali_GrupluSenaryoda_BolgeAyrimiUygulanmaz` ise modüllerin gerçekten etkili olduğunu
  gösteriyor. Bayrakları test dışında kullanmadan bu üç iddia doğrulanamazdı.
- Bayrak alanı `OptimizationInput` üzerinde durduğu için, açılmasına karar verilirse tek bir
  DTO alanı yeterlidir. Karar geri alınabilir; şu an bilinçli olarak alınmamıştır.

## Açılmasının ön koşulları

Bu karar sonsuza kadar geçerli değildir. Bayrakların dışa açılması için, yeni bir ADR ile:

1. Açılacak **her kombinasyon** için katsayı kalibrasyonu yapılmış ve ölçümü kayıt altına
   alınmış olmalı (kalan 13 kombinasyonun tamamı değil, yalnızca açılacak olanlar).
2. Her açılan kombinasyon için en az bir golden-master snapshot'ı bulunmalı — aksi hâlde
   kombinasyonun davranışı hiçbir yerde kilitli olmaz.
3. Kullanıcıya kombinasyonun ne yaptığı anlatılabilir olmalı. "Denge modülünü kapat" bir
   operasyon kullanıcısı için anlamlı bir cümle değildir; kalibre edilmiş bir **kriter adı**
   anlamlıdır. Yeni bir kombinasyon gerekiyorsa doğru yol, bayrak açmak değil,
   `LoadingPlanOptimizationCriteria`'ya kalibre edilmiş yeni bir üye eklemektir.

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| **Dört bayrağı request DTO'suna ekleyip arayüzde onay kutusu yapmak** | 16 kombinasyonun 13'ü kalibre edilmemiş. Kalibre edilmemiş kombinasyon hata vermez, **sessizce anlamsız plan üretir**; operatör bunu ancak sahada fark eder. Ayrıca üretimde her kombinasyonun destek yükünü doğurur. |
| **Yalnızca `UseContamination`'ı açmak** (görece bağımsız görünen tek bayrak) | Kontaminasyon filtresi skor terimi değil, ürün eleme filtresidir ve motorun içinden değil komut işleyicilerinden çağrılıyor (`CreatePlanCommandHandler.cs:162`, `ReOptimizePlanCommandHandler.cs:93`). Kapatılması `stackGroup` / `incompatibleGroups` ile tanımlanan uyumsuz yük ayrımını devre dışı bırakır (`ContaminationFilter.cs:6-11`); bu bir optimizasyon tercihi değil, yük güvenliği kısıtıdır. |
| **Bayrakları hiç eklememek, modülleri `criteria` üzerinden koşullamak** | Kod bugün bunu zaten yapıyor (`FromCriteria`), ama bayrak katmanı olmadan `ModulBayraklariTests`'in üç testi yazılamazdı; modüllerin gerçekten ayrılabildiği ve türetmenin bugünkü davranışa eşit olduğu doğrulanamazdı. Bayrak, **test edilebilirlik** için var. |
| **Bayrakları feature-flag altında yalnızca test ortamında açmak** | Ortama göre farklı plan üreten bir motor demektir; test ortamında doğrulanan plan üretimde farklı çıkabilirdi. Motorun determinizm sözleşmesiyle (`DeterminizmTests`) çelişir. |

## Açık konular

- `UseContamination` bayrağı bugün hiçbir kod yolunda `false` olmuyor; `FromCriteria` onu
  koşulsuz `true` döndürüyor. Bayrak, ileride bir muafiyet ihtiyacı doğarsa diye duruyor —
  bugün ölü kaldıraç.
- Kalibre edilmemiş 13 kombinasyonun hiçbirinin **ne ürettiği ölçülmedi**. "Anlamsız plan
  üretebilir" iddiası katsayı yapısından türetilen bir çıkarımdır, ölçüm değildir.
- Bayrakların testlerde kullanımı `internal` görünürlüğe ve `InternalsVisibleTo`'ya bağlıdır.
  Motor ileride ayrı bir derlemeye taşınırsa (ADR-0002'de elenen alternatif) bu erişim yolu
  yeniden düşünülmelidir.
