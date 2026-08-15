# CargoPilot User Story Tracker

**Son güncelleme:** 2026-05-08 · **Durum:** Aktif

Bu dosya, her user story altındaki tüm alt işleri tek tek takip etmek için kullanılır.
Hem daha önce yapılanlar hem de bu sohbette tamamlananlar aynı listede işaretlenir.

Durum göstergeleri:
- `✅ Tamamlandı`
- `🟡 Kısmi / Devam ediyor`
- `⬜ Başlanmadı`

---

## 1) Geliştirici ortam standardizasyonu (VS bileşenleri + SDK)
**Story:** Backend Chapter Lead olarak, tüm geliştiricilerin projeyi sorunsuz derleyebilmesi ve aynı araç setini kullanması için gerekli olan Visual Studio bileşenlerinin ve SDK sürümlerinin kurulumlarının yapılmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Kabul Kriterleri
- Proje hedef frameworku ile uyumlu .NET SDK sürümünü sabitleyen bir `global.json` bulunmalıdır.
  *(⚠️ 2026-08-15 düzeltmesi: kriter önce "repo kökünde" diyordu. Dosya **repo kökünde değil**, `apps/backend/global.json` konumundadır — `find . -maxdepth 1 -iname global.json` → 0 sonuç. `developer-setup.md` doğru konumu yazıyor.)*
- Gerekli Visual Studio workload'larını, kurulum adımlarını ve doğrulama komutlarını açıklayan bir `docs/developer-setup.md` dokümanı bulunmalıdır.
- Temiz bir geliştirici ortamında, dokümanda tanımlanan `dotnet restore` ve `dotnet build` komutları başarıyla çalıştırılabilmelidir.

### Alt İşler
- `✅` `apps/backend/global.json` ile SDK sürümünü sabitle *(2026-08-15: kökte değil, backend klasöründe)*
- `✅` Proje hedef framework ile uyumlu SDK seçimi yap (`net8.0` için `.NET 8`)
- `✅` Developer setup dokümanı hazırla (`docs/developer-setup.md`)
- `✅` Gerekli Visual Studio workload listesi dokümanda yazsın
- `✅` Kurulum doğrulama komutlarını dokümanda tanımla
- `✅` Komutları ekip makinesinde çalıştırarak doğrula (`dotnet --info`, `--list-sdks`, `--version`, `restore`, `build`)
- `✅` CI tarafında aynı SDK bandının pinlendiği bilgisini dokümana bağla

**Kanıtlar:**
- `apps/backend/global.json` *(2026-08-15: repo kökünde değil)*
- `docs/developer-setup.md`
- `.github/workflows/ci.yml`

---

## 2) Clean Architecture standardı
**Story:** Backend Chapter Lead olarak, projenin ve dizin yapısının sürdürülebilir, test edilebilir ve modüler olması için Clean Architecture standartlarında oluşturulmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

> **⚠️ Kanıt uyarısı — 2026-08-15.** Bu story'nin alt işlerinde ve "Kanıtlar" listesinde geçen
> `Cargo`, `TrackingNumber`, `CargoStatus`, `ICargoRepository`, `CargoRepository`,
> `Features/Cargos/CreateCargo/*` adları **kod tabanında yoktur** — `grep -rln "class Cargo\b" apps/backend`
> yalnızca doküman dosyalarını döndürür, tek bir `.cs` dosyası bile eşleşmez.
> Bunlar story yazıldığı sırada kullanılan **kurgusal/örnek** adlardır; gerçek entity'ler `Item`,
> `Vehicle`, `LoadingPlan` vb.'dir ve `architecture.md` bu değişimi zaten açıklıyor.
> Story'nin kendisi (katmanlı yapı, repository pattern, FluentValidation, composition root)
> gerçekten tamamlanmıştır; yanlış olan yalnız örnek sınıf adlarının "kanıt" gibi listelenmesidir.
> Tarihsel kayıt olduğu için metin silinmedi, uyarı eklendi.

**Bu story için teknik kararlar (netleştirildi):**
- `Application` katmanında servis bazlı yaklaşım kullanılacak.
- Veri erişiminde repository pattern uygulanacak.
- Doğrulama standardı olarak FluentValidation kullanılacak.

