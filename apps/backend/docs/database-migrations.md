# Database Migrations Akışı

**Son güncelleme:** 2026-04-17 · **Durum:** Aktif

Bu doküman, CargoPilot backend'inde ilk migration'ın nasıl üretildiğini, veritabanının nasıl oluşturulduğunu ve bu akışın her ortamda nasıl işletildiğini açıklar.

---

## 1) Ön Koşullar

### 1.1 EF Core CLI Aracı

Global `dotnet-ef` aracı bir kez kurulur:

```powershell
dotnet tool install --global dotnet-ef
```

Zaten kuruluysa güncelle:

```powershell
dotnet tool update --global dotnet-ef
```

Doğrulama:

```powershell
dotnet ef --version
```

### 1.2 Connection String

Migration komutları `AppDbContextFactory` aracılığıyla connection string'i şu kaynak sıralamasından okur:

1. Ortam değişkeni: `ConnectionStrings__DefaultConnection`
2. Fallback (yalnızca local dev için): `Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;`

Yerel örnekleri:

```powershell
# Windows authentication (lokal SQL Server / LocalDB)
$env:ConnectionStrings__DefaultConnection = "Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;"

# SA hesabı ile (Docker için)
$env:ConnectionStrings__DefaultConnection = "Server=localhost,1433;Database=CargoPilotDev;User Id=sa;Password=Your_password123;TrustServerCertificate=True;"
```

```bash
# bash / git bash
export ConnectionStrings__DefaultConnection="Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;"
```

> **Not:** Production'da env var mutlaka set edilmeli; `docker-compose.*.yml` ve CI/CD pipeline'larında bu değişkenin varlığı zorunlu tutulmalıdır.

---

## 2) Çalışma Dizini

Komutlar `apps/backend/` dizininden çalıştırılır. Bu dizinde `CargoPilot.slnx` ve tüm katman klasörleri yer alır:

```powershell
cd apps/backend
```

---

## 3) İlk Migration

Başlangıç migration'ını üret:

```powershell
dotnet ef migrations add InitialCreate `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output-dir Persistence/Migrations
```

Parametrelerin anlamları:

- `--project` — migration dosyalarının üretileceği proje (`DbContext`'in yaşadığı yer).
- `--startup-project` — uygulamanın giriş projesi; host yapılandırması ve configuration buradan okunur.
- `--output-dir` — migration dosyalarının hangi klasör altında tutulacağı. Projede standart `Persistence/Migrations`.

Komut başarıyla tamamlanınca aşağıdaki dosyalar oluşur:

```
CargoPilot.Infrastructure/Persistence/Migrations/
  <timestamp>_InitialCreate.cs
  <timestamp>_InitialCreate.Designer.cs
  AppDbContextModelSnapshot.cs
```

---

## 4) Veritabanını Oluştur / Güncelle

Migration'ı uygula:

```powershell
dotnet ef database update `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Bu komut:

- Hedef sunucuda veritabanı yoksa oluşturur (`CREATE DATABASE`).
- Bekleyen migration'ları sırayla uygular.
- `__EFMigrationsHistory` tablosunu oluşturup uygulanmış migration kaydını tutar.

Belirli bir migration'a dönmek için:

```powershell
dotnet ef database update <MigrationAdi> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Tüm migration'ları geri almak için `0` hedef verilir:

```powershell
dotnet ef database update 0 `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

---

## 5) Yeni Bir Migration Eklerken

Domain / mapping değiştiğinde yeni migration üretilir:

```powershell
dotnet ef migrations add <AnlamliIsim> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output-dir Persistence/Migrations
```

İsim kuralı: `PascalCase`, ne yaptığını özetleyen ifadeler. Örnekler:

```
AddCargoWeightColumn
ExtendTrackingNumberLength
AddCargoStatusIndex
```

---

## 6) Yanlış Migration'ı İptal Etme

### 6.1 Henüz DB'ye uygulanmamışsa

```powershell
dotnet ef migrations remove `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Bu komut **son** migration dosyalarını siler ve snapshot'ı öncesine geri alır.

### 6.2 DB'ye uygulanmışsa

Önce bir önceki migration'a geri dön:

```powershell
dotnet ef database update <OncekiMigration> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI
```

Sonra dosyayı `remove` ile kaldır.

---

## 7) Ortam Bazlı Akış

### 7.1 Development

