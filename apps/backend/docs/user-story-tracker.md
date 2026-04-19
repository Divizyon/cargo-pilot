# CargoPilot User Story Tracker

Bu dosya, her user story altindaki tum alt isleri tek tek takip etmek icin kullanilir.
Hem daha once yapilanlar hem de bu sohbette tamamlananlar ayni listede isaretlenir.

Durum gostergeleri:
- `✅ Tamamlandi`
- `🟡 Kismi / Devam ediyor`
- `⬜ Baslanmadi`

---

## 1) Gelistirici ortam standardizasyonu (VS bilesenleri + SDK)
**Story:** Backend Chapter Lead olarak, tum gelistiricilerin projeyi sorunsuz derleyebilmesi ve ayni arac setini kullanmasi icin gerekli olan Visual Studio bilesenlerinin ve SDK surumlerinin kurulumlarinin yapilmasini isterim.

**Genel Durum:** `✅ Tamamlandi`

### Kabul Kriterleri
- Repo kokunde, proje hedef frameworku ile uyumlu .NET SDK surumunu sabitleyen bir `global.json` bulunmalidir.
- Gerekli Visual Studio workload'larini, kurulum adimlarini ve dogrulama komutlarini aciklayan bir `docs/developer-setup.md` dokumani bulunmalidir.
- Temiz bir gelistirici ortaminda, dokumanda tanimlanan `dotnet restore` ve `dotnet build` komutlari basariyla calistirilabilmelidir.

### Alt Isler
- `✅` Repo kokunde `global.json` ile SDK surumunu sabitle
- `✅` Proje hedef framework ile uyumlu SDK secimi yap (`net8.0` icin `.NET 8`)
- `✅` Developer setup dokumani hazirla (`docs/developer-setup.md`)
- `✅` Gerekli Visual Studio workload listesi dokumanda yazsin
- `✅` Kurulum dogrulama komutlarini dokumanda tanimla
- `✅` Komutlari ekip makinesinde calistirarak dogrula (`dotnet --info`, `--list-sdks`, `--version`, `restore`, `build`)
- `✅` CI tarafinda ayni SDK bandinin pinlendigi bilgisini dokumana bagla

**Kanitlar:**
- `global.json`
- `docs/developer-setup.md`
- `.github/workflows/ci.yml`

---

## 2) Clean Architecture standardi
**Story:** Backend Chapter Lead olarak, projenin ve dizin yapisinin surdurulebilir, test edilebilir ve moduler olmasi icin Clean Architecture standartlarinda olusturulmasini isterim.

**Genel Durum:** `🟡 Kismi / Devam ediyor`

**Bu story icin teknik kararlar (netlestirildi):**
- `Application` katmaninda servis bazli yaklasim kullanilacak.
- Veri erisiminde repository pattern uygulanacak.
- Dogrulama standardi olarak FluentValidation kullanilacak.

