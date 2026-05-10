# Secret Yönetimi ve Güvenli Konfigürasyon

**Görev:** US-D23-S  
**Tarih:** 2026-04-25  
**Durum:** Tamamlandı

---

## 1. Kural: Repoya Secret Commit Edilmez

Aşağıdaki değerler **asla** repoya girmemeli:

- Veritabanı parolaları (SA, uygulama kullanıcısı)
- MinIO root/access key
- Grafana admin parolası
- JWT secret key (eklenirse)
- Herhangi bir üçüncü taraf API key

---

## 2. Ortam Dosyaları (Docker / Sunucu)

| Dosya | Repoda? | İçerik |
|-------|---------|--------|
| `infra/env/.env.test.example` | ✅ Evet | Placeholder değerler |
| `infra/env/.env.prod.example` | ✅ Evet | Placeholder değerler |
| `infra/env/.env.monitoring.test.example` | ✅ Evet | Placeholder değerler |
| `infra/env/.env.monitoring.prod.example` | ✅ Evet | Placeholder değerler |
| `infra/env/.env.test` | ❌ Hayır | `.gitignore` tarafından dışlanır |
| `infra/env/.env.prod` | ❌ Hayır | `.gitignore` tarafından dışlanır |
| `infra/env/.env.monitoring.test` | ❌ Hayır | `.gitignore` `.env.*` ile kapsar |
| `infra/env/.env.monitoring.prod` | ❌ Hayır | `.gitignore` `.env.*` ile kapsar |

**Sunucuda gerçek değerler:** `/opt/cargo-pilot/infra/env/` altındaki `.env.*` dosyaları
sunucuya SSH ile bağlanarak el ile oluşturulur. VPS konsolunda saklanır.

---

## 3. GHCR Package Erişimi

**Durum (2026-05-10):** GHCR package'ları **public** yapıldı.

| Package | Visibility |
|---------|------------|
| `ghcr.io/divizyon/cargo-pilot-backend` | 🌐 Public |
| `ghcr.io/divizyon/cargo-pilot-frontend` | 🌐 Public |
| `ghcr.io/divizyon/cargo-pilot-dotnet-sdk` | 🌐 Public |
| `ghcr.io/divizyon/cargo-pilot-dotnet-aspnet` | 🌐 Public |

Geliştiricilerin GHCR'a login olmasına veya PAT oluşturmasına **gerek yoktur**. `docker compose pull` ve `docker compose up -d` doğrudan çalışır.

Sunucunun GHCR'dan image çekmesi için kullandığı `TEST_GHCR_PAT` GitHub secret'ı hâlâ geçerlidir ve CI pipeline tarafından kullanılmaktadır.

---

## 4. Backend Geliştirme (Local .NET)

### `appsettings.Development.json`

Bu dosya **repoda tutulur** ancak yalnızca placeholder değer içerir:

```json
"Password=<REPLACE_WITH_LOCAL_SA_PASSWORD>"
```

Gerçek local SA parolasını buraya **yazma**. Bunun yerine iki yöntemden biri kullan:

#### Yöntem A — `appsettings.Development.Local.json` (önerilen)

```bash
# CargoPilot.WebAPI/ dizininde oluştur:
cat > appsettings.Development.Local.json << 'EOF'
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1434;Database=CargoPilotTest;User Id=sa;Password=GERCEK_SA_PAROLASI;TrustServerCertificate=True;Encrypt=False"
  },
  "Seed": {
    "DefaultAdminPassword": "GERCEK_ADMIN_PAROLASI"
  }
}
EOF
```

`appsettings.*.Local.json` pattern'i `apps/backend/.gitignore` tarafından dışlanır.

ASP.NET Core bu dosyayı otomatik yüklemez; `Program.cs`'e aşağıdaki satırı eklemen gerekir:

```csharp
builder.Configuration
    .AddJsonFile("appsettings.Development.Local.json", optional: true, reloadOnChange: true);
```

> **Not:** Bu satır mevcut değilse Yöntem B'yi kullan.

#### Yöntem B — Ortam Değişkeni

```bash
export ConnectionStrings__DefaultConnection="Server=localhost,1434;Database=CargoPilotTest;User Id=sa;Password=GERCEK_PAROLAYI_BURAYA_YAZ;TrustServerCertificate=True;Encrypt=False"
```

ASP.NET Core ortam değişkenlerini `appsettings.json`'ın üstüne otomatik uygular.

---

## 5. CI/CD Secret'ları (GitHub Actions)

