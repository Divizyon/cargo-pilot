# CLAUDE.md

## Kapsam
Bu dosya Cargo Pilot **backend** içindir (`apps/backend/`).
Frontend kuralları için `apps/frontend/CLAUDE.md`'ye bak.
Backend davranışını frontend tarafından yeniden tasarlama.

## Öncelik
1. Task / backlog
2. Bu dosya
3. Teknik tasarım dokümanı (TDD v2.0) + `docs/architecture.md`
4. Mevcut kod pattern'i

---

## Monorepo Yapısı

```
apps/
  backend/                      — bu geliştirme yüzeyi
    src/
      CargoPilot.Domain/        — entity, enum, value object, saf iş kuralları
      CargoPilot.Application/   — use case, feature servisleri, validator, DTO
      CargoPilot.Infrastructure/— EF Core, DbContext, repository implementasyonları
      CargoPilot.WebAPI/        — controller, middleware, auth, DI, swagger
    tests/
      CargoPilot.Unit.Tests/
      CargoPilot.Integration.Tests/
    docs/
      architecture.md           — katman yapısı ve mimari kararlar (yetkili kaynak)
      database-migrations.md    — migration akışı
      developer-setup.md        — araç kurulumu
      environment-variables.md  — env var naming standardı
  frontend/                     — React 18 + Vite 5 + TypeScript
database/                       — SQL migrations ve seeds
infra/
  env/                          — .env.*.example dosyaları
  compose/                      — docker-compose.*.yml
docs/
  conventions/                  — BRANCHING.md, COMMITS.md (git kurallarının yetkili kaynağı)
.github/
  workflows/                    — ci.yml, test-deploy.yml
```

---

## Geliştirici Ortamı

- **IDE:** Visual Studio 2022 (17.8+), workload: `ASP.NET and web development` + `Data storage and processing`
- **SDK:** `8.0.419` — repo kökündeki `global.json` ile sabitlenmiş (`rollForward: latestPatch`)
- **CI:** `.github/workflows/ci.yml` — `actions/setup-dotnet@v4` ile aynı SDK pinlenmiş; local ile CI aynı bant
- SDK değişikliği chapter lead onayı gerektirir; önce local, sonra CI doğrulaması yapılır

---

## Komutlar

Tüm backend komutları `apps/backend/` dizininden çalıştırılır.

```bash
# Derleme ve test
dotnet build
dotnet test
dotnet test --filter "Category=Unit"
dotnet test --filter "FullyQualifiedName~PlanningHandlerTests"

# Dev server (Development modunda DB olmadan çalışır)
dotnet run --project CargoPilot.WebAPI

# Migration — proje parametreleri zorunlu
dotnet ef migrations add <Ad> \
  --project CargoPilot.Infrastructure \
  --startup-project CargoPilot.WebAPI \
  --output-dir Persistence/Migrations

dotnet ef database update \
  --project CargoPilot.Infrastructure \
  --startup-project CargoPilot.WebAPI

dotnet ef migrations remove \
  --project CargoPilot.Infrastructure \
  --startup-project CargoPilot.WebAPI

# SQL script üretimi (DBA / release için)
dotnet ef migrations script \
  --project CargoPilot.Infrastructure \
  --startup-project CargoPilot.WebAPI \
  --output ./migration.sql
```

> `AppDbContextFactory` (`IDesignTimeDbContextFactory<AppDbContext>`) sayesinde migration komutları runtime DI'ya gerek duymadan çalışır; `ConnectionStrings__DefaultConnection` env var'ı set edilmiş olmalıdır.

---

## Stack

Cargo Pilot sıradan CRUD değildir; 3D placement algoritması, lojistik kuralları, raporlama ve ERP entegrasyonu çekirdektir.

- C# 12 / .NET 8
- Clean Architecture: Domain / Application / Infrastructure / WebAPI
- SQL Server, Redis, MinIO
- EF Core + `AppDbContextFactory` (design-time), FluentValidation, Hangfire, Serilog, Mapster
- JWT Bearer + DataProtection (AES-256 ile hassas entegrasyon anahtarları şifrelenir)
- QuestPDF + ClosedXML
- HealthChecks
- xUnit + Moq + FluentAssertions
- Swagger / Swashbuckle (Development + Staging'de açık, Production'da kapalı)
- `.editorconfig` + `Directory.Build.props`: `TreatWarningsAsErrors=true`, `EnforceCodeStyleInBuild=true`, `AnalysisMode=Recommended`
- Analyzer: `Microsoft.CodeAnalysis.NetAnalyzers` + `SonarAnalyzer.CSharp` — `Directory.Build.props`'ta merkezi

