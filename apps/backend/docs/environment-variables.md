# CargoPilot Environment Variables

Bu dokuman, CargoPilot projesinde yapilandirma degerlerinin environment
variable olarak nasil isimlendirilecegini tanimlar. Dokuman, ekip icinde
tutarli bir standart saglamak icin referans olarak kullanilir.

---

## Naming Standard

Yapilandirma degerleri `appsettings.json` icinde nested JSON olarak
tutulur. Bir degeri environment variable ile override etmek icin, ayni
yol **cift alt cizgi (`__`)** ile yazilir.

| appsettings JSON path                 | Environment variable name              |
| ------------------------------------- | -------------------------------------- |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` |
| `Logging:LogLevel:Default`            | `Logging__LogLevel__Default`           |
| `Logging:LogLevel:Microsoft.AspNetCore` | `Logging__LogLevel__Microsoft.AspNetCore` |
| `ApplicationSettings:AppName`         | `ApplicationSettings__AppName`         |
| `ApplicationSettings:Version`         | `ApplicationSettings__Version`         |

---

## Neden `__` (cift alt cizgi)?

JSON yolunda kullanilan `:` karakteri, Linux/bash ve POSIX kabuklarinda
environment variable isminde **gecerli degildir**. ASP.NET Core
`EnvironmentVariablesConfigurationProvider`'i, cift alt cizgi gordugunde
otomatik olarak `:` ile replace edip nested key'e donusturur.

Bu sayede ayni env var:
- Windows (`cmd`, `PowerShell`),
- Linux/macOS (`bash`, `zsh`),
- Docker / Kubernetes / CI pipeline

ortamlarinda tek bir isimle calisir.

---

## Kurallar

- **Buyuk/kucuk harf duyarsiz**: `ConnectionStrings__DefaultConnection` ile
  `connectionstrings__defaultconnection` ayni degeri set eder. Yine de
  okunabilirlik icin `PascalCase__PascalCase` tercih edilmelidir.
- **Ozel prefix gerekmez**: `ASPNETCORE_` ya da `DOTNET_` gibi prefix'ler
  ASP.NET Core'un kendi degiskenleri (ornegin `ASPNETCORE_ENVIRONMENT`)
  icindir; uygulama yapilandirmasi icin kullanilmaz.
- **Bir seviye nesting**: `SectionA:SectionB:Key` -> `SectionA__SectionB__Key`.
  Ic ice sayi sinirsizdir ama 3'ten derine inmekten kacinin; bu yapilandirmada
  refactor sinyali verir.
- **Liste/array degerleri**: `ArraySection:0:Name` -> `ArraySection__0__Name`
  seklinde indekslenir. Array kullanimi bu projede yoktur; eklenirse bu
  dokuman guncellenmelidir.

---

## Ornek: SQL Baglanti Dizesini Set Etme

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

## Yapilandirma Oncelik Sirasi

ASP.NET Core yapilandirmayi asagidaki siraya gore ust uste yukler (son kaynak kazanir):

1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. **User Secrets** (sadece Development)
4. **Environment Variables**
5. Command-line arguments

---

## Ortam Bazli Secret Kaynaklari

| Ortam | Connection String Kaynagi | Nasil Set Edilir |
|---|---|---|
| Development (local, Docker'siz) | User Secrets | `dotnet user-secrets set` |
| Test (Docker) | `.env.test` → compose env | `infra/env/.env.test` |
| Production (Docker) | `.env.prod` → compose env | `/opt/cargo-pilot/infra/env/.env.prod` |

---

## Development: User Secrets Kurulumu

`UserSecretsId` `CargoPilot.WebAPI.csproj` icinde `cargo-pilot-backend` olarak tanimlidir.
Docker kullanmadan `dotnet run` ile local calistirirken:

**Windows (PowerShell):**
```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=CargoPilotDev;User Id=sa;Password=SIFRE;TrustServerCertificate=True;" --project apps/backend/CargoPilot.WebAPI
```

**Linux/macOS:**
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=CargoPilotDev;User Id=sa;Password=SIFRE;TrustServerCertificate=True;" --project apps/backend/CargoPilot.WebAPI
```

Kayitli secrets listesi:
```bash
dotnet user-secrets list --project apps/backend/CargoPilot.WebAPI
```

User Secrets dosyalari `%APPDATA%/Microsoft/UserSecrets/cargo-pilot-backend/` altinda saklanir; repoya eklenmez.

---

## Production: Bulut DB Baglantisi ve Guvenlik Policy

### Baglanti Akisi

```
.env.prod  (DATABASE_CONNECTION_STRING)
  └─> docker-compose.prod.yml  (ConnectionStrings__DefaultConnection)
      └─> ASP.NET Core IConfiguration
          └─> GetConnectionString("DefaultConnection")
```

### Connection String Formati

```
Server=mssql,1433;Database=CargoPilot;User Id=sa;Password=SIFRE;TrustServerCertificate=True;
```

- `mssql` — Docker network icindeki servis adi; sunucu disından erisimde IP/hostname kullanilir
- `TrustServerCertificate=True` — Docker icinde self-signed sertifika ile calistigi icin gerekli
- Production TLS icin backend onune reverse proxy (Nginx/Caddy) konulmalidir

### Secret Management Policy

- `.env.prod` sunucuda `/opt/cargo-pilot/infra/env/.env.prod` konumunda `chmod 600` ile korunur
- `.env.prod` repoya eklenmez (`.gitignore` korumalı)
- Credentials asla `appsettings.json`, `appsettings.Production.json` veya kaynak koda yazilmaz
- PR review'larinda connection string iceren dosyalar reddedilir

---

## Zorunlu / Opsiyonel Degiskenler

| Degisken | Zorunlu | Aciklama |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | **Evet** | SQL Server baglanti dizesi |
| `ASPNETCORE_ENVIRONMENT` | **Evet** | `Production` veya `Development` |
| `ASPNETCORE_URLS` | **Evet** | Dinlenecek adres (orn. `http://+:8080`) |
| `MINIO_ENDPOINT` | MinIO kullaniliyorsa | MinIO API endpoint |
| `MINIO_BUCKET` | MinIO kullaniliyorsa | Hedef bucket adi |
| `MINIO_ROOT_USER` | MinIO kullaniliyorsa | MinIO erisim kullanici adi |
| `MINIO_ROOT_PASSWORD` | MinIO kullaniliyorsa | MinIO erisim sifresi |
