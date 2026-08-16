# CargoPilot Backend Mimari Rehberi

**Son güncelleme:** 2026-08-15 · **Durum:** Aktif

Bu doküman, backend projesinin katmanlı yapısını ve temel mimari kararlarını özetler. Amaç; ekip içinde tek bir referans nokta tanımlamak ve yeni geliştirmelerin aynı standartla yapılmasını sağlamaktır.

> **Güncelleme (2026-08-04):** Dokümandaki "service-based, MediatR kullanılmaz" kararı kod
> tabanıyla çelişiyordu — kod uçtan uca MediatR (Command/Query/Handler) kullanıyor. Doküman
> kodun gerçeğine göre düzeltildi. Kurgusal `Cargo`/`TrackingNumber` örnekleri gerçek
> entity'lerle değiştirildi. Detay: `docs/context/kod-taramasi-2026-08.md`.

---

## 1) Mimari Yaklaşım

Backend, Clean Architecture prensiplerine göre 4 katmana ayrılmıştır:

| Katman | Proje | Sorumluluk |
|--------|-------|------------|
| Presentation | `CargoPilot.WebAPI` | HTTP giriş noktası, controller'lar, middleware, Swagger |
| Application | `CargoPilot.Application` | Use-case / feature servisleri, validator'lar, soyutlamalar |
| Domain | `CargoPilot.Domain` | Entity, value object, enum; iş kuralları |
| Infrastructure | `CargoPilot.Infrastructure` | EF Core, DbContext, repository implementasyonları |

### 1.1 Referans Yönü

Bağımlılık sadece içe doğru akar. Dış katmanlar içteki soyutlamaları referans alır; iç katman dış katmanı bilmez.

```
WebAPI ──► Application ──► Domain
             ▲
Infrastructure ─┘
```

Kurallar:

- `Domain` hiçbir katmana referans vermez.
- `Application` yalnızca `Domain`'e referans verir.
- `Infrastructure` `Application` ve `Domain`'e referans verir (Application'daki interface'leri implemente eder).
- `WebAPI` hem `Application`'i hem `Infrastructure`'i referans alır (yalnızca DI composition amacıyla).

Bu yön sayesinde Domain ve Application, framework/DB değişikliklerinden izole kalır.

---

## 2) Katman İçerikleri

### 2.1 Domain

- `Entities/` — `AppUser`, `Company`, `Item`, `Vehicle`, `LoadingPlan*` (Placement, ItemGroup, InputItem, UnplacedItem, Warning), `Integration`, `SyncLog`, `ErpUserMapping` vb. Tümü `BaseEntity`'den türer (audit + soft delete alanları).
- `Enums/` — `FragilityType`, `AllowedRotations`, `LoadingType`, `SubscriptionType` vb.

Kurallar:
- Domain nesneleri framework, EF Core veya HTTP bilmez.
- Davranış entity üzerinde tutulur (anemic modelden kaçınılır).

### 2.2 Application

