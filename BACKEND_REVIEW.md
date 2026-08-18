# CargoPilot Backend — Uçtan Uca Mimari İnceleme

**Tarih:** 2026-08-15
**Kapsam:** `apps/backend` (.NET 8 / Clean Architecture) + `infra/`, `.github/workflows/`, `docs/`
**Yöntem:** Doğrudan kod okuma. Her bulgu `dosya:satır` referansı ile desteklenmiştir.

---

## 1. Genel Değerlendirme

CargoPilot backend'i, **mimari disiplini beklenenin üzerinde, operasyonel olgunluğu ise beklenenin altında** bir projedir. Bu ikilik raporun ana bulgusudur.

Katman ayrımı gerçek ve tutarlı: `Domain` hiçbir NuGet paketine bağlı değil, `Application` CQRS/MediatR ile use-case bazlı organize edilmiş, `Infrastructure` teknoloji detaylarını kapsıyor. Kod kalitesi altyapısı sıkı — `TreatWarningsAsErrors=true`, SonarAnalyzer + NetAnalyzers, `EnforceCodeStyleInBuild`. Veri modeli özenli: 44 index tanımlı, 34 decimal alanın 34'ünde precision belirtilmiş, token alanları indeksli. API sözleşmesi tutarlı: tüm controller'lar `api/v1/*` prefix'inde, 88 endpoint için 246 `ProducesResponseType` tanımı var, `BaseController` temiz bir `ErrorType → HTTP status` eşlemesi yapıyor. CI/CD tarafında tüm GitHub Action'lar SHA ile pinlenmiş, `permissions` blokları least-privilege, terfi zinciri (feat→dev→test→main) CI'da zorlanıyor, test projesi bulunamazsa pipeline bilinçli olarak hata veriyor. Bunlar iyi mühendislik göstergeleridir ve rapor boyunca "güçlü yön" olarak ayrıca işaretlenmiştir.

Buna karşılık **üretim ortamına dair varsayımların çoğu kodda karşılığını bulmuyor.** Üç örüntü tekrar ediyor:

1. **Sessizce etkisiz güvenlik kontrolleri.** CORS allowlist'i, konfigürasyon anahtarı uyuşmazlığı yüzünden üretimde hiç devreye girmiyor ve `AllowAnyOrigin()` fallback'i çalışıyor. Rate limiting, ters proxy arkasında tüm trafiği tek partition'a topladığı için amacının tersine hizmet ediyor. Her iki kontrol de kodda *var* ama üretimde *yok*.
2. **Gözlemlenebilirlik boşluğu.** ~17.000 satırlık uygulama kodunda log çağrısı içeren dosya sayısı 10. HTTP istek logu (`UseSerilogRequestLogging`) hiç kayıtlı değil. Bir üretim olayında elde HTTP sayaçlarından başka iz yok.
3. **Doğrulama katmanının tek dayanağı disiplin.** Multi-tenant izolasyon için global query filter yok; her sorgunun `CompanyId`'yi elle taşıması gerekiyor (61 dosyada tekrarlanan manuel filtre). Bu bugün büyük ölçüde doğru yapılmış, ama tek bir unutma sessiz veri sızıntısı demek — ve bunu yakalayacak **tek bir test bile yok**. Aynı boşluğun somut bedeli abonelik kotasında zaten ödenmiş durumda: `CreatePlanCommandHandler.cs:44-47` kurumsal kullanıcılara hiç kota uygulamıyor ve bireysel kullanıcıları her zaman `Free` limitine göre ölçüyor (BIZ-01) — sıfır handler testi olduğu için bu ücretlendirme hatası sessizce üretimde duruyor.