> **⚠️ Düzeltme — 2026-08-15.** Bu bölüm daha önce "default konfigürasyon `useInMemoryRepository: true`
> ile çalışır, uygulama DB'siz ayağa kalkar" diyordu. **Bu artık doğru değil ve aynı klasördeki
> `architecture.md` §"Development" bölümüyle çelişiyordu.** Doğru olan `architecture.md`'dir.
> Kanıt (2026-08-15):
> - `CargoPilot.Infrastructure/DependencyInjection.cs:28` → `bool useInMemoryRepository = false` (varsayılan **false**)
> - `CargoPilot.WebAPI/Program.cs:23` → değer `UseInMemoryDatabase` konfigürasyon anahtarından okunur; tanımlı değilse `false`
> - `find apps/backend -iname "InMemory*Repository*.cs"` → **0 sonuç**; yani bayrak `true` yapılsa
>   bile devreye girecek bir InMemory repository implementasyonu **yoktur**, DI çözümlemesi patlar.

- Default konfigürasyon `useInMemoryRepository: **false**` ile çalışır (`Program.cs:23` →
  `Infrastructure/DependencyInjection.cs:28`). **Development'ta da gerçek bir SQL Server bağlantısı gerekir.**
- `UseInMemoryDatabase` bayrağı konfigürasyondan `true` yapılabilir ama karşılığında bir
  `InMemory*Repository` implementasyonu bulunmadığı için **çalışmaz** — bu bayrak fiilen ölüdür.
- Migration komutları `AppDbContextFactory` aracılığıyla bağımsız çalışır; runtime DI'ya ihtiyaç duymaz.
- Yerel DB'yi ayağa kaldırma adımları için `docs/setup/local-setup.md`.

### 7.2 Staging / Production

- Runtime'da `useInMemoryRepository: false` olmalıdır.
- `ConnectionStrings__DefaultConnection` env var'ı **zorunludur**; uygulama bu olmadan çalışmaz.
- Migration'lar iki yöntemden biriyle uygulanır:
  - **Uygulama açılışında otomatik** — `AppDbContext.Database.Migrate()` çağrısı `Program.cs` başlangıcında çalıştırılır. Kolaydır ama scale-out / blue-green senaryolarında yarışa yol açabilir.
  - **Deployment adımı olarak ayrık** — CI/CD pipeline'ında `dotnet ef database update` komutu uygulama deploy'undan önce çalıştırılır. Tercih edilen yaklaşım budur; rollback ve gözlemlenebilirlik daha nettir.

> **Not:** Üretim ortamına otomatik migrate policy'si Story 5 ve CI/CD story'leri ile birlikte kesinleştirilecektir.

---

## 8) SQL Script Üretmek (Opsiyonel)

DB değişiklikleri önce SQL olarak incelenip onaylanmak istenirse script üretilir:

```powershell
dotnet ef migrations script `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output ./migration.sql
```

Belirli iki migration arasını almak için:

```powershell
dotnet ef migrations script <From> <To> `
  --project CargoPilot.Infrastructure `
  --startup-project CargoPilot.WebAPI `
  --output ./migration.sql
```

DBA / release ekibi tarafından prod uygulaması için kullanışlı.

---

## 9) Sorun Giderme

| Sorun | Sebep / Çözüm |
|-------|---------------|
| `No DbContext was found` | `--startup-project CargoPilot.WebAPI` parametresi eksik veya yanlış proje gösteriyor. |
| `Unable to create an object of type 'AppDbContext'` | `AppDbContextFactory` eksik ya da connection string boş. Env var'ı set et ya da factory'nin fallback satırını kontrol et. |
| `Login failed for user 'sa'` | Connection string'teki kullanıcı / şifre yanlış. Docker parolasının `MSSQL_SA_PASSWORD` ile aynı olduğunu doğrula. |
| `A network-related or instance-specific error` | SQL Server çalışmıyor ya da firewall 1433 portunu kapatmış. `docker ps` veya `services.msc` ile doğrula. |
| `The specified framework 'Microsoft.NETCore.App', version 'x.y.z' was not found` | `global.json`'daki SDK sürümü makinede yok. `dotnet --list-sdks` kontrol et, gerekirse kur. |

---

## 10) İlgili Dokümanlar

- [developer-setup.md](./developer-setup.md) — SDK ve tooling kurulumu
- [environment-variables.md](./environment-variables.md) — Env var naming standardı
- [architecture.md](./architecture.md) — Katman yapısı ve Infrastructure sorumluluğu