### Alt Isler
- `✅` Katmanli cozum yapisini olustur (`WebAPI`, `Application`, `Domain`, `Infrastructure`)
- `✅` Katmanlar arasi referans yonunu Clean Architecture prensibine gore kur
- `✅` Application icin feature/use-case klasor standardini olustur (`Features/Cargos/CreateCargo`, `GetCargoById`, `ListCargos`, `UpdateCargoStatus`, `CancelCargo`)
- `✅` Domain tarafinda temel entity/value object/aggregate iskeletini olustur (Kapsam: `Entities/Cargo`, `ValueObjects/TrackingNumber`, `Enums/CargoStatus`; Disinda: domain event, ileri seviye state-machine, adres/agırlik gibi ek modeller)
- `✅` Application katmaninda repository interface'lerini tanimla (Kapsam: `Abstractions/Persistence/ICargoRepository` contract; Disinda: EF/SQL implementasyonu)
- `✅` Infrastructure katmaninda EF Core tabanli repository implementasyonlarini yaz (Kapsam: `Persistence/Repositories/CargoRepository`, `AppDbContext` uzerinden `DbSet<Cargo>` ve `TrackingNumber` conversion; Disinda: migration/ileri query optimizasyonu)
- `✅` Composition root (DI registration extensionlari) standardini kur (Kapsam: her katmanin kendi `DependencyInjection.cs` uzerinden `IServiceCollection` extension sunmasi. `CargoPilot.Application/DependencyInjection.cs` icinde `AddApplication()` use-case kayitlarini yapar; `CargoPilot.Infrastructure/DependencyInjection.cs` icinde `AddInfrastructure(IConfiguration, bool useInMemoryRepository)` `AppDbContext`+connection string okumasi ve `ICargoRepository` icin SQL/InMemory secimini ustlenir; `CargoPilot.WebAPI/DependencyInjection.cs` icinde `AddPresentation()` ve `UsePresentation()` controllers/Swagger/middleware zincirini kurar. `Program.cs` artik ~50 satirdan ~15 satira indi; concrete tip veya EF Core referansi icermiyor, sadece orkestrasyon yapiyor. Application'a DI extension'i kurabilmek icin `Microsoft.Extensions.DependencyInjection.Abstractions 8.0.2` paket referansi eklendi; Infrastructure'in Hosting abstraction'ina bagimliligini onlemek icin environment karari `Program.cs`'de `builder.Environment.IsDevelopment()` flag'i uzerinden geciliyor. Disinda: assembly-scanning (Scrutor), FluentValidation pipeline kayitlari, auth/CORS middleware)
- `✅` FluentValidation paket ve pipeline entegrasyonunu yap, ilk validatorlari ekle (Kapsam: `CargoPilot.Application` projesine `FluentValidation 11.11.0` ve `FluentValidation.DependencyInjectionExtensions 11.11.0` paketleri eklendi. Assembly scanning ile tum `AbstractValidator<T>` turevleri `Application/DependencyInjection.cs` icindeki `AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly)` cagrisi sayesinde otomatik olarak DI konteynirina kaydediliyor. Ilk validator olarak `Features/Cargos/CreateCargo/CreateCargoRequestValidator.cs` yazildi; `TrackingNumber` icin `NotEmpty` ve `MaximumLength(64)` kurallari, `Status` icin ise deger gonderildiginde `IsInEnum` kurali tanimli. `CreateCargoUseCase` constructor'ina `IValidator<CreateCargoRequest>` inject edildi; use-case bastan `ValidateAsync` cagirarak hatalari `Result<T>.Failure` ile `ValidationError` kodlu tek bir mesajda (`;` ile birlestirilmis) dondurur; boylece onceki ham `if (request is null)` kontrolu ve `try/catch (ArgumentException)` exception-for-control-flow kalibi ortadan kalkti. Disinda: MediatR pipeline behavior kurgusu (projede MediatR yok), cok-hatali structured `ValidationError` tipi (Story 8 response envelope standardi ile birlikte ele alinacak), ileri seviye kurallar (async DB kontrolleri, cross-field/cross-aggregate kurallar), validator icin unit test projesi (ayri story))
- `✅` Architecture decision record veya mimari rehber dokumani ekle (Kapsam: `apps/backend/docs/architecture.md` dosyasi olusturuldu. Icerik: (1) katmanli yapi tablosu ve bagimlilik akisi diyagrami (Domain <- Application <- Infrastructure / WebAPI), (2) her katmanin icerik standardi ve orneklerle klasor yapisi (`Features/<Aggregate>/<UseCase>/`), (3) mimari kararlarin gerekcesi: service-based Application (MediatR neden alinmadi), repository pattern (aggregate-specific, generic degil), FluentValidation standardi ve assembly scanning yaklasimi, `Result<T>` ile exception-free akis, composition root (her katmanda `DependencyInjection.cs`), dev ortaminda `InMemoryCargoRepository` ile DB-siz calisma, configuration ve secret kaynaklari, (4) yeni use-case eklerken izlenecek 8 adimlik akis, (5) scope disi tutulan yaklasimlar (CQRS, domain event, Scrutor, generic repository). Developer setup ve environment-variables dokumanlariyla cross-link yapildi. Disinda: formal ADR numaralandirma/template akisi (ilerideki story'de), her karar icin ayri ADR dosyasi; bu surum tek bir rehber dokumanda konsolide edilmistir)

**Kanitlar:**
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
**Story:** Gelistirici Takimi icin uygulamanin farkli ortamlarda farkli API uc noktalarina baglanabilmesi icin ortam degiskenleri (environment variables / .env yapisi) kurgulanmali.

**Genel Durum:** `🟡 Kismi / Devam ediyor`

### Alt Isler
- `✅` Ortam bazli appsettings dosyalarini olustur (`Development`, `Staging`)
- `✅` Repo kokunde `.gitignore` olustur (Kapsam: repo koku `.gitignore` dosyasi elle yazildi; Microsoft'un `dotnet new gitignore` template'indeki ~300 satirlik genis liste yerine projenin fiilen kullandigi kalemler secildi. Bolumler: (a) build ciktilari `bin/`, `obj/`, `[Dd]ebug/`, `[Rr]elease/`, `x64/`, `x86/`; (b) Visual Studio/Rider kullanici dosyalari `.vs/`, `.idea/`, `*.user`, `*.suo`, `*.userosscache`, `*.sln.docstates`; (c) test & log `TestResults/`, `*.log`; (d) secret & env `appsettings.*.Local.json`, `.env`, `.env.local`, `.env.*.local`, `secrets.json`, `*.pfx`, `*.key`; (e) NuGet `*.nupkg`, `packages/`; (f) publish ciktilari `publish/`, `*.publishsettings`; (g) OS `Thumbs.db`, `.DS_Store`. `.env.example` pattern'den otomatik haric (farkli isim). User Secrets dosyalari zaten `%APPDATA%/Microsoft/UserSecrets/` altinda, repo disinda kaldigi icin ekstra kural gerekmedi. Disinda: `.vscode/` blok listesi (paylasima acik tutuldu), CI/CD runner-ozel ciktilari, resmi Microsoft template'indeki kullanilmayan ASP.NET Classic/Azure Tools/StyleCop kurallari)
- `✅` Mevcut `appsettings.Development.json` ve `appsettings.Staging.json` icindeki placeholder connection string'leri kaldir (Kapsam: `appsettings.Development.json` icinden `ConnectionStrings.DefaultConnection` degeri (`Server=SUNUCU_IP_ADRESI;Database=CargoPilot_Dev;User Id=GELISTIRICI_USER;Password=GUCLU_SIFRE;TrustServerCertificate=True;`) ve `appsettings.Staging.json` icinden `ConnectionStrings.DefaultConnection` degeri (`Server=STAGING_SERVER_IP;Database=CargoPilot_Test;Trusted_Connection=True;`) tamamen silindi; her iki dosyada sadece `Logging` blogu kaldi. Yan etki olarak `Infrastructure/DependencyInjection.cs` icindeki `AddDbContext<AppDbContext>` cagrisi artik kosullu: `useInMemoryRepository == true` ise ne `AppDbContext` ne de SQL repository kaydedilir (boylece null connection string yuzunden `UseSqlServer` hata firlatmaz); `false` ise SQL modu `AddDbContext` + `CargoRepository` ikilisi kaydedilir. Development'ta `dotnet run` connection string olmadan sorunsuz baslatilabildigi runtime dogrulamasi ile teyit edildi. Program.cs'teki `useInMemoryRepository: builder.Environment.IsDevelopment()` secimi korundu; DB geldiginde bu tek satirin false'a cekilmesi ve user-secrets/env var ile `ConnectionStrings__DefaultConnection` set edilmesi yeterli. Disinda: config-driven otomatik switch (Yaklasim B) bilincli olarak ertelendi, staging icin Key Vault/secret store entegrasyonu (Story 5 kapsaminda ele alinacak))
- `✅` Environment variable isim standardini tanimla (Kapsam: `docs/environment-variables.md` dosyasi olusturuldu ve naming standardi bolumu ile dolduruldu. Standart: `appsettings.json` icindeki nested key yolu (`Section:SubSection:Key`) env var'da cift alt cizgi (`Section__SubSection__Key`) olarak ifade edilir; bu .NET `EnvironmentVariablesConfigurationProvider`'inin otomatik destekledigi kanonik konvansiyondur. Dokumantasyonda (a) mevcut projedeki tum key'ler icin JSON-path -> env-var donusum tablosu (ConnectionStrings, Logging, ApplicationSettings), (b) neden `__` tercih edildigi (`:` POSIX kabuklarinda gecersiz, `__` Windows/Linux/macOS/Docker/K8s ortamlarinda tek isimle calisir), (c) kurallar (buyuk/kucuk harf duyarsizligi, `ASPNETCORE_`/`DOTNET_` prefix'lerin farki, nesting derinligi tavsiyesi, array indeksleme sozdizimi), (d) PowerShell/bash/Docker icin pratik set ornekleri yer aliyor. Kod tarafinda degisiklik yok, .NET zaten bu konvansiyonu destekliyor. Disinda: oncelik sirasi, ortam bazli kaynak tablosu, zorunlu/opsiyonel degisken listesi ve policy bolumleri (sonraki alt islerde ayni dosyaya eklenecek))
- `⬜` Development icin User Secrets kurulumunu yap (`UserSecretsId` ekle, kullanim komutlarini belgele)
- `⬜` Local gelistirme icin secret/config yukleme stratejisini belirle (User Secrets + `launchSettings.json` profilleri)
- `⬜` `.env.example` olustur ve zorunlu/opsiyonel degiskenleri belgele
- `⬜` `docs/environment-variables.md` olustur: naming standardi, oncelik sirasi, ortam bazli kaynak tablosu (user-secrets / env var / appsettings)
- `⬜` Gizli verilerin dosyalarda tutulmamasini garanti edecek policy ekle (dokumanda + `.gitignore` + code review kurali)

---

## 4) Kod yazim standartlari (.editorconfig + statik analiz)
**Story:** Backend Chapter Lead olarak, tum ekip uyelerinin ayni kod yazim standartlarina uymasini zorunlu kilmak icin `.editorconfig` ve statik kod analiz araclarinin projeye dahil edilmesini isterim.

**Genel Durum:** `✅ Tamamlandi`

### Alt Isler
- `✅` `.editorconfig` olustur
- `✅` Kod stili kurallarini tanimla (indent, newline, naming)
- `✅` Analyzer paketlerini backend projelerine merkezi olarak ekle (`Microsoft.CodeAnalysis.NetAnalyzers`)
- `✅` Sonar analyzer paketini backend projelerine merkezi olarak ekle (`SonarAnalyzer.CSharp`)
- `✅` Warning policy (treat as error, quality gate) seviyesini netlestir (Kapsam: `apps/backend/Directory.Build.props` olusturuldu; tum backend projelerine ortak kural seti uygulanir. Ayarlar: (1) `TreatWarningsAsErrors=true` — lokal ve CI build'leri uyari bulursa kirmiziya gecer, boylece kalite kapisi build seviyesinde islemeye baslar, (2) `EnforceCodeStyleInBuild=true` — `.editorconfig` IDE kurallari (IDE0005 gibi) build sirasinda dogrulanir, sadece editor zamaninda kalmaz, (3) `AnalysisLevel=latest` + `AnalysisMode=Recommended` — NetAnalyzers kuralcasi modern ve dengeli seviyede, (4) `GenerateDocumentationFile=true` — IDE0005 (kullanilmayan using) kontrolu icin on kosul, (5) `ContinuousIntegrationBuild` GitHub Actions'ta otomatik aciliyor (deterministik build). `WarningsNotAsErrors` listesi uc kalemi hata olmaktan muaf tutar: `CS1591` (public XML doc eksikligi — Story 10 kapsaminda olgunlasacak), `CA1000` (generic type uzerinde static uye — `Result<T>.Success`/`Failure` factory'leri Result pattern'in ozu), `CA1716` (`Error` reserved keyword ile cakismasi — domain terimi olarak korunuyor, VB tuketimi yok). Policy'yi aktif ederken analyzer'larin yakaladigi 4 gercek bulgu duzeltildi: (a) `InMemoryCargoRepository.UpdateAsync` S4144 duplicate body uyarisi: `_storage[cargo.Id] = cargo` yerine `_storage.AddOrUpdate(cargo.Id, cargo, (_, _) => cargo)` kullanildi — yapisal olarak `AddAsync`'ten farkli ve semantik olarak daha net, (b) `WebAPI/DependencyInjection.cs` IDE0005 gereksiz using'ler: Web SDK zaten implicit import ettigi icin 4 using satiri kaldirildi, (c) `HomeController.Get` S3400 sabit donen metot ve S6968 eksik `ProducesResponseType`: endpoint `ActionResult<WelcomeResponse>` donuyor, `WelcomeResponse` sealed record'u eklendi (`Message`, `Status`, `TimestampUtc`), `[ProducesResponseType(typeof(WelcomeResponse), StatusCodes.Status200OK)]` eklendi — hem Swagger sozlesmesi zenginlesti hem de pure-constant donus kalibi kirildi, (d) `Program.cs` S6966: `app.Run()` yerine `await app.RunAsync()` kullanildi, top-level async Main olarak calisir. Sonuc: Release build 0 hata / 83 uyari; warning'lerin buyuk cogu `CS1591`, kalan istisnalar `WarningsNotAsErrors` ile muaf tutulan `CA1000` ve `CA1716`. Disinda: per-rule `.editorconfig` severity overrides (su an ihtiyac yok), CA/S kural ailesinin kapsamli customize edilmesi (SonarCloud/SonarQube entegrasyonu ile birlikte ileride ele alinacak), XML doc yazimi (Story 10))

**Kanitlar:**
- `.editorconfig`
- `Directory.Build.props`
- `CargoPilot.Infrastructure/Persistence/Repositories/InMemoryCargoRepository.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/HomeController.cs`
- `CargoPilot.WebAPI/Program.cs`
- `CargoPilot.Infrastructure/Persistence/Repositories/InMemoryCargoRepository.cs`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/HomeController.cs`
- `CargoPilot.WebAPI/Program.cs`

---

## 5) Connection string'in merkezi okunmasi + bulut DB baglantisi
**Story:** Backend Chapter Lead olarak, uygulamanin veritabani ile iletisim kurabilmesi icin gerekli baglanti bilgilerinin (Connection String) merkezi bir dosyadan okunmasini ve bulut uzerindeki veri tabanina baglantisini saglanilmasini isterim.

**Genel Durum:** `🟡 Kismi / Devam ediyor`

### Alt Isler
- `✅` Connection string'i configuration uzerinden oku (`GetConnectionString("DefaultConnection")`)
- `✅` Ortam bazli connection string tanimlari ekle (`appsettings.*.json`)
- `⬜` Secret management'e tasi (User Secrets / Key Vault / env vars)
- `⬜` Bulut DB endpoint ve guvenli baglanti policy'sini dokumante et
- `⬜` Connection resiliency/retry policy ekle
- `✅` Hassas bilgi loglamasini kaldir (Kapsam: `Program.cs` icindeki `ApplicationSettings:AppName` ve `ConnectionStrings:DefaultConnection` degerlerini konsola yazan `Console.WriteLine` satirlari, composition root refactor'u sirasinda tamamen kaldirildi. Boylece baglanti dizesi ve uygulama meta verisi artik standart cikti akimina yazilmiyor. Disinda: yapilandirilmis log cercevesi (Serilog/ILogger) entegrasyonu ve hassas alan maskeleme kurallari)

### US-DB01: Merkezi baglanti yonetimi — `✅ Tamamlandi`
Bagimli branch: `feature/US-DB01-centralized-connection-string`. Runtime baglanti dizesi artik tek kaynaktan (`infra/env/.env.dev`) okunuyor; ikinci bir hard-coded degere duzelme ihtiyaci kalmadi.

- `✅` `.env.dev.example` + `.env.dev` dosyalarina `DATABASE_CONNECTION_STRING` degiskeni eklendi (Kapsam: MSSQL blogu altina, Docker network icinde gecerli `Server=mssql,1433;Database=CargoPilotDev;User Id=sa;Password=DevPassword123!;TrustServerCertificate=True;` degeri ile; host uzerinden `dotnet ef` calistirilirken `mssql` yerine `localhost` kullanilmasi gerektigi yorum satirinda belirtildi. Disinda: `.env.test.example` ve `.env.prod.example` icin benzer degiskenlerin tanimlanmasi (ilgili ortam compose dosyalari US-D03e kapsaminda tamamlaninca eklenecek))
- `✅` `docker-compose.dev.yml` backend servisine `ConnectionStrings__DefaultConnection: ${DATABASE_CONNECTION_STRING}` env binding'i eklendi (Kapsam: `.env.dev` -> compose -> container env var zinciri kuruldu; .NET `EnvironmentVariablesConfigurationProvider` bu degeri dogrudan `IConfiguration.GetConnectionString("DefaultConnection")` uzerinden sunuyor, ara bir mapping gerekmiyor. Container yeniden olusturulup env var'in `printenv ConnectionStrings__DefaultConnection` ile dogrulanmasi yapildi. Disinda: kullanilmayan `MSSQL_HOST/PORT/USER/PASSWORD` env entry'lerinin backend servisinden temizlenmesi (ileri bir temizlik commit'ine birakildi; fonksiyonel etki yok))
- `✅` `AppDbContextFactory` icindeki sert kodlanmis `FallbackConnectionString` kaldirildi (Kapsam: `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs` icindeki `Server=localhost;...Trusted_Connection=True;...` sabiti ve `?? FallbackConnectionString` null-coalescing zinciri silindi. Env var tanimsizsa tasarim zamani komutlari net bir `InvalidOperationException` ile durup "dotnet ef komutlarindan once bu degiskeni set et" mesajiyla kullaniciyi `.env.dev` degerine yonlendiriyor; sessiz localhost-fallback davranisi boylece ortadan kaldirildi. Disinda: `Program.cs:9`'daki `useInMemoryRepository: builder.Environment.IsDevelopment()` flag'i — runtime'da MSSQL'e gecis icin ayri bir commit'e birakildi, bu is sadece altyapiyi hazirladi))

**Kanitlar:**
- `CargoPilot.WebAPI/Program.cs`
- `CargoPilot.WebAPI/appsettings.Development.json`
- `CargoPilot.WebAPI/appsettings.Staging.json`
- `infra/env/.env.dev.example`
- `infra/compose/docker-compose.dev.yml`
- `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs`

---

## 6) EF Core entegrasyonu + temel DbContext
**Story:** Backend Chapter Lead olarak, uygulamanin SQL Server ve Bulut veritabanlariyla iletisim kurabilmesi icin Entity Framework Core entegrasyonunu ve temel DbContext yapisinin kurulmasini isterim.

**Genel Durum:** `✅ Tamamlandi`

### Alt Isler
- `✅` EF Core SQL Server paketlerini ekle
- `✅` `AppDbContext` sinifini olustur
- `✅` DI ile `AddDbContext` kaydini yap
- `✅` Ilk migration ve veritabani olusturma akisini dokumante et (Kapsam: `apps/backend/docs/database-migrations.md` dosyasi olusturuldu; 10 bolumluk pratik rehber. Icerik: (1) `dotnet-ef` global tool kurulumu ve dogrulama komutlari, (2) `ConnectionStrings__DefaultConnection` env var kaynak sirasi ve Windows Auth / SA / Docker icin ornek connection string'ler, (3) komutlarin `apps/backend/` dizininden calistirilma standardi, (4) ilk migration uretimi: `dotnet ef migrations add InitialCreate --project CargoPilot.Infrastructure --startup-project CargoPilot.WebAPI --output-dir Persistence/Migrations` ve parametre aciklamalari, (5) `database update` ile DB olusturma/guncelleme, belirli migration'a geri donme, `0` ile tum migration'lari geri alma, (6) yeni migration ekleme isim kurali (PascalCase, ornekler `AddCargoWeightColumn` vb), (7) migration iptal akisi (DB'ye uygulanmadan `migrations remove`, uygulandiysa once `database update <Onceki>`), (8) ortam bazli akis: Dev modunda InMemory repo aktifken factory sayesinde migration'lar calisir, prod'da env var zorunlu ve auto-migrate vs pipeline-step secimleri, (9) SQL script uretme (`migrations script`) DBA akisi, (10) sorun giderme tablosu (6 yaygin hata ve cozum). Dokumanin calisir olmasi icin `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs` eklendi: `IDesignTimeDbContextFactory<AppDbContext>` implementasyonu, `ConnectionStrings__DefaultConnection` env var'i okur, local SQL fallback'i var; sadece tasarim zamani cagrilir, runtime'da kullanilmaz. Bu olmadan Development ortaminda (`useInMemoryRepository: true` iken `AddDbContext` kaydedilmedigi icin) `dotnet ef` komutlari "Unable to create an object of type 'AppDbContext'" hatasi verirdi; factory bu blokaji ortadan kaldirir ve EF CLI akisini runtime DI'dan bagimsiz kilar. Disinda: ilk migration dosyasinin gercek uretimi (tercihen ilk DB baglantisi story'si ile birlikte yapilacak), auto-migrate policy'sinin prod icin netlestirilmesi (Story 5 + CI/CD story'leri), seed data stratejisi (ayri story))
- `✅` DbSet bazli domain tablolarini olustur (`DbSet<Cargo>`)

**Kanitlar:**
- `CargoPilot.Infrastructure/CargoPilot.Infrastructure.csproj`
- `CargoPilot.Infrastructure/Persistence/AppDbContext.cs`
- `CargoPilot.Infrastructure/Persistence/AppDbContextFactory.cs`
- `CargoPilot.WebAPI/Program.cs`
- `docs/database-migrations.md`

---

## 7) Base Entity standardi
**Story:** Backend Chapter Lead olarak, tum veritabani tablolarinda Id, CreatedDate, UpdatedDate ve IsDeleted (Soft Delete) gibi alanlarin standart olmasini saglayan bir Base Entity yapisinin kurulmasini isterim.

**Genel Durum:** `✅ Tamamlandi`

### Alt Isler
- `✅` Story 7 oncesi ortam dogrulamasi: `global.json` (SDK `8.0.419`, `rollForward: latestPatch`) uyumlu `8.0.420` ile `dotnet build CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` basariyla tamamlandi (0 hata); boylece BaseEntity turetmesi oncesi baseline temiz build teyit edildi.
- `✅` Ilk `InitialCreate` migration'ini uret (Kapsam: `dotnet ef migrations add InitialCreate --project CargoPilot.Infrastructure --startup-project CargoPilot.Infrastructure --output-dir Persistence/Migrations` komutu ile `20260418104913_InitialCreate.cs`, `.Designer.cs` ve `AppDbContextModelSnapshot.cs` dosyalari olusturuldu. Migration; `Cargos` tablosunu uretiyor: `Id uniqueidentifier PK`, `TrackingNumber nvarchar(64) NOT NULL`, `Status int NOT NULL`. EF CLI `AppDbContextFactory` uzerinden tasarim zamani context olusturdugu icin `ConnectionStrings__DefaultConnection` env var'i olmadan da uretim basarili oldu. Bu migration BaseEntity calismasi icin referans snapshot gorevi gorur; `BaseEntity` eklendiginde bir sonraki `AddBaseEntity` migration'i bu baseline uzerinden `CreatedDate`, `UpdatedDate`, `IsDeleted` kolonlarini getirecek. Disinda: migration'in aktif DB'ye uygulanmasi (Story 5 kapsaminda DB endpoint netlestikten sonra `database update`))
- `✅` Migration generator ile `TreatWarningsAsErrors` kalite kapisi arasindaki catismayi mimari seviyede coz (Kapsam: `InitialCreate` uretildikten sonra ilk build `IDE0005: Using directive is unnecessary` hatasiyla kirildi. Sebep: EF Core generator her migration dosyasinin basina sabit olarak `using System;` ekler, ancak `CargoPilot.Infrastructure.csproj` icinde `<ImplicitUsings>enable</ImplicitUsings>` acik oldugu icin `System` namespace'i zaten global olarak import edilir ve satir gereksiz sayilir. Story 4'te aktif edilen `TreatWarningsAsErrors=true` + `EnforceCodeStyleInBuild=true` policy'si bu uyariyi hataya cevirdigi icin build kirildi. Her migration uretildiginde satiri elle silmek (a) gelecekteki ekip uyeleri icin ayak bagi, (b) generated koda manuel mudahale anti-pattern'i. Cozum olarak `.editorconfig` dosyasina `[**/Persistence/Migrations/*.cs]` bolumu eklendi: `generated_code = true` ile bu klasor generated kod olarak isaretlendi (analyzer'lar bu dosyalari otomatik atlar), `dotnet_diagnostic.IDE0005.severity = none` ile style analizi muafiyeti kesinlestirildi. Sonraki build 0 hata / 83 uyari (tumu CS1591, policy muaf) ile gecti. Disinda: Migrations klasoru icin baska analyzer kurali customize'i (ileri story'lerde ihtiyac dogarsa))
- `✅` Domain'de `BaseEntity` tanimla (Kapsam: `CargoPilot.Domain/Entities/BaseEntity.cs` olusturuldu. Alanlar: `Id (Guid, protected set)`, `CreatedDate (DateTime, private set)`, `UpdatedDate (DateTime, private set)`, `IsDeleted (bool, private set)`, `CreatedBy (Guid?, private set)`, `UpdatedBy (Guid?, private set)`. `protected BaseEntity()` EF Core tasarim zamani nesnelestirmesi icin; `protected BaseEntity(Guid id)` uygulama kodu icin — `id == Guid.Empty` dogrulamasi burada merkezi olarak yapiliyor. Audit property'leri `private set` ile korunuyor; EF Core `ChangeTracker.CurrentValue` API'si CLR seviyesinde setter'i atlayarak alanlara yazacagi icin Sonar S1144 ("kullanilmayan private setter") yanh pozitif uretir. Bunu suppress etmek icin iki adim atildi: (a) `apps/backend/.editorconfig` dosyasina `[**/Domain/Entities/BaseEntity.cs]` bolumu ile `dotnet_diagnostic.S1144.severity = none` eklendi — ancak Sonar Roslyn analyzer bu glob pattern'i build sirasinda okuyamadi, (b) dogrudan kaynak dosyaya `#pragma warning disable S1144 / #pragma warning restore S1144` eklendi — bu Roslyn tabanli her analyzer icin garantili calisir. Disinda: `CreatedBy`/`UpdatedBy` icin gercek userId (auth story'si ile gelecek), domain event pattern, `DeletedDate` stamp)
- `✅` Tum aggregate/entity siniflarini `BaseEntity`den turet (Kapsam: `Cargo` sinifi `BaseEntity`'den turetildi. `Id` property'si `Cargo`'dan kaldirildi (artik `BaseEntity`'de). Constructor `base(id)` cagrisi ile id dogrulamasini `BaseEntity`'ye delege ediyor. EF Core icin `protected Cargo() : base() { TrackingNumber = null!; }` constructor'i eklendi — `private` yerine `protected` kullanildi: Sonar S1144 private constructor'lari "kullanilmayan" olarak isaretler cunku EF Core reflection ile cagirdigini goremez; `protected` yapilarak bu false pozitif engellendi. `TrackingNumber = null!` null-forgiving atamasi CS8618 uyarisini susturur — bu EF Core constructor'i oldugu icin compiler dogrulama yapamaz, anlambilim olarak dogru. Disinda: baska aggregate/entity yoktur; yenisi eklendigi zaman ayni pattern izlenecek)
- `✅` `SaveChanges` seviyesinde audit alanlarini otomatik set et ve `CreatedBy`/`UpdatedBy` icin `ICurrentUserService` altyapisini kur (Kapsam: `AppDbContext.SaveChangesAsync` ve `SaveChanges` override edilerek `ApplyAuditFields()` private metodu cagrilir. Metod `ChangeTracker.Entries<BaseEntity>()` uzerinden tum tracked entity'leri tarar: `EntityState.Added` ise `CreatedDate`, `UpdatedDate`, `CreatedBy`, `UpdatedBy` set edilir; `EntityState.Modified` ise sadece `UpdatedDate` ve `UpdatedBy` set edilir. Set islemi `entry.Property(x => x.CreatedDate).CurrentValue = now` seklinde EF Core'un expression tree API'si uzerinden yapilir — bu yontem `private set` kisitini atlar. Kim-degistirdi bilgisi icin `ICurrentUserService` interface'i `CargoPilot.Application/Abstractions/ICurrentUserService.cs` olarak tanimlandi (tek property: `Guid? UserId`); `CargoPilot.Infrastructure/Services/AnonymousCurrentUserService.cs` `UserId => null` dondurecek sekilde implement edildi (`internal sealed`). `Infrastructure/DependencyInjection.cs` icinde `services.AddScoped<ICurrentUserService, AnonymousCurrentUserService>()` kaydedildi. `AppDbContext` constructor'ina `ICurrentUserService` inject edildi. `AppDbContextFactory` (design-time, DI'siz) `new AnonymousCurrentUserService()` ile dogrudan orneklendi. Auth story'si geldiginde yalnizca `AnonymousCurrentUserService` yerine `JwtCurrentUserService` yazilip DI kaydedilecek; `AppDbContext`, `BaseEntity`, `Cargo` degismez. Disinda: gercek `UserId` okuma (JWT/session), `IHttpContextAccessor` inject etme, `CreatedBy`/`UpdatedBy` icin navigation property)
- `✅` Soft delete query filter'larini global olarak tanimla ve `IsDeleted` icin index ekle (Kapsam: `AppDbContext.OnModelCreating` icinde `Cargo` entity konfigurasyonuna `entity.HasQueryFilter(cargo => !cargo.IsDeleted)` eklendi — bu sayede tum `SELECT` sorgularina otomatik `WHERE IsDeleted = 0` eklenir. Silinen kaydi gormek gerektiginde `dbContext.Cargos.IgnoreQueryFilters().Where(...)` kullanilir. Performans icin `entity.HasIndex(cargo => cargo.IsDeleted)` ile `IX_Cargos_IsDeleted` indeksi tanimlandi. Audit kolonlari (`CreatedDate NOT NULL`, `UpdatedDate NOT NULL`, `IsDeleted NOT NULL DEFAULT 0`, `CreatedBy uniqueidentifier NULL`, `UpdatedBy uniqueidentifier NULL`) entity konfigurasyonunda `IsRequired()`/`HasDefaultValue(false)` ile belirtildi. Disinda: cascade soft delete (iliskili entity'ler, proje su an tek aggregate), `DeletedDate` / `DeletedBy` stamp alanlari, soft delete icin ayri repository metotlari (`ListIncludingDeleted` vb.))
- `✅` `AddBaseEntity` migration'ini uret ve son build dogrula (Kapsam: `dotnet ef migrations add AddBaseEntity --project CargoPilot.Infrastructure --startup-project CargoPilot.Infrastructure --output-dir Persistence/Migrations` komutu basariyla tamamlandi; `20260418115212_AddBaseEntity.cs` ve `.Designer.cs` olusturuldu. Migration `Cargos` tablosuna `CreatedBy (uniqueidentifier NULL)`, `CreatedDate (datetime2 NOT NULL)`, `IsDeleted (bit NOT NULL DEFAULT 0)`, `UpdatedBy (uniqueidentifier NULL)`, `UpdatedDate (datetime2 NOT NULL)` kolonlarini ve `IX_Cargos_IsDeleted` indeksini ekler. Migration sonrasi `dotnet build CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` 0 hata ile tamamlandi. Disinda: `database update` ile DB'ye uygulanmasi (Story 5 kapsaminda aktif baglanti saglannca))

