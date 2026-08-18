# 3D Bin Packing — Backend Geliştirme Faz Planı

**Son güncelleme:** 2026-08-04 · **Durum:** Arşiv

{% hint style="warning" %}
Tasarım arşivi — güncel implementasyonun birebir dokümantasyonu değildir. `feature/3D_Packing_Algorithm` branch'inde (2026-05-05) üretildi; güncel implementasyon tarafından geride bırakıldı.

> **Yönlendirme düzeltmesi (2026-08-15):** bu satır önce okuyucuyu `CargoPilot.Infrastructure/Services/OptimizationEngine.cs` yoluna gönderiyordu; o yol `caab495d` (2026-08-11) refactor'ünden beri **yoktur**. Güncel motor: `apps/backend/CargoPilot.Application/Common/Optimization/` — 7 dosya (`OptimizationEngine.cs`, `PlacementValidator.cs`, `BalanceScoring.cs`, `LifoPlacement.cs`, `ItemOrdering.cs`, `VolumeScoring.cs`, `PlacedBox.cs`). Dosyanın geri kalanı tarihsel kayıttır, değiştirilmedi.

**Bilinen farklar:**
- Koordinat ekseni adlandırması farklıdır. Güncel sözleşme: **X = width (genişlik), Y = height (yükseklik), Z = length (uzunluk)**; origin kutunun **origin'e en yakın köşesi** `(min x, min y, min z)`, araçta uzak yüzdeki (`z = 0`) sol-alt köşedir. Bağlayıcı tanım: `docs/COORDINATE_STANDARD.md`.
  *(2026-08-16: standardın eksen ve terim kısmı PR #997/#1004 ile koda uygulandı — `depth`/"derinlik" boyut terimi kaldırıldı, referans kapı `z = length`. Aynı düzeltme kardeş dosya `sistem-mimarisi.md`'ye #1007'de yapılmış, bu dosya atlanmıştı. Dosyanın kendisi tarihsel arşivdir; yalnız bu yönlendirme satırı güncellendi.)*
- MediatR atıfları hâlâ geçerlidir — güncel mimari: `apps/backend/docs/architecture.md`.
- `Packing/` klasörü ve `PackingEngine` sınıfı `test` branch'inde bulunmamaktadır.
- **Güncel yol:** motor bugün `apps/backend/CargoPilot.Application/Common/Optimization/OptimizationEngine.cs` altındadır (yukarıdaki `Infrastructure/Services/` yolu 2026-08 itibarıyla tarihsel kayıttır).

Algoritma çalışması yapılırken kavramsal referans olarak kullanılabilir; kod kaynağı olarak değil.
{% endhint %}

---

**Hedef:** "Optimize Et" komutu tetiklendiğinde EP tabanlı 3D Bin Packing algoritmasını çalıştırıp yerleşim sonucunu dönen, Clean Architecture uyumlu bir backend servisi.

**Mevcut proje yapısı:** `CargoPilot.Domain` / `CargoPilot.Application` / `CargoPilot.Infrastructure` / `CargoPilot.WebAPI`  
**Stack:** .NET 8, MediatR, FluentValidation, `Result<T>` pattern

---

## Faz 1 — Domain Modelleri ve Algoritma Kontratları

> **Amaç:** Algoritmanın çalışacağı saf domain kavramlarını ve servis arayüzlerini tanımla. Hiç DB bağımlılığı yok.

### 1.1 Domain Katmanı — Yeni Value Object'ler

**`CargoPilot.Domain/Packing/`** klasörü altında:

| Dosya | Sorumluluk |
|---|---|
| `ContainerSpec.cs` | `record ContainerSpec(decimal Length, decimal Width, decimal Height, decimal MaxWeight)` |
| `ItemSpec.cs` | `record ItemSpec(string Id, string Name, decimal Length, decimal Width, decimal Height, decimal Weight, bool IsStackable, decimal MaxWeightOnTop, int? LifoIndex)` |
| `PackingParameters.cs` | `record PackingParameters(bool LifoEnabled, decimal CgThresholdPercent = 15m)` |
| `ExtremePoint.cs` | `record ExtremePoint(decimal X, decimal Y, decimal Z)` |
| `Rotation.cs` | `record Rotation(decimal L, decimal W, decimal H)` — efektif boyutlar |
| `PlacedItem.cs` | `record PlacedItem(string ItemId, ExtremePoint Position, Rotation Rotation, decimal CurrentStackLoad)` |
| `PackingCandidate.cs` | `record PackingCandidate(ExtremePoint Ep, Rotation Rot, decimal DeltaX, decimal DeltaY, double Score, bool PassesCgConstraint)` |
| `PackingPlacement.cs` | Çıktı: `record PackingPlacement(string ItemId, decimal X, decimal Y, decimal Z, Rotation Rotation)` |
| `PackingWarning.cs` | `record PackingWarning(string ItemId, decimal DeltaX, decimal DeltaY, string Message)` |
| `UnplacedItemResult.cs` | `record UnplacedItemResult(string ItemId, string Reason)` |
| `PackingResult.cs` | Tüm çıktıyı kapsayan ana sonuç nesnesi (bkz. §1.2) |

### 1.2 PackingResult Yapısı

```csharp
public sealed record PackingResult(
    IReadOnlyList<PackingPlacement> Placements,
    decimal CgFinalX,
    decimal CgFinalY,
    decimal CgFinalZ,
    decimal CgDeviationX,   // yüzde
    decimal CgDeviationY,   // yüzde
    decimal TotalWeight,
    decimal FillRatePercent,
    IReadOnlyList<PackingWarning> Warnings,
    IReadOnlyList<UnplacedItemResult> UnplacedItems
);
```

### 1.3 Domain Servis Kontratı

**`CargoPilot.Domain/Packing/IPackingEngine.cs`**

```csharp
public interface IPackingEngine
{
    PackingResult Optimize(
        ContainerSpec container,
        IReadOnlyList<ItemSpec> items,
        PackingParameters parameters);
}
```

**Teslimatlar:**
- [ ] `CargoPilot.Domain/Packing/` klasörü ve tüm record/interface dosyaları
- [ ] Domain katmanında sıfır dış bağımlılık (sadece BCL)

---

## Faz 2 — EP Algoritması — Çekirdek Motor

> **Amaç:** `IPackingEngine` implementasyonunu tam algoritmaya sadık biçimde yaz. Infrastructure'a bağlı değil; unit test edilebilir.

Implementasyon klasörü: **`CargoPilot.Infrastructure/Packing/`**

### 2.1 Sıralama Katmanı (Katman A)

**`ItemSorter.cs`**

- LIFO kapalı: `V_i = l × w × h`, DESC sıralama
- LIFO açık: `lifo_index` DESC, `null` olanlar kuyruğun sonu, kendi aralarında hacim DESC
- Pure static metod; bağımlılık yok

### 2.2 Geometri Yardımcıları

**`GeometryHelper.cs`**

| Metod | Açıklama |
|---|---|
| `GetRotations(ItemSpec)` | 6 rotasyonu üret |
| `CheckBoundary(ep, rot, container)` | §5.1 konteyner sınırı |
| `CheckAabbNoOverlap(ep, rot, placed)` | §5.2 AABB çakışma testi, `ε = 1e-6` |
| `CheckGroundSupport(ep, rot, placed, container)` | §5.3 zemin desteği ≥ %80 |
| `CheckStackingRules(ep, rot, item, placed)` | §5.4 istif kontrolü |
| `ComputeRectIntersectionArea(...)` | Dikdörtgen kesişim alanı |

### 2.3 CG Hesaplayıcı

**`CgCalculator.cs`**

| Metod | Açıklama |
|---|---|
| `ComputeTempCg(...)` | §6.2 geçici CG ve δ_x, δ_y hesabı |
| `UpdateCg(...)` | §6.1 inkremental CG güncellemesi |

### 2.4 Maliyet Fonksiyonu

**`CostFunction.cs`**

- `GroundProximity(z, Hc)` → `1 − z/Hc`
- `SpaceQuality(epCountAfter)` → `1 − epCount/20`
- `LifoAlignment(xCandidate, lifoIndex, lifoMax, Lc)` → `1 − |x − x_ideal|/Lc`
- `ComputeScore(candidate, parameters, lifoMax, Hc, Lc)` → ağırlıklı toplam

### 2.5 EP Yöneticisi

**`ExtremePointManager.cs`**

- `GenerateNew(ep, rot)` → 3 yeni EP üretir
- `ApplyDominanceFilter(eps)` → dominance eleme (§4.3)
- `Prune(eps, maxCount = 30)` → liste 30'u geçerse düşük kalitelileri temizle

### 2.6 Ana Motor — PackingEngine

**`PackingEngine.cs : IPackingEngine`**

Pseudocode'u birebir uygula (§9 Ana Döngü):

```
1. ItemSorter ile sırala
2. EP = {(0,0,0)}, yerleşimler = [], CG = (Lc/2, Wc/2, 0), M = 0
3. Her P_i için:
   a. Fiziksel kontrolleri geç
   b. CG sapmasını hesapla → A_gecerli / A_tum
   c. Seçim: argmax(Score) veya fallback
   d. Yerleştir, CG güncelle, EP üret, dominance filtresi
4. Sonucu hesapla (doluluk, final CG sapması) → PackingResult
```

**Teslimatlar:**
- [ ] `GeometryHelper.cs` — 4 kontrol metodu
- [ ] `CgCalculator.cs` — inkremental ve geçici CG
- [ ] `CostFunction.cs` — 3 terim + ağırlık vektörü
- [ ] `ExtremePointManager.cs` — üretim + dominance + prune
- [ ] `ItemSorter.cs` — FFD + LIFO sıralama
- [ ] `PackingEngine.cs` — tam ana döngü

---

## Faz 3 — Mock Data ve Girdi Doğrulama

> **Amaç:** DB bağımlılığı olmadan algoritmayı test edecek kapsamlı mock veri ve istek doğrulama.

### 3.1 Mock Data Sağlayıcı

**`CargoPilot.Infrastructure/Packing/MockPackingDataProvider.cs`**

```csharp
public static class MockPackingDataProvider
{
    public static ContainerSpec GetContainer()     // 20-ft konteyner benzeri
    public static IReadOnlyList<ItemSpec> GetItems() // 15 farklı ürün
    public static PackingParameters GetParameters()
}
```

**Mock ürün seti — kapsam:**
- Hacimce büyük palettler (stackable=true, max_stack yüksek)
- Orta boy kutular (çeşitli boyut oranları)
- Küçük paketler (LIFO index'li — 1,2,3)
- Kırılgan ürün (stackable=false)
- Konteynere sığmayan aşırı büyük ürün (yerleşmeyen listesi testi)
- Farklı ağırlıklarda ürünler (CG dengesini zorlayan)

### 3.2 JSON Mock Data Dosyası

**`CargoPilot.WebAPI/MockData/bin_packing_mock.json`**

Dışarıdan `POST /api/packing/optimize` çağrısını test etmek için kullanılabilir hazır JSON body.

### 3.3 Girdi Doğrulama

**`CargoPilot.Application/Features/Packing/OptimizePacking/OptimizePackingCommandValidator.cs`**

- Tüm boyutlar > 0
- `MaxWeightCapacity` > 0
- LIFO index'leri unique (çakışma → validation error)
- LIFO açık ama hiç `lifoIndex` yok → warning üret, devam et

**Teslimatlar:**
- [ ] `MockPackingDataProvider.cs` — en az 15 ürün, tüm kısıt senaryoları kapsanmış
- [ ] `bin_packing_mock.json` — doğrudan Swagger'dan test edilebilir
- [ ] `OptimizePackingCommandValidator.cs` — 4 kural

---

## Faz 4 — Application Katmanı — Command/Query

> **Amaç:** MediatR command, handler ve DTO'larını projenin mevcut CQRS pattern'ine uygun yaz.

Klasör: **`CargoPilot.Application/Features/Packing/`**

### 4.1 Command ve DTO'lar

**`OptimizePackingCommand.cs`**

```csharp
public sealed record OptimizePackingCommand(
    ContainerSpecDto Container,
    IReadOnlyList<ItemSpecDto> Items,
    PackingParametersDto Parameters
) : IRequest<Result<PackingResultDto>>;
```

**DTO Dosyaları:**
- `ContainerSpecDto.cs` — uzunluk, genislik, yukseklik, maxYuk, aracTipi
- `ItemSpecDto.cs` — id, uzunluk, genislik, yukseklik, agirlik, istiflenebilir, maxIstif, lifoIndex
- `PackingParametersDto.cs` — lifoAktif, cgEsik
- `PackingResultDto.cs` — yerleşimler, cgFinal, toplamAgirlik, dolulukOrani, uyarilar, yerlesmeyen

### 4.2 Mock Command

**`OptimizePackingWithMockDataCommand.cs`**

```csharp
public sealed record OptimizePackingWithMockDataCommand : IRequest<Result<PackingResultDto>>;
```

Handler: `MockPackingDataProvider`'dan veri alır → `IPackingEngine` çalıştırır → sonucu maplar.

### 4.3 Real Command Handler

**`OptimizePackingCommandHandler.cs`**

- Validator çağırır
- DTO → Domain model map
- `IPackingEngine.Optimize(...)` çağırır
- Domain sonuç → DTO map
- `Result<PackingResultDto>.Success(...)` döner

**Teslimatlar:**
- [ ] `OptimizePackingCommand.cs` + tüm DTO'lar
- [ ] `OptimizePackingWithMockDataCommand.cs` + handler
- [ ] `OptimizePackingCommandHandler.cs`
- [ ] `OptimizePackingCommandValidator.cs`

---

## Faz 5 — WebAPI Katmanı — Controller ve Kayıt

> **Amaç:** HTTP endpoint'leri aç, DI kayıtlarını tamamla.

### 5.1 Controller

**`CargoPilot.WebAPI/Controllers/PackingController.cs`**

```
POST /api/packing/optimize
    Body: OptimizePackingCommand
    → PackingResultDto

POST /api/packing/optimize/mock
    Body: (yok)
    → PackingResultDto   ← algoritma doğrulaması için hızlı test endpoint'i
```

- `[Authorize]` attribute (mevcut JWT akışı)
- `HandleResult<PackingResultDto>(result)` ile standart yanıt
- Swagger XML comment'leri

### 5.2 DI Kayıtları

**`CargoPilot.Infrastructure/DependencyInjection.cs`** içine:

```csharp
services.AddSingleton<IPackingEngine, PackingEngine>();
```

**`CargoPilot.Application/DependencyInjection.cs`** — MediatR zaten tüm assembly'yi tarar; ekstra kayıt gerekmez.

### 5.3 Performans

- `PackingEngine` → `Singleton` (durumsuz, thread-safe)
- `Stopwatch` ile süre ölçümü → response header veya log

**Teslimatlar:**
- [ ] `PackingController.cs` — 2 endpoint
- [ ] DI kayıtları güncellendi
- [ ] Swagger'dan her iki endpoint test edilebilir

---

## Faz 6 — Test Senaryoları ve Doğrulama

> **Amaç:** Dokümanın §10.3 test senaryolarını karşıla; edge case'leri kapat.

### 6.1 Unit Test Senaryoları

**Dosya:** `CargoPilot.Tests/Packing/PackingEngineTests.cs`

| No | Senaryo | Beklenen |
|---|---|---|
| T1 | Tek ürün — konteynere tam sığan | x=0, y=0, z=0 |
| T2 | İki ürün yan yana | Çakışma yok |
| T3 | stackable=false ürün | Üstüne ürün konulmamalı |
| T4 | CG fallback | Uyarı üretilmeli |
| T5 | LIFO sırası | lifo_index=1 → en düşük x |
| T6 | Konteynere sığmayan ürün | yerlesmeyen listesinde |
| T7 | Doluluk oranı | 10 birim / 100 birim = %10 |
| T8 | LIFO + CG çakışması | CG öncelikli, uyarı üretilir |
| T9 | Dominance filtresi | EP listesi 30'u aşmamalı |
| T10 | Zemin desteği | %80 altı → yerleştirilmemeli |

### 6.2 Integration Test

`POST /api/packing/optimize/mock` → HTTP 200, `placements` boş değil, `fillRatePercent > 0`

### 6.3 Performans Doğrulaması

- n=50 → < 500ms
- n=100 → < 2s
- `Stopwatch` log çıktısı

**Teslimatlar:**
- [ ] `PackingEngineTests.cs` — 10 unit test
- [ ] Integration smoke test
- [ ] Performans log kaydı

---

## Özet Tablo

| Faz | Katman | Ana Çıktı | Bağımlılık |
|---|---|---|---|
| 1 | Domain | Value object'ler, `IPackingEngine` kontratı | Yok |
| 2 | Infrastructure | EP motoru — tam algoritma | Faz 1 |
| 3 | Infrastructure + WebAPI | Mock data, JSON dosyası, validator | Faz 1-2 |
| 4 | Application | MediatR command/handler, DTO'lar | Faz 1-3 |
| 5 | WebAPI | Controller, DI kaydı | Faz 1-4 |
| 6 | Tests | Unit + integration + performans | Faz 1-5 |

---

## Dosya Ağacı — Geliştirme Sonrası Hedef Yapı

```
CargoPilot.Domain/
└── Packing/
    ├── ContainerSpec.cs
    ├── ItemSpec.cs
    ├── PackingParameters.cs
    ├── ExtremePoint.cs
    ├── Rotation.cs
    ├── PlacedItem.cs
    ├── PackingCandidate.cs
    ├── PackingPlacement.cs
    ├── PackingWarning.cs
    ├── UnplacedItemResult.cs
    ├── PackingResult.cs
    └── IPackingEngine.cs

CargoPilot.Infrastructure/
└── Packing/
    ├── PackingEngine.cs
    ├── ItemSorter.cs
    ├── GeometryHelper.cs
    ├── CgCalculator.cs
    ├── CostFunction.cs
    ├── ExtremePointManager.cs
    └── MockPackingDataProvider.cs

CargoPilot.Application/
└── Features/Packing/
    ├── OptimizePacking/
    │   ├── OptimizePackingCommand.cs
    │   ├── OptimizePackingCommandHandler.cs
    │   ├── OptimizePackingCommandValidator.cs
    │   └── OptimizePackingWithMockDataCommand.cs
    └── DTOs/
        ├── ContainerSpecDto.cs
        ├── ItemSpecDto.cs
        ├── PackingParametersDto.cs
        ├── PlacementDto.cs
        ├── CgFinalDto.cs
        ├── PackingWarningDto.cs
        ├── UnplacedItemDto.cs
        └── PackingResultDto.cs

CargoPilot.WebAPI/
├── Controllers/
│   └── PackingController.cs
└── MockData/
    └── bin_packing_mock.json
```

---

## Geliştirme Notları

**Koordinat sistemi:** Doküman metreyle çalışır. `Item` entity'si mevcut durumda milimetre saklar. Mock data ve DTO'lar **metre** cinsinden olacak; gerekirse `InternalLength / 1000` dönüşümü API katmanında yapılır.

**`PackingEngine` durumsuz:** Her `Optimize` çağrısı kendi lokal state'ini taşır; Singleton güvenli.

**Epsilon:** Tüm geometrik karşılaştırmalarda `const double Epsilon = 1e-6` kullanılır.

**Fallback uyarı kodu:** `"PACKING_CG_FALLBACK"`
