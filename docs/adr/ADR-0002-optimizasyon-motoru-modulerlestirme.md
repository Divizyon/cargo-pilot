# ADR-0002 — Optimizasyon Motorunun Application Katmanına Taşınması ve Modüllere Bölünmesi

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-11 *(karar tarihi; ADR 2026-08-17'de geriye dönük yazıldı)*
- **Kapsam:** ALG-01…ALG-07 · PR #935 (`caab495d`) · **İlgili:** ADR-0005 (modül bayrakları)
- **Etkilediği kod:** `apps/backend/CargoPilot.Application/Common/Optimization/`

> **Geriye dönük kayıt.** Karar 2026-08-11'de alınıp uygulandı; bu ADR sonradan, kodun ve
> commit'in üzerinden doğrulanarak yazıldı. Aşağıdaki tüm sayılar `dev` @ `628c55d4` üzerinde
> yeniden ölçülmüştür.

## Bağlam

Yerleştirme motoru tek bir dosyaydı: `apps/backend/CargoPilot.Infrastructure/Services/OptimizationEngine.cs`,
**600 satır** (ölçüm: `git show caab495d^:apps/backend/CargoPilot.Infrastructure/Services/OptimizationEngine.cs | wc -l` → `600`).

İki sorun vardı:

1. **Yanlış katman.** Motor saf hesaplama yapıyor: girdi `OptimizationInput`, çıktı
   `OptimizationResult`; veritabanı, dosya sistemi, HTTP ya da başka bir dış kaynak kullanmıyor.
   Infrastructure katmanında durması Clean Architecture sözleşmesine aykırıydı
   (`apps/backend/docs/architecture.md`) ve motoru test etmek için Infrastructure'ın tüm
   bağımlılıklarını ayağa kaldırmayı gerektiriyordu.
2. **Tek dosyada altı ayrı sorumluluk.** Sıralama, yönelim üretimi, sert kısıt doğrulaması,
   hacim skorlaması, denge skorlaması ve LIFO bölge hesabı aynı dosyada iç içeydi. Bir kısıtı
   değiştirmek diğer beşini okumayı gerektiriyordu.

Karşı risk açıktı: motorun sıcak döngüsü kutu × aday nokta × yönelim üzerinde çalışır ve
500 kutuluk senaryoda saniyeler mertebesindedir. Bölme, doğruluğu veya hızı bozmamalıydı.

## Karar

### 1. Motor Infrastructure'dan Application'a taşındı

`CargoPilot.Infrastructure/Services/OptimizationEngine.cs` silindi (`git show --stat caab495d`:
`600 ---`), yerine `CargoPilot.Application/Common/Optimization/` klasörü açıldı.
DI kaydı da Application'a taşındı: `CargoPilot.Application/DependencyInjection.cs:24`
`services.AddScoped<IOptimizationEngine, OptimizationEngine>();`

Gerekçe:

- Motor saf fonksiyondur; Application katmanının tanımına birebir uyar.
- `IOptimizationEngine` (`Common/Interfaces/IOptimizationEngine.cs`) zaten Application'daydı;
  arayüz ve gerçekleştirim ayrı katmanlardaydı ama arada hiçbir altyapı bağımlılığı yoktu.
- Taşıma sayesinde motor, Infrastructure'a hiç referans vermeyen ayrı bir test projesinden
  (`CargoPilot.Engine.Tests`) doğrudan örneklenebiliyor.

Sonuçları:

- Sınıflar `internal` kaldı; test görünürlüğü `InternalsVisibleTo` ile verildi
  (`CargoPilot.Application/AssemblyInfo.cs:5,8`). Motor iç yapısı API yüzeyi değildir.
- Infrastructure artık motoru tanımıyor; motor değişikliği Infrastructure'ı yeniden derletmiyor.

### 2. Bölme biçimi arayüz/plugin değil, statik fonksiyonlardır

Motor 7 dosyaya bölündü. Bölünen parçaların hiçbiri arayüz, sınıf örneği ya da DI kaydı değildir;
hepsi `internal static class` içinde saf statik fonksiyonlardır ve motor bunları **doğrudan
adıyla** çağırır.

Bugünkü ölçüm (`wc -l`, `dev` @ `628c55d4`):

| Dosya | Sorumluluk | Satır (#935) | Satır (bugün) |
|---|---|---:|---:|
| `OptimizationEngine.cs` | greedy döngü, aday tarama, maliyet toplama | 240 | 300 |
| `PlacementValidator.cs` | sert kısıtlar, yönelim üretimi | 261 | 314 |
| `BalanceScoring.cs` | denge terimi + ikinci geçiş takas | 207 | 220 |
| `LifoPlacement.cs` | grup bölgeleri, LIFO dikey kuralı | 91 | 131 |
| `ItemOrdering.cs` | yerleştirme sırası | 71 | 71 |
| `VolumeScoring.cs` | hacim/derinlik/genişlik terimleri | 28 | 55 |
| `PlacedBox.cs` | yerleşim kaydı | 17 | 17 |
| **Toplam** | | **915** | **1 108** |

Gerekçe:

- **Sıcak döngüye tek bir dolaylı çağrı bile eklenmedi.** `OptimizationEngine.cs:128-134`'teki
  altı sert kısıt kontrolü doğrudan statik çağrıdır (`PlacementValidator.HasOverlap(...)`,
  `PlacementValidator.HasSupport(...)`, …). Arayüz kullanılsaydı bu satırların her biri
  kutu × aday nokta × yönelim başına bir sanal çağrı olurdu ve JIT satır içine alamazdı.
- Saf statik fonksiyon durumsuzdur; motorun determinizmi (`DeterminizmTests.cs`) çağrı sırasına
  bağlıdır, nesne ömrüne değil. Örnek tabanlı bir modül modeli buraya gizli durum sızdırabilirdi.
- Modülün açık/kapalı olması `bool` bayrakla çözülür (ADR-0005), plugin kaydıyla değil:
  `OptimizationEngine.cs:17-19` bayrakları döngüden **önce bir kez** çözüp yerel `bool`lere okur.

Sonuçları:

- **Bu kararın en çok saldırıya uğrayacak yeri burasıdır.** "Düzgün mimari" adına
  `IPlacementValidator`, `IScoringModule`, `IEnumerable<IConstraint>` gibi bir soyutlama
  önermek, bu ADR'nin bilinçli olarak reddettiği şeydir. Böyle bir öneri, ölçülmüş bir
  performans gerekçesiyle ve yeni bir ADR ile gelmelidir; bu ADR'ye dayanarak yapılamaz.
- Dosyalar birbirine `using` ile değil, aynı ad alanında doğrudan bağlıdır. Bu, dairesel
  bağımlılık riskini kaldırır ama modülleri ayrı derlenebilir birimler yapmaz — kasıtlı.
- Toplam satır sayısı 600'den 915'e çıktı (+%53). Artışın büyük kısmı XML dokümantasyonu ve
  kalibrasyon yorumlarıdır (ör. `OptimizationEngine.cs:241-268` maliyet fonksiyonu açıklaması).
  Satır sayısı bu kararda başarı ölçütü değildir.

### 3. Bölmeden önce 16 golden-master snapshot testi yazıldı

Bölme, davranışı önce kilitleyip sonra taşıma sırasıyla yapıldı. `CargoPilot.Engine.Tests`
projesi ve **16 snapshot** aynı değişiklikle repoya girdi
(ölçüm: `git show caab495d --stat -- 'apps/backend/CargoPilot.Engine.Tests/Snapshots/'` → 16 `.json`;
dağılım 6 VolumeFirst · 5 Lifo · 5 WeightBalance).

Gerekçe:

- Motor greedy'dir; en-iyi-aday seçimi `decimal` skorların karşılaştırmasına dayanır. Terimlerin
  toplama sırası değişirse yuvarlama farkı seçimi kaydırabilir. Bu, derleme hatası vermez —
  yalnızca plan sessizce değişir. Snapshot dışında bunu yakalayacak bir mekanizma yoktu.
- Snapshot'lar bayt düzeyinde karşılaştırıldığı için "aynı doluluk, farklı yerleşim" bile kırmızı verir.

Sonuçları:

- Toplama sırası artık sözleşmedir ve kodda yazılıdır: `OptimizationEngine.cs:246-255`
  "TOPLAMA SIRASI KRİTİKTİR — yerçekimi → uzunluk → denge → genişlik → bölge".
- Snapshot korpusu bu karardan sonraki her motor işinde kabul kapısı oldu; ADR-0003 ve ADR-0004
  aynı korpusa karşı ölçüldü ve ikisi de 0 kayma raporladı.

## Bölmenin doğrulanması

Bölme yedi adımda yapıldı ve **hiçbir adımda snapshot kaymadı**. Adımlar PR #935'te tek commit
olarak birleştirildiği için adım adım kanıt commit geçmişinde ayrı ayrı durmuyor; bugün
doğrulanabilir olan sonuç şudur:

- Bölmeyle birlikte giren 16 snapshot dosyasının hiçbiri sonradan yeniden üretilmedi.
  Bölmeden bu yana `Snapshots/` altına eklenen tek dosya
  `Lifo_UcGrup_AynalanmisYukleme_BolgeSirasiKorunur.json`'dır ve o da yeni bir senaryodur,
  mevcut bir snapshot'ın yenilenmesi değildir
  (`git log --diff-filter=A --name-only caab495d..HEAD -- .../Snapshots/`).
- Motorun tek genel yüzeyi `IOptimizationEngine.Run` olarak kaldı; imzası bölmeden bu yana
  değişmedi.

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| **Tek dosyada bırakmak** (600 satır) | Katman ihlali kendiliğinden çözülmezdi ve motoru Infrastructure bağımlılıkları olmadan test etmek mümkün olmazdı. Ayrıca ADR-0003/ADR-0004'ün dokunduğu iki farklı kısıt aynı dosyada olurdu; iki iş kalemi aynı hunk'ta çakışırdı. |
| **Arayüz + DI ile plugin mimarisi** (`IConstraint`, `IScoringModule` listeleri) | Sıcak döngüde kutu × aday nokta × yönelim başına sanal çağrı ekler; `OptimizationEngine.cs:128-134`'teki altı kontrol JIT tarafından satır içine alınamaz hale gelirdi. Modül açma/kapama zaten `bool` bayrakla çözülebiliyordu (ADR-0005) — soyutlamanın karşılığı yoktu. **Bu ADR'nin bilinçli reddi.** |
| **Ayrı `CargoPilot.Engine` derlemesi** | Katman sorununu çözerdi ama `internal` görünürlüğü kaybettirir, motorun iç tiplerini (`PlacedBox`, `PlacementValidator`) yayın yüzeyi yapardı. `InternalsVisibleTo` ile test erişimi aynı sonucu bedelsiz verdi. |
| **Önce bölüp sonra test yazmak** | Snapshot olmadan bölmenin davranışı koruyup korumadığı ölçülemezdi; greedy `decimal` skorlamada davranış kayması derleme hatası vermez, sessizce plan değiştirir. |

## Açık konular

- Klasör bölmeden sonra iki dosya daha aldı: `DoorSetFactory.cs` (37) ve `LoadingCorner.cs` (50),
  ikisi de PR #1013 koordinat standardı çalışmasından. Bunlar `public static` — motorun içi
  değil, kapı/başlangıç köşesi türetme yardımcılarıdır. Klasörün bugünkü toplamı
  **9 dosya / 1 195 satır**; bu ADR'nin kapsadığı 7 dosya **1 108 satırdır**.
- Bölme performans **ölçümü** ile doğrulanmadı; gerekçe analitiktir (sanal çağrı yok, satır içi
  alma korundu). Bugün `PerformansTabanCizgisiTests.cs` bir taban çizgisi tutuyor, ama bölme
  öncesi/sonrası karşılaştırması yapılmamıştır — **ölçülmedi**.
- `ContaminationFilter.cs` bölmeye dahil edilmedi; `Common/` altında kaldı. Motorun içinden
  değil, komut işleyicilerinden çağrılıyor
  (`CreatePlanCommandHandler.cs:162`, `ReOptimizePlanCommandHandler.cs:93`). Yeri tartışmaya açık.