**Kanitlar:**
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

## 8) Standart API response yapisi
**Story:** Backend Chapter Lead olarak, API'den donen tum yanitlarin, tahmin edilebilir ve standart bir JSON yapisinda olmasini isterim.

**Genel Durum:** `🟡 Kismi / Devam ediyor`

### Alt Isler
- `✅` Uygulama katmaninda `Result<T>` ve `Error` modellerini olustur
- `⬜` Tanimli tek bir response contract'i belirle (success/error envelope)
- `⬜` Tum controller endpointlerini bu contract ile hizala
- `⬜` Validation hatalarini da ayni response yapisina bagla
- `⬜` Swagger uzerinde response tiplerini standart goster

**Kanitlar:**
- `CargoPilot.Application/Common/Models/Result.cs`
- `CargoPilot.Application/Common/Models/Error.cs`

---

## 9) Global Exception Handling
**Story:** Backend Chapter Lead olarak, uygulama genelinde firlatilan tum beklenmedik hatalarin merkezi bir noktadan yakalanmasini (Global Exception Handling) isterim.

**Genel Durum:** `⬜ Baslanmadi`

### Alt Isler
- `⬜` Global exception middleware veya `UseExceptionHandler` ekle
- `⬜` Exception-to-response map stratejisi belirle
- `⬜` Beklenmeyen hatalarda standart error response don
- `⬜` Correlation id ve loglama baglantisini kur
- `⬜` Exception handling icin unit/integration test ekle