Yeni ORM / mapper / logger / MediatR ekleme. Secret hardcode etme.

---

## Mimari Kurallar

Bağımlılık yalnızca içe doğru akar:

```
WebAPI ──► Application ──► Domain
               ▲
    Infrastructure ─┘
```

| Katman | Sorumluluk |
|---|---|
| Domain | entity, enum, value object, saf iş kuralları; framework bilmez |
| Application | `Features/<Aggregate>/<UseCase>/` klasör standardı; service-based (MediatR yok) |
| Infrastructure | EF Core, repository implementasyonları, dış servis adapter'ları |
| WebAPI | controller (ince tutulur), middleware, auth, DI, swagger |

**Uygulanan pattern'ler:**
- **Service-based Application:** Her use case kendi servis sınıfını alır (`CreateItemUseCase`). MediatR pipeline'ı eklenmez.
- **Repository pattern:** `Application/Abstractions/Persistence/` altında interface; `Infrastructure/Persistence/Repositories/` altında EF implementasyonu. Aggregate-specific, generic repository değil.
- **Composition root:** Her katman kendi `DependencyInjection.cs`'ini sunar; `Program.cs` yalnızca orkestrasyon yapar (~15 satır), concrete tip veya EF Core referansı içermez.
- **Development'ta DB-siz çalışma:** `useInMemoryRepository: builder.Environment.IsDevelopment()` flag'i ile InMemory repository aktif olur; `AppDbContext` kaydedilmez. DB gelince bu tek satır `false`'a çekilir.
- **`ICurrentUserService`:** `Application/Abstractions/ICurrentUserService.cs` (interface); `Infrastructure/Services/AnonymousCurrentUserService.cs` (geçici, `UserId = null`). Auth story'sinde yalnızca `JwtCurrentUserService` yazılıp DI kaydı değiştirilir; `AppDbContext` ve `BaseEntity` dokunulmaz.

**Yapma:**
- Controller içine business logic koyma
- Entity ile API DTO'sunu aynı yapma
- Infrastructure detaylarını Domain/Application'a sızdırma
- Katman atlayarak hızlı çözüm üretme
- Domain'e dış sistem bağımlılığı (ERP, PayTR) taşıma
- `Persistence/Migrations/` klasörüne manuel müdahale etme (generated kod)

---

## Çalışma Şekli

- İstenen işi yap, işi büyütme
- İlgisiz dosyalara dokunma
- Küçük diff üret; değişiklik kolay revert edilebilir olmalı
- Refactor sadece gerçekten gerekliyse yap
- Önce sadece ilgili task ve dosyaları oku; küçük iş için tüm repo'yu tarama
- Mevcut pattern'i yeni soyutlama getirmeden önce koru
- Auth, audit, rapor akışı ve placement algoritması kodunda ekstra muhafazakâr ol

---

## Domain Model Özeti

### BaseEntity (tüm entity'lerde zorunlu)
```
Id (Guid)           — protected set; Guid.Empty geçersiz, BaseEntity constructor'ında doğrulanır
CreatedDate         — private set; SaveChangesAsync'de EF ChangeTracker üzerinden set edilir
UpdatedDate         — private set; her Modified'da güncellenir
IsDeleted (bool)    — private set; yalnızca soft delete ile değişir
CreatedBy (Guid?)   — private set; ICurrentUserService.UserId
UpdatedBy (Guid?)   — private set; ICurrentUserService.UserId
```
- EF Core design-time nesneleştirmesi için `protected BaseEntity()` constructor'ı vardır
- Audit alanları `entry.Property(x => x.CreatedDate).CurrentValue` API'siyle set edilir (private set'i atlar)
- Global query filter: `HasQueryFilter(e => !e.IsDeleted)` — tüm SELECT sorgularına `WHERE IsDeleted = 0` eklenir; atlamak için `IgnoreQueryFilters()` kullanılır

### User
- `UserType`: 0 SuperAdmin · 1 CompanyAdmin · 2 CompanyWorker · 3 Individual
- `CompanyId`: CompanyAdmin/Worker için zorunlu, diğerleri null
- `AuthProvider`: Local | Google | Microsoft
- `ExternalSystemId`: ERP (Logo/Netsis) eşleşme alanı

