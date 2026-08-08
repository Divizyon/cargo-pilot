# CargoPilot Developer Setup

**Son güncelleme:** 2026-04-17 · **Durum:** Aktif

Bu dokümanın amacı, tüm geliştiricilerin projeyi aynı araç seti ile sorunsuz derlemesini sağlamaktır.

---

## 1) Gerekli araçlar

- Visual Studio 2022 (17.8 veya üstü önerilir)
- .NET SDK 8.0.x
- Git

## 2) Visual Studio kurulumu (zorunlu)

Visual Studio Installer üzerinden aşağıdaki workloadları kurun:

- ASP.NET and web development
- Data storage and processing

Ek olarak şu individual componentlerin kurulu olduğunu doğrulayın:

- .NET 8.0 SDK
- SQL Server Data Tools (SSDT) (önerilir)

## 3) SDK standardı

Bu repository, kök dizindeki `global.json` dosyası ile SDK sürümünü sabitler:

- `version`: `8.0.419`
- `rollForward`: `latestPatch`

Anlamları:

- `version`: Takımın temel SDK sürümünü belirler.
- `latestPatch`: Aynı feature band içindeki en güncel patch sürümüne izin verir.

## 4) Kurulum sonrası doğrulama

Repository kök dizininde şu komutları çalıştırın:

```powershell
dotnet --info
dotnet --list-sdks
dotnet --version
dotnet restore .\CargoPilot.WebAPI\CargoPilot.WebAPI.csproj
dotnet build .\CargoPilot.WebAPI\CargoPilot.WebAPI.csproj
```

Beklenen durum:

- `dotnet --version` çıktı değeri `8.0.419` olmalı (veya aynı bandda `latestPatch` ile seçilen patch).
- Restore ve build adımları hata vermeden tamamlanmalı.

## 5) Sıklıkla karşılaşılan sorunlar

- **SDK uyuşmazlığı:** `global.json` bulunan klasörde komut çalıştırdığınızdan emin olun.
- **.NET 8 bulunamadı hatası:** Visual Studio Installer veya .NET installer ile .NET 8 SDK kurun.
- **NuGet restore sorunu:** Internet/proxy ayarlarınızı ve kurum sertifika politikasını kontrol edin.

## 6) Takım standardı

- Projede SDK sürümü `global.json` ile yönetilir.
- SDK değişiklikleri chapter lead onayı ile yapılır.
- Yeni sürüme geçişte önce local doğrulama, sonra CI doğrulaması yapılır.

## 7) CI tarafında SDK sabitleme

CI tarafında da aynı SDK sürümü kullanılır. Bu repository'de GitHub Actions pipeline dosyası:

- `.github/workflows/ci.yml`

Bu dosyada `actions/setup-dotnet@v4` ile şu sürüm pinlenmiştir:

- `.NET SDK 8.0.419`

Böylece local (`global.json`) ve CI aynı SDK sürümü ile build alır.
