# CargoPilot Environment Variables

**Son güncelleme:** 2026-08-15 · **Durum:** Aktif

Bu doküman, CargoPilot projesinde yapılandırma değerlerinin environment
variable olarak nasıl isimlendirileceğini tanımlar. Doküman, ekip içinde
tutarlı bir standart sağlamak için referans olarak kullanılır.

---

## Naming Standard

Yapılandırma değerleri `appsettings.json` içinde nested JSON olarak
tutulur. Bir değeri environment variable ile override etmek için, aynı
yol **çift alt çizgi (`__`)** ile yazılır.

| appsettings JSON path                 | Environment variable name              |
| ------------------------------------- | -------------------------------------- |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` |
| `Logging:LogLevel:Default`            | `Logging__LogLevel__Default`           |
| `Logging:LogLevel:Microsoft.AspNetCore` | `Logging__LogLevel__Microsoft.AspNetCore` |
| `ApplicationSettings:AppName`         | `ApplicationSettings__AppName`         |
| `ApplicationSettings:Version`         | `ApplicationSettings__Version`         |

---

## Neden `__` (çift alt çizgi)?

JSON yolunda kullanılan `:` karakteri, Linux/bash ve POSIX kabuklarında
environment variable isminde **geçerli değildir**. ASP.NET Core
`EnvironmentVariablesConfigurationProvider`'i, çift alt çizgi gördüğünde
otomatik olarak `:` ile replace edip nested key'e dönüştürür.

Bu sayede aynı env var:
- Windows (`cmd`, `PowerShell`),
- Linux/macOS (`bash`, `zsh`),
- Docker / Kubernetes / CI pipeline

ortamlarında tek bir isimle çalışır.

---

## Kurallar

- **Büyük/küçük harf duyarsız**: `ConnectionStrings__DefaultConnection` ile
  `connectionstrings__defaultconnection` aynı değeri set eder. Yine de
  okunabilirlik için `PascalCase__PascalCase` tercih edilmelidir.
- **Özel prefix gerekmez**: `ASPNETCORE_` ya da `DOTNET_` gibi prefix'ler
  ASP.NET Core'un kendi değişkenleri (örneğin `ASPNETCORE_ENVIRONMENT`)
  içindir; uygulama yapılandırması için kullanılmaz.
- **Bir seviye nesting**: `SectionA:SectionB:Key` -> `SectionA__SectionB__Key`.
  İç içe sayı sınırsızdır ama 3'ten derine inmekten kaçının; bu yapılandırmada
  refactor sinyali verir.
- **Liste/array değerleri**: `ArraySection:0:Name` -> `ArraySection__0__Name`
  şeklinde indekslenir. Proje artık array kullanmaktadır — `Cors:AllowedOrigins`,
  `ForwardedHeaders:KnownProxies` ve `ForwardedHeaders:KnownNetworks` string dizisi
  olarak okunur (`DependencyInjection.ReadStringArray` → `GetSection(key).Get<string[]>()`).
  Bu nedenle **indeksli** env var yazımı zorunludur:

  ```bash
  Cors__AllowedOrigins__0=https://app.example.com
  Cors__AllowedOrigins__1=https://admin.example.com
  ```

  {% hint style="warning" %}
  Virgülle ayrılmış tek satır (`Cors__AllowedOrigins=a,b`) **çalışmaz**; skaler değer
  `string[]`'e bağlanmaz ve liste boş kabul edilir.
  {% endhint %}

---

## Örnek: SQL Bağlantı Dizesini Set Etme

**Windows (PowerShell):**
```powershell
$env:ConnectionStrings__DefaultConnection = "Server=localhost;Database=CargoPilot;Trusted_Connection=True;"
```

**Linux/macOS (bash/zsh):**
```bash
export ConnectionStrings__DefaultConnection="Server=localhost;Database=CargoPilot;Trusted_Connection=True;"
```

**Docker:**
```
ENV ConnectionStrings__DefaultConnection=Server=db;Database=CargoPilot;...
```

---

## Yapılandırma Öncelik Sırası

ASP.NET Core yapılandırmayı aşağıdaki sıraya göre üst üste yükler (son kaynak kazanır):

1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. **User Secrets** (sadece Development)
4. **Environment Variables**
5. Command-line arguments

---

## Ortam Bazlı Secret Kaynakları

| Ortam | Connection String Kaynağı | Nasıl Set Edilir |
|---|---|---|
| Development (local, Docker'sız) | User Secrets | `dotnet user-secrets set` |
| Test (Docker) | `.env.test` → compose env | `infra/env/.env.test` |
| Production (Docker) | `.env.prod` → compose env | `/opt/cargo-pilot/infra/env/.env.prod` |

---

## Development: User Secrets Kurulumu

`UserSecretsId` `CargoPilot.WebAPI.csproj` içinde `cargo-pilot-backend` olarak tanımlıdır.
Docker kullanmadan `dotnet run` ile local çalıştırırken:

**Windows (PowerShell):**
```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=CargoPilotDev;User Id=sa;Password=SIFRE;TrustServerCertificate=True;" --project apps/backend/CargoPilot.WebAPI
```

**Linux/macOS:**
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=CargoPilotDev;User Id=sa;Password=SIFRE;TrustServerCertificate=True;" --project apps/backend/CargoPilot.WebAPI
```