### UserSession (RefreshToken)
- `ExpiresAt` statik değil; her API isteğinde (mevcut zaman + 30 dk) ileri ötelenir
- `LastUsedAt`: `ExpiresAt` uzatma kararı bu alana göre verilir
- `IsRevoked` yalnızca `Revoke()` domain metodu üzerinden `true` yapılır (encapsulation)
- `CreatedByIp` güvenlik denetimi için tutulur
- Refresh token response body'ye yazılmaz; `HttpOnly=true, Secure=true, SameSite=None` Cookie olarak gönderilir
- `[JsonIgnore]` ile `RefreshToken` ve `RefreshTokenExpiresAt` DTO alanları JSON'a yazılmaz

### Item (Ürün/Koli)
- `Category`: 0 Package · 1 Pallet · 2 Box
- `FragilityType`: 0 NonFragile · 1 Fragile · 2 Liquid/Chemical · 3 Flammable · 4 Oxidizing · 5 Corrosive · 6 OdorSensitive · 7 FoodContact · 8 KeepDry · 9 Chemical
- `AllowedRotations` (Flags/Enum): 0 All · 1 NoVertical · 2 Fixed
- `MaxStackCount`, `MaxWeightOnTop`, `IsStackable` yerleşim algoritmasını doğrudan etkiler
- `StackGroup`: Birlikte taşınabilirlik grubu (Gıda, Kimyasal, ADR vb.)
- `Diameter`: Yalnızca silindirik ürünlerde; diğerlerinde null
- `CompanyId` **yoktur**; Item company-bağımsız global katalog olarak tasarlanmıştır
- `SKU`: zorunlu, unique index ile korunur; sistemler arası eşleşme anahtarı
- `ProductType (string)`: zorunlu; kaydetmeden önce `Trim()` ile normalize edilir

### EF / DB Kolon Kuralları (Item ve yeni entity'ler için)
- Ölçü ve ağırlık alanları: `decimal(12,3)`
- String uzunlukları: `SKU(100)`, `Barcode(100)`, `Name(200)`, `ProductType(100)`, `ImageUrl(500)`, `StackGroup(100)`, `SpecialNotes(1000)`
- `Barcode`: nullable, ilk fazda unique index yok
- Soft delete index: `HasIndex(e => e.IsDeleted)` her entity için ekle

### Vehicle (Araç/Konteyner)
- `VehicleType`: 0 Trailer · 1 Truck · 2 Container · 3 Römork
- `LoadingType`: 0 Rear · 1 SideRight · 2 SideLeft · 3 SideBoth · 4 Top
- `CompanyId` zorunlu; multi-tenant izolasyonu bu alanla sağlanır
- `InternalWidth/Height/Length` cm; `MaxWeightCapacity` kg

### Plan / LoadingResult
- `PlanStatus`: 0 Draft · 1 PendingCalculation · 2 Completed · 3 Error
- `OptimizationCriteria`: 0 MaximizeSpace · 1 BalancedWeight · 2 LIFO_Priority
- Sığmayan ürünler `Unplaced` listesinde **sebep koduyla** ayrılır (örn. `Err.DimensionMismatch`)

### Enums (diğer)
- `RotationType`: 0 Standard · 1 Yaw90 · 2 Pitch90 · 3 Roll90
- `StackingRule`: 0 NoLimit · 1 StrictlyNoStack · 2 WeightLimitedStack
- `ReportType`: 0 PDF_Summary · 1 Excel_Detailed_List
- `IntegrationSystem`: 0 Netsis · 1 Logo · 2 Custom_WMS
- `PaymentStatus`: 0 AwaitingPayment · 1 Success · 2 Failed · 3 Refunded
- `UnitSystem`: 0 Metric (cm, kg) · 1 Imperial (inch, lbs)
- `ErrorType`: None · Validation · Unauthorized · Forbidden · NotFound · Conflict · BusinessRule · RateLimit · Unexpected

---

## API Response Contract

Tüm endpoint'ler `Result<T>` zarfını `BaseController.HandleResult` üzerinden döner.

```json
// Başarı
{ "isSuccess": true, "data": { ... }, "error": null }

// Hata
{ "isSuccess": false, "data": null, "error": { "code": "VAL_MAX_WEIGHT", "description": "..." } }
```

`ErrorType` → HTTP status mapping (`BaseController.HandleResult`):

| ErrorType | HTTP |
|---|---|
| Validation | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| NotFound | 404 |
| Conflict | 409 |
| BusinessRule | 422 |
| RateLimit | 429 |
| Unexpected | 500 |