- `Features/<Aggregate>/<UseCase>/` klasör standardı kullanılır.
- Her use-case bir **MediatR** Command/Query + Handler çiftidir (`IRequestHandler<TRequest, TResponse>`).
- Validator'lar aynı klasör altında `<UseCase>CommandValidator.cs` olarak durur.
- Repository soyutlamaları `Common/Interfaces/` altında yaşar (`I*Repository`, aggregate-specific).
- Ortak modeller `Common/Models/` altında (`Result<T>`, `Error`, `OptimizationInput/Result`).
- **Yük yerleştirme motoru** `Common/Optimization/` altındadır — **7 dosya**: `OptimizationEngine.cs`,
  `PlacementValidator.cs`, `BalanceScoring.cs`, `LifoPlacement.cs`, `ItemOrdering.cs`,
  `VolumeScoring.cs`, `PlacedBox.cs`. `caab495d` (2026-08-11) ile Infrastructure katmanından
  buraya taşındı ve tek dosyadan 7 dosyaya bölündü.
  *Ölçüm 2026-08-15 (ikinci ölçüm), `dev` @ `96e9fd8b`:
  `wc -l apps/backend/CargoPilot.Application/Common/Optimization/*.cs` → toplam **1036 satır**
  (BalanceScoring 220 · ItemOrdering 71 · LifoPlacement 118 · OptimizationEngine 268 ·
  PlacedBox 17 · PlacementValidator 314 · VolumeScoring 28). Aynı gün erken saatte ölçülen
  915 satır değeri, OPT-01 (#989) ve OPT-02 (#990) `dev`'e alınmadan öncesine aitti ve artık
  bayattır. Satır sayısı yeniden ölçülmeden alıntılanmamalıdır.*
- **LIFO boşaltma bölgesi kısıtı** (`LifoPlacement.cs`) PR **#990** ile **iki kademeli sert kısıt**
  oldu: motor önce bölge içindeki geçerli adaylar arasından seçer
  (`OptimizationEngine.cs:131` → `LifoPlacement.IsInsideZone`), bölge içinde hiç aday yoksa
  cezalı skorlamaya düşer (yedek kademe, `OptimizationEngine.cs:264` → `ZonePenalty`).
  Ceza katsayısı **2 000'de bırakıldı** (`LifoPlacement.cs:30`) ama artık yalnızca yedek
  kademedeki adayları kendi aralarında sıralar — "bölge ihlali cezalandırılır" tarifi
  **geçersizdir**, bölge içi aday varken ihlal hiç seçilemez. Bölge haritası PR **#997** ile
  ters çevrildi: referans kapı `z = length`, ilk inecek grup kapıya en yakın bölgeyi alır
  (`LifoPlacement.cs:82`). Ayrıntı ve ölçümler: `docs/context/kod-taramasi-2026-08.md` §4.1.
- **Denge takası destek doğrulaması** PR **#989** ile eklendi: `BalanceScoring` greedy-swap'i
  artık takas edilen her iki kutu için `PlacementValidator.ViolatesLoadAbove` çağırıyor
  (`BalanceScoring.cs:182-183`) ve takas sonrası eski üst yüzeylerdeki desteği yeniden
  denetliyor. Önceki hâlde takas yalnız aşağı bakan kısıtları kontrol ediyordu.

Örnek klasör (gerçek koddan):
```
Features/
  Plans/
    CreatePlan/
      CreatePlanCommand.cs
      CreatePlanCommandHandler.cs
      CreatePlanCommandValidator.cs
      CreatePlanItemRequest.cs
```

### 2.3 Infrastructure

- `Persistence/AppDbContext.cs` (25 DbSet; audit alanları `SaveChanges` override'inda otomatik dolar)
- `Persistence/Repositories/<Entity>Repository.cs`
- `Persistence/Configurations/` — entity konfigürasyonları + soft delete global query filter
- `Services/` — `ResendEmailService`, ERP connector'ları (`LogoErpConnector`, `NetsisErpConnector`)
  - ⚠️ Yük yerleştirme motoru **artık burada değil**: `caab495d` (2026-08-11) ile Application katmanına taşındı → `CargoPilot.Application/Common/Optimization/`, 7 dosya. Bkz. §2.2.
- `Jobs/` — Hangfire job'ları (`ErpExportJob`, trial expiry, notification cleanup)
- EF Core + SQL Server sağlayıcısı kullanılır.

### 2.4 WebAPI

- Controller'lar ince tutulur; iş mantığı Application katmanında.
- Swagger yalnızca Development ortamında aktiftir.
- Middleware zinciri `DependencyInjection.UsePresentation()` içinde kurulur.

---

## 3) Temel Mimari Kararlar

### 3.1 MediatR ile Use-case Yapısı

Her use-case bir MediatR request'idir: `<UseCase>Command`/`<UseCase>Query` + `<UseCase>CommandHandler` (`IRequestHandler<>`). Controller'lar iş mantığı içermez; `IMediator.Send(...)` ile ilgili handler'ı çağırır. Command/Query ayrımı ayrı proje olarak değil, aynı proje içinde isimlendirme ile yapılır.

> Not: Dokümanın önceki sürümü "service-based, MediatR kullanılmaz" diyordu; bu karar
> uygulamada terk edildi. Kod tabanı ~150+ dosyada MediatR desenini kullanıyor.

### 3.2 Repository Pattern

Veri erişimi `Application/Common/Interfaces/` altındaki interface'ler üzerinden yapılır (17 aggregate-specific interface). Application katmanı `DbContext`'i doğrudan bilmez.

- Interface: `IItemRepository`, `IVehicleRepository`, `ILoadingPlanRepository`, ... (Application)
- Implementasyon: `Persistence/Repositories/*Repository.cs` (Infrastructure, EF Core)

### 3.3 FluentValidation

Girdi doğrulama standardı olarak FluentValidation kullanılır.

- Paketler: `FluentValidation`, `FluentValidation.DependencyInjectionExtensions`
- `Application/DependencyInjection.cs` içinde `AddValidatorsFromAssembly(...)` ile assembly scanning yapılır.
- Validator'lar `<UseCase>CommandValidator.cs` olarak use-case klasöründe durur.
- Validation hataları `Result<T>.Failure` üzerinden dönülür; exception-for-control-flow kullanılmaz.

### 3.4 Result<T> ile Hata Akışı

Use-case'ler exception fırlatmaz; sonuç `Result<T>` zarfında dönülür.

- Başarı: `Result<T>.Success(value)`
- Hata: `Result<T>.Failure(Error)`
- Kod tarafında try/catch ile akış kontrolü yapılmaz.

Not: Ortak API response envelope'u US-Story 8 kapsamında olgunlaştırılacaktır.

### 3.5 Composition Root (DI)

Her katman kendi `DependencyInjection.cs` dosyasını sunar; `Program.cs` yalnızca orkestrasyon yapar.

```csharp
// Program.cs:23-28 (gerçek kod, 2026-08-15)
var useInMemory = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: useInMemory)
    .AddPresentation(builder.Configuration, useInMemoryRepository: useInMemory);
```

Kurallar:
- `Program.cs` concrete tip veya EF Core referansı içermez.
- Ortam bazlı kararlar `Program.cs`'de alınır; Infrastructure, Hosting soyutlamasına bağımlı olmaz.
- ⚠️ *2026-08-15 düzeltmesi:* örnek kod önce `useInMemoryRepository: builder.Environment.IsDevelopment()` yazıyordu. Gerçek kod bayrağı **`UseInMemoryDatabase` konfigürasyon anahtarından** okur ve varsayılanı **`false`**'tur (`Infrastructure/DependencyInjection.cs:28`). Ayrıca §3.6'da anlatıldığı gibi bu bayrak fiilen çalışmaz.
- Middleware zinciri `UsePresentation()` üzerinden kurulur.

### 3.6 ~~Development'ta Veritabansız Çalışma~~ (çalışmıyor — kullanmayın)

`UseInMemoryDatabase` bayrağı konfigürasyonda mevcut ama **fiilen çalışmaz durumda**:
bayrak `true` iken `AppDbContext`/Hangfire kayıtları atlanır fakat SQL-backed repository'ler
yine de kayıtlı kalır — DI çözümlemesi çalışma zamanında patlar. Hiçbir `InMemory*` repository
implementasyonu yazılmamıştır. Lokal geliştirme için `docs/setup/local-setup.md`'deki
Docker MSSQL akışı kullanılır.

Bu bölüm ya bayrağın tamamlanmasıyla ya da bayrağın koddan temizlenmesiyle kapanacaktır
(karar bekliyor — bkz. `docs/context/kod-taramasi-2026-08.md` §3).

Production ve CI/CD'de connection string `ConnectionStrings__DefaultConnection` env var'ı üzerinden verilir.

### 3.7 Configuration ve Secret

- Yapılandırma: `appsettings.json` + `appsettings.{Environment}.json`
- Development secret: User Secrets (planlanan)
- Prod/Staging secret: env var (`Section__SubSection__Key` formatında)
- Detay: [environment-variables.md](./environment-variables.md)

---

## 4) Kod Standardı

- `.editorconfig` ile stil kuralları sabitlenmiştir.
- Analyzer paketleri: `Microsoft.CodeAnalysis.NetAnalyzers`, `SonarAnalyzer.CSharp`.
- `ImplicitUsings` ve `Nullable` tüm projelerde açıktır.
- Hedef framework: `net8.0` (bkz. `global.json`).

---

## 5) Yeni Use-case Eklerken İzlenecek Akış

1. `Application/Features/<Aggregate>/<UseCase>/` klasörünü aç.
2. `<UseCase>Command.cs` veya `<UseCase>Query.cs` yaz (`IRequest<Result<T>>` implemente eder).
3. `<UseCase>CommandValidator.cs` (FluentValidation) yaz.
4. `<UseCase>CommandHandler.cs` içinde iş mantığını kur (`IRequestHandler<>`); `Result<T>` döner.
5. Gerekli ise `Application/Common/Interfaces/` altında yeni repository interface'i tanımla.
6. Infrastructure'da karşılık gelen repository implementasyonunu yaz.
7. `WebAPI` tarafında controller endpoint'ini ekle; yalnızca `IMediator.Send(...)` çağır ve sonucu map et.
8. DI kayıtları gerekiyorsa ilgili katmanın `DependencyInjection.cs` dosyasına ekle.

---

## 6) Yapılmayacaklar (Scope Dışı)

Bu mimaride bilinçli olarak tercih edilmeyenler:

- Domain event altyapısı (ilerideki story'de değerlendirilecek)
- CQRS'in proje düzeyinde ayrılması (command/query ayrımı aynı proje içinde, isimlendirme ile yapılır)
- Assembly-scanning framework'ü olarak Scrutor (yalnızca FluentValidation için assembly scan yapılır)
- Generic repository (repository'ler aggregate-specific tutulur)

---

## 7) İlgili Dokümanlar

- [developer-setup.md](./developer-setup.md) — Geliştirici ortam kurulumu
- [environment-variables.md](./environment-variables.md) — Env var naming ve yapılandırma
- [user-story-tracker.md](./user-story-tracker.md) — Story bazlı ilerleme takibi
