# Database Migrations Akisi

Bu dokuman, CargoPilot backend'inde ilk migration'in nasil uretildigini, veritabaninin nasil olusturuldugunu ve bu akisin her ortamda nasil isletildigini aciklar.

---

## 1) On Kosullar

### 1.1 EF Core CLI Araci

Global `dotnet-ef` araci bir kez kurulur:

```powershell
dotnet tool install --global dotnet-ef
```

Zaten kuruluysa guncelle:

```powershell
dotnet tool update --global dotnet-ef
```

Dogrulama:

```powershell
dotnet ef --version
```

### 1.2 Connection String

Migration komutlari `AppDbContextFactory` araciligiyla connection string'i su kaynak siralamasindan okur:

1. Ortam degiskeni: `ConnectionStrings__DefaultConnection`
2. Fallback (yalnizca local dev icin): `Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;`

Yerel ornekleri:

```powershell
# Windows authentication (lokal SQL Server / LocalDB)
$env:ConnectionStrings__DefaultConnection = "Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;"

# SA hesabi ile (Docker icin)
$env:ConnectionStrings__DefaultConnection = "Server=localhost,1433;Database=CargoPilotDev;User Id=sa;Password=Your_password123;TrustServerCertificate=True;"
```

```bash
# bash / git bash
export ConnectionStrings__DefaultConnection="Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;"
```

> **Not:** Production'da env var mutlaka set edilmeli; `docker-compose.*.yml` ve CI/CD pipeline'larinda bu degiskenin varligi zorunlu tutulmalidir.

---

## 2) Calisma Dizini

Komutlar `apps/backend/` dizininden calistirilir. Bu dizinde `CargoPilot.slnx` ve tum katman klasorleri yer alir:

```powershell
cd apps/backend
```

---

## 3) Ilk Migration

Baslangic migration'ini uret:

```powershell
dotnet ef migrations add InitialCreate `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output-dir Persistence/Migrations
```

Parametrelerin anlamlari:

- `--project` — migration dosyalarinin uretilecegi proje (`DbContext`'in yasadigi yer).
- `--startup-project` — uygulamanin giris projesi; host yapilandirmasi ve configuration buradan okunur.
- `--output-dir` — migration dosyalarinin hangi klasor altinda tutulacagi. Projede standart `Persistence/Migrations`.

Komut basariyla tamamlaninca asagidaki dosyalar olusur:

```
CargoPilot.Infrastructure/Persistence/Migrations/
  <timestamp>_InitialCreate.cs
  <timestamp>_InitialCreate.Designer.cs
  AppDbContextModelSnapshot.cs
```

---

## 4) Veritabanini Olustur / Guncelle

Migration'i uygula:

```powershell
dotnet ef database update `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Bu komut:

- Hedef sunucuda veritabani yoksa olusturur (`CREATE DATABASE`).
- Bekleyen migration'lari sirayla uygular.
- `__EFMigrationsHistory` tablosunu olusturup uygulanmis migration kaydini tutar.

Belirli bir migration'a donmek icin:

```powershell
dotnet ef database update <MigrationAdi> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Tum migration'lari geri almak icin `0` hedef verilir:

```powershell
dotnet ef database update 0 `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

---

## 5) Yeni Bir Migration Eklerken

Domain / mapping degistiginde yeni migration uretilir:

```powershell
dotnet ef migrations add <AnlamliIsim> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output-dir Persistence/Migrations
```

Isim kurali: `PascalCase`, ne yaptigini ozetleyen ifadeler. Ornekler:

```
AddCargoWeightColumn
ExtendTrackingNumberLength
AddCargoStatusIndex
```

---

## 6) Yanlis Migration'i Iptal Etme

### 6.1 Henuz DB'ye uygulanmamissa

```powershell
dotnet ef migrations remove `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Bu komut **son** migration dosyalarini siler ve snapshot'i oncesine geri alir.

### 6.2 DB'ye uygulanmissa

Once bir onceki migration'a geri don:

```powershell
dotnet ef database update <OncekiMigration> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Sonra dosyayi `remove` ile kaldir.

---

## 7) Ortam Bazli Akis

### 7.1 Development

- Default konfigurasyon `useInMemoryRepository: true` ile calisir (bkz. `Program.cs`).
- Bu modda `DbContext` runtime'da kaydedilmez; uygulama DB'siz ayaga kalkar.
- Migration komutlari `AppDbContextFactory` araciligiyla bagimsiz calisir; runtime DI'ya ihtiyac duymaz.
- Gerçek DB uzerinde calismak icin `Program.cs`'teki flag `false`'a cekilir veya ortam degiskeni uzerinden override edilir (Story 5 kapsami).

### 7.2 Staging / Production

- Runtime'da `useInMemoryRepository: false` olmalidir.
- `ConnectionStrings__DefaultConnection` env var'i **zorunludur**; uygulama bu olmadan calismaz.
- Migration'lar iki yontemden biriyle uygulanir:
  - **Uygulama acilisinda otomatik** — `AppDbContext.Database.Migrate()` cagrisi `Program.cs` baslangicinda calistirilir. Kolaydir ama scale-out / blue-green senaryolarinda yarisa yol acabilir.
  - **Deployment adimi olarak ayrik** — CI/CD pipeline'inda `dotnet ef database update` komutu uygulama deploy'undan once calistirilir. Tercih edilen yaklasim budur; rollback ve gozlemlenebilirlik daha nettir.

> **Not:** Uretim ortamina otomatik migrate policy'si Story 5 ve CI/CD story'leri ile birlikte kesinlestirilecektir.

---

## 8) SQL Script Uretmek (Opsiyonel)

DB degisiklikleri once SQL olarak incelenip onaylanmak istenirse script uretilir:

```powershell
dotnet ef migrations script `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output ./migration.sql
```

Belirli iki migration arasini almak icin:

```powershell
dotnet ef migrations script <From> <To> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output ./migration.sql
```

DBA / release ekibi tarafindan prod uygulamasi icin kullanisli.

---

## 9) Sorun Giderme

| Sorun | Sebep / Cozum |
|-------|---------------|
| `No DbContext was found` | `--startup-project CargoPilot.WebAPI` parametresi eksik veya yanlis proje gosteriyor. |
| `Unable to create an object of type 'AppDbContext'` | `AppDbContextFactory` eksik ya da connection string bos. Env var'i set et ya da factory'nin fallback satirini kontrol et. |
| `Login failed for user 'sa'` | Connection string'teki kullanici / sifre yanlis. Docker parolasinin `MSSQL_SA_PASSWORD` ile ayni oldugunu dogrula. |
| `A network-related or instance-specific error` | SQL Server calismiyor ya da firewall 1433 portunu kapatmis. `docker ps` veya `services.msc` ile dogrula. |
| `The specified framework 'Microsoft.NETCore.App', version 'x.y.z' was not found` | `global.json`'daki SDK surumu makinede yok. `dotnet --list-sdks` kontrol et, gerekirse kur. |

---

## 10) Ilgili Dokumanlar

- [developer-setup.md](./developer-setup.md) — SDK ve tooling kurulumu
- [environment-variables.md](./environment-variables.md) — Env var naming standardi
- [architecture.md](./architecture.md) — Katman yapisi ve Infrastructure sorumlulugu