- Use case'ler exception fırlatmaz; `Result<T>.Success(value)` veya `Result<T>.Failure(Error)` döner
- Validation hataları `Result<T>.Failure` üzerinden döner; exception-for-control-flow kullanılmaz
- Hata kodu örüntüsü: `VAL_MAX_WEIGHT`, `ERR_DIMENSION_MISMATCH`, `AUTH_INVALID_TOKEN`
- JSON: **camelCase** | C#: **PascalCase**
- `/api/v1` prefix'i korunur
- Request / Response DTO ayrımı korunur
- Validation FluentValidation katmanında; `AddValidatorsFromAssembly` ile assembly scanning

---

## Yeni Use Case Ekleme Akışı

1. `Application/Features/<Aggregate>/<UseCase>/` klasörünü aç
2. `<UseCase>Request.cs` (input DTO) yaz
3. `<UseCase>RequestValidator.cs` (FluentValidation) yaz; constructor'a `IValidator<TRequest>` inject et, ilk iş `ValidateAsync`
4. `<UseCase>UseCase.cs` içinde iş mantığını kur; `Result<T>` döner
5. Gerekirse `Application/Abstractions/Persistence/` altında yeni repository interface'i tanımla
6. Infrastructure'da karşılık gelen repository implementasyonunu yaz
7. WebAPI'de controller endpoint'ini ekle; yalnızca use case'i çağır, sonucu `HandleResult` ile map et
8. DI kayıtları gerekiyorsa ilgili katmanın `DependencyInjection.cs`'ine ekle

---

## Domain Invariants

Aşağıdakileri sessizce gevşetme:

- **Ağırlık hiyerarşisi:** yoğun/ağır ürün alta, hafif ürün üste
- **Kırılabilirlik:** Fragile ürünün üzerine hiçbir yük binemez
- **MaxStackCount** aşılmaz
- **MaxWeightOnTop** aşılmaz
- **Rotasyon kısıtları:** Liquid/Chemical ürünlerde Pitch90 ve Roll90 yasaktır
- **AllowedRotations** korunur
- **Kapasite hard block:** TotalWeight > Vehicle.MaxWeightCapacity → `PlanStatus = Error`
- **Boyut kontrolü:** Herhangi bir kenarı iç ölçüyü aşan ürün → Unplaced + sebep kodu
- **Ağırlık merkezi / axle load** dikkate alınır
- **LashingGap:** Varsayılan 2 cm; ürünler arası minimum sarsıntı payı
- **Ölü alan:** < 5 cm boşluk "Lashing Area" olarak işaretlenir, fill rate'e dahil edilmez
- **Kapı boşluğu:** Kapı tarafında minimum 10 cm operasyonel boşluk
- **LIFO:** Çoklu duraklı rotada son durak → arka, ilk durak → kapıya yakın
- **Grup kuralı:** Aynı SKU veya alıcıya ait paketler komşu koordinatlara atanır

---

## Veri / Contract

- Uzunluk: **cm**, ağırlık: **kg**, hacim backend'de hesaplanır
- Koordinat eksenleri: **X = Width · Y = Height (Up) · Z = Depth/Length**
- Pivot (origin): **Bottom-Left-Rear** köşe
- Rotasyon: 0 / 90 / 180 / 270 derece
- Tüm ID'ler: **GUID (UUID v4)**
- Soft delete (`IsDeleted`) bozulmaz; global query filter ile korunur

---

## Güvenlik / Entegrasyon

- Secret'ları config / environment'dan oku; asla hardcode etme
- Env var naming: `appsettings.json` yolu → cift alt çizgi (`ConnectionStrings:DefaultConnection` → `ConnectionStrings__DefaultConnection`)
- Config öncelik sırası: `appsettings.json` → `appsettings.{Env}.json` → User Secrets → Env Vars → CLI args
- User Secrets ID: `cargo-pilot-backend`; secret dosyaları `%APPDATA%/Microsoft/UserSecrets/` altında, repoya girmez
- `.env.dev`, `.env.prod`, `.env.test` repoya girmez (`.gitignore` korumalı); yalnızca `.env.*.example` repoda kalır
- Zorunlu env var'lar: `ConnectionStrings__DefaultConnection`, `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`
- Hassas entegrasyon anahtarları veritabanında **AES-256** ile şifrelenmiş tutulur
- JWT + Refresh Token mantığını bozma; `ExpiresAt` sliding window davranışı korunur; token rotation aktif
- Refresh token response body'ye yazılmaz; HttpOnly Cookie kullanılır
- **2FA zorunluluğu:** Billing, Kullanıcı Silme ve ERP Ayarları işlemlerinde MFA atlatılamaz
- **Rate limiting:** Aynı kullanıcı için dakikada max istek sınırı (varsayılan 100 req/min)
- **CORS:** Yalnızca tanımlı CargoPilot frontend origin'leri
- **Webhook güvenliği:** `/billing/webhook` → yalnızca PayTR IP aralıklarından erişilebilir
- **Audit trail:** POST / PUT / DELETE işlemleri (kim, ne, ne zaman) loglanır; kritik işlemleri atlama
- Credentials asla `appsettings.json`, `appsettings.Production.json` veya kaynak koda yazılmaz; PR review'da reddedilir
- Rapor akışı ve report metadata mantığını bozma

