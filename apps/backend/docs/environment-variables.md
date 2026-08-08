# CargoPilot Environment Variables

**Son güncelleme:** 2026-04-25 · **Durum:** Aktif

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
  şeklinde indekslenir. Array kullanımı bu projede yoktur; eklenirse bu
  doküman güncellenmelidir.

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