---

## 10) Swagger dokumantasyonu
**Story:** Backend Chapter Lead olarak 3D ve Platform squad'larinin gelistirme yapabilmesi icin API uc noktalarini Swagger ile dokumante edilmesini isterim.

**Genel Durum:** `✅ Tamamlandi`

### Alt Isler
- `✅` Swagger servislerini ekle (`AddEndpointsApiExplorer`, `AddSwaggerGen`)
- `✅` Swagger middleware kur (`UseSwagger`, `UseSwaggerUI`)
- `✅` Swagger gorunurlugunu ortamlara gore netlestir (sadece development disi gereksinim) (Kapsam: `DependencyInjection.cs` icerisinde `app.Environment.IsDevelopment()` kontrolu `!app.Environment.IsProduction()` olarak degistirildi. Boylece Swagger; Development ve Staging ortamlarinda gorunur duruma, yalnizca guvenlik amaciyla Production ortaminda erisime kapali hale getirildi.)
- `✅` Endpoint summary/description/response kod dokumantasyonlarini tamamla (Kapsam: XML dokumantasyon uretimi icin `CargoPilot.WebAPI.csproj` dosyasina `<GenerateDocumentationFile>true</GenerateDocumentationFile>` eklendi. Gerekli olmayan `<NoWarn>1591</NoWarn>` public property yorum uyarilari sessize alindi. Projedeki `Assembly.GetExecutingAssembly().GetName().Name + ".xml"` yolu yakalanarak `SwaggerGen` `IncludeXmlComments` metoduyla baglandi. Sonrasinda `CargosController` ve `HomeController` endpoint'lerine `/// <summary>`, `/// <response>` xml dökümanları ve `[ProducesResponseType]` attribute'ları girildi. 200/400 donus modelleri (`CreateCargoResponse`, `WelcomeResponse` vs.) Swagger'a acildi. Controller isim karmasasini onlemek icin `[Tags("Cargos")]` seklinde grouping etiketleri kullanildi.)
- `✅` Auth kullaniliyorsa Swagger auth ayarlarini ekle (Kapsam: Henuz projenin JWT akislari kurulmamis olsa da, gelecekte iskelet teskil etmesi adina Swagger tarafinda JWT token butonunu cikaracak ayarlar eklendi. `Options.AddSecurityDefinition` ve `AddSecurityRequirement` konfigleri Swashbuckle v10 standardina gore yapilandirildi. Auth story implement edildiginde Swagger uzerinden 'Authorize' tusuyla test edilebilecek hale getirildi.)

**Kanitlar:**
- `CargoPilot.WebAPI/Program.cs`
- `CargoPilot.WebAPI/CargoPilot.WebAPI.csproj`
- `CargoPilot.WebAPI/DependencyInjection.cs`
- `CargoPilot.WebAPI/CargosController.cs`
- `CargoPilot.WebAPI/HomeController.cs`

---
