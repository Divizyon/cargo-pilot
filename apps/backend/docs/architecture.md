# CargoPilot Backend Mimari Rehberi

Bu dokuman, backend projesinin katmanli yapisini ve temel mimari kararlarini ozetler. Amac; ekip icinde tek bir referans nokta tanimlamak ve yeni gelistirmelerin ayni standartla yapilmasini saglamaktir.

> **Guncelleme (2026-08-04):** Dokumandaki "service-based, MediatR kullanilmaz" karari kod
> tabaniyla celisiyordu — kod uctan uca MediatR (Command/Query/Handler) kullaniyor. Dokuman
> kodun gercegine gore duzeltildi. Kurgusal `Cargo`/`TrackingNumber` ornekleri gercek
> entity'lerle degistirildi. Detay: `docs/context/kod-taramasi-2026-08.md`.

---

## 1) Mimari Yaklasim

Backend, Clean Architecture prensiplerine gore 4 katmana ayrilmistir:

| Katman | Proje | Sorumluluk |
|--------|-------|------------|
| Presentation | `CargoPilot.WebAPI` | HTTP giris noktasi, controller'lar, middleware, Swagger |
| Application | `CargoPilot.Application` | Use-case / feature servisleri, validator'lar, soyutlamalar |
| Domain | `CargoPilot.Domain` | Entity, value object, enum; is kurallari |
| Infrastructure | `CargoPilot.Infrastructure` | EF Core, DbContext, repository implementasyonlari |

### 1.1 Referans Yonu

Bagimlilik sadece ice dogru akar. Dis katmanlar icteki soyutlamalari referans alir; ic katman dis katmani bilmez.

```
WebAPI ──► Application ──► Domain
             ▲
Infrastructure ─┘
```

Kurallar:

- `Domain` hicbir katmana referans vermez.
- `Application` yalnizca `Domain`'e referans verir.
- `Infrastructure` `Application` ve `Domain`'e referans verir (Application'daki interface'leri implemente eder).
- `WebAPI` hem `Application`'i hem `Infrastructure`'i referans alir (yalnizca DI composition amaciyla).

Bu yon sayesinde Domain ve Application, framework/DB degisikliklerinden izole kalir.

---

## 2) Katman Icerikleri

### 2.1 Domain

- `Entities/` — `AppUser`, `Company`, `Item`, `Vehicle`, `LoadingPlan*` (Placement, ItemGroup, InputItem, UnplacedItem, Warning), `Integration`, `SyncLog`, `ErpUserMapping` vb. Tumu `BaseEntity`'den turer (audit + soft delete alanlari).
- `Enums/` — `FragilityType`, `AllowedRotations`, `LoadingType`, `SubscriptionType` vb.

Kurallar:
- Domain nesneleri framework, EF Core veya HTTP bilmez.
- Davranis entity uzerinde tutulur (anemic modelden kacinilir).

### 2.2 Application

- `Features/<Aggregate>/<UseCase>/` klasor standardi kullanilir.
- Her use-case bir **MediatR** Command/Query + Handler ciftidir (`IRequestHandler<TRequest, TResponse>`).
- Validator'lar ayni klasor altinda `<UseCase>CommandValidator.cs` olarak durur.
- Repository soyutlamalari `Common/Interfaces/` altinda yasar (`I*Repository`, aggregate-specific).
- Ortak modeller `Common/Models/` altinda (`Result<T>`, `Error`, `OptimizationInput/Result`).

Ornek klasor (gercek koddan):
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