Kayıtlı secrets listesi:
```bash
dotnet user-secrets list --project apps/backend/CargoPilot.WebAPI
```

User Secrets dosyaları `%APPDATA%/Microsoft/UserSecrets/cargo-pilot-backend/` altında saklanır; repoya eklenmez.

---

## Production: Bulut DB Bağlantısı ve Güvenlik Policy

### Bağlantı Akışı

```
.env.prod  (DATABASE_CONNECTION_STRING)
  └─> docker-compose.prod.yml  (ConnectionStrings__DefaultConnection)
      └─> ASP.NET Core IConfiguration
          └─> GetConnectionString("DefaultConnection")
```

### Connection String Formatı

```
Server=mssql,1433;Database=CargoPilot;User Id=sa;Password=SIFRE;TrustServerCertificate=True;
```

- `mssql` — Docker network içindeki servis adı; sunucu dışından erişimde IP/hostname kullanılır
- `TrustServerCertificate=True` — Docker içinde self-signed sertifika ile çalıştığı için gerekli
- Production TLS için backend önüne reverse proxy (Nginx/Caddy) konulmalıdır

### Secret Management Policy

- `.env.prod` sunucuda `/opt/cargo-pilot/infra/env/.env.prod` konumunda `chmod 600` ile korunur
- `.env.prod` repoya eklenmez (`.gitignore` korumalı)
- Credentials asla `appsettings.json`, `appsettings.Production.json` veya kaynak koda yazılmaz
- PR review'larında connection string içeren dosyalar reddedilir

---

## Zorunlu / Opsiyonel Değişkenler

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | **Evet** | SQL Server bağlantı dizesi |
| `ASPNETCORE_ENVIRONMENT` | **Evet** | `Production` veya `Development` |
| `ASPNETCORE_URLS` | **Evet** | Dinlenecek adres (örn. `http://+:8080`) |
| `MINIO_ENDPOINT` | MinIO kullanılıyorsa | MinIO API endpoint |
| `MINIO_BUCKET` | MinIO kullanılıyorsa | Hedef bucket adı |
| `MINIO_ROOT_USER` | MinIO kullanılıyorsa | MinIO erişim kullanıcı adı |
| `MINIO_ROOT_PASSWORD` | MinIO kullanılıyorsa | MinIO erişim şifresi |

---

## Güvenlik Anahtarları (Faz 1)

Aşağıdaki anahtarlar güvenlik sertleştirmesiyle eklendi. **"Uygulama başlamaz"** işaretli
olanlar fail-fast'tir: yanlış/eksik ayarda container açılışta exception ile durur.

### Zorunlu — yanlışsa uygulama başlamaz

| Anahtar (env var) | Varsayılan | Zorunlu olduğu ortam | Yanlış ayarın sonucu |
|---|---|---|---|
| `Cors:AllowedOrigins` (`Cors__AllowedOrigins__0`, `__1`, …) | Yok | **Development dışındaki tüm ortamlar** | Liste boşsa `InvalidOperationException` → **uygulama başlamaz**. Development'ta boş bırakılırsa `AllowAnyOrigin()` geri dönüş yolu devreye girer. |
| `Jwt:Secret` (`Jwt__Secret`) | Yok | Tüm ortamlar | Boş, **32 karakterden kısa** veya bilinen bir placeholder içeriyorsa (`dev-only-secret`, `replace-with`, `changeme`, `change-me`, `your-secret`, `secret-key-here`, `placeholder`, `sample-secret`) options doğrulaması `ValidateOnStart()` ile patlar → **uygulama başlamaz**. |

{% hint style="warning" %}
`appsettings.Development.json` içindeki örnek secret (`dev-only-secret-…`) artık
placeholder listesinde olduğu için **olduğu gibi kullanılamaz**; gerçek bir değerle
değiştirilmeli veya `Jwt__Secret` env var'ı ile override edilmelidir.
{% endhint %}

### Opsiyonel — davranış anahtarları