### Alt İşler
- `✅` Katmanlı çözüm yapısını oluştur (`WebAPI`, `Application`, `Domain`, `Infrastructure`)
- `✅` Katmanlar arası referans yönünü Clean Architecture prensibine göre kur
- `✅` Application için feature/use-case klasör standardını oluştur (`Features/Cargos/CreateCargo`, `GetCargoById`, `ListCargos`, `UpdateCargoStatus`, `CancelCargo`)
- `✅` Domain tarafında temel entity/value object/aggregate iskeletini oluştur (Kapsam: `Entities/Cargo`, `ValueObjects/TrackingNumber`, `Enums/CargoStatus`; Dışında: domain event, ileri seviye state-machine, adres/ağırlık gibi ek modeller)
- `✅` Application katmanında repository interface'lerini tanımla (Kapsam: `Abstractions/Persistence/ICargoRepository` contract; Dışında: EF/SQL implementasyonu)
- `✅` Infrastructure katmanında EF Core tabanlı repository implementasyonlarını yaz (Kapsam: `Persistence/Repositories/CargoRepository`, `AppDbContext` üzerinden `DbSet<Cargo>` ve `TrackingNumber` conversion; Dışında: migration/ileri query optimizasyonu)
- `✅` Composition root (DI registration extensionları) standardını kur (Kapsam: her katmanın kendi `DependencyInjection.cs` üzerinden `IServiceCollection` extension sunması. `CargoPilot.Application/DependencyInjection.cs` içinde `AddApplication()` use-case kayıtlarını yapar; `CargoPilot.Infrastructure/DependencyInjection.cs` içinde `AddInfrastructure(IConfiguration, bool useInMemoryRepository)` `AppDbContext`+connection string okuması ve `ICargoRepository` için SQL/InMemory seçimini üstlenir; `CargoPilot.WebAPI/DependencyInjection.cs` içinde `AddPresentation()` ve `UsePresentation()` controllers/Swagger/middleware zincirini kurar. `Program.cs` artık ~50 satırdan ~15 satıra indi; concrete tip veya EF Core referansı içermiyor, sadece orkestrasyon yapıyor. Application'a DI extension'i kurabilmek için `Microsoft.Extensions.DependencyInjection.Abstractions 8.0.2` paket referansı eklendi; Infrastructure'in Hosting abstraction'ina bağımlılığını önlemek için environment kararı `Program.cs`'de `builder.Environment.IsDevelopment()` flag'i üzerinden geçiliyor. Dışında: assembly-scanning (Scrutor), FluentValidation pipeline kayıtları, auth/CORS middleware)
- `✅` FluentValidation paket ve pipeline entegrasyonunu yap, ilk validatorları ekle (Kapsam: `CargoPilot.Application` projesine `FluentValidation 11.11.0` ve `FluentValidation.DependencyInjectionExtensions 11.11.0` paketleri eklendi. Assembly scanning ile tüm `AbstractValidator<T>` türevleri `Application/DependencyInjection.cs` içindeki `AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly)` çağrısı sayesinde otomatik olarak DI konteynirina kaydediliyor. İlk validator olarak `Features/Cargos/CreateCargo/CreateCargoRequestValidator.cs` yazıldı; `TrackingNumber` için `NotEmpty` ve `MaximumLength(64)` kuralları, `Status` için ise değer gönderildiğinde `IsInEnum` kuralı tanımlı. `CreateCargoUseCase` constructor'ina `IValidator<CreateCargoRequest>` inject edildi; use-case baştan `ValidateAsync` çağırarak hataları `Result<T>.Failure` ile `ValidationError` kodlu tek bir mesajda (`;` ile birleştirilmiş) döndürür; böylece önceki ham `if (request is null)` kontrolü ve `try/catch (ArgumentException)` exception-for-control-flow kalıbı ortadan kalktı. Dışında: MediatR pipeline behavior kurgusu (projede MediatR yok), çok-hatalı structured `ValidationError` tipi (Story 8 response envelope standardı ile birlikte ele alınacak), ileri seviye kurallar (async DB kontrolleri, cross-field/cross-aggregate kurallar), validator için unit test projesi (ayrı story))
- `✅` Architecture decision record veya mimarı rehber dokümanı ekle (Kapsam: `apps/backend/docs/architecture.md` dosyası oluşturuldu. İçerik: (1) katmanlı yapı tablosu ve bağımlılık akışı diyagramı (Domain <- Application <- Infrastructure / WebAPI), (2) her katmanın içerik standardı ve örneklerle klasör yapısı (`Features/<Aggregate>/<UseCase>/`), (3) mimarı kararların gerekçesi: service-based Application (MediatR neden alınmadı), repository pattern (aggregate-specific, generic değil), FluentValidation standardı ve assembly scanning yaklaşımı, `Result<T>` ile exception-free akış, composition root (her katmanda `DependencyInjection.cs`), dev ortamında `InMemoryCargoRepository` ile DB-siz çalışma, configuration ve secret kaynakları, (4) yeni use-case eklerken izlenecek 8 adımlık akış, (5) scope dışı tutulan yaklaşımlar (CQRS, domain event, Scrutor, generic repository). Developer setup ve environment-variables dokümanlarıyla cross-link yapıldı. Dışında: formal ADR numaralandırma/template akışı (ilerideki story'de), her karar için ayrı ADR dosyası; bu sürüm tek bir rehber dokümanda konsolide edilmiştir)

**Kanıtlar:**
- `CargoPilot.Application/DependencyInjection.cs`
- `CargoPilot.Infrastructure/DependencyInjection.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/Program.cs`
- `CargoPilot.Application/CargoPilot.Application.csproj`
- `CargoPilot.Application/Features/Cargos/CreateCargo/CreateCargoRequestValidator.cs`
- `CargoPilot.Application/Features/Cargos/CreateCargo/CreateCargoUseCase.cs`
- `docs/architecture.md`

---

## 3) Environment variables / .env kurgusu
**Story:** Geliştirici Takımı için uygulamanın farklı ortamlarda farklı API uç noktalarına bağlanabilmesi için ortam değişkenleri (environment variables / .env yapısı) kurgulanmalı.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` Ortam bazlı appsettings dosyalarını oluştur (`Development`, `Staging`)
- `✅` Repo kökünde `.gitignore` oluştur (Kapsam: repo koku `.gitignore` dosyası elle yazıldı; Microsoft'un `dotnet new gitignore` template'indeki ~300 satırlık geniş liste yerine projenin fiilen kullandığı kalemler seçildi. Bölümler: (a) build çıktıları `bin/`, `obj/`, `[Dd]ebug/`, `[Rr]elease/`, `x64/`, `x86/`; (b) Visual Studio/Rider kullanıcı dosyaları `.vs/`, `.idea/`, `*.user`, `*.suo`, `*.userosscache`, `*.sln.docstates`; (ç) test & log `TestResults/`, `*.log`; (d) secret & env `appsettings.*.Local.json`, `.env`, `.env.local`, `.env.*.local`, `secrets.json`, `*.pfx`, `*.key`; (e) NuGet `*.nupkg`, `packages/`; (f) publish çıktıları `publish/`, `*.publishsettings`; (g) OS `Thumbs.db`, `.DS_Store`. `.env.example` pattern'den otomatik hariç (farklı isim). User Secrets dosyaları zaten `%APPDATA%/Microsoft/UserSecrets/` altında, repo dışında kaldığı için ekstra kural gerekmedi. Dışında: `.vscode/` blok listesi (paylaşıma açık tutuldu), CI/CD runner-özel çıktıları, resmi Microsoft template'indeki kullanılmayan ASP.NET Classic/Azure Tools/StyleCop kuralları)
- `✅` Mevcut `appsettings.Development.json` ve `appsettings.Staging.json` içindeki placeholder connection string'leri kaldır (Kapsam: `appsettings.Development.json` içinden `ConnectionStrings.DefaultConnection` değeri (`Server=SUNUCU_IP_ADRESI;Database=CargoPilot_Dev;User Id=GELISTIRICI_USER;Password=GUCLU_SIFRE;TrustServerCertificate=True;`) ve `appsettings.Staging.json` içinden `ConnectionStrings.DefaultConnection` değeri (`Server=STAGING_SERVER_IP;Database=CargoPilot_Test;Trusted_Connection=True;`) tamamen silindi; her iki dosyada sadece `Logging` bloğu kaldı. Yan etki olarak `Infrastructure/DependencyInjection.cs` içindeki `AddDbContext<AppDbContext>` çağrısı artık koşullu: `useInMemoryRepository == true` ise ne `AppDbContext` ne de SQL repository kaydedilir (böylece null connection string yüzünden `UseSqlServer` hata fırlatmaz); `false` ise SQL modu `AddDbContext` + `CargoRepository` ikilisi kaydedilir. Development'ta `dotnet run` connection string olmadan sorunsuz başlatılabildiği runtime doğrulaması ile teyit edildi. Program.cs'teki `useInMemoryRepository: builder.Environment.IsDevelopment()` seçimi korundu; DB geldiğinde bu tek satırın false'a çekilmesi ve user-secrets/env var ile `ConnectionStrings__DefaultConnection` set edilmesi yeterli. Dışında: config-driven otomatik switch (Yaklaşım B) bilinçli olarak ertelendi, staging için Key Vault/secret store entegrasyonu (Story 5 kapsamında ele alınacak))
- `✅` Environment variable isim standardını tanımla (Kapsam: `docs/environment-variables.md` dosyası oluşturuldu ve naming standardı bölümü ile dolduruldu. Standart: `appsettings.json` içindeki nested key yolu (`Section:SubSection:Key`) env var'da çift alt çizgi (`Section__SubSection__Key`) olarak ifade edilir; bu .NET `EnvironmentVariablesConfigurationProvider`'inin otomatik desteklediği kanonik konvansiyondur. Dokümantasyonda (a) mevcut projedeki tüm key'ler için JSON-path -> env-var dönüşüm tablosu (ConnectionStrings, Logging, ApplicationSettings), (b) neden `__` tercih edildiği (`:` POSIX kabuklarında geçersiz, `__` Windows/Linux/macOS/Docker/K8s ortamlarında tek isimle çalışır), (ç) kurallar (büyük/küçük harf duyarsızlığı, `ASPNETCORE_`/`DOTNET_` prefix'lerin farkı, nesting derinliği tavsiyesi, array indeksleme sözdizimi), (d) PowerShell/bash/Docker için pratik set örnekleri yer alıyor. Kod tarafında değişiklik yok, .NET zaten bu konvansiyonu destekliyor. Dışında: öncelik sırası, ortam bazlı kaynak tablosu, zorunlu/opsiyonel değişken listesi ve policy bölümleri (sonraki alt işlerde aynı dosyaya eklenecek))

- `✅` Development için User Secrets kurulumunu yap (`UserSecretsId` ekle, kullanım komutlarını belgele) (Kapsam: `CargoPilot.WebAPI.csproj` dosyasına `<UserSecretsId>cargo-pilot-backend</UserSecretsId>` eklendi. ASP.NET Core `WebApplication.CreateBuilder`, `ASPNETCORE_ENVIRONMENT=Development` olduğunda User Secrets'i otomatik yükler; `Program.cs`'de ekstra kod gerekmez. `docs/environment-variables.md` dosyasına "Development: User Secrets Kurulumu" bölümü eklendi; Windows/Linux için `dotnet user-secrets set` ve `dotnet user-secrets list` komutları, dosya konumu (`%APPDATA%/Microsoft/UserSecrets/cargo-pilot-backend/`) belgelendi. Dışında: CI ortamı için User Secrets devre dışı bırakma (CI'da env var kullanılır zaten), per-developer secrets rotation politikası)
- `✅` Local geliştirme için secret/config yükleme stratejisini belirle (User Secrets + `launchSettings.json` profilleri) (Kapsam: `docs/environment-variables.md` dosyasında yapılandırma öncelik sırası ve ortam bazlı kaynak tablosu tanımlandı: Docker'siz local geliştirmede User Secrets, Docker dev ortamında `.env.dev` -> compose env var zinciri kullanılır. `launchSettings.json` mevcut profili `ASPNETCORE_ENVIRONMENT: Development` ile korundu; bu ayar User Secrets'i otomatik aktıve eder, ayrı bir profil gerekmedi. Dışında: `launchSettings.json`'a Docker Compose profili eklenmesi (Visual Studio'nun Docker desteği bu senaryoyu ayrı kurgular), Staging ortamı için local profil)
- `✅` `.env.example` oluştur ve zorunlu/opsiyonel değişkenleri belgele (Kapsam: `infra/env/.env.dev.example` ve `infra/env/.env.prod.example` dosyaları oluşturuldu ve güncel tutuldu. `.env.dev.example` geliştirici için çalışan default değerlerle (MSSQL, MinIO, port'lar, `DATABASE_CONNECTION_STRING`) dolduruldu; `cp .env.dev.example .env.dev` ile hemen kullanılabilir. `.env.prod.example` production için placeholder değerler ve güvenlik uyarılarıyla dolduruldu. Zorunlu/opsiyonel değişken tablosu `docs/environment-variables.md` dosyasına eklendi. `.gitignore` `.env.dev`, `.env.prod`, `.env.test` dosyalarını repoya girmeyi engeller; `.env.*.example` dosyaları repoda kalır. Dışında: `.env.staging.example` (staging altyapısı kurulunca eklenecek), Kubernetes Secret manifest örneği)
- `✅` `docs/environment-variables.md` oluştur: naming standardı, öncelik sırası, ortam bazlı kaynak tablosu (user-secrets / env var / appsettings) (Kapsam: Dosya önceki story'de naming standardı bölümüyle oluşturulmuştu; bu story kapsamında genişletildi. Eklenen bölümler: (1) Yapılandırma Öncelik Sırası (appsettings.json -> appsettings.{Env}.json -> User Secrets -> Environment Variables -> CLI args), (2) Ortam Bazlı Secret Kaynakları tablosu (local/Docker dev, production), (3) Development User Secrets kurulum komutları, (4) Production bağlantı akış diyagramı (.env.prod -> compose -> IConfiguration -> GetConnectionString), (5) zorunlu/opsiyonel değişken tablosu. Dışında: Staging ortamı için ayrı tablo satırı (staging altyapısı netlesince eklenecek))
- `✅` Gizli verilerin dosyalarda tutulmamasını garanti edecek policy ekle (dokümanda + `.gitignore` + code review kuralı) (Kapsam: Uç katmanlı güvence kuruldu. (1) `.gitignore`: `infra/env/.env.dev`, `infra/env/.env.test`, `infra/env/.env.prod`, `.env`, `.env.*` satırları ile tüm gerçek env dosyaları engellendi; `!.env.*.example` ve `!infra/env/.env.*.example` satırları ile sadece örnek dosyalara izin verildi. (2) `docs/environment-variables.md` "Secret Management Policy" bölümü: `.env.prod` için `chmod 600` zorunluluğu, credentials'in appsettings/kaynak koda yazılmaması kuralı ve "PR review'larında connection string içeren dosyalar reddedilir" politikası dokümante edildi. (3) Uygulama kodu: `AppDbContextFactory` fallback connection string kaldırıldığı için sert kodlanmış secret girme imkanı ortadan kaldırıldı; `Program.cs`'de hassas veri loglayan `Console.WriteLine` satırları daha önce temizlenmişti. Dışında: otomatik secret tarama (git-secrets / trufflehog CI entegrasyonu), branch protection rule olarak secret scan zorunluluğu)

**Kanıtlar:**
- `apps/backend/.gitignore` (env dosya koruma kuralları)
- `infra/env/.env.prod.example`
- `CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` (UserSecretsId)
- `CargoPilot.WebAPI/Properties/launchSettings.json`
- `docs/environment-variables.md`


## 4) Kod yazım standartları (.editorconfig + statik analiz)
**Story:** Backend Chapter Lead olarak, tüm ekip üyelerinin aynı kod yazım standartlarına uymasını zorunlu kılmak için `.editorconfig` ve statik kod analiz araçlarının projeye dahil edilmesini isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` `.editorconfig` oluştur
- `✅` Kod stili kurallarını tanımla (indent, newline, naming)
- `✅` Analyzer paketlerini projeye ekle ve merkezileştir (Kapsam: `Microsoft.CodeAnalysis.NetAnalyzers` paket referansı `Directory.Build.props` altına taşındı, proje bazlı tekrarlar silindi.)
- `✅` Sonar analyzer paketini projeye ekle ve merkezileştir (Kapsam: `SonarAnalyzer.CSharp` paket referansı `Directory.Build.props` altına taşındı, versiyon kayması riski önlendi.)
- `✅` Warning policy (treat as error, quality gate) seviyesini netleştir (Kapsam: `apps/backend/Directory.Build.props` oluşturuldu; tüm backend projelerine ortak kural seti uygulanır. Ayarlar: (1) `TreatWarningsAsErrors=true` — lokal ve CI build'leri uyarı bulursa kırmızıya geçer, (2) `EnforceCodeStyleInBuild=true` — `.editorconfig` IDE kuralları build sırasında doğrulanır, (3) `AnalysisLevel=latest` + `AnalysisMode=Recommended`, (4) `GenerateDocumentationFile=true`. `WarningsNotAsErrors` ile `CS1591;CA1000;CA1716` muaf tutuldu. Ayrıca lokal hata düzeltmeleri (`S4144`, `IDE0005`, `S3400`, `S6966`) yapıldı.)

**Kanıtlar:**
- `.editorconfig`
- `Directory.Build.props`
- `CargoPilot.WebAPI/CargoPilot.WebAPI.csproj`
- `CargoPilot.Application/CargoPilot.Application.csproj`
- `CargoPilot.Domain/CargoPilot.Domain.csproj`
- `CargoPilot.Infrastructure/CargoPilot.Infrastructure.csproj`
- `CargoPilot.Infrastructure/Persistence/Repositories/InMemoryCargoRepository.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/HomeController.cs`
- `CargoPilot.WebAPI/Program.cs`

---

## 5) Connection string'in merkezi okunması + bulut DB bağlantısı
**Story:** Backend Chapter Lead olarak, uygulamanın veritabanı ile iletişim kurabilmesi için gerekli bağlantı bilgilerinin (Connection String) merkezi bir dosyadan okunmasını ve bulut üzerindeki veri tabanına bağlantısını sağlanılmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` Connection string'i configuration üzerinden oku (`GetConnectionString("DefaultConnection")`)
- `✅` Ortam bazlı connection string tanımları ekle (`appsettings.*.json`)
- `✅` Secret management'e taşı (User Secrets / Key Vault / env vars) (Kapsam: `CargoPilot.WebAPI.csproj` dosyasına `<UserSecretsId>cargo-pilot-backend</UserSecretsId>` eklendi; Docker'siz local geliştirmede `dotnet user-secrets set` ile connection string set edilebilir. Production için `docker-compose.prod.yml` backend servisine `ConnectionStrings__DefaultConnection: ${DATABASE_CONNECTION_STRING}` env binding'i eklendi; `.env.prod.example` dosyasına `DATABASE_CONNECTION_STRING` değişkeni eklendi. Dışında: Azure Key Vault / AWS Secrets Manager entegrasyonu (proje su an self-hosted Docker ortamında))
- `✅` Bulut DB endpoint ve güvenli bağlantı policy'sini dokümante et (Kapsam: `docs/environment-variables.md` dosyası genişletildi; eklenenler: (1) yapılandırma öncelik sırası (appsettings -> User Secrets -> env vars), (2) ortam bazlı secret kaynak tablosu (local/Docker dev, production), (3) User Secrets kurulum komutları, (4) production bağlantı akış diyagramı, (5) `TrustServerCertificate=True` açıklaması ve reverse proxy TLS notu, (6) secret management policy (chmod 600, gitignore, PR review kuralı), (7) zorunlu/opsiyonel değişken tablosu. Dışında: Nginx TLS konfigürasyonu, SSL sertifika kurulumu (infra story kapsamında))
- `✅` Connection resiliency/retry policy ekle (Kapsam: `CargoPilot.Infrastructure/DependencyInjection.cs` içindeki `AddDbContext` çağrısı `EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: 30s, errorNumbersToAdd: null)` ile güncellendi. EF Core SQL Server provider'in built-in transient fault detection'i kullanılıyor; geçici ağ kesintileri ve SQL Server yeniden başlatma senaryolarında otomatik retry yapılır. Dışında: Polly ile HTTP client retry policy, circuit breaker pattern)
- `✅` Hassas bilgi loglamasını kaldır (Kapsam: `Program.cs` içindeki `ApplicationSettings:AppName` ve `ConnectionStrings:DefaultConnection` değerlerini konsola yazan `Console.WriteLine` satırları, composition root refactor'u sırasında tamamen kaldırıldı. Böylece bağlantı dizesi ve uygulama meta verisi artık standart çıktı akımına yazılmıyor. Dışında: yapılandırılmış log çerçevesi (Serilog/ILogger) entegrasyonu ve hassas alan maskeleme kuralları)

### US-DB01: Merkezi bağlantı yönetimi — `✅ Tamamlandı`
Bağımlı branch: `feature/US-DB01-centralized-connection-string`. Runtime bağlantı dizesi artık tek kaynaktan (`infra/env/.env.dev`) okunuyor; ikinci bir hard-coded değere düzelme ihtiyacı kalmadı.

- `✅` `.env.dev.example` + `.env.dev` dosyalarına `DATABASE_CONNECTION_STRING` değişkeni eklendi (Kapsam: MSSQL bloğu altına, Docker network içinde geçerli `Server=mssql,1433;Database=CargoPilotDev;User Id=sa;Password=DevPassword123!;TrustServerCertificate=True;` değeri ile; host üzerinden `dotnet ef` çalıştırılırken `mssql` yerine `localhost` kullanılması gerektiği yorum satırında belirtildi. Dışında: `.env.test.example` ve `.env.prod.example` için benzer değişkenlerin tanımlanması (ilgili ortam compose dosyaları US-D03e kapsamında tamamlanınca eklenecek))
- `✅` `docker-compose.dev.yml` backend servisine `ConnectionStrings__DefaultConnection: ${DATABASE_CONNECTION_STRING}` env binding'i eklendi (Kapsam: `.env.dev` -> compose -> container env var zinciri kuruldu; .NET `EnvironmentVariablesConfigurationProvider` bu değeri doğrudan `IConfiguration.GetConnectionString("DefaultConnection")` üzerinden sunuyor, ara bir mapping gerekmiyor. Container yeniden oluşturulup env var'in `printenv ConnectionStrings__DefaultConnection` ile doğrulanması yapıldı. Dışında: kullanılmayan `MSSQL_HOST/PORT/USER/PASSWORD` env entry'lerinin backend servisinden temizlenmesi (ileri bir temizlik commit'ine bırakıldı; fonksiyonel etki yok))
- `✅` `AppDbContextFactory` içindeki sert kodlanmış `FallbackConnectionString` kaldırıldı (Kapsam: `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs` içindeki `Server=localhost;...Trusted_Connection=True;...` sabiti ve `?? FallbackConnectionString` null-coalescing zinciri silindi. Env var tanımsızsa tasarım zamanı komutları net bir `InvalidOperationException` ile durup "dotnet ef komutlarından önce bu değişkeni set et" mesajıyla kullanıcıyı `.env.dev` değerine yönlendiriyor; sessiz localhost-fallback davranışı böylece ortadan kaldırıldı. Dışında: `Program.cs:9`'daki `useInMemoryRepository: builder.Environment.IsDevelopment()` flag'i — runtime'da MSSQL'e geçiş için ayrı bir commit'e bırakıldı, bu is sadece altyapıyı hazırladı))

**Kanıtlar:**
- `CargoPilot.WebAPI/Program.cs`
- `CargoPilot.WebAPI/appsettings.Development.json`
- `CargoPilot.WebAPI/appsettings.Staging.json`
- `CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` (UserSecretsId)
- `infra/env/.env.prod.example` (DATABASE_CONNECTION_STRING)
- `infra/compose/docker-compose.prod.yml` (ConnectionStrings__DefaultConnection binding)
- `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs`
- `CargoPilot.Infrastructure/DependencyInjection.cs` (EnableRetryOnFailure)
- `docs/environment-variables.md`

---

## 6) EF Core entegrasyonu + temel DbContext
**Story:** Backend Chapter Lead olarak, uygulamanın SQL Server ve Bulut veritabanlarıyla iletişim kurabilmesi için Entity Framework Core entegrasyonunu ve temel DbContext yapısının kurulmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` EF Core SQL Server paketlerini ekle
- `✅` `AppDbContext` sınıfını oluştur
- `✅` DI ile `AddDbContext` kaydını yap
- `✅` İlk migration ve veritabanı oluşturma akışını dokümante et (Kapsam: `apps/backend/docs/database-migrations.md` dosyası oluşturuldu; 10 bölümlük pratik rehber. İçerik: (1) `dotnet-ef` global tool kurulumu ve doğrulama komutları, (2) `ConnectionStrings__DefaultConnection` env var kaynak sırası ve Windows Auth / SA / Docker için örnek connection string'ler, (3) komutların `apps/backend/` dizininden çalıştırılma standardı, (4) ilk migration üretimi: `dotnet ef migrations add InitialCreate --project CargoPilot.Infrastructure --startup-project CargoPilot.WebAPI --output-dir Persistence/Migrations` ve parametre açıklamaları, (5) `database update` ile DB oluşturma/güncelleme, belirli migration'a geri dönme, `0` ile tüm migration'ları geri alma, (6) yeni migration ekleme isim kuralı (PascalCase, örnekler `AddCargoWeightColumn` vb), (7) migration iptal akışı (DB'ye uygulanmadan `migrations remove`, uygulandıysa önce `database update <Onceki>`), (8) ortam bazlı akış: Dev modunda InMemory repo aktifken factory sayesinde migration'lar çalışır, prod'da env var zorunlu ve auto-migrate vs pipeline-step seçimleri, (9) SQL script üretme (`migrations script`) DBA akışı, (10) sorun giderme tablosu (6 yaygın hata ve çözüm). Dokümanın çalışır olması için `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs` eklendi: `IDesignTimeDbContextFactory<AppDbContext>` implementasyonu, `ConnectionStrings__DefaultConnection` env var'i okur, local SQL fallback'i var; sadece tasarım zamanı çağrılır, runtime'da kullanılmaz. Bu olmadan Development ortamında (`useInMemoryRepository: true` iken `AddDbContext` kaydedilmediği için) `dotnet ef` komutları "Unable to create an object of type 'AppDbContext'" hatası verirdi; factory bu blokajı ortadan kaldırır ve EF CLI akışını runtime DI'dan bağımsız kılar. Dışında: ilk migration dosyasının gerçek üretimi (tercihen ilk DB bağlantısı story'si ile birlikte yapılacak), auto-migrate policy'sinin prod için netleştirilmesi (Story 5 + CI/CD story'leri), seed data stratejisi (ayrı story))
- `✅` DbSet bazlı domain tablolarını oluştur (`DbSet<Cargo>`)

**Kanıtlar:**
- `CargoPilot.Infrastructure/CargoPilot.Infrastructure.csproj`
- `CargoPilot.Infrastructure/Persistence/AppDbContext.cs`
- `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs`
- `CargoPilot.WebAPI/Program.cs`
- `docs/database-migrations.md`

---

## 7) Base Entity standardı
**Story:** Backend Chapter Lead olarak, tüm veritabanı tablolarında Id, CreatedDate, UpdatedDate ve IsDeleted (Soft Delete) gibi alanların standart olmasını sağlayan bir Base Entity yapısının kurulmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` Story 7 öncesi ortam doğrulaması: `global.json` (SDK `8.0.419`, `rollForward: latestPatch`) uyumlu `8.0.420` ile `dotnet build CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` başarıyla tamamlandı (0 hata); böylece BaseEntity türetmesi öncesi baseline temiz build teyit edildi.
- `✅` İlk `InitialCreate` migration'ini üret (Kapsam: `dotnet ef migrations add InitialCreate --project CargoPilot.Infrastructure --startup-project CargoPilot.Infrastructure --output-dir Persistence/Migrations` komutu ile `20260418104913_InitialCreate.cs`, `.Designer.cs` ve `AppDbContextModelSnapshot.cs` dosyaları oluşturuldu. Migration; `Cargos` tablosunu üretiyor: `Id uniqueidentifier PK`, `TrackingNumber nvarchar(64) NOT NULL`, `Status int NOT NULL`. EF CLI `AppDbContextFactory` üzerinden tasarım zamanı context oluşturduğu için `ConnectionStrings__DefaultConnection` env var'i olmadan da üretim başarılı oldu. Bu migration BaseEntity çalışması için referans snapshot görevi görür; `BaseEntity` eklendiğinde bir sonraki `AddBaseEntity` migration'i bu baseline üzerinden `CreatedDate`, `UpdatedDate`, `IsDeleted` kolonlarını getirecek. Dışında: migration'in aktif DB'ye uygulanması (Story 5 kapsamında DB endpoint netleştikten sonra `database update`))
- `✅` Migration generator ile `TreatWarningsAsErrors` kalite kapısı arasındaki çatışmayı mimarı seviyede çöz (Kapsam: `InitialCreate` üretildikten sonra ilk build `IDE0005: Using directive is unnecessary` hatasıyla kırıldı. Sebep: EF Core generator her migration dosyasının basına sabit olarak `using System;` ekler, ancak `CargoPilot.Infrastructure.csproj` içinde `<ImplicitUsings>enable</ImplicitUsings>` açık olduğu için `System` namespace'i zaten global olarak import edilir ve satır gereksiz sayılır. Story 4'te aktif edilen `TreatWarningsAsErrors=true` + `EnforceCodeStyleInBuild=true` policy'si bu uyarıyı hataya çevirdiği için build kırıldı. Her migration üretildiğinde satırı elle silmek (a) gelecekteki ekip üyeleri için ayak bağı, (b) generated koda manuel müdahale anti-pattern'i. Çözüm olarak `.editorconfig` dosyasına `[**/Persistence/Migrations/*.cs]` bölümü eklendi: `generated_code = true` ile bu klasör generated kod olarak işaretlendi (analyzer'lar bu dosyaları otomatik atlar), `dotnet_diagnostic.IDE0005.severity = none` ile style analizi muafiyeti kesinleştirildi. Sonraki build 0 hata / 83 uyarı (tümü CS1591, policy muaf) ile geçti. Dışında: Migrations klasörü için başka analyzer kuralı customize'i (ileri story'lerde ihtiyaç doğarsa))
- `✅` Domain'de `BaseEntity` tanımla (Kapsam: `CargoPilot.Domain/Entities/BaseEntity.cs` oluşturuldu. Alanlar: `Id (Guid, protected set)`, `CreatedDate (DateTime, private set)`, `UpdatedDate (DateTime, private set)`, `IsDeleted (bool, private set)`, `CreatedBy (Guid?, private set)`, `UpdatedBy (Guid?, private set)`. `protected BaseEntity()` EF Core tasarım zamanı nesneleştirmesi için; `protected BaseEntity(Guid id)` uygulama kodu için — `id == Guid.Empty` doğrulaması burada merkezi olarak yapılıyor. Audit property'leri `private set` ile korunuyor; EF Core `ChangeTracker.CurrentValue` API'si CLR seviyesinde setter'i atlayarak alanlara yazacağı için Sonar S1144 ("kullanılmayan private setter") yanh pozitif üretir. Bunu suppress etmek için iki adım atıldı: (a) `apps/backend/.editorconfig` dosyasına `[**/Domain/Entities/BaseEntity.cs]` bölümü ile `dotnet_diagnostic.S1144.severity = none` eklendi — ancak Sonar Roslyn analyzer bu glob pattern'i build sırasında okuyamadı, (b) doğrudan kaynak dosyaya `#pragma warning disable S1144 / #pragma warning restore S1144` eklendi — bu Roslyn tabanlı her analyzer için garantili çalışır. Dışında: `CreatedBy`/`UpdatedBy` için gerçek userId (auth story'si ile gelecek), domain event pattern, `DeletedDate` stamp)
- `✅` Tüm aggregate/entity sınıflarını `BaseEntity`den türet (Kapsam: `Cargo` sınıfı `BaseEntity`'den türetildi. `Id` property'si `Cargo`'dan kaldırıldı (artık `BaseEntity`'de). Constructor `base(id)` çağrısı ile id doğrulamasını `BaseEntity`'ye delege ediyor. EF Core için `protected Cargo() : base() { TrackingNumber = null!; }` constructor'i eklendi — `private` yerine `protected` kullanıldı: Sonar S1144 private constructor'ları "kullanılmayan" olarak işaretler çünkü EF Core reflection ile çağırdığını göremez; `protected` yapılarak bu false pozitif engellendi. `TrackingNumber = null!` null-forgiving ataması CS8618 uyarısını susturur — bu EF Core constructor'i olduğu için compiler doğrulama yapamaz, anlambilim olarak doğru. Dışında: başka aggregate/entity yoktur; yenisi eklendiği zaman aynı pattern izlenecek)
- `✅` `SaveChanges` seviyesinde audit alanlarını otomatik set et ve `CreatedBy`/`UpdatedBy` için `ICurrentUserService` altyapısını kur (Kapsam: `AppDbContext.SaveChangesAsync` ve `SaveChanges` override edilerek `ApplyAuditFields()` private metodu çağrılır. Metod `ChangeTracker.Entries<BaseEntity>()` üzerinden tüm tracked entity'leri tarar: `EntityState.Added` ise `CreatedDate`, `UpdatedDate`, `CreatedBy`, `UpdatedBy` set edilir; `EntityState.Modified` ise sadece `UpdatedDate` ve `UpdatedBy` set edilir. Set işlemi `entry.Property(x => x.CreatedDate).CurrentValue = now` şeklinde EF Core'un expression tree API'si üzerinden yapılır — bu yöntem `private set` kısıtını atlar. Kim-değiştirdi bilgisi için `ICurrentUserService` interface'i `CargoPilot.Application/Abstractions/ICurrentUserService.cs` olarak tanımlandı (tek property: `Guid? UserId`); `CargoPilot.Infrastructure/Services/AnonymousCurrentUserService.cs` `UserId => null` döndürecek şekilde implement edildi (`internal sealed`). `Infrastructure/DependencyInjection.cs` içinde `services.AddScoped<ICurrentUserService, AnonymousCurrentUserService>()` kaydedildi. `AppDbContext` constructor'ina `ICurrentUserService` inject edildi. `AppDbContextFactory` (design-time, DI'siz) `new AnonymousCurrentUserService()` ile doğrudan örneklendi. Auth story'si geldiğinde yalnızca `AnonymousCurrentUserService` yerine `JwtCurrentUserService` yazılıp DI kaydedilecek; `AppDbContext`, `BaseEntity`, `Cargo` değişmez. Dışında: gerçek `UserId` okuma (JWT/session), `IHttpContextAccessor` inject etme, `CreatedBy`/`UpdatedBy` için navigation property)
- `✅` Soft delete query filter'larini global olarak tanımla ve `IsDeleted` için index ekle (Kapsam: `AppDbContext.OnModelCreating` içinde `Cargo` entity konfigürasyonuna `entity.HasQueryFilter(cargo => !cargo.IsDeleted)` eklendi — bu sayede tüm `SELECT` sorgularına otomatik `WHERE IsDeleted = 0` eklenir. Silinen kaydı görmek gerektiğinde `dbContext.Cargos.IgnoreQueryFilters().Where(...)` kullanılır. Performans için `entity.HasIndex(cargo => cargo.IsDeleted)` ile `IX_Cargos_IsDeleted` indeksi tanımlandı. Audit kolonları (`CreatedDate NOT NULL`, `UpdatedDate NOT NULL`, `IsDeleted NOT NULL DEFAULT 0`, `CreatedBy uniqueidentifier NULL`, `UpdatedBy uniqueidentifier NULL`) entity konfigürasyonunda `IsRequired()`/`HasDefaultValue(false)` ile belirtildi. Dışında: cascade soft delete (ilişkili entity'ler, proje su an tek aggregate), `DeletedDate` / `DeletedBy` stamp alanları, soft delete için ayrı repository metotları (`ListIncludingDeleted` vb.))
- `✅` `AddBaseEntity` migration'ini üret ve son build doğrula (Kapsam: `dotnet ef migrations add AddBaseEntity --project CargoPilot.Infrastructure --startup-project CargoPilot.Infrastructure --output-dir Persistence/Migrations` komutu başarıyla tamamlandı; `20260418115212_AddBaseEntity.cs` ve `.Designer.cs` oluşturuldu. Migration `Cargos` tablosuna `CreatedBy (uniqueidentifier NULL)`, `CreatedDate (datetime2 NOT NULL)`, `IsDeleted (bit NOT NULL DEFAULT 0)`, `UpdatedBy (uniqueidentifier NULL)`, `UpdatedDate (datetime2 NOT NULL)` kolonlarını ve `IX_Cargos_IsDeleted` indeksini ekler. Migration sonrası `dotnet build CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` 0 hata ile tamamlandı. Dışında: `database update` ile DB'ye uygulanması (Story 5 kapsamında aktif bağlantı sağlannca))

**Kanıtlar:**
- `CargoPilot.Domain/Entities/BaseEntity.cs`
- `CargoPilot.Domain/Entities/Cargo.cs`
- `CargoPilot.Application/Abstractions/ICurrentUserService.cs`
- `CargoPilot.Infrastructure/Services/AnonymousCurrentUserService.cs`
- `CargoPilot.Infrastructure/DependencyInjection.cs`
- `CargoPilot.Infrastructure/Persistence/AppDbContext.cs`
- `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs`
- `CargoPilot.Infrastructure/Persistence/Migrations/20260418115212_AddBaseEntity.cs`
- `apps/backend/.editorconfig`

---

## 8) Standart API response yapısı
**Story:** Backend Chapter Lead olarak, API'den dönen tüm yanıtların, tahmin edilebilir ve standart bir JSON yapısında olmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` Uygulama katmanında `Result<T>` ve `Error` modellerini oluştur (Kapsam: TDD Madde 1.1'e uygun PascalCase ve isSuccess, data, error yapısını taşıyan generic sarmalayıcı sınıfları uygulandı.)
- `✅` Tanımlı tek bir response contract'i belirle (success/error envelope) (Kapsam: JSON formatının PascalCase kalmasını sağlamak için JsonSerializerOptions güncellendi ve tüm sonuçların ortak BaseController üzerinden dönülmesi standartlaştırıldı.)
- `✅` Tüm controller endpointlerini bu contract ile hizala (Kapsam: CargosController ve HomeController sınıfları BaseController'dan türetildi ve HandleResult metoduyla Result<T> dönecek şekilde düzenlendi.)
- `✅` ErrorType enum ekle ve BaseController'da HTTP status code mapping'i kur (Kapsam: `Error.cs` dosyasına `ErrorType` enum eklendi (None/Validation/Unauthorized/Forbidden/NotFound/Conflict/BusinessRule/RateLimit/Unexpected). `Error` record constructor'i `ErrorType Type` parametresi alacak şekilde güncellendi. `BaseController.HandleResult` metodu `result.Error.Type` switch expression ile hata tipine göre doğru HTTP status code dönecek şekilde yeniden yazıldı: Validation→400, Unauthorized→401, Forbidden→403, NotFound→404, Conflict→409, BusinessRule→422, RateLimit→429, Unexpected→500. Önceki sabit `BadRequest(result)` dönüşü kaldırıldı. `CreateCargoUseCase` içindeki `new Error("ValidationError", message)` çağrısı yeni constructor imzasına uygun `new Error(ErrorType.Validation, "ValidationError", message)` olarak güncellendi. `GlobalExceptionMiddleware` de aynı şekilde `ErrorType.Unexpected` kullanacak şekilde düzeltildi.)
- `⬜` Validation hatalarını da aynı response yapısına bağla
- `✅` Swagger üzerinde response tiplerini standart göster (Kapsam: ProducesResponseType kullanılarak Swagger dokümantasyonunda API dönüş tipleri Result<T> olacak şekilde kapsüllendi.)

**Kanıtlar:**
- `CargoPilot.Application/Common/Models/Result.cs`
- `CargoPilot.Application/Common/Models/Error.cs`
- `CargoPilot.WebAPI/Controllers/BaseController.cs`
- `CargoPilot.WebAPI/Controllers/CargosController.cs`
- `CargoPilot.WebAPI/Controllers/HomeController.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`

---

## 9) Global Exception Handling
**Story:** Backend Chapter Lead olarak, uygulama genelinde fırlatılan tüm beklenmedik hataların merkezi bir noktadan yakalanmasını (Global Exception Handling) isterim.

**Genel Durum:** `🟡 Kısmi / Devam ediyor`

### Alt İşler
- `✅` Global exception middleware veya `UseExceptionHandler` ekle (Kapsam: `IMiddleware` arayüzünü uygulayan `GlobalExceptionMiddleware` oluşturuldu ve `DependencyInjection.cs` üzerinden kaydedildi.)
- `✅` Exception-to-response map stratejisi belirle (Kapsam: Mimarı dokümanlarda belirtildiği gibi hataların `Result<T>` formatına map edilmesi kararlaştırıldı.)
- `✅` Beklenmeyen hatalarda standart error response dön (Kapsam: Beklenmeyen hataların (`Exception`) 500 status code ile standart JSON (`IsSuccess: false`, `Error` içeren) zarfına dönüştürülerek dönülmesi sağlandı.)
- `🟡` Correlation id ve loglama bağlantısını kur (Kapsam: `[LoggerMessage]` source generator ile yüksek performanslı loglama kuruldu (CA1848 ihlali önlendi). Eksik: `context.TraceIdentifier` henüz log mesajına ve response zarfına eklenmedi; correlation ID takibi tamamlanmamış.)
- `⬜` Exception handling için unit/integration test ekle

**Kanıtlar:**
- `CargoPilot.WebAPI/Middlewares/GlobalExceptionMiddleware.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`

---

## 10) Swagger dokümantasyonu
**Story:** Backend Chapter Lead olarak 3D ve Platform squad'larının geliştirme yapabilmesi için API uç noktalarını Swagger ile dokümante edilmesini isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` Swagger servislerini ekle (`AddEndpointsApiExplorer`, `AddSwaggerGen`)
- `✅` Swagger middleware kur (`UseSwagger`, `UseSwaggerUI`)
- `✅` Swagger görünürlüğünü ortamlara göre netleştir (sadece development dışı gereksinim) (Kapsam: `DependencyInjection.cs` içerisinde `app.Environment.IsDevelopment()` kontrolü `!app.Environment.IsProduction()` olarak değiştirildi. Böylece Swagger; Development ve Staging ortamlarında görünür duruma, yalnızca güvenlik amacıyla Production ortamında erişime kapalı hale getirildi.)
- `✅` Endpoint summary/description/response kod dokümantasyonlarını tamamla (Kapsam: XML dokümantasyon üretimi için `CargoPilot.WebAPI.csproj` dosyasına `<GenerateDocumentationFile>true</GenerateDocumentationFile>` eklendi. Gerekli olmayan `<NoWarn>1591</NoWarn>` public property yorum uyarıları sessize alındı. Projedeki `Assembly.GetExecutingAssembly().GetName().Name + ".xml"` yolu yakalanarak `SwaggerGen` `IncludeXmlComments` metoduyla bağlandı. Sonrasında `CargosController` ve `HomeController` endpoint'lerine `/// <summary>`, `/// <response>` xml dokümanları ve `[ProducesResponseType]` attribute'ları girildi. 200/400 dönüş modelleri (`CreateCargoResponse`, `WelcomeResponse` vs.) Swagger'a açıldı. Controller isim karmaşasını önlemek için `[Tags("Cargos")]` şeklinde grouping etiketleri kullanıldı.)
- `✅` Auth kullanılıyorsa Swagger auth ayarlarını ekle (Kapsam: Henüz projenin JWT akışları kurulmamış olsa da, gelecekte iskelet teşkil etmesi adına Swagger tarafında JWT token butonunu çıkaracak ayarlar eklendi. `Options.AddSecurityDefinition` ve `AddSecurityRequirement` konfigleri Swashbuckle v10 standardına göre yapılandırıldı. Auth story implement edildiğinde Swagger üzerinden 'Authorize' tuşuyla test edilebilecek hale getirildi.)

**Kanıtlar:**
- `CargoPilot.WebAPI/Program.cs`
- `CargoPilot.WebAPI/CargoPilot.WebAPI.csproj`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/Controllers/CargosController.cs`
- `CargoPilot.WebAPI/Controllers/HomeController.cs`

---

## 11) US-AUTH-09: Refresh Token Endpoint (Token Rotation)
**Story:** Backend Chapter Lead olarak, oturumun güvenli bir şekilde yenilenmesi için POST /api/v1/auth/refresh endpoint'inin eklenmesini, refresh token'ların DB'de saklanmasını ve rotation + revoke kontrollerinin uygulanmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` Refresh Token'in HttpOnly Cookie ile döndürülmesi (Kapsam: Login endpoint'i refresh token'i artık response body'ye değil, `HttpOnly=true, Secure=true, SameSite=None` Cookie olarak yazar. Bu sayede JS ortamı token'a erişemez.)
- `✅` `POST /api/v1/auth/refresh` endpoint'inin eklenmesi (Kapsam: `AuthController`'a `[HttpPost("refresh")]` eklendi. Cookie'den token okunur, eksikse 401 döner.)
- `✅` `RefreshTokenAsync` servisi ile Token Rotation mekanizmasının implementasyonu (Kapsam: `IAuthService` ve `AuthService`'e `RefreshTokenAsync` eklendi. Eski session `Revoke()` ile iptal edilir, yeni access+refresh token çifti üretilip yeni `UserSession` DB'ye yazılır.)
- `✅` `UserSession.Revoke()` domain metodu eklenmesi (Kapsam: Encapsulation kuralı gereği `IsRevoked` sadece `Revoke()` metodu üzerinden `true` yapılabilir.)
- `✅` `AuthErrors.InvalidToken` hata tanımının eklenmesi (Kapsam: Süresi dolmuş, iptal edilmiş veya bulunamayan token'lar için standart hata kodu: `AUTH_INVALID_TOKEN`.)
- `✅` `RefreshResponse` ve `LoginResponse` DTO'larinda güvenlik sıkılaşması (Kapsam: `RefreshToken` ve `RefreshTokenExpiresAt` alanlarına `[JsonIgnore]` eklendi; bu alanlar JSON body'ye yazılmaz, yalnızca controller'in cookie set etmesi için DTO içerisinde taşınır.)

**Kanıtlar:**
- `CargoPilot.Domain/Entities/UserSession.cs`
- `CargoPilot.Application/Features/Auth/IAuthService.cs`
- `CargoPilot.Application/Features/Auth/DTOs/RefreshResponse.cs`
- `CargoPilot.Application/Common/Errors/AuthErrors.cs`
- `CargoPilot.Infrastructure/Auth/AuthService.cs`
- `CargoPilot.WebAPI/Controllers/AuthController.cs`

---

## 12) US-DASH-04: Yükleme Planı Liste ve Detay Endpoint'leri
**Story:** Dashboard geliştirici olarak, yükleme planlarını sayfalı/sıralı listeleyebilmek ve tek bir planı tüm detaylarıyla getirebilmek için backend endpoint'lerinin hazır olmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` `ILoadingPlanRepository` interface'ini tanımla (`CargoPilot.Application/Common/Interfaces/ILoadingPlanRepository.cs`)
- `✅` `LoadingPlanRepository` implementasyonunu yaz (EF Core, `AsNoTracking`, N+1 önlemi için 4 ayrı sorgu)
- `✅` `GetPlansQuery` + `GetPlansQueryHandler` (sayfalı/sıralı liste, `PlanSummaryDto`)
- `✅` `GetPlansQueryValidator` (page ≥ 1, pageSize 1–100, geçerli sortBy/sortDirection değerleri)
- `✅` `GetPlanByIdQuery` + `GetPlanByIdQueryHandler` (vehicle, placements, unplaced items, warnings)
- `✅` DTO'lar: `PlanSummaryDto`, `PlanDetailDto`, `VehicleInPlanDto`, `PlacementDto`, `ItemInPlanDto`, `UnplacedItemDto`, `WarningDto`
- `✅` `PlansController` — route `api/v1/loading-plans`, `[Authorize]` class-level
- `✅` `ILoadingPlanRepository` DI kaydı (`DependencyInjection.cs`)
- `✅` `IUserVehicleFavoriteRepository` DI kaydı merge conflict sonrası geri eklendi
- `✅` Build: 0 hata doğrulandı; uygulama `http://localhost:8081` adresinde hatasız ayağa kalktı

### Kanıtlar
- `CargoPilot.Application/Common/Interfaces/ILoadingPlanRepository.cs`
- `CargoPilot.Application/Features/Plans/GetPlans/` (Query, Handler, Validator, Dto)
- `CargoPilot.Application/Features/Plans/GetPlanById/` (Query, Handler, tüm Dto'lar)
- `CargoPilot.Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/DependencyInjection.cs`
- `CargoPilot.WebAPI/Controllers/PlansController.cs`
## 13) US-AUTH-12: Yeni Cihaz Girişi Bildirimi
**Story:** Backend Chapter Lead olarak, kullanıcının hesabına daha önce giriş yapılmamış bir cihazdan/tarayıcıdan erişim sağlandığında e-posta bildirimi gönderilmesini ve kullanıcının tek tıkla tüm oturumlarını sonlandırıp şifre sıfırlama akışına yönlendirilmesini isterim.

**Genel Durum:** `✅ Tamamlandı`

### Kabul Kriterleri
- AC1: Kullanıcı bilinen bir cihazdan giriş yaptığında hiçbir bildirim gönderilmez.
- AC2: Kullanıcı yeni bir cihazdan (farklı User-Agent) giriş yaptığında uyarı e-postası gönderilir; e-posta cihaz özetini ve UTC giriş zamanını içerir.
- AC3: E-postadaki "Hesabımı Güvenliğe Al" linki tıklandığında tüm aktif oturumlar iptal edilir ve kullanıcı şifre sıfırlama sayfasına yönlendirilir.
- AC4: Yeni cihaz tespiti OAuth (Google) girişleri için de çalışır.

### Alt İşler
- `✅` `UserSession` entity'sine `DeviceSummary` kolonu ekle (Kapsam: `UserSession.cs` güncellendi; `DeviceSummary` nullable `nvarchar(500)` alanı eklendi. `UserSessionConfiguration.cs` içinde EF kolon kısıtları tanımlandı. `20260501170422_AddDeviceSummaryToUserSession` migration'i üretildi.)
- `✅` Login akışında yeni cihaz tespiti yap (Kapsam: `AuthService.IssueTokensAsync` metodu güncellendi; User-Agent header'i `DeviceSummary` olarak kaydedilir. `UserSessions` tablosunda aynı `UserId + DeviceSummary` çifti yoksa `isNewDevice = true` set edilir.)
- `✅` Yeni cihaz tespitinde uyarı e-postası gönder (Kapsam: `IEmailService` arabirimine `SendNewDeviceWarningEmailAsync` eklendi. `ResendEmailService` HTML + plain-text şablonlu implementasyonu yazıldı. E-posta: cihaz/tarayıcı bilgisi, UTC tarih/saat ve "Hesabımı Güvenliğe Al" butonu içerir.)
- `✅` `GET /api/v1/auth/secure-account` endpoint'ini ekle (Kapsam: `IAuthService` ve `AuthService`'e `SecureAccountAsync` eklendi. Endpoint token'i doğrular, tüm aktif oturumlarını iptal eder, yeni bir şifre sıfırlama token'i üretir ve frontend şifre sıfırlama sayfasına 302 yönlendirir.)
- `✅` E-postadaki link için güvenli token üret (Kapsam: `RandomNumberGenerator.GetBytes(32)` ile ham token üretilir; `WebEncoders.Base64UrlEncode` ile URL-safe string'e dönüştürülür; `SHA256(rawBytes)` ile hash hesaplanıp DB'ye kaydedilir. Tüketimde `WebEncoders.Base64UrlDecode` ile ham byte'lara dönülür ve hash yeniden hesaplanarak eşleştirilir. Bu yaklaşım string tabanlı encoding farkından kaynaklanan hash uyumsuzluklarını ortadan kaldırır.)
- `✅` `OAuthLoginCommand` ve `OAuthLoginCommandHandler`'a `ipAddress` ve `userAgent` parametreleri ekle (Kapsam: OAuth girişlerinde de cihaz tespiti ve bildirim akışı çalışsın diye güncellendi.)
- `✅` `PasswordResetSettings`'e `BackendBaseUrl` alanı ekle (Kapsam: `secure-account` linki üretiminde backend URL'i konfigürasyon üzerinden okunur; `appsettings.json` ve `appsettings.Development.json` güncellendi.)
- `✅` `Microsoft.AspNetCore.WebUtilities` paketini `Infrastructure` projesine ekle (Kapsam: `WebEncoders` sınıfından faydalanmak için `CargoPilot.Infrastructure.csproj` güncellendi.)

**Kanıtlar:**
- `CargoPilot.Domain/Entities/UserSession.cs`
- `CargoPilot.Application/Abstractions/IEmailService.cs`
- `CargoPilot.Application/Common/Settings/PasswordResetSettings.cs`
- `CargoPilot.Application/Features/Auth/IAuthService.cs`
- `CargoPilot.Application/Features/Auth/OAuthLogin/OAuthLoginCommand.cs`
- `CargoPilot.Application/Features/Auth/OAuthLogin/OAuthLoginCommandHandler.cs`
- `CargoPilot.Infrastructure/Auth/AuthService.cs`
- `CargoPilot.Infrastructure/CargoPilot.Infrastructure.csproj`
- `CargoPilot.Infrastructure/Persistence/Configurations/UserSessionConfiguration.cs`
- `CargoPilot.Infrastructure/Persistence/Migrations/20260501170422_AddDeviceSummaryToUserSession.cs`
- `CargoPilot.Infrastructure/Services/ResendEmailService.cs`
- `CargoPilot.WebAPI/Controllers/AuthController.cs`
- `CargoPilot.WebAPI/appsettings.json`
- `CargoPilot.WebAPI/appsettings.Development.json`

---

## 14) Loading Plan CRUD Endpoint'leri (Oluştur / İsim Güncelle / Sil)
**Story:** Backend geliştirici olarak, yükleme planı oluşturabilmek, plan adını güncelleyebilmek ve planı soft-delete ile silebilmek için CRUD endpoint'lerinin hazır olmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Alt İşler
- `✅` `IOptimizationEngine` interface'ini tanımla (`CargoPilot.Application/Common/Interfaces/IOptimizationEngine.cs`)
- `✅` `NoOpOptimizationEngine` mock implementasyonu yaz (`CargoPilot.Infrastructure/Services/NoOpOptimizationEngine.cs`)
- `✅` `IOptimizationEngine` DI kaydı eklendi (`DependencyInjection.cs`)
- `✅` `CreatePlanItemRequest` record tanımla (ItemId, Quantity)
- `✅` `CreatePlanCommand` tanımla (PlanName, VehicleId, Items, OptimizationCriteria)
- `✅` `CreatePlanCommandValidator` yaz (PlanName max 100, VehicleId NotEmpty, Items NotEmpty, her item Quantity > 0)
- `✅` `CreatePlanCommandHandler` yaz (Vehicle 404 kontrolü, inputTotalQuantity hesabı, LoadingPlan oluştur, Add + SaveChanges + RunOptimizationAsync)
- `✅` `UpdatePlanNameCommand` tanımla (Id, PlanName)
- `✅` `UpdatePlanNameCommandValidator` yaz (PlanName max 100)
- `✅` `UpdatePlanNameCommandHandler` yaz (GetByIdAsync 404 kontrolü, plan.UpdatePlanName, SaveChanges)
- `✅` `LoadingPlan.UpdatePlanName(string)` domain metodu eklendi (`private set` koruması için)
- `✅` `DeletePlanCommand` tanımla (Id)
- `✅` `DeletePlanCommandHandler` yaz (GetByIdAsync 404 kontrolü, plan.MarkAsDeleted, SaveChanges)
- `✅` `ILoadingPlanRepository` genişletildi (GetByIdAsync, Add, SaveChangesAsync)
- `✅` `LoadingPlanRepository` implementasyonları eklendi (GetByIdAsync tracking olmadan, Add, SaveChangesAsync)
- `✅` `PlansController` güncellendi — POST 201, PATCH 200, DELETE 200; XML summary'ler eklendi
- `✅` Build: 0 hata doğrulandı; uygulama `http://localhost:8081` adresinde hatasız ayağa kalktı

### Kanıtlar
- `CargoPilot.Application/Common/Interfaces/IOptimizationEngine.cs`
- `CargoPilot.Application/Features/Plans/CreatePlan/` (Command, ItemRequest, Validator, Handler)
- `CargoPilot.Application/Features/Plans/UpdatePlanName/` (Command, Validator, Handler)
- `CargoPilot.Application/Features/Plans/DeletePlan/` (Command, Handler)
- `CargoPilot.Application/Common/Interfaces/ILoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/Services/NoOpOptimizationEngine.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/DependencyInjection.cs`
- `CargoPilot.Domain/Entities/LoadingPlan.cs`
- `CargoPilot.WebAPI/Controllers/PlansController.cs`

---

## 15) US-REP-03: Yükleme Planı Rapor Listesi Endpoint'i
**Story:** Rapor sayfası geliştirici olarak, geçmiş yükleme planı raporlarını filtreli ve sayfalı listeleyebilmek için backend endpoint'inin hazır olmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

### Kabul Kriterleri
- AC1: Rapor listesi `CreatedAtUtc` desc sıralı döner; her satırda `planName`, `createdAt`, `vehiclePlate`, `fillRate`, `status`, `reportId`, `downloadUrl` alanları bulunur.
- AC2: Tarih aralığı (`startDate`/`endDate`), araç (`vehicleId`), doluluk oranı aralığı (`minFillRate`/`maxFillRate`) filtreleri ve sayfalama (`page`/`pageSize`) desteklenir.
- AC3: Her satırda PDF indirme bilgisi (`reportId`/`downloadUrl`) endpoint'ten döner; frontend bu URL ile indirme yapabilir.
- AC4: Kayıt yoksa `items=[]`, `totalCount=0` döner; frontend empty state gösterebilir.

### Alt İşler
- `✅` `LoadingPlanReportDto` record tanımla (`Id`, `PlanName`, `CreatedAtUtc`, `VehiclePlate`, `FillRate`, `Status`, `ReportId`, `DownloadUrl`)
- `✅` `GetLoadingPlanReportsQuery` record tanımla (`StartDate`, `EndDate`, `VehicleId`, `MinFillRate`, `MaxFillRate`, `Page`, `PageSize`)
- `✅` `GetLoadingPlanReportsQueryValidator` yaz (Page ≥ 1, PageSize 1–100, FillRate 0–100, MinFillRate ≤ MaxFillRate, StartDate ≤ EndDate)
- `✅` `GetLoadingPlanReportsQueryHandler` yaz (validasyon + repository çağrısı, `Result.Success` ile dön)
- `✅` `LoadingPlan` entity'sine `ReportId (Guid?)` ve `ReportUrl (string?)` alanları eklendi
- `✅` `ILoadingPlanRepository` arayüzüne `GetPagedReportsAsync` metodu eklendi
- `✅` `LoadingPlanRepository`'e `GetPagedReportsAsync` implementasyonu yazıldı (5 dinamik filtre, `OrderByDescending CreatedAtUtc`, `Skip/Take`)
- `✅` `PlansController`'a `GET /api/v1/loading-plans/reports` endpoint'i eklendi
- `✅` `AddReportFieldsToLoadingPlans` migration'i oluşturuldu ve `dotnet ef database update` ile uygulandı; sütunlar SQL sorgusuyla doğrulandı
- `✅` Swagger üzerinden filtreleme, sıralama ve validasyon (0–100 doluluk kontrolü) senaryoları test edildi
- `✅` Branch `dev`'e rebase edildi, build 0 hata ile doğrulandı

### Kanıtlar
- `CargoPilot.Application/Features/Plans/GetLoadingPlanReports/LoadingPlanReportDto.cs`
- `CargoPilot.Application/Features/Plans/GetLoadingPlanReports/GetLoadingPlanReportsQuery.cs`
- `CargoPilot.Application/Features/Plans/GetLoadingPlanReports/GetLoadingPlanReportsQueryValidator.cs`
- `CargoPilot.Application/Features/Plans/GetLoadingPlanReports/GetLoadingPlanReportsQueryHandler.cs`
- `CargoPilot.Application/Common/Interfaces/ILoadingPlanRepository.cs`
- `CargoPilot.Domain/Entities/LoadingPlan.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/Persistence/Migrations/20260507133430_AddReportFieldsToLoadingPlans.cs`
- `CargoPilot.WebAPI/Controllers/PlansController.cs`

### US-REP-03 Düzeltmeleri (branch: `feature/loading-plan-reports`)
- `✅` `GET /loading-plans/reports` endpoint'inde `[FromQuery]` model binding varsayılan değerleri çalışmıyordu — query record doğrudan bind edilmek yerine explicit `[FromQuery]` parametreler + manuel record constructor ile düzeltildi (`PlansController.cs`)
- `✅` `ReportUrl` EF konfigürasyonuna `HasMaxLength(2048)` eklendi; `nvarchar(max)` yerine `nvarchar(2048)` kolonu oluşturulur (`LoadingPlanConfiguration.cs`)
- `✅` `GetPagedReportsAsync` içindeki `.Include(p => p.Vehicle)` kaldırıldı; Select projection kullanıldığında gereksiz join yapıyordu (`LoadingPlanRepository.cs`)
- `✅` `FixReportUrlMaxLength` migration'i oluşturuldu ve uygulandı

**Kanıtlar:**
- `CargoPilot.WebAPI/Controllers/PlansController.cs`
- `CargoPilot.Infrastructure/Persistence/Configurations/LoadingPlanConfiguration.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/Persistence/Migrations/20260508090402_FixReportUrlMaxLength.cs`

---

## 16) Auth Company Scope — ICurrentUserService Genişletme + CRUD İzolasyonu (PR1)
**Story:** Backend geliştirici olarak, tüm CRUD endpoint'lerinin (Items, Vehicles, LoadingPlans) yalnızca token sahibi kullanıcının şirketine ait verileri döndürmesi ve oluşturması için company-scope izolasyonunun uygulanmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

**Branch:** `feature/auth-company-scope`

### Task 1 — ICurrentUserService Genişletme
- `✅` `ICurrentUserService` arayüzüne `CompanyId (Guid?)` ve `UserType (UserType?)` property'leri eklendi (`CargoPilot.Application/Abstractions/ICurrentUserService.cs`)
- `✅` `JwtCurrentUserService`'e `company_id` claim'inden `CompanyId`, `role` claim'inden `UserType` okuma eklendi (`CargoPilot.WebAPI/Services/JwtCurrentUserService.cs`)
- `✅` `AnonymousCurrentUserService`'e eksik implementasyonlar eklendi (`CompanyId => null`, `UserType => null`) (`CargoPilot.Infrastructure/Services/AnonymousCurrentUserService.cs`)

### Task 2 — Items CRUD Company-Scope
- `✅` `IItemRepository` tüm metodlarına `Guid? companyId` parametresi eklendi (`GetByIdAsync`, `GetExistingIdsAsync`, `ExistsBySkuAsync` x2, `SearchAsync`)
- `✅` `ItemRepository` implementasyonları güncellendi; tüm sorgulara `WHERE CompanyId == companyId` filtresi eklendi
- `✅` 6 Item handler'ına (`Create`, `Update`, `Delete`, `GetById`, `Search`, `BulkCreate`) `ICurrentUserService` inject edildi ve `_currentUserService.CompanyId` geçildi

### Task 3 — Vehicles CRUD Company-Scope + Favorite Guard
- `✅` `IVehicleRepository`'ye `SearchAsync` ve `GetByIdAsync` metodlarına `Guid? companyId` parametresi eklendi
- `✅` `VehicleRepository` implementasyonları güncellendi; `SearchAsync`'e `WHERE CompanyId == companyId`, `GetByIdAsync`'e compound predicate eklendi
- `✅` `SearchVehiclesQueryHandler` güncellendi
- `✅` `CreateVehicleCommandHandler`'dan gereksiz `IUserRepository` bağımlılığı kaldırıldı; `_currentUserService.CompanyId` doğrudan kullanılıyor (DB round-trip eliminasyonu)
- `✅` `UpdateVehicleCommandHandler`, `DeleteVehicleCommandHandler`, `DuplicateVehicleCommandHandler` güncellendi
- `✅` `AddVehicleFavoriteCommandHandler`'dan `IUserRepository` bağımlılığı kaldırıldı; `GetByIdAsync(vehicleId, companyId)` ile implicit company guard sağlandı

### Task 4 — LoadingPlan CRUD Company-Scope
- `✅` `ILoadingPlanRepository` tüm 4 metoduna `Guid? companyId` parametresi eklendi (`GetPagedAsync`, `GetDetailByIdAsync`, `GetByIdAsync`, `GetPagedReportsAsync`)
- `✅` `LoadingPlanRepository` implementasyonları güncellendi; tüm sorgulara company filtresi eklendi
- `✅` 6 Plan handler'ına (`GetPlans`, `GetPlanById`, `UpdatePlanName`, `DeletePlan`, `CreatePlan`, `GetLoadingPlanReports`) `ICurrentUserService` inject edildi
- `✅` `CreatePlanCommandHandler`'da araç lookup ve item lookup da company-scope ile yapılıyor; `ICurrentUserService` eklendi

### Kanıtlar
- `CargoPilot.Application/Abstractions/ICurrentUserService.cs`
- `CargoPilot.Application/Common/Interfaces/IItemRepository.cs`
- `CargoPilot.Application/Common/Interfaces/IVehicleRepository.cs`
- `CargoPilot.Application/Common/Interfaces/ILoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/ItemRepository.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/VehicleRepository.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs`
- `CargoPilot.Infrastructure/Services/AnonymousCurrentUserService.cs`
- `CargoPilot.WebAPI/Services/JwtCurrentUserService.cs`
- 13 handler dosyası (Items x6, Vehicles x5, Plans x6)

---

## 17) Auth Company Scope — Personal Company Otomatik Oluşturma + Role Policy Tanımları (PR2)
**Story:** Backend geliştirici olarak, bireysel kayıt olan kullanıcıların JWT token'larında `company_id` claim'inin dolu gelmesi ve tüm company-scope endpoint'lere role tabanlı authorization uygulanması için gerekli altyapının kurulmasını isterim.

**Genel Durum:** `✅ Tamamlandı`

**Branch:** `feature/auth-company-scope-pr2`

### Task 5 — Individual Register → Personal Company Otomatik Oluşturma
- `✅` `ICompanyRepository` arayüzü oluşturuldu (`Add`, `SaveChangesAsync`) (`CargoPilot.Application/Common/Interfaces/ICompanyRepository.cs`)
- `✅` `CompanyRepository` implementasyonu oluşturuldu (`CargoPilot.Infrastructure/Persistence/Repositories/CompanyRepository.cs`)
- `✅` `ICompanyRepository → CompanyRepository` Infrastructure DI'a kaydedildi
- `✅` `RegisterCommandHandler` güncellendi: kayıt sırasında `Personal - {email}` adlı `SubscriptionType.Free` Company otomatik oluşturulur ve kullanıcıya atanır; artık JWT token'da `company_id` claim'i dolu gelir

**Kabul Kriterleri:**
- `POST /api/v1/auth/register` → login sonrası JWT decode edildiğinde `company_id` dolu
- Aynı e-posta ile ikinci kayıt → `Auth.EmailAlreadyExists` (409); ikinci Personal Company oluşturulmaz

### Task 6 — Role Policy Tanımları ve Controller Güvenlik Güncellemesi
- `✅` `services.AddAuthorization(...)` ile 5 named policy tanımlandı (`CargoPilot.WebAPI/DependencyInjection.cs`):
  - `SuperAdmin` — role claim = `"SuperAdmin"`
  - `CompanyAdmin` — role claim = `"CompanyAdmin"`
  - `CompanyWorker` — role claim = `"CompanyWorker"`
  - `Individual` — role claim = `"Individual"`
  - `CompanyMember` — role claim ∈ {`CompanyAdmin`, `CompanyWorker`, `Individual`}
- `✅` `ItemsController` → `[Authorize(Policy = "CompanyMember")]`
- `✅` `VehiclesController` → `[Authorize(Policy = "CompanyMember")]`
- `✅` `PlansController` → `[Authorize(Policy = "CompanyMember")]`
- `✅` `MeController` → `[Authorize(Policy = "CompanyMember")]`

**Kabul Kriterleri:**
- Token olmadan Items/Vehicles/Plans/Me endpoint'lerine istek → **401**
- `SuperAdmin` token ile bu endpoint'lere istek → **403** (CompanyMember policy dışı)
- `CompanyAdmin/CompanyWorker/Individual` token ile istek → **200**, yalnızca kendi company'sinin verisi

### Kanıtlar
- `CargoPilot.Application/Common/Interfaces/ICompanyRepository.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/CompanyRepository.cs`
- `CargoPilot.Infrastructure/DependencyInjection.cs`
- `CargoPilot.Application/Features/Auth/Register/RegisterCommandHandler.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/Controllers/ItemsController.cs`
- `CargoPilot.WebAPI/Controllers/VehiclesController.cs`
- `CargoPilot.WebAPI/Controllers/PlansController.cs`
- `CargoPilot.WebAPI/Controllers/MeController.cs`