Testin durumu bu tabloyu özetliyor: 53 test vakasının **tamamı** optimizasyon motorunu hedefliyor ve orada iş gerçekten iyi yapılmış (golden-master altyapısı, deterministik Guid'ler, 11 testlik rotasyon kapsamı). Buna karşılık 78 handler'ın, 17 controller'ın, tüm `Infrastructure` ve `Domain` katmanlarının testi yok — satır bazında kapsam ≈ **%4,5**.

**Üretime hazırlık değerlendirmesi:** Ürün işlevsel olarak çalışır durumda, ancak Faz 1'deki maddeler kapatılmadan çok kiracılı bir SaaS olarak dış müşteriye açılması önerilmez. Tek başlarına kapatılması gereken maddeler: refresh token'ların düz metin saklanması, üretimde sabit SuperAdmin seed'lenmesi, ERP bağlantı dizesinin tamamen kullanıcı kontrolünde olması ve 4,5 yıllık MinIO imajının internete açık portlarla çalışması.

**Ayrıca bir takvim baskısı var:** .NET 8 için End of Support **10 Kasım 2026** — bu raporun tarihinden yaklaşık **87 gün sonra**. Altı projenin tamamı `net8.0` hedefliyor. .NET 10 geçişi Faz 2'ye planlanmalı; ertelenirse güvenlik yaması alınamayan bir platformda çalışılır.

### Alan Bazlı Sağlık Skorları

| Alan | Skor | Gerekçe |
|---|:--:|---|
| API Katmanı | 7/10 | Tutarlı `api/v1`, iyi hata eşlemesi, güçlü Swagger; REST semantiği ve hata kodu sözlüğü eksik |
| Veritabanı | 7/10 | Index ve precision disiplini iyi; global filter, transaction ve concurrency yok |
| Güvenlik | 3/10 | İki kontrol üretimde etkisiz, düz metin refresh token, ERP bağlantı primitifi |
| Hata Yön. & Gözlemlenebilirlik | 3/10 | Exception yönetimi temiz, ancak uygulama logu pratikte yok |
| Performans | 5/10 | Sınırlar bilinçli konmuş; cache yok, optimizasyon istek içinde senkron |
| Kod Kalitesi & Mimari | 7/10 | Katman ayrımı gerçek; anemik domain, zaman soyutlaması yok, DI kırılganlıkları |
| CI/CD & Deployment | 5/10 | Pipeline hijyeni çok iyi; üretim deploy otomasyonu yok, container root |
| **Test Kapsamı** | **2/10** | Motor örnek nitelikte test edilmiş; 78 handler ve tüm HTTP katmanı test dışı |
| **Bağımlılıklar** | **5/10** | NuGet tarafı temiz (0 zafiyet); 4,5 yıllık MinIO imajı ve .NET 8 EOL baskısı |
| **Dokümantasyon** | **6/10** | Kapsam beklenenden geniş ve API dokümanı güçlü; birkaç doküman kodla çelişip onboarding'i kırıyor |

---

## 2. Metodoloji ve Kapsam Notu

Bu rapordaki bulgular doğrudan kaynak kod okunarak üretilmiş, satır numaraları `grep -n` / numaralı `Read` çıktısıyla doğrulanmıştır. Rapora girmeden elenen iddialara örnekler (yanlış pozitif olmasınlar diye kontrol edildiler ve **sorun olmadıkları görüldü**):

- Notification IDOR — `MarkNotificationRead` ve `DeleteNotification` handler'ları sahiplik kontrolü **yapıyor**.
- Share token entropisi — `RandomNumberGenerator.GetBytes(32)` (256-bit CSPRNG), sorun **yok**.
- ERP sorgusunda SQL injection — `categoryFilter` parametrize edilmiş (`@CategoryFilter`), injection **yok**.
- Optimizasyonda sınırsız DoS — 500 kutu tavanı bilinçli ve gerekçesi kodda yazılı.
- `ApproveDraftItem`'da çoklu `SaveChanges` — iki çağrı birbirini dışlayan dallarda, atomiklik ihlali **değil**.
- Swagger/XML dokümantasyon eksikliği — 246 `ProducesResponseType` + 100 XML `<summary>` mevcut.
- Logo upload doğrulaması — content-type allowlist ve 2 MB sınırı **var**.
- NuGet zafiyetleri — `dotnet list package --vulnerable --include-transitive` çalıştırıldı, 6/6 projede **sıfır** bilinen zafiyet.
- `Microsoft.Bcl.Memory` override'ı — CVE-2026-26127 gerçek ve fix sürümü doğru uygulanmış.
- MediatR lisansı — 12.5.0 hâlâ Apache 2.0; ticari lisans yalnızca 13+ için geçerli.
- Backend geliştirici rehberi — `apps/backend/docs/` altında 7 dosya / 2.962 satır **var** (bu raporun ilk taslağındaki "yok" ifadesi hatalıydı, düzeltilmiştir).
- Public API dokümantasyonu — 88 endpoint'in 72'sinde XML `<summary>`, 246 `ProducesResponseType`; Swagger'a bağlı.

**Bağımlılık taraması notu:** CVE iddiaları `dotnet list package` çıktısı ve harici advisory kaynaklarıyla (OSV, GitHub Security Advisories, MinIO güvenlik bülteni) doğrulanmıştır. Kesin olarak doğrulanamayan tek madde CVE-2023-28432'nin standalone MinIO kurulumuna uygulanıp uygulanmadığıdır; raporda bu belirsizlik açıkça işaretlenmiştir.

---

## 3. Alan Bazlı Raporlar

### 3.1 Güvenlik

**Mevcut Durum.** JWT + Google OAuth ile kimlik doğrulama, BCrypt ile parola saklama, policy tabanlı yetkilendirme (`SuperAdmin`/`CompanyAdmin`/`CompanyWorker`/`Individual`/`CompanyMember`) kuruludur. `MapInboundClaims = false` ve `ClockSkew = TimeSpan.Zero` gibi doğru JWT ayarları yapılmış. On adet endpoint için isimlendirilmiş rate limit politikası tanımlanmış. ERP parolaları ASP.NET DataProtection ile şifreleniyor. Ancak kontrollerin bir kısmı üretim konfigürasyonunda devre dışı kalıyor ve uzun ömürlü kimlik bilgileri düz metin saklanıyor.

**Güçlü Yönler**
- `GlobalExceptionMiddleware` stack trace sızdırmıyor, `[LoggerMessage]` source generator kullanıyor (`Middlewares/GlobalExceptionMiddleware.cs:14-42`).
- Share token'ları 256-bit CSPRNG (`Features/Shares/CreateShareLink/CreateShareLinkCommandHandler.cs:43-44`).
- Parola sıfırlama ve e-posta değişikliği token'ları **hash'lenerek** saklanıyor (`PasswordResetTokenConfiguration.cs:27`, `EmailChangeTokenConfiguration.cs:31`).
- ERP sorgusu parametrize (`SqlServerErpProductFetcher.cs:30,39`).
- `.dockerignore` yerel secret dosyalarını dışlıyor (`apps/backend/.dockerignore`).
- CodeQL hem `csharp` hem `javascript-typescript` tarıyor (`.github/workflows/codeql.yml:29-31`).

**Tespit Edilen Eksikler/Riskler**

**[Kritik] SEC-01 — CORS allowlist'i üretimde hiç devreye girmiyor**
Kod `CORS_ALLOWED_ORIGIN_1` … `CORS_ALLOWED_ORIGIN_10` anahtarlarını okuyor:
```csharp
// apps/backend/CargoPilot.WebAPI/DependencyInjection.cs:167-170
var corsOrigins = Enumerable.Range(1, 10)
    .Select(i => configuration[$"CORS_ALLOWED_ORIGIN_{i}"])
```
Compose ise `Cors__AllowedOrigins__0` enjekte ediyor (`infra/compose/docker-compose.prod.yml:39`, aynısı `docker-compose.test.yml:36`). İki ayrı uyuşmazlık var: anahtar adı farklı (`Cors:AllowedOrigins:0` ≠ `CORS_ALLOWED_ORIGIN_1`) ve indeks tabanı farklı (0 vs 1). Sonuç: `corsOrigins.Length` her zaman 0 ve `DependencyInjection.cs:178`'deki `AllowAnyOrigin()` fallback'i üretimde çalışıyor.
**Etki:** Origin allowlist'i tamamen etkisiz. Bu dalda `AllowCredentials()` çağrılmadığı ve kimlik doğrulama Bearer token tabanlı olduğu için tarayıcı oturum devralma riski *doğrudan* oluşmuyor; asıl sorun kimlik doğrulaması gerektirmeyen uçların (contact, register, login, share) herhangi bir origin'den tarayıcı üzerinden çağrılabilmesi ve ekibin aktif sandığı kontrolün gerçekte kapalı olmasıdır.
**Öneri:** Kodu `Cors:AllowedOrigins` dizisini okuyacak şekilde düzeltin (`configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()`), fallback'i `AllowAnyOrigin()` yerine **üretimde başlatmayı durduran** bir hata haline getirin. **Efor: S**

**[Kritik] SEC-02 — Refresh token'lar veritabanında düz metin**
`UserSession.Token` ham string olarak tutuluyor (`CargoPilot.Domain/Entities/UserSession.cs:7,34`), doğrudan indeksleniyor (`UserSessionConfiguration.cs:19,44`) ve üretilen değer ham bir gizli anahtar:
```csharp
// apps/backend/CargoPilot.Infrastructure/Security/JwtTokenService.cs:60-61
public string GenerateRefreshToken() =>
    Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
```
Entropi yeterli; sorun saklama biçimi. Aynı kod tabanı kısa ömürlü parola sıfırlama ve e-posta değişikliği token'larını **hash'liyor** — bu tutarsızlık bilinçli bir karardan çok gözden kaçmaya işaret ediyor.
**Etki:** Veritabanına okuma erişimi elde eden herkes (yedek sızıntısı, `sa` hesabı, CD-03'teki dışarı açık MSSQL portu) tüm kullanıcılar adına doğrudan yeniden oynatılabilir oturum elde eder. Parola değişikliği bu token'ları geçersiz kılmaz.
**Öneri:** `Token` yerine `TokenHash` (SHA-256) saklayın, doğrulamayı hash üzerinden yapın, index'i `TokenHash`'e taşıyın. Geçiş için mevcut oturumları geçersiz kılın. **Efor: M**

**[Kritik] SEC-03 — Rate limiting ters proxy arkasında çöküyor**
Tüm politikalar istemci IP'sine göre partition alıyor:
```csharp
// apps/backend/CargoPilot.WebAPI/DependencyInjection.cs:49-51 (10 politikanın hepsinde aynı desen)
RateLimitPartition.GetSlidingWindowLimiter(
    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown", ...)
```
Kod tabanının tamamında `UseForwardedHeaders`, `ForwardedHeadersOptions` veya `KnownProxies` yapılandırması **yok** (doğrulandı). Dağıtım nginx arkasında yapılıyor (`infra/nginx/`).
**Etki:** `RemoteIpAddress` her istekte nginx'in IP'si olur; tüm trafik tek partition'a düşer. Login limiti tüm platform için dakikada 10 isteğe iner — hem meşru kullanıcılar için hizmet kesintisi, hem de per-IP brute-force korumasının tamamen kaybı.
**Öneri:** `UseForwardedHeaders` middleware'ini `UseRateLimiter`'dan **önce** ekleyin, `KnownProxies`/`KnownNetworks`'ü nginx adresiyle sınırlayın. **Efor: S**

**[Kritik] SEC-04 — Üretimde sabit SuperAdmin seed'leniyor, parola değişimi zorlanmıyor**
```csharp
// apps/backend/CargoPilot.Infrastructure/Persistence/Seeding/DbInitializer.cs:11
private const string DefaultAdminEmail = "admin@cargopilot.com";
```
Bu kullanıcı `UserType.SuperAdmin` olarak oluşturuluyor (`DbInitializer.cs:72-84`) ve parolası `Seed__DefaultAdminPassword` ortam değişkeninden geliyor — üretim compose'unda bu değer sağlanıyor (`docker-compose.prod.yml:32`). `AppUser.SetMustChangePassword` metodu ve `MustChangePasswordMiddleware` mevcut olmasına rağmen `DbInitializer` bu bayrağı **hiç set etmiyor**.
**Etki:** Üretimde adresi bilinen, kalıcı, en yüksek yetkili bir hesap var. Seed parolası ortamlar arası tekrar kullanılırsa veya sızarsa, tüm kiracıların verisine erişilir.
**Öneri:** Üretimde seed'i tamamen kapatın (ortam kontrolü), veya hesabı `MustChangePassword = true` ile oluşturun ve ilk girişte rotasyonu zorlayın. **Efor: S**

**[Kritik] SEC-05 — ERP bağlantı dizesi tamamen kullanıcı kontrolünde**
Saldırı zinciri uçtan uca doğrulandı:
1. `CompanyAdmin` yetkili kullanıcı `ServerAddress` gönderir — doğrulama yalnızca "boş değil, ≤500 karakter" (`Features/ErpSettings/UpsertErpSettings/UpsertErpSettingsCommandValidator.cs`). Host/format/allowlist kontrolü yok.
2. Değer `Integration.ApiEndpoint` olarak saklanır (`UpsertErpSettingsCommandHandler.cs:63`).
3. Senkronizasyonda `FetchAsync(apiEndpoint, ...)` çağrılır (`Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:84`).
4. Kimlik bilgisi yoksa **veya JSON ayrıştırma hata verirse**, endpoint doğrudan ADO.NET bağlantı dizesi olarak kullanılır:
```csharp
// apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:90-113
private static string BuildConnectionString(string apiEndpoint, string? authCredentialsJson) {
    if (authCredentialsJson is null) return apiEndpoint;   // satır 92-93
    try { ... }
    catch { return apiEndpoint; }                          // satır 110-113
}
```
**Etki:** Kimliği doğrulanmış herhangi bir kiracı yöneticisi, üretim ağının içinden keyfi bir SQL Server bağlantı dizesi kurdurabilir. Bu; erişilebilir iç hostlara bağlantı (SSRF / ağ keşfi) ve `AttachDbFilename` gibi tehlikeli bağlantı dizesi anahtar kelimelerinin kullanımı anlamına gelir. `catch` bloğu bozuk kimlik bilgisini sessizce bu tehlikeli dala düşürür. Ek olarak mutlu yolda `TrustServerCertificate = true` (satır 106) sertifika doğrulamasını kapatır ve varsayılanlar `UserID = "sa"`, `InitialCatalog = "DIVIZYON"`'dur (satır 103-104).
**Öneri:** `ServerAddress`'i host/port formatına zorlayan bir doğrulayıcı ekleyin, bağlantı dizesini **her zaman** `SqlConnectionStringBuilder` ile kurun (ham endpoint'i asla doğrudan kullanmayın), `catch` bloğunu hata döndürecek şekilde değiştirin, `sa` varsayılanını kaldırın, `TrustServerCertificate`'ı yapılandırılabilir yapın. **Efor: M**

**[Orta] SEC-06 — Taban `appsettings.json`'da varsayılan JWT secret**
`"Secret": "dev-only-secret-replace-with-env-var-in-staging-and-prod!!"` (`CargoPilot.WebAPI/appsettings.json:27`) tüm ortamlara uygulanan taban dosyada duruyor. Başlangıç doğrulaması yalnızca boş olup olmadığına bakıyor (`CargoPilot.Infrastructure/DependencyInjection.cs:28-33`); minimum uzunluk veya "varsayılan değerle aynı mı" kontrolü yok. Compose'da `JWT_SECRET` tanımsızsa değer boş string olur ve uygulama başlamaz — bu yol güvenlidir; risk, taban dosyanın imaja girdiği ve ortam değişkeninin atlandığı diğer çalıştırma biçimlerindedir.
**Öneri:** Varsayılanı dosyadan tamamen kaldırın; `.Validate()` içine minimum 32 karakter ve "bilinen varsayılana eşit değil" kuralı ekleyin. **Efor: S**

**[Orta] SEC-07 — `/health/detail` ve `/metrics` kimlik doğrulamasız**
`/health/detail` bileşen bazında durum ve `e.Value.Exception?.Message` alanını döndürüyor (`DependencyInjection.cs`, `WriteDetailedHealthResponse`); `/metrics` Prometheus çıktısını açıyor. İkisi de `RequireAuthorization()` olmadan map edilmiş.
**Etki:** İç bileşen adları, hata mesajları (bağlantı dizesi parçaları içerebilir), endpoint envanteri ve trafik hacmi dışarıya açık.
**Öneri:** Her ikisini de yetkilendirmeye bağlayın veya nginx seviyesinde iç ağa kısıtlayın. `/health` (sığ) açık kalabilir. **Efor: S**

**[Orta] SEC-08 — Güvenlik başlıkları ve HTTPS zorlaması yok**
`UseHsts`, `UseHttpsRedirection`, CSP / `X-Content-Type-Options` / `X-Frame-Options` başlıkları kod tabanında **hiç yok** (doğrulandı). `appsettings.json:14` `"AllowedHosts": "*"`.
**Öneri:** Başlıkları nginx'te veya middleware'de merkezî olarak ekleyin; `AllowedHosts`'u gerçek alan adına daraltın. **Efor: S**

**[Orta] SEC-09 — Dosya yükleme doğrulaması kısmi ve asimetrik**
Logo yükleme doğru yapılmış: content-type allowlist + 2 MB sınırı (`Features/Settings/UploadReportingLogo/UploadReportingLogoCommandValidator.cs`). Ancak content-type **istemciden** geliyor (`Controllers/SettingsController.cs:59`, `logo.ContentType`) ve magic-byte doğrulaması yok. Plan thumbnail tarafında ise **boyut sınırı hiç yok** (`Features/Plans/UploadPlanThumbnail/UploadPlanThumbnailCommandValidator.cs` yalnızca base64 data-URL formatı kontrol ediyor). Ayrıca `MultipartBodyLengthLimit` / `MaxRequestBodySize` kod tabanında hiç tanımlı değil.
**Etki:** Bildirilen MIME ile gerçek içerik ayrışabilir (SVG/HTML yükleyip depolanan XSS); thumbnail ucunda sınırsız base64 yükü belleğe alınır (DoS).
**Öneri:** Magic-byte doğrulaması ekleyin, thumbnail'e boyut sınırı koyun, Kestrel/form gövde limitlerini merkezî olarak tanımlayın. **Efor: M**

**[Orta] SEC-10 — Swagger üretim dışı tüm ortamlarda açık**
`if (!app.Environment.IsProduction())` koşulu Staging'i de kapsıyor. Staging genellikle üretim verisinin kopyasını taşır.
**Öneri:** Koşulu `IsDevelopment()` yapın veya Staging'de kimlik doğrulamasına bağlayın. **Efor: S**

**[Orta] SEC-11 — DataProtection `SetApplicationName` olmadan yapılandırılmış**
`services.AddDataProtection().PersistKeysToDbContext<AppDbContext>()` (`CargoPilot.Infrastructure/DependencyInjection.cs`) — uygulama adı belirtilmediği için amaç dizesi içerik kök yolundan türetilir.
**Etki:** Konteyner yolu veya dağıtım biçimi değişirse mevcut ERP parolaları çözülemez hale gelir (sessiz veri kaybı).
**Öneri:** `SetApplicationName("CargoPilot")` ekleyin ve anahtar ömrünü açıkça yapılandırın. **Efor: S**

**[Düşük] SEC-12 — CI'da gömülü JWT fallback secret'ı**
`.github/workflows/test-deploy.yml:180` — `JWT_SECRET: ${{ secrets.JWT_SECRET || 'ci-test-secret-key-at-least-32-chars-long!' }}`. Repo secret'ı tanımlı değilse herkese açık bir değerle deploy edilir.
**Öneri:** Fallback'i kaldırın, secret yoksa pipeline hata versin. **Efor: S**

---

### 3.2 Veritabanı Katmanı

**Mevcut Durum.** EF Core 8.0.30 / SQL Server, 25 entity, 44 migration, 17 repository. Yapılandırma sınıfları ayrı dosyalarda ve özenli: 44 index tanımı, 34 decimal alanın tamamında precision, token alanlarında hedefli index'ler, kompozit kiracı index'leri (`CompanyId, SKU` / `CompanyId, PlateNumber`). Audit alanları `SaveChanges` override'ında merkezî olarak dolduruluyor. Zayıf noktalar şema tasarımında değil, **çalışma zamanı garantilerinde**: kiracı izolasyonu, atomiklik ve eşzamanlılık kontrolü tamamen geliştirici disiplinine bırakılmış.

**Güçlü Yönler**
- Index disiplini yüksek: `ShareLink.Token`, `PasswordResetToken.TokenHash`, `EmailChangeToken.TokenHash`, `UserSession.Token`, kompozit `CompanyId` index'leri (`Persistence/Configurations/` genelinde 44 `HasIndex`).
- Tüm decimal alanlarda precision tanımlı (34/34) — para ve ölçü alanlarında yuvarlama sürprizi yok.
- `ApplyAuditFields()` merkezî (`Persistence/AppDbContext.cs:43-51`).
- SQL Server geçici hata dayanıklılığı açık: `EnableRetryOnFailure(maxRetryCount: 5, ...)` (`Infrastructure/DependencyInjection.cs`).

**Tespit Edilen Eksikler/Riskler**

**[Kritik] DB-01 — Global query filter yok; kiracı izolasyonu tamamen elle**
`AppDbContext.OnModelCreating` (`Persistence/AppDbContext.cs:53-75`) yalnızca `ApplyConfiguration` çağrıları içeriyor; `HasQueryFilter` kod tabanında **hiç kullanılmıyor** (doğrulandı). Ne soft-delete (`IsDeleted`) ne de `CompanyId` için otomatik filtre var.
**Etki:** Her sorgu `CompanyId` ve `IsDeleted` koşullarını elle taşımak zorunda. Bugün incelenen handler'lar bunu doğru yapıyor, ancak tek bir unutulan `Where` sessiz çapraz-kiracı veri sızıntısı demek — ve bunu yakalayacak otomatik test yok. Bu, güvenlik bölümündeki IDOR riskinin yapısal kök nedenidir.
**Öneri:** Soft-delete için global query filter ekleyin (düşük riskli, hemen yapılabilir). Kiracı filtresi için `ICurrentUserService` bağımlı bir filtre değerlendirin; arka plan işleri (Hangfire) için `IgnoreQueryFilters` kaçış yolunu bilinçli tasarlayın. **Efor: M**

**[Orta] DB-02 — Hiçbir yerde explicit transaction yok**
`BeginTransaction` / `IDbContextTransaction` / `TransactionScope` kod tabanında hiç geçmiyor (doğrulandı). Çok varlıklı yazma yapan akışlar tek `SaveChanges`'e güveniyor; bu aynı `DbContext` içinde çalıştığı sürece atomiktir, ancak akış içinde birden fazla kayıt noktası olan yerlerde garanti yok. `SyncErpItemsCommandHandler` içinde iki ayrı `SaveChangesAsync` var (satır 147 ve 156) — biri taslak ürünler, diğeri senkronizasyon logu için; ilki başarılı olup ikincisi başarısız olursa kayıt tutarsız kalır.
**Öneri:** Çok adımlı akışlarda (ERP senkronizasyonu, plan oluşturma + yerleşim yazma) açık transaction kullanın veya bir Unit of Work soyutlaması getirin. **Efor: M**

**[Orta] DB-03 — Optimistic concurrency yok**
`RowVersion` / `IsRowVersion` / `ConcurrencyToken` kod tabanında hiç yok (doğrulandı).
**Etki:** İki kullanıcı aynı planı/ürünü eş zamanlı düzenlerse son yazan sessizce kazanır (lost update). Çok kullanıcılı bir şirket hesabında gerçekçi bir senaryo.
**Öneri:** En azından `LoadingPlan`, `Item`, `Vehicle` ve `ErpSettings` üzerinde `RowVersion` ekleyin; çakışmayı 409 ile döndürün. **Efor: M**

**[Orta] DB-04 — Migration uygulama açılışında çalışıyor**
```csharp
// apps/backend/CargoPilot.Infrastructure/Persistence/Seeding/DbInitializer.cs:27-29
if (_context.Database.IsSqlServer()) {
    await _context.Database.MigrateAsync(cancellationToken);
}
```
`Program.cs:33-38`'de her açılışta çağrılıyor.
**Etki:** (a) Birden fazla replika ile aynı anda migration yarışı; (b) şema değişikliği konteyner başlatmaya bağlı olduğu için imaj rollback'i şemayı geri almaz — CD-04 ile birleşince rollback stratejisini kırar; (c) uygulamanın çalışma zamanında DDL yetkisi gerektirmesi (`sa` kullanımını pekiştiriyor); (d) migration hatası = uygulama hiç ayağa kalkmaz.
**Öneri:** Migration'ı deploy pipeline'ında ayrı ve idempotent bir adıma taşıyın (`dotnet ef database update` veya idempotent script). **Efor: M**

**[Orta] DB-05 — Üretim veritabanına test verisi seed'leniyor**
`DbInitializer` "Default Logistics" şirketi ve `https://erp.test` adresli sahte bir "TestERP" entegrasyonu oluşturuyor (`DbInitializer.cs:36-61`). Entegrasyon kontrolü **en eski şirkete** bağlı (`satır 31-33, 46-47`), yani gerçek bir müşteri kaydı ilk sıradaysa sahte entegrasyon **gerçek bir kiracıya** iliştirilir.
**Öneri:** Seed'i yalnızca Development ortamıyla sınırlayın. **Efor: S**

**[Düşük] DB-06 — Repository soyutlaması sızdırıyor**
`ApproveDraftItemCommandHandler.cs:92-94` — `_itemRepository.Add(item)` sonrası `_draftItemRepository.SaveChangesAsync()` çağrılıyor. Aynı `DbContext` paylaşıldığı için çalışıyor, ancak repository sınırının ayrı depo ima etmesiyle çelişiyor ve gelecekte kırılgan.
**Öneri:** Kayıt sorumluluğunu açık bir Unit of Work'e taşıyın. **Efor: M**

**[Düşük] DB-07 — Kullanılmayan `database/` klasörleri**
Repo kökünde boş `database/migrations` ve `database/seeds` klasörleri var; gerçek migration'lar `apps/backend/CargoPilot.Infrastructure/Persistence/Migrations` altında. Kafa karışıklığı yaratıyor.
**Öneri:** Kaldırın veya README ile amacını açıklayın. **Efor: S**

---

### 3.3 API Katmanı

**Mevcut Durum.** 17 controller, 88 endpoint. Tüm controller'lar `api/v1/*` prefix'i kullanıyor (`HomeController` hariç, o kök `/` üzerinde bir karşılama ucu). `BaseController.HandleResult<T>` `Result<T>` desenini HTTP durum kodlarına eşliyor. Model binding hataları `ApiBehaviorOptions.InvalidModelStateResponseFactory` ile aynı zarf yapısına dönüştürülmüş — yani doğrulama hataları, iş hataları ve auth hataları istemciye tek tip `{isSuccess, data, error}` sözleşmesiyle dönüyor. Bu tutarlılık projenin güçlü yanlarından biri.

**Güçlü Yönler**
- Sürüm prefix'i tutarlı: 16 controller'ın tamamı `api/v1/...` (`Controllers/` genelinde doğrulandı).
- Hata eşlemesi eksiksiz ve tek noktada: `Validation→400, Unauthorized→401, Forbidden→403, NotFound→404, Conflict→409, BusinessRule→422, RateLimit→429, Unexpected→500` (`Controllers/BaseController.cs:16-27`).
- Swagger sözleşmesi zengin: 88 endpoint için 246 `ProducesResponseType`, 100 XML `<summary>`.
- Auth hataları da aynı zarf yapısında dönüyor (`DependencyInjection.cs`, `JwtBearerEvents.OnChallenge`/`OnForbidden`).

**Tespit Edilen Eksikler/Riskler**

**[Orta] API-01 — Yazma işlemleri REST semantiğine uymuyor**
`HandleResult` başarı durumunda **her zaman** `Ok(result)` (200) döndürüyor (`Controllers/BaseController.cs:11-14`). Kaynak oluşturan POST uçları 201 Created ve `Location` başlığı üretmiyor; DELETE uçları 204 No Content döndürmüyor.
**Etki:** İstemci, oluşturulan kaynağın adresini yanıt gövdesinden çıkarmak zorunda; ara katman/cache davranışları standart dışı.
**Öneri:** `HandleResult` yanına `HandleCreated<T>(result, routeName, routeValues)` ekleyin, oluşturma uçlarını ona taşıyın. **Efor: M**

**[Orta] API-02 — 19 komutun doğrulayıcısı yok; toplu uçlar sınırsız**
54 `*Command` dosyasına karşılık 43 `*Validator` var. Eksikler arasında yalnızca `Guid` alan silme/işaretleme komutları (kabul edilebilir) yanında gerçek riskli olanlar da bulunuyor:
- `Items/BulkCreateItems/BulkCreateItemsCommand` ve `Items/BulkUpdateItems/BulkUpdateItemsCommand` — doğrulayıcı yok. Handler'da yalnızca boşluk kontrolü var (`BulkCreateItemsCommandHandler.cs:32`), **üst sınır yok**; tüm liste tek `SaveChanges` ile yazılıyor (satır 110).
- `Shares/CreateShareLink/CreateShareLinkCommand` — geçerlilik/son kullanma doğrulaması yok.
- `Auth/OAuthLogin/OAuthLoginCommand` — kimlik doğrulama girdisi, doğrulayıcısız.
**Öneri:** Toplu uçlara `MaximumLength`/`Must(x => x.Count <= N)` kuralı ekleyin, `OAuthLogin` ve `CreateShareLink` için doğrulayıcı yazın. **Efor: M**

**[Düşük] API-03 — Sayfalama sözleşmesi çoğunlukla tutarlı ama tam değil**
`SearchItems`, `SearchVehicles`, `GetPlans`, `GetLoadingPlanReports`, `GetPendingItemMappings` doğrulayıcılarında `PageSize` `InclusiveBetween(1, 100)` ile sınırlanmış — iyi. Ancak `GetNotifications` ve `GetSyncLogs` için aynı üst sınırın uygulandığı doğrulanamadı.
**Öneri:** Tüm sayfalanan uçlarda ortak bir `PagedQueryValidator` tabanı kullanın. **Efor: S**

---

### 3.4 Performans

**Mevcut Durum.** Ürünün en ağır işi olan 3D bin-packing optimizasyonu `Application/Common/Optimization` altında, saf ve iyi yorumlanmış kod olarak duruyor. Ekip maliyetin farkında: tek planda 500 kutu üst sınırı konmuş ve gerekçesi kodda yazılı. Ancak hesap hâlâ HTTP isteği içinde senkron çalışıyor ve uygulamada **hiçbir önbellekleme katmanı yok**. Dış servis çağrılarında yeniden deneme/devre kesici yok.

**Güçlü Yönler**
- Sınır bilinçli ve belgeli: `MaxTotalBoxCount = 500`, gerekçesi ile birlikte (`Application/Common/Config/OptimizationLimits.cs:5-11`).
- `CancellationToken` optimizasyon döngüsünde gerçekten kontrol ediliyor (`OptimizationEngine.cs:62`).
- Sync-over-async deseni (`.Result`, `.Wait()`, `async void`) kod tabanında **hiç yok** (doğrulandı).
- `new HttpClient()` kullanımı yok; hepsi `IHttpClientFactory` üzerinden (doğrulandı) — socket exhaustion riski yok.
- Belirlenimcilik bilinçli korunmuş: skor toplama sırası sabitlenmiş ve gerekçesi yorumda açıklanmış (`OptimizationEngine.cs:196-209`).

**Tespit Edilen Eksikler/Riskler**

**[Kritik] PERF-01 — Optimizasyon istek içinde senkron ve süper-lineer**
Her kutu için tüm extreme point'ler × yönelimler taranıyor, her aday için de yerleştirilmiş kutu listesi üzerinden altı ayrı kısıt fonksiyonu çalışıyor (`OptimizationEngine.cs:86-121`). Extreme point sayısı her yerleştirmede ~3 artıyor (satır 138-140) ve her kutuda yeniden sıralanıyor (satır 86, `OrderBy(...).ThenBy(...).ThenBy(...)`). Aritmetik `decimal` ile yapılıyor — belirlenimcilik için bilinçli bir seçim, ancak `double`'a göre bir mertebe yavaş. Kod yorumu durumu zaten kabul ediyor: *"hesap istek içinde senkron çalışır; sınır olmadan büyük listeler isteği zaman aşımına uğratır"* (`OptimizationLimits.cs:7-9`).
**Etki:** 500 kutuluk üst sınır bir ürün tavanıdır: müşteri daha büyük bir yük planlayamaz. Sınıra yakın planlarda istek süresi uzar ve web worker'ını bloke eder; eş zamanlı birkaç ağır plan tüm API'yi yavaşlatır.
**Öneri:** Optimizasyonu Hangfire işine taşıyın (altyapı zaten kurulu), istemciye plan durumu için polling/push verin. Bu, 500 sınırının kaldırılmasının da ön koşuludur. İkinci adım olarak sıcak döngüde `decimal` yerine ölçeklenmiş tamsayı (mm cinsinden `long`) kullanmayı değerlendirin — belirlenimciliği korur, hızı belirgin artırır. **Efor: L**

**[Orta] PERF-02 — Uygulamada hiç önbellekleme yok**
`IMemoryCache`, `IDistributedCache`, Redis, `OutputCache`, `ResponseCaching` — hiçbiri kod tabanında geçmiyor (doğrulandı).
**Etki:** Nadiren değişen veriler her istekte veritabanından okunuyor: abonelik plan tanımları, şirket/raporlama/ERP ayarları, araç kataloğu. HTTP seviyesinde `ETag`/`Last-Modified` de yok; paylaşım planı ve thumbnail uçları her seferinde tam yanıt üretiyor.
**Öneri:** Önce `IMemoryCache` ile düşük riskli referans verilerini (abonelik planları, ayarlar) önbellekleyin; paylaşım/thumbnail uçlarına `ETag` ekleyin. **Efor: M**

**[Orta] PERF-03 — Dış servis çağrılarında retry/timeout/devre kesici yok**
Polly veya `AddTransientHttpErrorPolicy` kod tabanında hiç yok (doğrulandı). ERP bağlayıcıları, Resend e-posta servisi ve Google OAuth çağrıları korumasız. `SqlServerErpProductFetcher`'da `CommandTimeout` da ayarlanmamış.
**Etki:** Yavaş veya erişilemez bir ERP/e-posta servisi istek thread'lerini tutar; geçici hatalar kullanıcıya doğrudan yansır.
**Öneri:** `IHttpClientFactory` kayıtlarına Polly retry + circuit breaker + timeout politikası ekleyin; SQL komutlarına açık `CommandTimeout` verin. **Efor: M**

**[Orta] PERF-04 — ERP depo filtresi bellekte uygulanıyor**
Sorgu `TBLSTSABIT` tablosundan tüm uygun ürünleri çekiyor, depo filtresi ise satır satır C# tarafında uygulanıyor:
```csharp
// apps/backend/CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs:55-56
if (warehouseFilter is not null && depoKodu != warehouseFilter)
    continue;
```
Kategori filtresi ise doğru şekilde SQL'e parametre olarak gidiyor (satır 29-30, 38-39) — asimetri açık.
**Etki:** Büyük ERP kataloglarında gereksiz tam tablo aktarımı; ağ ve bellek maliyeti.
**Öneri:** `warehouseFilter`'ı da `@WarehouseFilter` parametresiyle `WHERE` koşuluna taşıyın. **Efor: S**

**[Orta] PERF-05 — Toplu uçlarda parti boyutu sınırı yok**
`BulkCreateItemsCommandHandler` tüm listeyi işleyip tek `SaveChangesAsync` ile yazıyor (`satır 83-110`), üst sınır yok (API-02 ile aynı kök).
**Etki:** Büyük içe aktarmalarda EF change tracker şişer, tek dev transaction oluşur, bellek ve kilit süresi artar.
**Öneri:** Üst sınır + parti parti (`chunk`) kaydetme uygulayın. **Efor: M**

**[Düşük] PERF-06 — Extreme point listesi her kutuda yeniden sıralanıyor**
`OptimizationEngine.cs:86` her kutu için `OrderBy().ThenBy().ThenBy()` ile tüm aday noktaları yeniden sıralıyor ve her seferinde yeni bir dizi ayırıyor.
**Öneri:** Sıralı bir veri yapısı (öncelik kuyruğu veya sıralı ekleme) kullanın. **Efor: M**

---

### 3.5 Hata Yönetimi & Gözlemlenebilirlik

**Mevcut Durum.** Merkezî exception middleware temiz yazılmış ve istemciye iç detay sızdırmıyor. Prometheus metrikleri ve health check'ler kurulu; Grafana/Loki/Promtail yığını `infra/docker` altında yapılandırılmış. Ancak **uygulama seviyesinde loglama pratikte yok** — bu, altyapının varlığıyla keskin bir tezat oluşturuyor: log toplama hattı kurulmuş ama toplanacak log üretilmiyor.

**Güçlü Yönler**
- `GlobalExceptionMiddleware` stack trace sızdırmıyor, `Result` sözleşmesine uygun tek tip 500 üretiyor, `[LoggerMessage]` source generator kullanıyor (`Middlewares/GlobalExceptionMiddleware.cs:14-42`).
- Serilog `CompactJsonFormatter` ile yapılandırılmış çıktı veriyor (`Program.cs:17-21`) — Loki için doğru format.
- `UseHttpMetrics()` + `MapMetrics("/metrics")` kurulu; health check'ler bileşen bazında (`minio`, `database`) etiketli.

**Tespit Edilen Eksikler/Riskler**

**[Kritik] OBS-01 — Uygulama logu pratikte yok, HTTP istek logu hiç yok**
~17.000 satırlık uygulama kodunda log çağrısı içeren dosya sayısı **10**. Loglama yapan dosyalar: `GlobalExceptionMiddleware`, `AuthService`, `MinioStorageService`, `ResendEmailService`, `SendContactMessageCommandHandler`, `UpdateCompanyUserCommandHandler`, `SyncErpItemsCommandHandler`, `RequestEmailChangeCommandHandler`, `ChangeMyPasswordCommandHandler`, `CreateCompanyUserCommandHandler`. Ürünün çekirdek akışı olan **plan oluşturma ve optimizasyon hiç log üretmiyor**; Items, Vehicles, Shares, Notifications, DraftItems, Subscriptions, tüm repository'ler, `JwtTokenService`, `GoogleOAuthService` ve üç Hangfire işi de sessiz. Ayrıca `UseSerilogRequestLogging` kod tabanında **hiç kayıtlı değil** (doğrulandı) — yani metot/yol/durum/süre/kullanıcı içeren istek logu üretilmiyor.
**Etki:** Üretimde bir olay yaşandığında elde yalnızca Prometheus HTTP sayaçları ve yakalanmamış exception'lar var. "Hangi kullanıcı hangi planı ne zaman oluşturdu, neden başarısız oldu" sorusu kodla cevaplanamaz. Loki/Promtail yatırımı büyük ölçüde boşa çalışıyor.
**Öneri:** (1) `UseSerilogRequestLogging()` ekleyin — tek satır, en yüksek getiri. (2) Kritik iş akışlarına (plan oluşturma/optimizasyon, ERP senkronizasyonu, abonelik limiti aşımı, yetki reddi) yapılandırılmış log ekleyin. (3) Hangfire işlerine başlangıç/bitiş/hata logu ekleyin. **Efor: M**

**[Orta] OBS-02 — Korelasyon kimliği ve kullanıcı bağlamı yok**
`Program.cs:17-21`'de yalnızca `Enrich.FromLogContext()` var; request id, user id, company id enrichment'ı yok. Dağıtık izleme (OpenTelemetry/Activity) hiç kurulu değil.
**Etki:** Üretilen az sayıdaki log bile bir isteğe veya kiracıya bağlanamıyor.
**Öneri:** Request id + user id + company id enricher middleware'i ekleyin; sonraki adımda OpenTelemetry değerlendirin. **Efor: M**

**[Orta] OBS-03 — `GlobalExceptionMiddleware` iki uç durumu ele almıyor**
```csharp
// apps/backend/CargoPilot.WebAPI/Middlewares/GlobalExceptionMiddleware.cs:23-27
catch (Exception ex) {
    LogUnhandledException(ex);
    await HandleExceptionAsync(context);
}
```
(a) `context.Response.HasStarted` kontrolü yok — yanıt akışı başladıysa `HandleExceptionAsync` içindeki `StatusCode`/`WriteAsJsonAsync` ikinci bir exception fırlatır. (b) `OperationCanceledException` / `TaskCanceledException` de yakalanıp **Error** seviyesinde loglanıp 500 dönüyor; istemci bağlantıyı kestiğinde bu normal bir durumdur.
**Etki:** İstemci kopmaları sahte 500 ve sahte Error logu üretir — alarm gürültüsü ve yanıltıcı hata oranı.
**Öneri:** `HasStarted` kontrolü ekleyin; `OperationCanceledException`'ı ayrı yakalayıp `Information`/`Debug` seviyesinde loglayın ve 499/altyapı davranışına bırakın. **Efor: S**

**[Orta] OBS-04 — Serilog yalnızca konsola yazıyor**
`Program.cs:17-21`'de tek sink `WriteTo.Console`. Promtail konteyner çıktısını topluyorsa hat çalışır, ancak konteyner yeniden başladığında tamponlanmamış kayıtlar kaybolur ve yerel geliştirmede kalıcı log yoktur.
**Öneri:** Loki sink'ini doğrudan ekleyin veya Promtail bağımlılığını dokümante edip retention'ı doğrulayın. **Efor: S**

**[Orta] OBS-05 — İş metriği yok**
Yalnızca `UseHttpMetrics` ile gelen varsayılan HTTP metrikleri var. Optimizasyon süresi, plan başarı/başarısızlık oranı, yerleştirilemeyen kutu sayısı, ERP senkronizasyon hata sayısı, Hangfire kuyruk derinliği gibi ürün sinyalleri ölçülmüyor.
**Etki:** Ürünün asıl sağlığı (planlar doğru ve hızlı üretiliyor mu) izlenemiyor.
**Öneri:** `prometheus-net` ile birkaç `Histogram`/`Counter` ekleyin; optimizasyon süresi ve yerleştirme başarı oranı ilk adaylar. **Efor: M**

**[Orta] OBS-06 — Liveness/readiness ayrımı yok, bağımlılık hataları 200 dönüyor**
`/health` ve `/health/detail` aynı kontrol setini çalıştırıyor. Hem `minio` hem `database` kontrolü `failureStatus: HealthStatus.Degraded` ile kayıtlı ve `Degraded → 200 OK` eşlenmiş.
**Etki:** Veritabanı erişilemez olsa bile `/health` 200 döner; compose healthcheck'i (`docker-compose.prod.yml:53-58`) konteyneri sağlıklı sayar ve gerçek arıza maskelenir.
**Öneri:** Sığ liveness (`/health/live`) ile bağımlılık kontrollü readiness (`/health/ready`) ayırın; readiness'ta veritabanı hatasını `Unhealthy` yapın. **Efor: S**

---

### 3.6 Kod Kalitesi & Mimari

**Mevcut Durum.** Clean Architecture gerçekten uygulanmış: `Domain` bağımlılıksız, `Application` yalnızca MediatR + FluentValidation'a bağlı, EF ve ASP.NET tipleri `Infrastructure`/`WebAPI` katmanlarında kalmış. Statik analiz sıkı yapılandırılmış. Zayıflıklar mimarinin şeklinde değil, derinliğinde: domain modeli anemik ve iş kuralları handler'lara dağılmış; test edilebilirliği doğrudan etkileyen soyutlamalar (zaman) eksik; DI kaydında birkaç kırılgan nokta var.

**Güçlü Yönler**
- `Directory.Build.props` merkezî ve disiplinli: `TreatWarningsAsErrors=true`, `AnalysisMode=Recommended`, `EnforceCodeStyleInBuild=true`, istisnalar gerekçeleriyle belgelenmiş.
- Feature klasör yapısı use-case bazlı ve öngörülebilir.
- `Result<T>` deseni tutarlı uygulanmış; exception ile akış kontrolü yapılmıyor.
- `Domain` projesinin `.csproj` dosyasında hiç `PackageReference` yok — bağımlılık yönü fiilen zorlanmış.

**Tespit Edilen Eksikler/Riskler**

**[Orta] QUAL-01 — Zaman soyutlaması yok**
`DateTime.UtcNow`/`DateTime.Now` doğrudan kullanımı: `Application` katmanında 7, `Infrastructure` katmanında 21 yer (migration'lar hariç). `IClock` / `ITimeProvider` / `IDateTimeProvider` kod tabanında **hiç yok** (doğrulandı).
**Etki:** Zamana bağlı davranışlar (token süresi dolması, deneme süresi bitişi, paylaşım linki geçerliliği, bildirim temizliği) deterministik olarak test edilemez. Test kapsamı eksikliğinin teknik nedenlerinden biri budur.
**Öneri:** .NET 8'in yerleşik `TimeProvider` soyutlamasını enjekte edin ve doğrudan kullanımları kademeli değiştirin. **Efor: M**

**[Orta] QUAL-02 — Anemik domain modeli**
`Domain/Entities` sınıfları büyük ölçüde veri taşıyıcı; iş kuralları handler'larda yaşıyor. Örneğin taslak onaylama kuralları (durum geçişleri, SKU çakışması) `ApproveDraftItemCommandHandler.cs:36-61` içinde; abonelik limitleri `Domain/Subscriptions/SubscriptionLimits.cs` ile `Application/Common/Policies` arasında bölünmüş.
**Etki:** Aynı kural birden fazla handler'da tekrarlanma eğiliminde; domain kuralları birim testine doğrudan açık değil.
**Öneri:** Durum geçişlerini entity metotlarına taşıyın (`draft.Approve()` zaten var — bu yaklaşımı yaygınlaştırın). **Efor: L**

**[Orta] QUAL-03 — DI kaydında kırılgan noktalar**
`Infrastructure/DependencyInjection.cs` içinde üç ayrı sorun:
- `IErpConnector` iki kez `AddTransient` ile kayıtlı (`LogoErpConnector`, `NetsisErpConnector`). Tüketici `IEnumerable<IErpConnector>` bekliyorsa doğru; tek `IErpConnector` enjekte ediyorsa **sessizce yalnızca sonuncusu (Netsis)** gelir.
- `SubscriptionPlanSettings` için `.ValidateOnStart()` çağrılmış ama hiç `.Validate()` kuralı yok — etkisiz bir çağrı.
- `ICurrentUserService` önce `AnonymousCurrentUserService` olarak kayıtlı, sonra `AddPresentation` içinde `JwtCurrentUserService` ile eziliyor. Doğru çalışıyor ancak **kayıt sırasına bağlı**; `Program.cs`'de sıra değişirse tüm istekler anonim kullanıcıya düşer — sessiz ve ciddi bir yetkilendirme hatası olur.
**Öneri:** Bağlayıcı seçimini açık bir factory'ye taşıyın; etkisiz `ValidateOnStart`'ı tamamlayın; `ICurrentUserService` kaydını tek yerde yapın. **Efor: M**

**[Düşük] QUAL-04 — İsimlendirme ve yerleşim tutarsızlıkları**
- `Controllers/UpdateCompanyUserRequest.cs` ve `Controllers/WelcomeResponse.cs` — DTO'lar controller klasöründe.
- `Features/Company` ve `Features/CompanyUsers` ayrı üst klasörler; sınır belirsiz.
- `Features/Plans/GetPlans` ve `Features/Subscriptions/GetPlans` aynı isimde iki farklı use-case.
- Yorumlar Türkçe/İngilizce karışık.
**Öneri:** DTO'ları ilgili feature klasörlerine taşıyın; `Subscriptions/GetPlans`'ı `GetSubscriptionPlans` olarak yeniden adlandırın. **Efor: S**

---

### 3.7 CI/CD & Deployment

**Mevcut Durum.** Pipeline hijyeni bu projenin en güçlü yanlarından biri. Sekiz workflow var; action'lar SHA ile pinlenmiş, `permissions` blokları dar, terfi zinciri makine tarafından zorlanıyor. Buna karşılık **üretime dağıtım otomasyonu yok** ve konteyner/compose güvenlik sertleştirmesi yapılmamış.

**Güçlü Yönler**
- Tüm GitHub Action'lar commit SHA'sı ile pinlenmiş (`.github/workflows/ci.yml:72,75,113,116,152,155,158,165` vb.) — tedarik zinciri açısından örnek davranış.
- `permissions: contents: read` varsayılanı ve job bazında daraltma.
- Terfi zinciri CI'da zorlanıyor: `test`'e yalnızca `dev`'den, `main`'e yalnızca `test`/`hotfix/*`'ten PR (`ci.yml:43-56`).
- Test projesi bulunamazsa pipeline bilinçli hata veriyor — "yanlış yeşil" koruması (`ci.yml:129-132`).
- `promote.yml` GITHUB_TOKEN özyineleme tuzağını doğru teşhis edip PAT ile çözmüş; gerekçe dosyada belgelenmiş (`promote.yml:1-34`).
- CodeQL hem C# hem TS tarıyor (`codeql.yml:29-31`).
- `.dockerignore` yerel secret dosyalarını dışlıyor.

**Tespit Edilen Eksikler/Riskler**

**[Kritik] CD-01 — Üretime dağıtım otomasyonu yok, ancak rollback otomatik**
`test-deploy.yml` yalnızca `test` dalını ve yalnızca test sunucusunu hedefliyor (`on.push.branches: [test]` satır 14-15; `secrets.TEST_SSH_HOST` satır 320; sağlık kontrolü `TEST_SSH_HOST:8081/health` satır 366). `rollback.yml` ise hem `test` hem `prod` ortamını destekliyor (satır 65-75, `PROD_SSH_HOST`). `release-tag.yml` yalnızca etiket üretiyor. Yani **üretime deploy eden bir workflow yok**.
**Etki:** Üretim dağıtımı elle, belgelenmemiş ve denetlenemez şekilde yapılıyor; ancak rollback otomatik. Bu asimetri en tehlikeli kombinasyondur: geri alma mekanizması, hiç doğrulanmamış bir ileri-alma sürecinin üzerine kuruludur. Deploy edilen sürümün ne olduğu CI kaydında yok.
**Öneri:** `main` üzerinde manuel onaylı (`environment: prod`) bir `prod-deploy.yml` yazın; imaj etiketini commit SHA'sına sabitleyin; deploy sonrası smoke test ekleyin. **Efor: M**

**[Orta] CD-02 — Konteyner root olarak çalışıyor, base imajlar sabitlenmemiş**
`apps/backend/Dockerfile`'da `USER` direktifi yok — `aspnet:8.0` imajı varsayılan olarak root çalışır. Base imajlar değişebilir etiketlerle (`mcr.microsoft.com/dotnet/sdk:8.0`, `aspnet:8.0`) referanslanıyor, digest yok. Ayrıca `COPY . .` `dotnet restore`'dan önce geldiği için bağımlılık katmanı önbelleği her kod değişikliğinde geçersizleşiyor.
**Öneri:** `USER $APP_UID` ekleyin, base imajları digest ile sabitleyin, csproj'ları önce kopyalayıp `restore` sonra kaynak kopyalayın. **Efor: S**

**[Orta] CD-03 — Üretim compose'unda altyapı sertleştirmesi yok**
`infra/compose/docker-compose.prod.yml` üzerinde:
- MSSQL host portuna açık (`${MSSQL_PORT}:1433`, satır 99) ve `user: root` ile çalışıyor (satır 92).
- MinIO API ve konsol portları açık (satır 121-123).
- MinIO sunucu imajı `RELEASE.2022-01-08T03-11-54Z` (satır 114) — yaklaşık 4,5 yıllık; bu sürüm aralığını etkileyen bilinen MinIO güvenlik düzeltmeleri mevcuttur (kesin CVE listesi bu incelemede doğrulanamadı, bkz. Kapsam Notu).
- Uygulama veritabanına `sa` hesabıyla bağlanıyor ve `Encrypt=False` (satır 22).
- Hiçbir servis için `deploy.resources.limits` tanımlı değil.
**Etki:** Sunucu güvenlik duvarı bu portları kapatmıyorsa veritabanı ve nesne deposu doğrudan internete açıktır. `sa` kullanımı en az yetki ilkesini ihlal eder ve DB-04'teki çalışma zamanı migration ihtiyacıyla pekişir. Kaynak limiti olmaması, PERF-01'deki ağır optimizasyon isteğinin host'u tüketmesine izin verir.
**Öneri:** DB/MinIO portlarını host'a açmayın (yalnızca compose ağı); MinIO'yu güncel bir sürüme yükseltin; uygulama için sınırlı yetkili DB kullanıcısı oluşturun; `Encrypt=True` kullanın; kaynak limitleri tanımlayın. **Efor: M**

**[Orta] CD-04 — Değişebilir imaj etiketi rollback'i zayıflatıyor**
Compose varsayılanı `${IMAGE_TAG:-prod}` (`docker-compose.prod.yml:6,64`). Değişebilir bir etiket kullanıldığında "önceki sürüme dön" işlemi belirsizleşir; DB-04'teki açılışta migration ile birleşince imaj geri alınsa bile şema ileri sürümde kalır.
**Öneri:** Etiketi commit SHA'sına sabitleyin; rollback'i şema uyumluluğu kontrolüyle birlikte tasarlayın (geri alınabilir migration politikası). **Efor: M**

**[Orta] CD-05 — İmaj zafiyet taraması ve SBOM yok**
CI'da Trivy/Grype benzeri imaj taraması, `dotnet list package --vulnerable` kapısı veya SBOM/provenance üretimi yok. CodeQL kaynak kodu tarıyor ancak base imaj ve bağımlılık CVE'lerini kapsamıyor.
**Öneri:** Build sonrası imaj taraması ve bağımlılık zafiyet kapısı ekleyin. **Efor: S**

**[Düşük] CD-06 — Çalışmayan workflow dosyası**
`apps/backend/.github/workflows/ci.yml` mevcut. GitHub yalnızca depo kökündeki `.github/workflows/` dizinini çalıştırır; bu dosya **hiçbir zaman çalışmaz**.
**Etki:** Yanıltıcı — bir geliştirici backend için ayrı bir CI olduğunu sanabilir.
**Öneri:** Silin veya kök workflow'a taşıyın. **Efor: S**

**[Düşük] CD-07 — `ci.yml`'de concurrency grubu yok**
Aynı dala art arda push yapıldığında eski koşular iptal edilmiyor; runner zamanı israfı.
**Öneri:** `concurrency: {group: ci-${{ github.ref }}, cancel-in-progress: true}` ekleyin. **Efor: S**

---

### 3.8 Test Kapsamı

**Mevcut Durum.** İki test projesi var: `CargoPilot.Engine.Tests` (10 dosya, 1.231 satır + 16 snapshot JSON) ve `CargoPilot.Infrastructure.Tests` (4 dosya, 564 satır). Toplam **47 `[Fact]`/`[Theory]`**, `[InlineData]` ile birlikte **53 çalıştırılan test vakası**. Bu 53 vakanın **tamamı tek bir modülü** hedefliyor: `Application/Common/Optimization/` (915 satır). Kaynak satırı bazında kapsam ≈ **%4,5**.

Kritik oran: `Application/Features` altında **78 `*Handler.cs`** var ve **hiçbirinin testi yok (%0)**. 17 WebAPI controller'ının hiçbirinin testi yok. `Infrastructure` (5.436 satır — `AuthService.cs` tek başına 582 satır) ve `Domain` (1.705 satır) için de test yok. Ayrıca `CargoPilot.Infrastructure.Tests` adına rağmen Infrastructure'dan tek satır kapsamıyor; dört dosyası da `Application.Common.Optimization` tiplerini test ediyor.

Yani: **optimizasyon motoru örnek nitelikte test edilmiş, geri kalan her şey test edilmemiş.**

**Güçlü Yönler**
- Golden-master altyapısı doğru kurulmuş: snapshot dosyası yoksa oluşturuluyor **ama test yine de FAIL ediyor** (`Engine.Tests/Golden/GoldenMaster.cs:41-52`) — yeni referansın gözden geçirilmeden yeşile dönmesi engellenmiş. Çoğu ev yapımı snapshot altyapısında bulunmayan doğru davranış.
- Snapshot'lar tam durum görüntüsü: `TotalWeight`, `FillRate`, `CenterOfGravityX/Y/Z`, `WeightBalanceOffset` ve her yerleşimin tam koordinat/rotasyon değerleri (`Golden/SnapshotPayload.cs:114-136`). "Not-null" değil, birebir karşılaştırma.
- Determinizm bilinçli: indeks tabanlı sabit Guid (`Golden/EngineScenario.cs:29-31`), `DeterminizmTests.cs:19-31` aynı girdiyi 3 kez çalıştırıp eşitliği doğruluyor.
- Rotasyon kapsamı örnek nitelikte: `Infrastructure.Tests/OptimizationEngineOrientationTests.cs` 11 testle 6 `AllowedRotations` değerinin permütasyon kümesini, eksen kilidi değişmezlerini ve sınır durumlarını sabitliyor.
- `ModulBayraklariTests.cs:32` beklenen değeri üretim kodundan okumadan elle yazıyor — tautolojik test tuzağından bilinçle kaçınılmış.

**Tespit Edilen Eksikler/Riskler**

**[Kritik] BIZ-01 — Abonelik limiti hatalı uygulanıyor (test eksikliğinin gizlediği gerçek hata)**
```csharp
// apps/backend/CargoPilot.Application/Features/Plans/CreatePlan/CreatePlanCommandHandler.cs:44-47
if (_currentUserService.UserType == UserType.Individual && _currentUserService.UserId is { } planUserId)
{
    var currentCount = await _planRepository.CountByUserAsync(planUserId, cancellationToken);
    var maxCount = SubscriptionLimits.GetMaxLoadingPlanCount(SubscriptionType.Free);
```
İki ayrı kusur var: (a) kota kontrolü yalnızca `UserType.Individual` için çalışıyor — **kurumsal kullanıcılar (CompanyAdmin/CompanyWorker) hiçbir plan limitine tabi değil**; (b) abonelik tipi **sabit `SubscriptionType.Free`** olarak geçiliyor, kullanıcının gerçek aboneliği okunmuyor.
**Etki:** Ücretli bireysel müşteri Free kotasına takılır (gelir kaybı ve müşteri şikâyeti); kurumsal müşteri sınırsız plan üretir (kaynak ve gelir kaybı). Doğrudan ücretlendirme davranışını bozan sessiz bir hatadır ve sıfır handler testi olduğu için hiçbir otomatik kontrol bunu yakalamaz.
**Öneri:** Gerçek abonelik tipini okuyun, kurumsal kullanıcılar için de kota uygulayın, düzeltmeyi 4 handler testiyle (limit altı / limitte / limit üstü / kurumsal) kilitleyin. **Efor: S**

**[Kritik] TEST-01 — Application katmanının tamamı test edilmemiş (78 handler, 0 test)**
Dağılım: Plans 15, Integrations 9, Vehicles 8, Me 7, Items 7, Notifications 6, Shares 5, DraftItems 5, Settings 4, ErpSettings 3, Company 3, Subscriptions 2, Auth 2, Contact 1, CompanyUsers 1.
**Etki:** CI'ın yeşil olması hiçbir iş akışının çalıştığını göstermez. BIZ-01 bu boşluğun somut kanıtıdır.
**Öneri:** Mocking stratejisi belirleyin (NSubstitute/Moq) ve küçük bir dikey dilimde (örn. `Features/Shares`) şablon test seti kurun. **Efor: L**

**[Kritik] TEST-02 — Çok kiracılı izolasyon için tek bir test bile yok**
`CompanyId` 61 farklı Feature dosyasında elle filtreleniyor (DB-01'in doğrudan sonucu). Tek bir handler'da unutulması sessiz veri sızıntısıdır ve bunu yakalayacak hiçbir test yok.
**Etki:** Raporun en yüksek riskli boşluğu — güvenlik kontrolü tamamen insan dikkatine bağlı ve doğrulanmıyor.
**Öneri:** İki kiracı seed edilen, A'nın token'ıyla B'nin kayıtlarına erişilemediğini tüm liste/detay uçlarında parametrik doğrulayan entegrasyon test sınıfı. **Efor: L**

**[Kritik] TEST-03 — Auth akışlarının tamamı test dışı**
`Infrastructure/Auth/AuthService.cs` 582 satır, sıfır test. Register, login, OAuth, parola sıfırlama, e-posta değişikliği, refresh token rotasyonu — hiçbirinin testi yok.
**Etki:** Refresh token rotasyonu ve sıfırlama token'ının tek-kullanımlık olması doğrulanmadığından, token yeniden kullanımı (replay) sessizce mümkün hale gelebilir. SEC-02 ile birlikte değerlendirilmelidir.
**Öneri:** Öncelik sırası: refresh rotasyonu + replay reddi → reset token tek kullanımlık → e-posta değişikliği onayı → duplicate register. **Efor: M**

**[Kritik] TEST-04 — Entegrasyon test altyapısı yok**
`WebApplicationFactory`, `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers`, `Respawn` — hiçbiri repoda yok. Hiçbir test EF Core kullanmıyor.
**Etki:** Route guard'lar, `[Authorize]` politikaları, RBAC, model binding, `/share/:token` public erişimi ve `ErrorType→HTTP` eşlemesi hiçbir otomatik doğrulamaya tabi değil.
**Öneri:** SQL Server Testcontainers kurun. **EF InMemory bu iş için yanlış araçtır**: unique index ve referans bütünlüğü zorlanmaz, collation/case-sensitivity farklıdır (Türkçe karakterli SKU aramaları farklı sonuç verir), transaction ve query filter davranışı gerçekçi değildir — yani en kritik boşluk olan kiracı izolasyonunu yanlış yeşil gösterir. **Efor: L**

**[Orta] TEST-05 — CI coverage toplamıyor; `coverlet.collector` ölü bağımlılık**
`.github/workflows/ci.yml:133` `--collect:"XPlat Code Coverage"` içermiyor; workflow'larda `coverage`/`codecov`/`threshold` geçen tek satır yok. Buna karşın `CargoPilot.Infrastructure.Tests.csproj:17` `coverlet.collector 10.0.1` referansı taşıyor (Engine.Tests'te yok).
**Öneri:** Coverage'ı toplayın ve eşiği mevcut seviyeye sabitleyerek gerilemeyi engelleyin; ya da paketi kaldırın. **Efor: S**

**[Orta] TEST-06 — `Infrastructure.Tests` yanlış isimli**
Proje `CargoPilot.Infrastructure.csproj`'a referans veriyor (`csproj:28`) ama dört dosyası da Application tiplerini test ediyor. "Infrastructure test edilmiş" izlenimi veriyor; ayrıca iki proje arasında motor kapsamı çakışıyor.
**Öneri:** Yeniden adlandırın (`Engine.Tests.More` veya birleştirin). **Efor: S**

**[Orta] TEST-07 — `Infrastructure.Tests` determinizmi `Guid.NewGuid()` ile kırılgan**
`OptimizationEngineTests.cs:121`, `GroupZoneTests.cs:81,94`, `OptimizationEngineRotationPlacementTests.cs:23`, `OptimizationEngineOrientationTests.cs:22` her çalıştırmada rastgele `ItemId` üretiyor. Motor eşit hacimli kutularda sıralamayı `ItemId`'ye göre yapıyor. `OptimizationEngineTests.cs:66` dört özdeş kutu kullanıyor — sıralama tamamen Guid'e bağlı ve assertion, flakiness'i önlemek için bilerek zayıflatılmış (`:58-63`).
**Öneri:** Engine.Tests'in sabit Guid yaklaşımını (`EngineScenario.cs:29-31`) buraya taşıyın; ardından assertion'ı güçlendirin. **Efor: S**

**[Orta] TEST-08 — Ağırlık merkezi için tek doğrudan assertion çok gevşek**
`OptimizationEngineTests.cs:51`: `Assert.InRange(result.CenterOfGravityZ.Value, 100m, 200m)` — 300 cm'lik araçta ±%33 tolerans. CoG snapshot'larda tam kayıtlı olduğu için regresyon yakalanır, ancak "CoG doğru hesaplanıyor mu" sorusunu yanıtlayan tek test bu ve aralık yanlış davranışların çoğunu geçirir.
**Öneri:** Elle hesaplanmış beklenen değerle dar toleranslı bir test ekleyin. **Efor: S**

**[Orta] TEST-09 — `UseContamination` modülünün kapalı hâli hiç test edilmiyor**
`ModulBayraklariTests.cs:21-23,68,114` — bayrak her yerde `true`. Diğer üç modülün kapalı davranışı test edilirken (`:51`, `:89`) bu modülün on/off farkı regresyona açık.
**Öneri:** Simetri için kapalı-hâl testi ekleyin. **Efor: S**

**[Düşük] TEST-10 — Repo kökündeki `tests/` iskeleti ölü**
`tests/unit` ve `tests/integration` yalnızca `.gitkeep` içeriyor ve `cargo-pilot.sln`'e dahil değil. Yeni geliştirici buraya test yazarsa CI hiç çalıştırmaz.
**Öneri:** Kaldırın veya gerçek projeye dönüştürün. **Efor: S**

**[Düşük] TEST-11 — `UPDATE_SNAPSHOTS` kaçış kapısı korumasız**
`Golden/GoldenMaster.cs:100-107` — değişken "0"/"false" dışında herhangi bir değer alırsa tüm farklar sessizce yeniden yazılır. CI'da set edilmiyor (doğrulandı), ancak runner ortamına sızarsa 16 golden test koşulsuz yeşil döner.
**Öneri:** CI'da değişkeni açıkça "0" olarak sabitleyin veya `#if DEBUG` ile sınırlayın. **Efor: S**

---

### 3.9 Bağımlılıklar

**Mevcut Durum.** `dotnet list package --vulnerable --include-transitive` gerçekten çalıştırıldı: **6/6 projede bilinen zafiyet yok.** NuGet tarafı temiz ve çoğu paket zaten en güncel sürümde (FluentValidation 12.1.1, Hangfire 1.8.24, BCrypt.Net-Next 4.2.0, Minio istemcisi 7.0.0, Google.Apis.Auth 1.75.0, IdentityModel 8.22.0). Asıl risk NuGet'te değil, **container imajlarında ve destek takviminde**.

**Güçlü Yönler**
- **CVE-2026-26127 doğru kapatılmış.** `Directory.Build.props`'taki `Microsoft.Bcl.Memory 9.0.19` override'ı gerçek bir CVE'ye karşı (Base64Url çözümlemesinde OOB read kaynaklı DoS, CVSS 7.5, etkilenen 9.0.0–9.0.13, fix 9.0.14). Kritik detay: `Infrastructure/Auth/AuthService.cs:419,545` kullanıcıdan gelen parola sıfırlama token'ları üzerinde `WebEncoders.Base64UrlDecode` çağırıyor — tam olarak bu CVE'nin saldırı yüzeyi. Doğru teşhis edilmiş ve doğru sürümle kapatılmış.
- **MediatR 12.5.0 lisans açısından güvenli.** MediatR 13.0.0 ticari lisansa geçti; 12.5.0 hâlâ Apache 2.0. 173 dosyada kullanım var — sabitleme bilinçli değer taşıyor.
- Dependabot kurulu, 5 ekosistemi kapsıyor, ignore kuralları gerekçeli, son 90 günde 9 bump.

**Tespit Edilen Eksikler/Riskler**

**[Kritik] DEP-01 — 4,5 yıllık MinIO sunucu imajı, aktif sömürülen CVE'ler**
`infra/compose/docker-compose.prod.yml:114`, `docker-compose.test.yml:111`, `.github/workflows/test-deploy.yml:251` — `RELEASE.2022-01-08T03-11-54Z`.

| CVE | CVSS | Açıklama | Fix | Geçerli mi |
|---|:--:|---|---|---|
| CVE-2023-28434 | 8.8 | `PostPolicyBucket`'ta bucket adı kontrolü bypass'ı → herhangi bir bucket'a nesne yazma | 2023-03-20 | **Evet** |
| CVE-2024-24747 | — | Access key parent'ın `admin:*` yetkilerini miras alıyor (privilege escalation) | 2024-01-31 | **Evet** |
| CVE-2022-31028 | — | Kapanmayan HTTP bağlantıları → go-routine birikimi (DoS) | 2022-06-02 | **Evet** |
| CVE-2023-28432 | 7.5 | Kimlik doğrulamasız endpoint tüm ortam değişkenlerini (`MINIO_ROOT_PASSWORD`) döndürüyor | 2023-03-20 | **Kısmen** — advisory cluster dağıtımları diyor; burada tek node çalışıyor, standalone'da uygulanmayabilir. Kesin doğrulanamadı, risk kabul edilmemeli |
| CVE-2023-28433 | — | Windows path manipülasyonu | 2023-03-20 | Hayır — `platform: linux/amd64` |

Risk artırıcı: MinIO portları `127.0.0.1` kısıtı olmadan host'a publish ediliyor ve önünde reverse proxy yok (CD-03). CVE-2023-28432/28434 internet ölçeğinde aktif taranıyor. Ayrıca imaj 4,5 yıldır güncellenmediği için altındaki Go runtime ve TLS yığını da o dönemde donmuş — listelenen CVE'lere ek olarak sayısız yamalanmamış upstream açık demektir.
**Öneri:** En az `RELEASE.2024-01-31T20-20-33Z`'ye yükseltin, tercihen güncel stable. **Uyarı:** MinIO 2025'te Community Edition'dan web konsolunu kaldırdı ve AGPL v3 altında; yükseltme salt sürüm bump'ı değil, `--console-address` davranışını doğrulamayı gerektiren planlı bir iştir. Ara önlem olarak portları hemen `127.0.0.1`'e bağlayın. **Efor: M**

**[Kritik] DEP-02 — Kök neden: Dependabot `infra/compose` dizinini hiç izlemiyor**
`.github/dependabot.yml`'de tanımlı dizinler yalnızca `/apps/frontend`, `/apps/backend` ve `/`. `/infra/compose` hiçbir ekosistemde yok — Dependabot compose dosyalarındaki `image:` alanlarını hiç görmüyor.
**Etki:** MinIO imajının 4,5 yıl fark edilmeden kalmasının teknik sebebi tam olarak budur. Aynı boşluk MSSQL ve monitoring imajlarını da kapsıyor; kapatılmazsa sorun tekrarlanır.
**Öneri:** `/infra/compose` için docker ekosistemi girdisi ekleyin. **Efor: S**

**[Orta] DEP-03 — .NET 8 desteği ~87 gün içinde bitiyor**
.NET 8 ve .NET 9 için End of Support **10 Kasım 2026**. Bugün 2026-08-15. Altı projenin tamamı `net8.0` hedefliyor; bu tarihten sonra güvenlik yaması gelmeyecek.
**Öneri:** .NET 10 LTS (Kasım 2028'e kadar destekli) geçişini şimdi planlayın. Kapsam: 6 projede TFM bump, `Microsoft.*` 8.0.30 → 10.0.x, Swashbuckle 7.3.2 → 10.2.3 + `Microsoft.OpenApi` 1.6 → 3.x (asıl kırıcı iş bu ikisi), Serilog.AspNetCore 8 → 10, Dockerfile ve CI SDK sürümü, Dependabot ignore kurallarının kaldırılması. Aynı geçişte legacy `System.IdentityModel.Tokens.Jwt` → `Microsoft.IdentityModel.JsonWebTokens` değerlendirilebilir. **Efor: M**

**[Orta] DEP-04 — Dependabot major ignore'u güvenlik güncellemelerini de bastırıyor**
`.github/dependabot.yml:81-84`. Gerekçe teknik olarak doğru (net8.0 ile 9.x/10.x hizalanmaz), ancak Dependabot'ta `ignore` kuralları **hem version-updates hem security-updates için geçerlidir**. Major bump gerektiren bir Microsoft güvenlik güncellemesi sessizce düşer. `nuget-minor-patch` grubunda `applies-to: version-updates` ayrımı yapılmış, ignore bloklarında yapılmamış.
**Öneri:** Ignore kurallarını `applies-to: version-updates` ile daraltın. **Efor: S**

**[Orta] DEP-05 — `Microsoft.Extensions.Configuration.Json 10.0.11` sürüm hizası bozuk**
`CargoPilot.Infrastructure.csproj:37`. Paket **gereklidir** (`Persistence/AppDbContextFactory.cs:35-37` EF design-time factory'de `AddJsonFile` kullanıyor), ancak projedeki diğer tüm `Microsoft.Extensions.*` paketleri 8.0.x iken bu 10.0.11. NuGet tüm grafiği yukarı unify eder ve bu, ekibin kendi dependabot kuralıyla doğrudan çelişir. Ayrıca `PrivateAssets` işaretli olmadığı için yalnızca design-time kullanılmasına rağmen runtime closure'a akıyor.
**Öneri:** 8.0.x'e indirin ve `PrivateAssets="all"` ekleyin; ya da .NET 10 geçişine kadar bilinçli istisna olarak yorumla belgeleyin. **Efor: S**

**[Orta] DEP-06 — Merkezî sürüm yönetimi ve lock file yok**
`Directory.Packages.props` yok, hiçbir projede `packages.lock.json` yok. Sonuçları: `Microsoft.EntityFrameworkCore.Design 8.0.30` iki yerde ayrı tanımlı (`Infrastructure.csproj:27`, `WebAPI.csproj:14`) ve ayrışabilir; transitive grafik restore anında çözüldüğü için **tekrarlanabilir build garantisi yok**; lock file hash'leriyle tedarik zinciri bütünlük doğrulaması devre dışı.
**Öneri:** CPM'e geçin ve `RestorePackagesWithLockFile=true` ile lock file'ları commit edin. **Efor: M**

**[Düşük] DEP-07 — `Swashbuckle.AspNetCore.Swagger` fazlalık referans**
`WebAPI.csproj:25`. `Swashbuckle.AspNetCore 7.3.2` metapaketi bu paketi zaten bağımlılık olarak getiriyor. Zararsız ama iki satırın sürümü ayrışırsa restore çakışması üretir. (`Microsoft.OpenApi 1.6.29` ise **gereklidir** — `DependencyInjection.cs` ve `Swagger/AuthorizeOperationFilter.cs` doğrudan `OpenApiInfo`/`OpenApiSecurityScheme` kullanıyor.)
**Öneri:** Kaldırın. **Efor: S**

**[Düşük] DEP-08 — Hangfire LGPL v3 lisans notu**
`Hangfire.Core` LGPL v3 altında. CargoPilot Hangfire'ı kendi sunucusunda SaaS olarak çalıştırıyor ve değiştirilmemiş binary olarak link'liyor — klasik LGPL yorumunda bu genellikle sorun değil. **On-premise dağıtım modeli gündeme gelirse yeniden değerlendirilmelidir.** (`SonarAnalyzer.CSharp` de LGPL-3.0 ancak `PrivateAssets=all` ile yalnızca build-time; risk yok.)
**Öneri:** SaaS dışı dağıtım planı varsa hukuk tarafıyla teyit edin. **Efor: S**

**[Düşük] DEP-09 — MSSQL imajı kayan etiket**
`docker-compose.prod.yml:89` — `mcr.microsoft.com/mssql/server:2022-latest`. MinIO'nun tam tersi problem: aşırı pinleme yerine hiç pinlememe; `docker pull` zamanına göre farklı binary çalışabilir.
**Öneri:** Sabit etiket veya digest'e pinleyin (DEP-02 çözüldükten sonra Dependabot güncel tutar). **Efor: S**

**[Not] MediatR 12.x güvenlik desteği almıyor.** Lisans riski yok, ancak yalnızca 13+ destekleniyor. İleride bir zafiyet çıkarsa tek çıkış yolu ticari 13+ olacaktır — backlog'a risk maddesi olarak yazılması yerinde olur.

---

### 3.10 Dokümantasyon

**Mevcut Durum.** Repo genelinde **41 markdown / 10.220 satır**, GitBook formatında ve dört katmana ayrılmış. **Önemli düzeltme:** bu raporun önceki taslağında "backend geliştirici rehberi yok" denmişti — bu **yanlıştır**. `apps/backend/docs/` altında 7 dosyalık, 2.962 satırlık bir set mevcut (`architecture.md`, `developer-setup.md`, `environment-variables.md`, `database-migrations.md`, `user-story-tracker.md`, `erp-integration/`) ve `SUMMARY.md`'de indekslenmiş, kırık link yok. Benzer şekilde API dokümantasyonu da beklenenden iyi: 88 endpoint'in 72'sinde XML `<summary>`, 246 `ProducesResponseType`, ve XML dosyası Swagger'a gerçekten bağlı.

Gerçek sorun kapsamda değil, **doğrulukta**: dokümanların birkaçı kodla çelişiyor ve bu çelişkiler onboarding'i fiilen kırıyor.

**Güçlü Yönler**
- `secret-management.md` kusursuz doğrulandı: dokümandaki 19 GitHub Actions secret'ı, workflow'lardan çıkarılanla **birebir** eşleşiyor; kaldırılan secret'lar tarih ve PR numarasıyla kayıtlı.
- `branching.md` required-check tablosu gerçek job adlarıyla eşleşiyor; `ci.yml`'deki terfi zinciri mantığıyla aynı.
- `architecture.md` kendi hatalarını açıkça düzeltmiş (§3.1 ve §3.6'da "MediatR kullanılmaz" ve "InMemory çalışır" iddialarının kodla çeliştiğini kabul edip not bırakmış) — denetlenen doküman setinde nadir bir dürüstlük.
- `docs/context/` katmanı "çelişkide kod kazanır" ilkesini yazılı kural yapmış.
- `promote.yml`'in 35 satırlık yorum bloğu repodaki en iyi mimari karar gerekçesi.
- `database-migrations.md` (43 migration) ve `CONTRIBUTING.md` CI kapıları doğrulandı.

**Tespit Edilen Eksikler/Riskler**

**[Orta] DOC-01 — `local-setup.md`'deki varsayılan login çalışmaz**
*(Alan incelemesi bunu Kritik işaretlemişti; §4'teki kalibrasyona göre üretim riski taşımadığı için Orta'ya indirildi — onboarding'i kırar, servisi değil.)*
Doküman "Default login: `admin@cargopilot.com` / `Admin@CargoPilot1!`" diyor. Ancak aynı dokümanın kopyalattığı `infra/env/.env.test.example:60` şunu içeriyor: `Seed__DefaultAdminPassword=<CHANGE_ME_ADMIN_PASSWORD>`. Değer boş olmadığı için `DbInitializer.cs:63-67`'deki koruma tetiklenmez — admin parolası **literal olarak `<CHANGE_ME_ADMIN_PASSWORD>` olur**. `Admin@CargoPilot1!` yalnızca `test-deploy.yml:178`'deki CI fallback'idir.
**Etki:** Adımları harfiyen izleyen yeni geliştirici giriş yapamaz ve hata mesajı da almaz.
**Öneri:** Sabit parola literalini dokümandan çıkarın; parolanın `.env` dosyasından geldiğini yazın. **Efor: S**

**[Orta] DOC-02 — `local-setup.md`'nin migration komutu hem gereksiz hem çalışmaz**
Doküman `docker exec cargo-pilot-backend-test dotnet ef database update` diyor. İki nedenle hatalı: (a) `Dockerfile:23` final stage aspnet **runtime** imajı — SDK ve `dotnet-ef` yok; (b) `Program.cs:32-36` zaten açılışta migrate ediyor. `deployment.md` aynı işi geçici SDK container'ıyla doğru anlatıyor — iki doküman çelişiyor.
**Öneri:** Komutu kaldırın, sunucu tarafı için `deployment.md`'ye yönlendirin. **Efor: S**

**[Kritik] DOC-03 — Swagger'ın kapalı olduğu belgelenmiş, aslında public test sunucusunda açık**
`apps/backend/docs/architecture.md:88`: *"Swagger yalnızca Development ortamında aktiftir."* Kod: `if (!app.Environment.IsProduction())`. `docker-compose.test.yml:13` ortamı `Test` olarak ayarlıyor → **public test sunucusunda `/swagger` erişilebilir.**
**Etki:** Bu SEC-10'un belgelenmiş hâlidir ve daha ciddi kılar: ekip kontrolün kapalı olduğuna inanıyor. Tüm API yüzeyi, auth şeması ve 246 response tanımı halka açık.
**Öneri:** Dokümanı gerçeğe çekin **ve** ayrı bir karar maddesi olarak Swagger'ı test ortamında kapatın veya auth arkasına alın. **Efor: S**

**[Orta] DOC-04 — Optimizasyon motorunun yolu 6 doküman referansında ölü**
Motor `Application/Common/Optimization/` altına taşınmış; `Infrastructure/Services/` altında yok. Eski yolu gösterenler: `architecture.md` §2.3, `project-snapshot.md` §2, `kod-taramasi-2026-08.md:51`, üç arşiv banner'ı, `user-story-tracker.md:362,385`. Doğru yolu bilen tek doküman `COORDINATE_AUDIT.md`.
**Etki:** Ürünün en karmaşık modülüne dokunacak geliştirici, dokümanların hiçbirinden doğru dosyayı bulamaz.
**Öneri:** Altı referansı düzeltin. **Efor: S**

**[Kritik] DOC-05 — "Tek yetkili" koordinat standardı kodla çelişiyor**
`COORDINATE_STANDARD.md` kendini *"Çelişki hâlinde bu belge kazanır"* diye tanımlıyor, ancak kod aksini yapıyor:
- `LifoPlacement.cs:36` yorumu: *"Arka kapı Z=0'dadır."* → Standart §3'e göre `z=0` **uzak yüz**, `z=length` referans kapı. **Yön tamamen ters** (doğrulandı; `COORDINATE_AUDIT.md` H-01).
- `PlacedBox.cs:8` `decimal W, H, D` (`D` = Depth) ve `VolumeScoring.DepthTerm` → Standart §9 `depth` terimini açıkça yasaklıyor, `length` olacak (`COORDINATE_AUDIT.md` M-11).
- Uyumlu olan taraf: birim (cm), eksen eşlemesi (`OptimizationEngine.cs:90-92`) ve bottom-left-rear pivot (`satır 169-171`) **doğru**.
**Etki:** Standart "kazanır" diyor ama kod kazanıyor; hangisine göre yazılacağı belirsiz. `COORDINATE_AUDIT.md` 9 High bulgunun hiçbirini kapatmamış. CLAUDE.md'nin 3D değişmezleri de bu standarda atıf yapıyor — belirsizlik frontend'e de yayılıyor.
**Öneri:** H-01 için karar verin: ya kodu standarda çevirin (golden-master testleri bunu destekleyecek durumda, tek PR'da yapılabilir) ya da standardı kodun konvansiyonuna göre revize edin. Mevcut belirsizlik her iki tarafı da bloke ediyor. **Efor: M**

**[Orta] DOC-06 — `AuthController`'ın 11 endpoint'inin tamamı dokümansız**
Endpoint bazında `<summary>` kapsamı: `AuthController` 0/11, `CompanyUsersController` 0/1, `ContactController` 0/1, `PlansController` 13/15, `VehiclesController` 7/8 — toplam 72/88. CS1591 hem `Directory.Build.props` `WarningsNotAsErrors` hem `WebAPI.csproj:8` `NoWarn` ile iki kez susturulmuş.
**Etki:** Auth akışı API'nin en riskli ve en çok soru alan yüzeyi ve Swagger'da tamamen açıklamasız.
**Öneri:** 16 eksik endpoint'i tamamlayın, ardından CS1591'i en azından `Controllers/` için hata seviyesine çekin. **Efor: M**

**[Orta] DOC-07 — Hata kodu sözlüğü yok, kodlar iki ayrı konvansiyonda**
Kodda 69 farklı `Error` code string'i var ve iki format karışık: `"AUTH_UNAUTHORIZED"` (SCREAMING_SNAKE) ile `"Auth.Unauthorized"` (noktalı PascalCase) — **ikisi aynı anda mevcut**. `Error.cs` yalnızca serbest `string Code` tutuyor; merkezî kayıt ve doküman yok.
**Etki:** Frontend hata koduna göre güvenle dallanamaz; `ProducesResponseType` HTTP kodunu gösterir ama iş hatasını göstermez. API-01 ile birlikte API sözleşmesinin en zayıf halkası.
**Öneri:** 69 kodu tek dokümanda toplayın, bir konvansiyon seçin (noktalı format çoğunlukta), çifti tekilleştirin, `Error.Code`'u sabitler sınıfına bağlayın. **Efor: M**

**[Orta] DOC-08 — README tek başına yeni backend geliştiricisini ayağa kaldıramaz**
Somut eksikler: .NET SDK sürümü yok (`global.json` `8.0.419` diyor, README sadece ".NET 8"), port tablosu yok, test çalıştırma komutu yok, migration ekleme adımı yok, ortam değişkeni tablosu yok, sorun giderme yok, ve **`apps/backend/docs/`'a hiç link vermiyor** — 7 dosyalık rehberin varlığı README'den öğrenilemiyor.
**Etki:** Rehber zaten var ama bulunamıyor. Bu, listedeki en yüksek getirili/en düşük maliyetli düzeltmedir.
**Öneri:** README'ye SDK sürümü, port tablosu, `dotnet test`, migration adımı ve `apps/backend/docs/` linkini ekleyin. **Efor: M**

**[Orta] DOC-09 — Runbook / on-call dokümanı yok**
Grafana alerting (6 kural), contact-point ve notification-policy dosyaları yapılandırılmış durumda; **alarm çaldığında ne yapılacağını anlatan doküman yok.** Nöbet rotasyonu, eskalasyon, RTO/RPO tanımlı değil.
**Etki:** Alarm altyapısı var, müdahale prosedürü yok — alarmın operasyonel değeri düşük. OBS-05 ile birlikte değerlendirilmelidir.
**Öneri:** `docs/devops/runbook.md` yazın: 6 alert kuralının her biri için müdahale adımı, rollback prosedürü, eskalasyon. **Efor: M**

**[Orta] DOC-10 — `deployment.md` terfi ve rollback'i hiç anlatmıyor**
Operatöre yönelik tek dokümanda `promote.yml`, `rollback.yml` veya `rollback.sh` geçmiyor. `rollback.yml`'in `workflow_dispatch` input'ları (`environment`, `target_ref`) hiçbir operasyon dokümanında tarif edilmemiş.
**Etki:** Olay anında operatör, deploy dokümanını açıp geri alma prosedürünü bulamaz. CD-01 ile birlikte üretim operasyonunun en zayıf noktası.
**Öneri:** `deployment.md`'ye terfi + rollback bölümü ekleyin. **Efor: S**

**[Orta] DOC-11 — ADR ve domain sözlüğü yok**
`docs/adr/` yok. `architecture.md` §3 kararları tarif ediyor ama gerekçelendirmiyor: MediatR neden seçildi (önceki karar "kullanılmaz" idi, dönüşün gerekçesi yazılı değil), Hangfire neden seçildi (hiçbir dokümanda gerekçe yok), aggregate-specific repository neden tercih edildi. §6 "Yapılmayacaklar" listesi bir ADR'nin en zor yarısını zaten içeriyor, biçimlendirilmemiş. Ayrıca `loading plan`, `placement`, `draft item` / `input item`, `contamination`, `LIFO zone`, `unplaced reason` terimlerinin merkezî tanımı yok.
**Öneri:** `docs/adr/` başlatın (ilk 4 kayıt mevcut malzemeden yazılabilir) ve `docs/glossary.md` ekleyin. **Efor: M**

**[Orta] DOC-12 — `appsettings.Development.Local.json` onboarding dokümanında geçmiyor**
`Program.cs:14-15` bu dosyayı Development'ta yüklüyor. Yalnızca `secret-management.md`'de anlatılıyor — orada da *"`Program.cs`'e şu satırı ekle"* deniyor, **satır zaten ekli**. Ayrıca aynı doküman "User Secrets" öneriyor ama `architecture.md` §3.7 bunu "(planlanan)" işaretliyor, oysa `UserSecretsId` csproj'da tanımlı.
**Etki:** Container dışı backend geliştirme yolu, onboarding dokümanında değil DevOps dokümanında saklı ve talimat kodun gerisinde.
**Öneri:** `local-setup.md`'ye ekleyin, bayat talimatı düzeltin. **Efor: S**

**[Düşük] DOC-13 — İndeks dokümanları kendi aralarında çelişiyor**
`context/README.md` "37 `.md`" diyor, `doc-map.md` "41 dosya / 10.125 satır" diyor, gerçek 41 dosya / 10.220 satır. Ayrıca `doc-map.md`, `project-snapshot.md` ve arşiv banner'ları koordinat standardını `Z = depth/derinlik` diye özetliyor — otorite belge bu terimi açıkça **yasaklıyor**.
**Öneri:** Sayıları ve terminolojiyi hizalayın. **Efor: S**

**[Düşük] DOC-14 — Repo hijyeni: yanlış konumlu ve açıklamasız dosyalar**
- `tip1_animasyonlu_planlayici (1).html` — 43 KB prototip, repo kökünde, dosya adında indirme kopyası eki `(1)`, `.gitignore`'da değil, hiçbir doküman ne olduğunu açıklamıyor.
- `devops-audit-raporu.md` repo kökünde; diğer 9 devops dokümanı `docs/devops/` altında. İndeksler bile konumu farklı sınıflandırıyor.
- README ağacı `database/`'i "Migration, seed ve DB scriptleri" diye tanıtıyor; klasör boş (DB-07).
- `.github/ISSUE_TEMPLATE/` yok (PR şablonu ise iyi durumda).
**Öneri:** Prototipi `docs/archive/prototypes/` altına taşıyıp amaç notu ekleyin; audit raporunu `docs/devops/` altına alın; README ağacını gerçekle eşleyin. **Efor: S**

**[Düşük] DOC-15 — Aktif geliştirilen motorun güncel tasarım dokümanı yok**
`docs/archive/algoritma-tasarimi/`'nin arşivde olması **doğru** (banner'lar dürüstçe "geride bırakıldı" diyor). Sorun arşivleme değil, **yerine hiçbir şey konmaması**: 915 satırlık, aktif modülerleştirilen motorun (skor fonksiyonu, extreme-point seçimi, LIFO zone, denge iyileştirici) güncel tasarım dokümanı sıfır.
**Öneri:** `apps/backend/docs/optimization-engine.md` yazın. **Efor: L**

---

## 4. Kritik Eksikler Listesi

Üretim riski taşıyan, önce çözülmesi gerekenler. **Öncelik kalibrasyonu:** Kritik = üretimde güvenlik ihlali, veri kaybı, servis kesintisi veya sessiz yanlış sonuç. Bu ölçüte göre birkaç dokümantasyon bulgusu (DOC-01, DOC-02, DOC-04) alan raporundaki "Kritik" etiketinden **Orta**'ya indirilmiştir — onboarding'i kırarlar ama üretim riski taşımazlar.

| # | ID | Başlık | Alan | Efor |
|---|---|---|---|:--:|
| 1 | SEC-02 | Refresh token'lar veritabanında düz metin | Güvenlik | M |
| 2 | SEC-04 | Üretimde sabit SuperAdmin, parola değişimi zorlanmıyor | Güvenlik | S |
| 3 | SEC-01 | CORS allowlist'i üretimde hiç devreye girmiyor | Güvenlik | S |
| 4 | SEC-03 | Rate limiting ters proxy arkasında çöküyor | Güvenlik | S |
| 5 | SEC-05 | ERP bağlantı dizesi tamamen kullanıcı kontrolünde | Güvenlik | M |
| 6 | DEP-01 | 4,5 yıllık MinIO imajı, aktif sömürülen CVE'ler | Bağımlılık | M |
| 7 | DEP-02 | Dependabot `infra/compose`'u izlemiyor (DEP-01'in kök nedeni) | Bağımlılık | S |
| 8 | BIZ-01 | Abonelik limiti hatalı uygulanıyor (gelir/yetki etkisi) | İş Kuralı | S |
| 9 | DB-01 | Global query filter yok; kiracı izolasyonu elle | Veritabanı | M |
| 10 | TEST-02 | Çok kiracılı izolasyon için tek bir test bile yok | Test | L |
| 11 | TEST-01 | Application katmanının tamamı test edilmemiş (78 handler) | Test | L |
| 12 | TEST-03 | Auth akışlarının tamamı test dışı | Test | M |
| 13 | TEST-04 | Entegrasyon test altyapısı yok | Test | L |
| 14 | OBS-01 | Uygulama logu ve HTTP istek logu pratikte yok | Gözlemlenebilirlik | M |
| 15 | CD-01 | Üretime dağıtım otomasyonu yok, rollback otomatik | CI/CD | M |
| 16 | DOC-03 | Swagger kapalı sanılıyor, public test sunucusunda açık | Dokümantasyon | S |
| 17 | DOC-05 | "Tek yetkili" koordinat standardı kodla çelişiyor | Dokümantasyon | M |
| 18 | PERF-01 | Optimizasyon istek içinde senkron ve süper-lineer | Performans | L |

## 5. Orta Öncelikli İyileştirmeler

| ID | Başlık | Alan | Efor |
|---|---|---|:--:|
| SEC-06 | Taban `appsettings.json`'da varsayılan JWT secret | Güvenlik | S |
| SEC-07 | `/health/detail` ve `/metrics` kimlik doğrulamasız | Güvenlik | S |
| SEC-08 | Güvenlik başlıkları ve HTTPS zorlaması yok | Güvenlik | S |
| SEC-09 | Dosya yükleme doğrulaması kısmi ve asimetrik | Güvenlik | M |
| SEC-10 | Swagger Staging'de açık | Güvenlik | S |
| SEC-11 | DataProtection `SetApplicationName` olmadan | Güvenlik | S |
| DB-02 | Hiçbir yerde explicit transaction yok | Veritabanı | M |
| DB-03 | Optimistic concurrency yok | Veritabanı | M |
| DB-04 | Migration uygulama açılışında çalışıyor | Veritabanı | M |
| DB-05 | Üretim veritabanına test verisi seed'leniyor | Veritabanı | S |
| API-01 | Yazma işlemleri REST semantiğine uymuyor | API | M |
| API-02 | 19 komutun doğrulayıcısı yok; toplu uçlar sınırsız | API | M |
| PERF-02 | Uygulamada hiç önbellekleme yok | Performans | M |
| PERF-03 | Dış servis çağrılarında retry/timeout yok | Performans | M |
| PERF-04 | ERP depo filtresi bellekte uygulanıyor | Performans | S |
| PERF-05 | Toplu uçlarda parti boyutu sınırı yok | Performans | M |
| OBS-02 | Korelasyon kimliği ve kullanıcı bağlamı yok | Gözlemlenebilirlik | M |
| OBS-03 | Exception middleware iki uç durumu ele almıyor | Gözlemlenebilirlik | S |
| OBS-04 | Serilog yalnızca konsola yazıyor | Gözlemlenebilirlik | S |
| OBS-05 | İş metriği yok | Gözlemlenebilirlik | M |
| OBS-06 | Liveness/readiness ayrımı yok | Gözlemlenebilirlik | S |
| QUAL-01 | Zaman soyutlaması yok | Kod Kalitesi | M |
| QUAL-02 | Anemik domain modeli | Kod Kalitesi | L |
| QUAL-03 | DI kaydında kırılgan noktalar | Kod Kalitesi | M |
| CD-02 | Konteyner root, base imajlar sabitlenmemiş | CI/CD | S |
| CD-03 | Üretim compose'unda altyapı sertleştirmesi yok | CI/CD | M |
| CD-04 | Değişebilir imaj etiketi rollback'i zayıflatıyor | CI/CD | M |
| CD-05 | İmaj zafiyet taraması ve SBOM yok | CI/CD | S |
| TEST-05 | CI coverage toplamıyor; `coverlet.collector` ölü | Test | S |
| TEST-06 | `Infrastructure.Tests` yanlış isimli | Test | S |
| TEST-07 | `Guid.NewGuid()` determinizm kırılganlığı | Test | S |
| TEST-08 | Ağırlık merkezi assertion'ı çok gevşek | Test | S |
| TEST-09 | `UseContamination` kapalı hâli test edilmiyor | Test | S |
| DEP-03 | .NET 8 desteği ~87 gün içinde bitiyor | Bağımlılık | M |
| DEP-04 | Dependabot major ignore'u güvenlik güncellemelerini bastırıyor | Bağımlılık | S |
| DEP-05 | `Configuration.Json 10.0.11` sürüm hizası bozuk | Bağımlılık | S |
| DEP-06 | Merkezî sürüm yönetimi ve lock file yok | Bağımlılık | M |
| DOC-01 | `local-setup.md`'deki varsayılan login çalışmaz | Dokümantasyon | S |
| DOC-02 | `local-setup.md`'nin migration komutu çalışmaz | Dokümantasyon | S |
| DOC-04 | Optimizasyon motoru yolu 6 referansta ölü | Dokümantasyon | S |
| DOC-06 | `AuthController`'ın 11 endpoint'i dokümansız | Dokümantasyon | M |
| DOC-07 | Hata kodu sözlüğü yok, iki konvansiyon karışık | Dokümantasyon | M |
| DOC-08 | README backend geliştiricisini ayağa kaldıramaz | Dokümantasyon | M |
| DOC-09 | Runbook / on-call dokümanı yok | Dokümantasyon | M |
| DOC-10 | `deployment.md` terfi ve rollback'i anlatmıyor | Dokümantasyon | S |
| DOC-11 | ADR ve domain sözlüğü yok | Dokümantasyon | M |
| DOC-12 | `appsettings.Development.Local.json` onboarding'de yok | Dokümantasyon | S |

## 6. Düşük Öncelikli / Nice-to-have

| ID | Başlık | Alan | Efor |
|---|---|---|:--:|
| SEC-12 | CI'da gömülü JWT fallback secret'ı | Güvenlik | S |
| DB-06 | Repository soyutlaması sızdırıyor | Veritabanı | M |
| DB-07 | Kullanılmayan `database/` klasörleri | Veritabanı | S |
| API-03 | Sayfalama sözleşmesi tam tutarlı değil | API | S |
| PERF-06 | Extreme point listesi her kutuda yeniden sıralanıyor | Performans | M |
| QUAL-04 | İsimlendirme ve yerleşim tutarsızlıkları | Kod Kalitesi | S |
| CD-06 | Çalışmayan workflow dosyası | CI/CD | S |
| CD-07 | `ci.yml`'de concurrency grubu yok | CI/CD | S |
| TEST-10 | Repo kökündeki `tests/` iskeleti ölü | Test | S |
| TEST-11 | `UPDATE_SNAPSHOTS` kaçış kapısı korumasız | Test | S |
| DEP-07 | `Swashbuckle.AspNetCore.Swagger` fazlalık referans | Bağımlılık | S |
| DEP-08 | Hangfire LGPL v3 lisans notu | Bağımlılık | S |
| DEP-09 | MSSQL imajı kayan etiket | Bağımlılık | S |
| DOC-13 | İndeks dokümanları kendi aralarında çelişiyor | Dokümantasyon | S |
| DOC-14 | Repo hijyeni: yanlış konumlu, açıklamasız dosyalar | Dokümantasyon | S |
| DOC-15 | Aktif motorun güncel tasarım dokümanı yok | Dokümantasyon | L |

---

## 7. Efor × Öncelik Matrisi

Bulguların tamamı öncelik ve efora göre çapraz tablolandığında, yol haritasının neden bu sırayla dizildiği görünür hale gelir. **Kaldıraç = öncelik ağırlığı ÷ efor ağırlığı** (Kritik 3 / Orta 2 / Düşük 1, bölü S 1 / M 2 / L 3). Yüksek kaldıraç, az emekle çok risk kapatmak demektir.

### Dağılım

| Öncelik ╲ Efor | S (küçük) | M (orta) | L (büyük) | **Σ** |
|---|:--:|:--:|:--:|:--:|
| **Kritik** | **6** | 8 | 4 | **18** |
| **Orta** | 24 | 22 | 1 | **47** |
| **Düşük** | 13 | 2 | 1 | **16** |
| **Σ** | **43** | **32** | **6** | **81** |

### Hücre içerikleri

| Hücre | Kaldıraç | n | Bulgular |
|---|:--:|:--:|---|
| **Kritik × S** | **3,0** | 6 | SEC-01, SEC-03, SEC-04, BIZ-01, DEP-02, DOC-03 |
| Orta × S | 2,0 | 24 | SEC-06, SEC-07, SEC-08, SEC-10, SEC-11, DB-05, PERF-04, OBS-03, OBS-04, OBS-06, CD-02, CD-05, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, DEP-04, DEP-05, DOC-01, DOC-02, DOC-04, DOC-10, DOC-12 |
| Kritik × M | 1,5 | 8 | SEC-02, SEC-05, DB-01, OBS-01, CD-01, TEST-03, DEP-01, DOC-05 |
| Kritik × L | 1,0 | 4 | PERF-01, TEST-01, TEST-02, TEST-04 |
| Orta × M | 1,0 | 22 | SEC-09, DB-02, DB-03, DB-04, API-01, API-02, PERF-02, PERF-03, PERF-05, OBS-02, OBS-05, QUAL-01, QUAL-03, CD-03, CD-04, DEP-03, DEP-06, DOC-06, DOC-07, DOC-08, DOC-09, DOC-11 |
| Düşük × S | 1,0 | 13 | SEC-12, DB-07, API-03, QUAL-04, CD-06, CD-07, TEST-10, TEST-11, DEP-07, DEP-08, DEP-09, DOC-13, DOC-14 |
| Orta × L | 0,7 | 1 | QUAL-02 |
| Düşük × M | 0,5 | 2 | DB-06, PERF-06 |
| Düşük × L | 0,3 | 1 | DOC-15 |

### Matrisin söyledikleri

**1. Kritik yüzey pahalı değil.** 18 kritik bulgunun **14'ü S veya M** efor. Yalnızca 4'ü büyük yatırım gerektiriyor ve o dördü tek bir temada toplanıyor: test altyapısı (TEST-01, TEST-02, TEST-04) ve optimizasyon motoru (PERF-01). Yani "büyük iş" kalemi dağınık değil, tek bir yatırım kararına indirgenebiliyor.

**2. Ucuz iş yığını, önemsiz iş yığını değil.** 43 küçük eforlu bulgunun **30'u kritik veya orta** öncelikte. Faz 1'in tek sprintte gerçekçi olmasının nedeni budur.

**3. Boşa emek riski düşük.** Düşük öncelik × büyük efor hücresinde **yalnızca 1 kalem** var (DOC-15). Backlog şekli sağlıklı; getirisi olmayan büyük işlere gömülme riski yok.

### Önce bu altı madde

Kritik × S hücresi raporun en yüksek getirili işidir. Altısı da yapılandırma değişikliği veya tek dosyalık düzeltmedir; hiçbiri şema değişikliği ya da mimari karar gerektirmez:

| ID | İş | Dosya |
|---|---|---|
| SEC-01 | CORS anahtar uyuşmazlığını düzelt | `WebAPI/DependencyInjection.cs:167-170` + `docker-compose.prod.yml:39` |
| SEC-03 | `UseForwardedHeaders` ekle | `WebAPI/DependencyInjection.cs` |
| SEC-04 | Üretim seed'ini kapat / `MustChangePassword` uygula | `Persistence/Seeding/DbInitializer.cs:11,72-84` |
| BIZ-01 | Abonelik limiti hatasını düzelt | `Features/Plans/CreatePlan/CreatePlanCommandHandler.cs:44-47` |
| DEP-02 | Dependabot'a `/infra/compose` ekle | `.github/dependabot.yml` |
| DOC-03 | Swagger'ı test ortamında kapat + dokümanı düzelt | `WebAPI/DependencyInjection.cs:375` + `architecture.md:88` |

> **Not:** Bu matriste 81 bulgunun tamamı tam bir kez yer alır; satır ve sütun toplamları §4–§6 listeleriyle ve Ek'teki sayılarla birebir tutarlıdır.

---

## 8. Aşamalı Yol Haritası

### Faz 1 — Kanamayı Durdur (tahmini 1–2 sprint)

**Hedef:** Üretimde sömürülebilir açıkları kapatmak ve bir olayı teşhis edebilecek asgari görünürlüğü kazanmak. Bu fazın tamamlanması, ürünün dış müşteriye açılması için ön koşuldur. **1–12. maddelerin tamamı S efordur ve tek sprintte bitirilebilir.**

| # | İş | Bulgu | Efor | Etkilenen Dosya/Modül | Gerekçe |
|:--:|---|---|:--:|---|---|
| 1 | `UseForwardedHeaders` ekle, `KnownProxies` tanımla | SEC-03 | S | `CargoPilot.WebAPI/DependencyInjection.cs` | Rate limiting'i çalışır hale getirir; diğer güvenlik işlerinin ölçümünü de doğru yapar |
| 2 | CORS anahtar sözleşmesini düzelt, fallback'i hata yap | SEC-01 | S | `WebAPI/DependencyInjection.cs:167-180`, `infra/compose/docker-compose.{prod,test}.yml` | Kod ve konfigürasyon aynı anda değişmeli |
| 3 | MinIO portlarını `127.0.0.1`'e bağla, konsol portunu kapat | DEP-01 (ara önlem) | S | `infra/compose/docker-compose.prod.yml:121-123` | Yükseltme planlanana kadar en hızlı azaltıcı önlem |
| 4 | Dependabot'a `/infra/compose` docker girdisi ekle | DEP-02 | S | `.github/dependabot.yml` | Kök neden; kapatılmazsa imaj eskimesi tekrarlanır |
| 5 | Abonelik limiti hatasını düzelt + 4 handler testi | BIZ-01 | S | `Features/Plans/CreatePlan/CreatePlanCommandHandler.cs:44-47` | Doğrudan gelir/yetki etkisi; düzeltmeyle birlikte test yazılmalı |
| 6 | Üretim seed'ini kapat / admin'e `MustChangePassword` uygula | SEC-04, DB-05 | S | `Persistence/Seeding/DbInitializer.cs` | Bilinen SuperAdmin hesabını ve gerçek kiracıya bulaşan test verisini kaldırır |
| 7 | `UseSerilogRequestLogging()` ekle | OBS-01 (1. adım) | S | `CargoPilot.WebAPI/Program.cs` | Tek satır; sonraki tüm işlerin doğrulanabilmesi için önce görünürlük gerekir |
| 8 | `/health/detail` ve `/metrics` uçlarını yetkilendirmeye bağla | SEC-07 | S | `WebAPI/DependencyInjection.cs` | Bilgi sızıntısını kapatır |
| 9 | Swagger'ı test ortamında kapat + `architecture.md:88`'i düzelt | SEC-10, DOC-03 | S | `WebAPI/DependencyInjection.cs:375`, `apps/backend/docs/architecture.md` | Yanlış belgelenmiş güvenlik varsayımı; kod ve doküman birlikte düzeltilmeli |
| 10 | Varsayılan JWT secret'ını kaldır, uzunluk + varsayılan kontrolü ekle | SEC-06, SEC-12 | S | `appsettings.json:27`, `Infrastructure/DependencyInjection.cs:28-33`, `.github/workflows/test-deploy.yml:180` | Sessiz zayıf-anahtar senaryosunu ortadan kaldırır |
| 11 | Güvenlik başlıkları + HTTPS zorlaması + `AllowedHosts` daralt | SEC-08 | S | `WebAPI/DependencyInjection.cs`, `infra/nginx/` | Standart sertleştirme |
| 12 | `local-setup.md`'yi çalışır hale getir (login + migration adımı) | DOC-01, DOC-02 | S | `docs/setup/local-setup.md` | Onboarding şu anda kırık; ucuz ve yüksek getirili |
| 13 | Refresh token'ları hash'leyerek sakla | SEC-02 | M | `Domain/Entities/UserSession.cs`, `Configurations/UserSessionConfiguration.cs`, `Security/JwtTokenService.cs`, `Repositories/UserSessionRepository.cs` + migration | Şema değişikliği ve mevcut oturumların geçersiz kılınmasını gerektirir |
| 14 | ERP bağlantı dizesi kurulumunu güvenli hale getir | SEC-05 | M | `Services/SqlServerErpProductFetcher.cs:90-113`, `UpsertErpSettingsCommandValidator.cs` | Kiracı yöneticisinin ağ içi keyfi bağlantı primitifini kapatır |
| 15 | MinIO imajını yükselt (test ortamında doğrulayarak) | DEP-01 | M | `infra/compose/docker-compose.{prod,test}.yml`, `.github/workflows/test-deploy.yml:251` | AGPL/konsol davranış değişikliği nedeniyle planlı iş; 3. madde ara önlem sağlar |
| 16 | DB/MinIO portlarını kapat, sınırlı yetkili DB kullanıcısı oluştur | CD-03 | M | `infra/compose/docker-compose.prod.yml` | `sa` kullanımının kaldırılması DB-04 ile koordineli olmalı |
| 17 | Soft-delete için global query filter ekle | DB-01 (1. adım) | M | `Persistence/AppDbContext.cs`, ilgili repository'ler | Düşük riskli yarısı önce; kiracı filtresi Faz 2'de testlerle birlikte |

### Faz 2 — Temeli Sağlamlaştır (tahmini 3–4 sprint)

**Hedef:** Faz 1'de kapatılan açıkların tekrar açılmasını engelleyecek doğrulama katmanını kurmak, .NET 8 EOL'ünden önce platformu taşımak ve operasyonel olgunluğu tamamlamak. Sıralama önemlidir: **testler, büyük refactor'lardan önce gelir.**

> **Takvim uyarısı:** 6. madde (.NET 10 geçişi) **10 Kasım 2026**'ya kadar tamamlanmalıdır. Bu fazın planlaması bu tarihe göre yapılmalıdır.

| # | İş | Bulgu | Efor | Etkilenen Dosya/Modül | Gerekçe |
|:--:|---|---|:--:|---|---|
| 1 | Entegrasyon test altyapısını kur (WebApplicationFactory + SQL Server Testcontainers) | TEST-04 | L | Yeni test projesi | Diğer tüm test işlerinin ön koşulu. **EF InMemory kullanılmamalı** — kiracı izolasyonunu yanlış yeşil gösterir |
| 2 | Multi-tenant izolasyon testi seti yaz | TEST-02, DB-01 | L | Yeni entegrasyon test projesi | Faz 1 güvenlik düzeltmelerinin regresyona uğramamasını garanti eder; en yüksek riskli boşluk |
| 3 | CI'da coverage topla, eşiği mevcut seviyeye sabitle | TEST-05 | S | `.github/workflows/ci.yml:133`, `Engine.Tests.csproj` | Kapsam gerilemesini görünür kılar |
| 4 | `TimeProvider` soyutlamasını enjekte et | QUAL-01 | M | `Application` + `Infrastructure` (28 kullanım noktası) | Zamana bağlı akışların (token, expiry, trial) test edilebilmesi için ön koşul |
| 5 | Auth akışları için test yaz (rotasyon, replay, tek-kullanımlık token) | TEST-03 | M | `Infrastructure/Auth/AuthService.cs`, `Features/Auth`, `Features/Me` | SEC-02 düzeltmesinin doğrulanması; en yüksek risk/satır oranlı test edilmemiş kod |
| 6 | **.NET 10 LTS geçişi** | DEP-03 | M | 6 csproj, `Dockerfile`, `.github/workflows/ci.yml`, `dependabot.yml` | **10 Kasım 2026 EOL.** Swashbuckle 7→10 ve Microsoft.OpenApi 1→3 asıl kırıcı iş |
| 7 | Kiracı filtresini global query filter'a taşı | DB-01 (2. adım) | M | `Persistence/AppDbContext.cs`, Hangfire işleri | 2. madde tamamlandıktan sonra güvenle yapılabilir |
| 8 | Handler testleri için şablon kur ve yaygınlaştır | TEST-01 | L | `Features/Shares` (pilot), sonra diğerleri | Mocking stratejisi (NSubstitute) + referans test seti; ekip bunu örnek alır |
| 9 | Üretim deploy workflow'u yaz (onaylı, SHA etiketli, smoke testli) | CD-01, CD-04 | M | `.github/workflows/prod-deploy.yml`, `docker-compose.prod.yml` | Rollback'in dayandığı ileri-alma sürecini denetlenebilir hale getirir |
| 10 | Migration'ı deploy pipeline'ında ayrı adıma taşı | DB-04 | M | `Program.cs:33-38`, `DbInitializer.cs`, prod deploy workflow | 9. madde ile birlikte; rollback semantiğini düzeltir |
| 11 | Kritik akışlara yapılandırılmış log + korelasyon kimliği ekle | OBS-01 (2. adım), OBS-02 | M | `Features/Plans`, `Features/Integrations`, `Jobs/`, yeni enricher | Faz 1'deki istek logunun üzerine iş bağlamı ekler |
| 12 | Exception middleware'i sertleştir (`HasStarted`, cancellation) | OBS-03 | S | `Middlewares/GlobalExceptionMiddleware.cs:23-27` | Alarm gürültüsünü keser, hata oranı metriğini güvenilir kılar |
| 13 | Liveness/readiness ayrımı yap | OBS-06 | S | `WebAPI/DependencyInjection.cs`, `infra/compose/*.yml` | Gerçek arızanın maskelenmesini önler |
| 14 | Koordinat standardı çelişkisini karara bağla (H-01) | DOC-05 | M | `docs/COORDINATE_STANDARD.md` veya `Common/Optimization/LifoPlacement.cs` | Golden-master testleri kod değişikliğini destekler; belirsizlik hem backend hem frontend'i bloke ediyor |
| 15 | Çok adımlı akışlara transaction ekle | DB-02 | M | `Features/Integrations/SyncErpItems`, `Features/Plans/CreatePlan` | Testler hazır olduğunda güvenli |
| 16 | Toplu uçlara doğrulayıcı + parti sınırı ekle | API-02, PERF-05 | M | `Features/Items/BulkCreateItems`, `BulkUpdateItems` | Bellek/kilit riskini ve doğrulanmamış girdiyi birlikte kapatır |
| 17 | Dosya yükleme doğrulamasını tamamla (magic-byte, boyut, gövde limiti) | SEC-09 | M | `UploadPlanThumbnail`, `UploadReportingLogo`, `Program.cs` | Depolanan XSS ve bellek DoS vektörünü kapatır |
| 18 | Dış çağrılara Polly retry + circuit breaker + timeout | PERF-03 | M | `Infrastructure/DependencyInjection.cs`, ERP bağlayıcıları, `ResendEmailService` | Dış servis arızasının API'yi kilitlemesini önler |
| 19 | Runbook yaz + `deployment.md`'ye terfi/rollback bölümü ekle | DOC-09, DOC-10 | M | `docs/devops/runbook.md`, `docs/devops/deployment.md` | Alarm altyapısı var, müdahale prosedürü yok; 9. madde ile birlikte anlamlı |
| 20 | İmaj zafiyet taraması + bağımlılık kapısı ekle | CD-05 | S | `.github/workflows/ci.yml` | DEP-01'in tekrarını kalıcı olarak engeller |
| 21 | Konteyner sertleştirme (`USER`, digest pin, katman sırası) | CD-02 | S | `apps/backend/Dockerfile` | Standart sertleştirme |
| 22 | Merkezî sürüm yönetimi (CPM) + lock file | DEP-06 | M | Yeni `Directory.Packages.props`, 6 csproj | .NET 10 geçişiyle birlikte yapılması en verimli |
| 23 | Dependabot ignore'unu daralt, `Configuration.Json` sürümünü hizala | DEP-04, DEP-05 | S | `.github/dependabot.yml:81-84`, `Infrastructure.csproj:37` | Güvenlik güncellemelerinin sessizce düşmesini önler |
| 24 | Optimistic concurrency (`RowVersion`) ekle | DB-03 | M | `Domain/Entities/{LoadingPlan,Item,Vehicle,ErpSettings}.cs` + migration | Çok kullanıcılı düzenlemede sessiz veri kaybını önler |

### Faz 3 — Ölçeklendir ve İyileştir (tahmini 3–4 sprint)

**Hedef:** Ürün tavanlarını kaldırmak, performansı ölçüye dayalı iyileştirmek ve mimari borcu azaltmak. Bu fazın önkoşulu Faz 2'deki gözlemlenebilirlik ve testlerdir — **ölçmeden optimize edilmez, testsiz refactor edilmez.**

| # | İş | Bulgu | Efor | Etkilenen Dosya/Modül | Gerekçe |
|:--:|---|---|:--:|---|---|
| 1 | İş metriklerini ekle (optimizasyon süresi, plan başarı oranı) | OBS-05 | M | `Common/Optimization`, `Features/Plans` | Sonraki performans işlerinin başarı ölçütü; önce gelir |
| 2 | Optimizasyonu Hangfire arka plan işine taşı | PERF-01 | L | `Features/Plans/CreatePlan`, `ReOptimizePlan`, `Infrastructure/Jobs/`, `PlansController.cs` | 500 kutu tavanını kaldırmanın ön koşulu; en büyük ürün kazanımı |
| 3 | `MaxTotalBoxCount` sınırını yeniden değerlendir / yükselt | PERF-01 | S | `Common/Config/OptimizationLimits.cs:11` | 2. madde sonrası ölçüme dayalı olarak |
| 4 | Sıcak döngüde `decimal` yerine ölçeklenmiş tamsayı değerlendir | PERF-01 | L | `Common/Optimization/*.cs` | Belirlenimciliği korur, hızı artırır; golden test'ler bunu destekliyor |
| 5 | Önbellekleme katmanı ekle (referans veri + ETag) | PERF-02 | M | `Features/Subscriptions`, `Features/Settings`, `Features/Shares` | Metriklerle darboğaz doğrulandıktan sonra |
| 6 | ERP depo filtresini SQL'e taşı | PERF-04 | S | `Services/SqlServerErpProductFetcher.cs:55-56` | Küçük ve net kazanım |
| 7 | Extreme point yönetimini veri yapısıyla iyileştir | PERF-06 | M | `Common/Optimization/OptimizationEngine.cs:86` | 4. madde ile birlikte |
| 8 | Hata kodu sözlüğü + tek konvansiyon + sabitler sınıfı | DOC-07 | M | `Common/Errors/`, yeni `docs/error-codes.md` | Frontend'in hata koduna göre dallanabilmesi için; 9. madde ile birlikte API sözleşmesini tamamlar |
| 9 | REST semantiğini düzelt (201/Location, 204) | API-01 | M | `Controllers/BaseController.cs`, oluşturma uçları | Frontend ile koordineli, kırıcı değişiklik |
| 10 | `AuthController` + eksik 5 endpoint için XML doc, CS1591'i sıkılaştır | DOC-06 | M | `WebAPI/Controllers/`, `Directory.Build.props` | API'nin en riskli yüzeyi şu an açıklamasız |
| 11 | DI kırılganlıklarını gider | QUAL-03 | M | `Infrastructure/DependencyInjection.cs` | Sessiz yetkilendirme hatası riskini kalıcı kapatır |
| 12 | Domain modelini zenginleştir (durum geçişleri entity'ye) | QUAL-02 | L | `Domain/Entities/`, ilgili handler'lar | En büyük refactor; testler ve zaman soyutlaması hazır olduktan sonra |
| 13 | Unit of Work soyutlaması getir | DB-06 | M | `Common/Interfaces`, repository'ler | 12. madde ile birlikte |
| 14 | README'yi tamamla + ADR ve glossary başlat | DOC-08, DOC-11 | M | `README.md`, yeni `docs/adr/`, `docs/glossary.md` | Rehber zaten var ama bulunamıyor; ADR'nin ilk 4 kaydı mevcut malzemeden yazılabilir |
| 15 | Optimizasyon motoru için güncel tasarım dokümanı | DOC-15 | L | Yeni `apps/backend/docs/optimization-engine.md` | Arşivlenen algoritma dokümanının yerini dolduracak tek şey |
| 16 | Test kalitesi iyileştirmeleri (sabit Guid, CoG, contamination, snapshot kapısı) | TEST-07, TEST-08, TEST-09, TEST-11 | S | `Infrastructure.Tests/*.cs`, `Golden/GoldenMaster.cs` | Mevcut testlerin güvenilirliğini artırır |
| 17 | Ölü dosya ve isimlendirme hijyeni | QUAL-04, CD-06, CD-07, DB-07, TEST-06, TEST-10, DEP-07, DEP-09, DOC-13, DOC-14 | S | `Controllers/`, `apps/backend/.github/`, `database/`, `tests/`, repo kökü | Düşük riskli; fırsat buldukça toplu yapılabilir |
| 18 | Hangfire LGPL uyumunu teyit et (on-premise planı varsa) | DEP-08 | S | — | Yalnızca dağıtım modeli değişirse gerekli |

---

## Ek: Bulgu Sayıları

| Öncelik | Adet |
|---|:--:|
| Kritik | 18 |
| Orta | 47 |
| Düşük | 16 |
| **Toplam** | **81** |

**Alan bazında:** Dokümantasyon 15, Güvenlik 12, Test 11, Bağımlılık 9, Veritabanı 7, CI/CD 7, Performans 6, Gözlemlenebilirlik 6, Kod Kalitesi 4, API 3, İş Kuralı 1.

*Bu rapordaki bulgular doğrudan kaynak kod okunarak üretilmiş ve satır referansları doğrulanmıştır. §2'de listelenen yanlış pozitifler rapora dahil edilmemiştir.*