---

## Story Durumu (Özet)

Tamamlanan altyapı story'lerini yeniden implement etme veya pattern'lerini bozma.

| # | Story | Durum |
|---|---|---|
| 1 | Geliştirici ortam standardizasyonu | ✅ |
| 2 | Clean Architecture standardı | ✅ |
| 3 | Environment variables / .env kurgusu | ✅ |
| 4 | .editorconfig + statik analiz | ✅ |
| 5 | Connection string merkezi okuma + bulut DB | ✅ |
| 6 | EF Core entegrasyonu + temel DbContext | ✅ |
| 7 | BaseEntity standardı + soft delete + audit | ✅ |
| 8 | Standart API response yapısı (`Result<T>`, `ErrorType`) | ✅ |
| 9 | Global Exception Handling | 🟡 Correlation ID eksik |
| 10 | Swagger dokümantasyonu | ✅ |
| 11 | Refresh Token endpoint (token rotation) | ✅ |

**Story 9 açık kalan:** `context.TraceIdentifier` henüz log mesajına ve response zarfına eklenmedi.

---

## Test

İş kuralı, validator, handler, algoritma, auth veya contract etkileniyorsa test yaz.

- Öncelik sırası: unit test → integration test
- Placement algoritması, domain invariant ve auth değişikliklerinde test zorunlu
- Handler testi için Infrastructure mock'lanır; katman karıştırma

---

## Quality Gates (PR Öncesi)

- `dotnet build` hatasız geçmeli (`TreatWarningsAsErrors=true` nedeniyle uyarı da hatadır)
- `dotnet test` hatasız geçmeli
- Yeni endpoint varsa `[ProducesResponseType]` ve XML summary eklenmiş olmalı
- Migration eklendiyse `Persistence/Migrations/` içine sadece generated dosyalar girmeli; elle düzenleme yapılmamış olmalı
- Audit gerektiren işlemler loglanıyor mu kontrol edilmeli
- Credentials içeren hiçbir dosya PR'a girmemeli

---

## Git Workflow

Git işi yapmadan önce şu dosyaları oku:
- `docs/conventions/BRANCHING.md`
- `docs/conventions/COMMITS.md`

Bu dosyalar yetkilidir; aşağıdaki özet ile çelişirse conventions dosyaları önceliklidir.

### Branch Akışı (Özet)
```
test ──► feature/* ──► PR → dev ──► PR: aynı feature/* → test ──► PR: test → main
```
- Branch her zaman **`test`'ten açılır** (`dev` veya `main`'den değil)
- Format: `feature/<TİCKET-KODU>-<kısa-açıklama>` — örn. `feature/US-88-refresh-token`
- Aynı feature branch iki ayrı PR açar: önce `dev`'e, sonra `test`'e
- `dev → test` direkt PR yasaktır
- `test` ve `main`'e merge yalnızca Chapter Lead / DevOps onayıyla
- Merge stratejisi: **Merge Commit** (geçmişi korur)

### Commit Stili (Özet)
- Atomic commit: her commit tek bir mantıksal değişiklik
- Mesajlar **Türkçe**, sade ve açıklayıcı — örn. `refresh token sliding window eklendi`
- Kaçınılacaklar: `fix`, `update`, `deneme`, `son`, `düzenleme`, `çeşitli değişiklikler`

---

## Stil / Yanıt

- Sade, okunabilir, kurumsal kod yaz
- Küçük ve tek sorumluluklu method'lar tercih et
- Magic string/number azalt, nullable bilinçli kullan, obvious yorum yazma
- `ImplicitUsings` ve `Nullable` tüm projelerde açık; `using` gereksiz ekleme
- `Persistence/Migrations/` generated kod; `[**/Persistence/Migrations/*.cs]` `.editorconfig`'da `generated_code = true`
- Sonar S1144 false positive'leri için `#pragma warning disable/restore` kullan; EF Core design-time constructor'larını `protected` yap
- Önce sonucu söyle, sonra kısa teknik gerekçe ver
- Emin olmadığını kesin yazma