- `Persistence/AppDbContext.cs` (25 DbSet; audit alanlari `SaveChanges` override'inda otomatik dolar)
- `Persistence/Repositories/<Entity>Repository.cs`
- `Persistence/Configurations/` — entity konfigurasyonlari + soft delete global query filter
- `Services/` — `OptimizationEngine` (yuk yerlestirme motoru), `ResendEmailService`, ERP connector'lari (`LogoErpConnector`, `NetsisErpConnector`)
- `Jobs/` — Hangfire job'lari (`ErpExportJob`, trial expiry, notification cleanup)
- EF Core + SQL Server saglayicisi kullanilir.

### 2.4 WebAPI

- Controller'lar ince tutulur; is mantigi Application katmaninda.
- Swagger yalnizca Development ortaminda aktiftir.
- Middleware zinciri `DependencyInjection.UsePresentation()` icinde kurulur.

---

## 3) Temel Mimari Kararlar

### 3.1 MediatR ile Use-case Yapisi

Her use-case bir MediatR request'idir: `<UseCase>Command`/`<UseCase>Query` + `<UseCase>CommandHandler` (`IRequestHandler<>`). Controller'lar is mantigi icermez; `IMediator.Send(...)` ile ilgili handler'i cagirir. Command/Query ayrimi ayri proje olarak degil, ayni proje icinde isimlendirme ile yapilir.

> Not: Dokumanin onceki surumu "service-based, MediatR kullanilmaz" diyordu; bu karar
> uygulamada terk edildi. Kod tabani ~150+ dosyada MediatR desenini kullaniyor.

### 3.2 Repository Pattern

Veri erisimi `Application/Common/Interfaces/` altindaki interface'ler uzerinden yapilir (17 aggregate-specific interface). Application katmani `DbContext`'i dogrudan bilmez.

- Interface: `IItemRepository`, `IVehicleRepository`, `ILoadingPlanRepository`, ... (Application)
- Implementasyon: `Persistence/Repositories/*Repository.cs` (Infrastructure, EF Core)

### 3.3 FluentValidation

Girdi dogrulama standardi olarak FluentValidation kullanilir.

- Paketler: `FluentValidation`, `FluentValidation.DependencyInjectionExtensions`
- `Application/DependencyInjection.cs` icinde `AddValidatorsFromAssembly(...)` ile assembly scanning yapilir.
- Validator'lar `<UseCase>CommandValidator.cs` olarak use-case klasorunde durur.
- Validation hatalari `Result<T>.Failure` uzerinden donulur; exception-for-control-flow kullanilmaz.

### 3.4 Result<T> ile Hata Akisi

Use-case'ler exception firlatmaz; sonuc `Result<T>` zarfinda donulur.

- Basari: `Result<T>.Success(value)`
- Hata: `Result<T>.Failure(Error)`
- Kod tarafinda try/catch ile akis kontrolu yapilmaz.

Not: Ortak API response envelope'u US-Story 8 kapsaminda olgunlastirilacaktir.

### 3.5 Composition Root (DI)

Her katman kendi `DependencyInjection.cs` dosyasini sunar; `Program.cs` yalnizca orkestrasyon yapar.

```csharp
builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: builder.Environment.IsDevelopment())
    .AddPresentation();
```

Kurallar:
- `Program.cs` concrete tip veya EF Core referansi icermez.
- Ortam bazli kararlar (`IsDevelopment`) `Program.cs`'de alinir; Infrastructure, Hosting soyutlamasina bagimli olmaz.
- Middleware zinciri `UsePresentation()` uzerinden kurulur.

### 3.6 ~~Development'ta Veritabansiz Calisma~~ (calismiyor — kullanmayin)

`UseInMemoryDatabase` bayragi konfigurasyonda mevcut ama **fiilen calismaz durumda**:
bayrak `true` iken `AppDbContext`/Hangfire kayitlari atlanir fakat SQL-backed repository'ler
yine de kayitli kalir — DI cozumlemesi calisma zamaninda patlar. Hicbir `InMemory*` repository
implementasyonu yazilmamistir. Lokal gelistirme icin `docs/setup/local-setup.md`'deki
Docker MSSQL akisi kullanilir.

Bu bolum ya bayragin tamamlanmasiyla ya da bayragin koddan temizlenmesiyle kapanacaktir
(karar bekliyor — bkz. `docs/context/kod-taramasi-2026-08.md` §3).

Production ve CI/CD'de connection string `ConnectionStrings__DefaultConnection` env var'i uzerinden verilir.

### 3.7 Configuration ve Secret

- Yapilandirma: `appsettings.json` + `appsettings.{Environment}.json`
- Development secret: User Secrets (planlanan)
- Prod/Staging secret: env var (`Section__SubSection__Key` formatinda)
- Detay: [environment-variables.md](./environment-variables.md)

---

## 4) Kod Standardi

- `.editorconfig` ile stil kurallari sabitlenmistir.
- Analyzer paketleri: `Microsoft.CodeAnalysis.NetAnalyzers`, `SonarAnalyzer.CSharp`.
- `ImplicitUsings` ve `Nullable` tum projelerde aciktir.
- Hedef framework: `net8.0` (bkz. `global.json`).

---

## 5) Yeni Use-case Eklerken Izlenecek Akis

1. `Application/Features/<Aggregate>/<UseCase>/` klasorunu ac.
2. `<UseCase>Command.cs` veya `<UseCase>Query.cs` yaz (`IRequest<Result<T>>` implemente eder).
3. `<UseCase>CommandValidator.cs` (FluentValidation) yaz.
4. `<UseCase>CommandHandler.cs` icinde is mantigini kur (`IRequestHandler<>`); `Result<T>` donur.
5. Gerekli ise `Application/Common/Interfaces/` altinda yeni repository interface'i tanimla.
6. Infrastructure'da karsilik gelen repository implementasyonunu yaz.
7. `WebAPI` tarafinda controller endpoint'ini ekle; yalnizca `IMediator.Send(...)` cagir ve sonucu map et.
8. DI kayitlari gerekiyorsa ilgili katmanin `DependencyInjection.cs` dosyasina ekle.

---

## 6) Yapilmayacaklar (Scope Disi)

Bu mimaride bilincli olarak tercih edilmeyenler:

- Domain event altyapisi (ilerideki story'de degerlendirilecek)
- CQRS'in proje duzeyinde ayrilmasi (command/query ayrimi ayni proje icinde, isimlendirme ile yapilir)
- Assembly-scanning framework'u olarak Scrutor (yalnizca FluentValidation icin assembly scan yapilir)
- Generic repository (repository'ler aggregate-specific tutulur)

---

## 7) Ilgili Dokumanlar

- [developer-setup.md](./developer-setup.md) — Gelistirici ortam kurulumu
- [environment-variables.md](./environment-variables.md) — Env var naming ve yapilandirma
- [user-story-tracker.md](./user-story-tracker.md) — Story bazli ilerleme takibi
