# CargoPilot Backend Mimari Rehberi

Bu dokuman, backend projesinin katmanli yapisini ve temel mimari kararlarini ozetler. Amac; ekip icinde tek bir referans nokta tanimlamak ve yeni gelistirmelerin ayni standartla yapilmasini saglamaktir.

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

- `Entities/Cargo.cs`
- `ValueObjects/TrackingNumber.cs`
- `Enums/CargoStatus.cs`

Kurallar:
- Domain nesneleri framework, EF Core veya HTTP bilmez.
- Davranis entity uzerinde tutulur (anemic modelden kacinilir).

### 2.2 Application

- `Features/<Aggregate>/<UseCase>/` klasor standardi kullanilir.
- Her use-case icin ayri servis (service-based) yaklasim; MediatR kullanilmaz.
- Validator'lar aynik klasor altinda `<UseCase>RequestValidator.cs` olarak durur.
- Repository soyutlamalari `Abstractions/Persistence/` altinda yasar.
- Ortak modeller `Common/Models/` altinda (`Result<T>`, `Error`).

Ornek klasor:
```
Features/
  Cargos/
    CreateCargo/
      CreateCargoRequest.cs
      CreateCargoUseCase.cs
      CreateCargoRequestValidator.cs
```

### 2.3 Infrastructure

- `Persistence/AppDbContext.cs`
- `Persistence/Repositories/<Entity>Repository.cs`
- EF Core + SQL Server saglayicisi kullanilir.
- Value object donusumleri (`TrackingNumber` gibi) DbContext'te konfigure edilir.

### 2.4 WebAPI

- Controller'lar ince tutulur; is mantigi Application katmaninda.
- Swagger yalnizca Development ortaminda aktiftir.
- Middleware zinciri `DependencyInjection.UsePresentation()` icinde kurulur.

---

## 3) Temel Mimari Kararlar

### 3.1 Service-based Application

Her use-case kendi servis sinifini alir (`CreateCargoUseCase`, `GetCargoByIdUseCase`, ...). MediatR gibi ek bir pipeline cercevesi eklenmez. Sebep: proje kapsaminda MediatR'in getirisi (cross-cutting behavior pipeline) su an gerekli degil; karmasikligi dusuk tutmak tercih edildi.

### 3.2 Repository Pattern

Veri erisimi `Application/Abstractions/Persistence/` altindaki interface'ler uzerinden yapilir. Application katmani `DbContext`'i dogrudan bilmez.

- Interface: `ICargoRepository` (Application)
- Implementasyon: `CargoRepository` (Infrastructure, EF Core)
- Development/test icin: `InMemoryCargoRepository`

### 3.3 FluentValidation

Girdi dogrulama standardi olarak FluentValidation kullanilir.

- Paketler: `FluentValidation`, `FluentValidation.DependencyInjectionExtensions`
- `Application/DependencyInjection.cs` icinde `AddValidatorsFromAssembly(...)` ile assembly scanning yapilir.
- Use-case constructor'ina `IValidator<TRequest>` inject edilir; ilk is `ValidateAsync`.
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

### 3.6 Development'ta Veritabansiz Calisma

Development ortaminda `useInMemoryRepository: true` ile `AppDbContext` ve SQL repository kaydedilmez; yerine `InMemoryCargoRepository` kullanilir. Sebep:
- Yeni gelistiricinin ilk gun DB kurmadan `dotnet run` yapabilmesi
- Testlerin ve lokal deneylerin hizlandirilmasi

Production ve CI/CD'de bu bayrak `false`'a cekilir; connection string `ConnectionStrings__DefaultConnection` env var'i uzerinden verilir.

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
2. `<UseCase>Request.cs` (input DTO) yaz.
3. `<UseCase>RequestValidator.cs` (FluentValidation) yaz.
4. `<UseCase>UseCase.cs` icinde is mantigini kur; `Result<T>` donur.
5. Gerekli ise `Application/Abstractions/Persistence/` altinda yeni interface tanimla.
6. Infrastructure'da karsilik gelen repository implementasyonunu yaz.
7. `WebAPI` tarafinda controller endpoint'ini ekle; yalnizca use-case'i cagir ve sonucu map et.
8. DI kayitlari gerekiyorsa ilgili katmanin `DependencyInjection.cs` dosyasina ekle.

---

## 6) Yapilmayacaklar (Scope Disi)

Bu mimaride bilincli olarak tercih edilmeyenler:

- MediatR ve benzeri pipeline cerceveleri (su an ihtiyac yok)
- Domain event altyapisi (ilerideki story'de degerlendirilecek)
- CQRS ayrimi (command/query ayri projeler olarak bolunmez)
- Assembly-scanning framework'u olarak Scrutor (yalnizca FluentValidation icin assembly scan yapilir)
- Generic repository (repository'ler aggregate-specific tutulur)

---

## 7) Ilgili Dokumanlar

- [developer-setup.md](./developer-setup.md) — Gelistirici ortam kurulumu
- [environment-variables.md](./environment-variables.md) — Env var naming ve yapilandirma
- [user-story-tracker.md](./user-story-tracker.md) — Story bazli ilerleme takibi
