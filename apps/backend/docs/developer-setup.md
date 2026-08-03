# CargoPilot Developer Setup

Bu dokumanin amaci, tum gelistiricilerin projeyi ayni arac seti ile sorunsuz derlemesini saglamaktir.

## 1) Gerekli araclar

- Visual Studio 2022 (17.8 veya ustu onerilir)
- .NET SDK 8.0.x
- Git

## 2) Visual Studio kurulumu (zorunlu)

Visual Studio Installer uzerinden asagidaki workloadlari kurun:

- ASP.NET and web development
- Data storage and processing

Ek olarak su individual componentlerin kurulu oldugunu dogrulayin:

- .NET 8.0 SDK
- SQL Server Data Tools (SSDT) (onerilir)

## 3) SDK standardi

Bu repository, kok dizindeki `global.json` dosyasi ile SDK surumunu sabitler:

- `version`: `8.0.419`
- `rollForward`: `latestPatch`

Anlamlari:

- `version`: Takimin temel SDK surumunu belirler.
- `latestPatch`: Ayni feature band icindeki en guncel patch surumune izin verir.

## 4) Kurulum sonrasi dogrulama

Repository kok dizininde su komutlari calistirin:

```powershell
dotnet --info
dotnet --list-sdks
dotnet --version
dotnet restore .\CargoPilot.WebAPI\CargoPilot.WebAPI.csproj
dotnet build .\CargoPilot.WebAPI\CargoPilot.WebAPI.csproj
```

Beklenen durum:

- `dotnet --version` cikti degeri `8.0.419` olmali (veya ayni bandda `latestPatch` ile secilen patch).
- Restore ve build adimlari hata vermeden tamamlanmali.

## 5) Siklikla karsilasilan sorunlar

- **SDK uyusmazligi:** `global.json` bulunan klasorde komut calistirdiginizdan emin olun.
- **.NET 8 bulunamadi hatasi:** Visual Studio Installer veya .NET installer ile .NET 8 SDK kurun.
- **NuGet restore sorunu:** Internet/proxy ayarlarinizi ve kurum sertifika politikasini kontrol edin.

## 6) Takim standardi

- Projede SDK surumu `global.json` ile yonetilir.
- SDK degisiklikleri chapter lead onayi ile yapilir.
- Yeni surume geciste once local dogrulama, sonra CI dogrulamasi yapilir.

## 7) CI tarafinda SDK sabitleme

CI tarafinda da ayni SDK surumu kullanilir. Bu repository'de GitHub Actions pipeline dosyasi:

- `.github/workflows/ci.yml`

Bu dosyada `actions/setup-dotnet@v4` ile su surum pinlenmistir:

- `.NET SDK 8.0.419`

Boylece local (`global.json`) ve CI ayni SDK surumu ile build alir.