| Secret | Kullanıldığı Yer |
|--------|-----------------|
| `TEST_SSH_HOST` | test-deploy.yml — sunucu IP |
| `TEST_SSH_PRIVATE_KEY` | test-deploy.yml — SSH deploy key |
| `JWT_SECRET` | test-deploy.yml — JWT imzalama anahtarı |
| `TEST_GHCR_PAT` | test-deploy.yml — GHCR'dan image pull için classic PAT (`read:packages` scope) |
| `TEST_GHCR_USER` | test-deploy.yml — `TEST_GHCR_PAT`'ı oluşturan GitHub kullanıcı adı |

> **US-D27-I:** Image'lar artık CI'da GHCR'a push edilir (`ghcr.io/divizyon/cargo-pilot-*:test`),
> sunucu build yapmaz, yalnızca pull eder. `TEST_GHCR_PAT` classic PAT olmalı;
> fine-grained token GHCR ile çalışmaz.

GitHub → Settings → Secrets and variables → Actions altında yönetilir.

---

## 6. Google OAuth ve Resend Yapılandırması

### Google OAuth (US-D32-C)

| Değişken | Kapsam | Açıklama |
|----------|--------|----------|
| `GOOGLE_CLIENT_ID` | Backend runtime | Google Cloud Console → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Backend runtime | Google Cloud Console → OAuth 2.0 Client Secret |
| `VITE_OAUTH_GOOGLE_URL` | Frontend build-time | Frontend'de Google butonu için OAuth başlatma URL'si |

- `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` sunucudaki `.env.test` / `.env.prod` dosyalarında tutulur.
- `VITE_OAUTH_GOOGLE_URL` de aynı env dosyasında tanımlanır; frontend image build sırasında baked-in olur.
- Tanımlanmazsa login ekranındaki Google butonu pasif kalır (`opacity-50`, tıklanamaz).
- Değerler repoya commit edilmez.

### Resend E-posta (US-D33)

| Değişken | Kapsam | Açıklama |
|----------|--------|----------|
| `RESEND_API_KEY` | Backend runtime | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Backend runtime | Gönderici e-posta adresi |
| `RESEND_FROM_NAME` | Backend runtime | Gönderici görünen adı |
| `PASSWORD_RESET_FRONTEND_URL` | Backend runtime | Şifre sıfırlama e-postasındaki link |

- `RESEND_API_KEY` sunucudaki `.env.*` dosyalarında tutulur; repoya commit edilmez.
- Domain doğrulanana kadar `RESEND_FROM_EMAIL` olarak yalnızca `onboarding@resend.dev` kullanılabilir ve yalnızca hesap sahibinin e-posta adresine gönderim yapılabilir.
- Domain doğrulandıktan sonra gerçek gönderici adresi (`noreply@cargopilot.divizyon.org` vb.) kullanılabilir.

---

## 7. Güvenlik İhlali Durumunda

Bir secret repoya commit edildiyse:

1. **Parolayı hemen döndür** (rotate) — sunucu/servis üzerinde değiştir
2. **Commit geçmişinden temizle:** `git filter-repo` veya `BFG Repo Cleaner` kullan
3. **GitHub Support'a bildir** (gerekirse cached view temizleme için)
4. **Tüm ekip üyelerini bilgilendir** — yerel klonlar eski geçmişi içerir

> ⚠️ `git rm` veya dosyayı düzeltmek geçmişten silmez. Parolayı döndürmek zorunludur.

---

## 8. Mevcut Durum (2026-05-10)

| Bulgu | Durum |
|-------|-------|
| `appsettings.Development.json` — SA parolası repoya commit edilmişti | ✅ Placeholder ile değiştirildi |
| `appsettings.Development.json` — Seed parolası `Admin123!` commit edilmişti | ✅ Belgelenmiş default `Admin@CargoPilot1!` ile değiştirildi |
| `.env.monitoring.test` — Grafana parolası repoya girmedi | ✅ `.gitignore` kapsamında |
| Sunucudaki SA parolası | ⚠️ Döndürülmesi önerilir (git geçmişinde görünür) |
| Google OAuth CLIENT_ID / CLIENT_SECRET | ✅ Sunucudaki `.env.test`'e eklendi; repoya girmedi |
| Resend API Key | ✅ Sunucudaki `.env.test`'e eklendi; repoya girmedi |
| Resend domain doğrulaması | ⚠️ Henüz yapılmadı; `onboarding@resend.dev` ile sınırlı gönderim |
