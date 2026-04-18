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

## Sonraki Bolumler

Bu dokuman sonraki user story alt islerinde genisletilecektir:
- Yapilandirma oncelik sirasi (env var vs user-secrets vs appsettings)
- Ortam bazli kaynak tablosu (Development / Staging / Production)
- Zorunlu/opsiyonel degisken listesi
- Secret management policy