| Anahtar (env var) | Varsayılan | Nerede etkili | Not |
|---|---|---|---|
| `Swagger:Enabled` (`Swagger__Enabled`) | `true` **yalnızca Development**, diğer ortamlarda `false` | Tüm ortamlar | `true` yapılan her ortamda `/swagger` public olur. Test/Production'da açmak bilinçli bir karar olmalıdır. |
| `Seed:EnableAdminSeed` (`Seed__EnableAdminSeed`) | Kod varsayılanı `false`; compose varsayılanları farklı — **test `true`**, **prod `false`** (`${SEED_ENABLE_ADMIN_SEED:-…}`). Development'ta anlamsız, orada seed her hâlükârda çalışır. | Development **dışı** ortamlar | `true` olmadan `admin@cargopilot.com` seed edilmez. `true` iken kullanıcı `MustChangePassword` bayrağıyla oluşturulur (ilk girişte parola değişimi zorunlu). |
| `Seed:DefaultAdminPassword` (`Seed__DefaultAdminPassword`) | Yok | Admin seed devredeyken | Admin seed çalışırken boş/whitespace ise `InvalidOperationException` → **uygulama başlamaz**. Placeholder metin (`<CHANGE_ME_ADMIN_PASSWORD>`) boş sayılmaz; literal parola olur. |
| `Security:EnableHttpsRedirection` (`Security__EnableHttpsRedirection`) | `false` | Tüm ortamlar | TLS nginx'te sonlandığı ve uygulama HTTP dinlediği için varsayılan kapalıdır. TLS'i doğrudan uygulamada sonlandıran dağıtımlarda `true` yapılır; nginx arkasında `true` yapmak redirect döngüsüne yol açabilir. |
| `ForwardedHeaders:KnownProxies` (`ForwardedHeaders__KnownProxies__0`, …) | Boş | Tüm ortamlar | Tekil IP adresi listesi. Parse edilemeyen değerler sessizce atlanır. |
| `ForwardedHeaders:KnownNetworks` (`ForwardedHeaders__KnownNetworks__0`, …) | Boş | Tüm ortamlar | CIDR listesi. **İkisi de boşsa** güvenli varsayılan uygulanır: loopback (IPv4+IPv6) + `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Yanlış ayar `X-Forwarded-For`'un yok sayılmasına → rate limiter'ın gerçek istemci IP'si yerine proxy IP'sini görmesine yol açar. |
| `ForwardedHeaders:ForwardLimit` (`ForwardedHeaders__ForwardLimit`) | `1` | Tüm ortamlar | Zincirdeki güvenilen proxy sayısı. |
| `Erp:SqlServer:TrustServerCertificate` (`Erp__SqlServer__TrustServerCertificate`) | **`false`** | ERP SQL Server bağlantısı | Bağlantıda `Encrypt=true` sabittir. Varsayılan `false` olduğu için self-signed sertifikalı ERP sunucularına bağlantı **sertifika hatası ile başarısız olur**; bu bilinçli bir güvenlik varsayılanıdır, gerekiyorsa açıkça `true` yapılmalıdır. |
| `AllowedHosts` (`AllowedHosts`) | `*` (hem `appsettings.json` hem compose: `${ALLOWED_HOSTS:-*}`) | Tüm ortamlar | ASP.NET Core Host filtering. Ayraç **noktalı virgül**tür. Health check `localhost` üzerinden geldiği için liste doldurulurken `localhost` mutlaka kalmalıdır, aksi halde container healthcheck'i başarısız olur. |

### ⚠️ Compose dolaylılığı — `.env` dosyasındaki isimler farklıdır

`.env.test` / `.env.prod` dosyalarına yukarıdaki `Anahtar__Yolu` isimlerini yazmak
**yeterli değildir**. Compose, kendi değişken isimlerini okuyup container'a `__` formatında
aktarır. Yeni bir anahtar eklerken compose'un `environment` bloğuna da eşleme eklenmelidir.

| `.env` dosyasındaki isim | Compose'un aktardığı anahtar | Compose varsayılanı |
|---|---|---|
| `JWT_SECRET` | `Jwt__Secret` | yok (zorunlu) |
| `CORS_ALLOWED_ORIGIN_0` | `Cors__AllowedOrigins__0` | boş → Development dışında **başlamaz** |
| `SEED_ENABLE_ADMIN_SEED` | `Seed__EnableAdminSeed` | test `true`, prod `false` |
| `Seed__DefaultAdminPassword` | `Seed__DefaultAdminPassword` (birebir) | — |
| `ALLOWED_HOSTS` | `AllowedHosts` | `*` |

{% hint style="info" %}
`Swagger__Enabled`, `Security__EnableHttpsRedirection`, `ForwardedHeaders__*` ve
`Erp__SqlServer__TrustServerCertificate` şu an **hiçbir compose dosyasında aktarılmıyor**;
bu ortamlarda kod varsayılanlarıyla çalışırlar. Bir tanesini değiştirmeniz gerekiyorsa önce
compose `environment` bloğuna eşlemesini eklemeniz gerekir.
{% endhint %}

**Doğrulama kaynakları:** `CargoPilot.WebAPI/DependencyInjection.cs` (CORS, Swagger, HTTPS
redirection, ForwardedHeaders, health/metrics yetkilendirmesi),
`CargoPilot.Infrastructure/DependencyInjection.cs` (`JwtSecretPolicy`),
`CargoPilot.Infrastructure/Persistence/Seeding/DbInitializer.cs` (seed),
`CargoPilot.Infrastructure/Services/SqlServerErpProductFetcher.cs` (ERP TLS),
`infra/compose/docker-compose.{test,prod}.yml` (env eşlemeleri).
