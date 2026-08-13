# Secret Yönetimi

**Son güncelleme:** 2026-08-13 · **Durum:** Aktif · **Görev:** US-D23-S

Bu doküman repoya girmemesi gereken secret'ları, ortam dosyalarının konumunu, GHCR/CI-CD secret'larını ve bir secret ihlali durumunda izlenecek adımları açıklar.

---

## Temel Kural

{% hint style="danger" %}
**Repoya secret commit edilmez.**

Şunlar asla repoya girmemeli: veritabanı parolaları, MinIO key'leri, Grafana admin parolası, JWT secret, API key'leri.
{% endhint %}

---

## Ortam Dosyaları

| Dosya | Repoda? | İçerik |
|-------|---------|--------|
| `infra/env/.env.test.example` | ✅ | Placeholder değerler |
| `infra/env/.env.prod.example` | ✅ | Placeholder değerler |
| `infra/env/.env.monitoring.test.example` | ✅ | Placeholder değerler |
| `infra/env/.env.monitoring.prod.example` | ✅ | Placeholder değerler |
| `infra/env/.env.test` | ❌ | `.gitignore` kapsamında |
| `infra/env/.env.prod` | ❌ | `.gitignore` kapsamında |
| `infra/env/.env.monitoring.*` | ❌ | `.gitignore` kapsamında |

Gerçek değerler sunucuda `/opt/cargo-pilot/infra/env/` altında saklanır.

---

## GHCR Package Erişimi

**Durum (2026-05-10):** Package'lar **public** yapıldı.

| Package | Visibility |
|---------|------------|
| `ghcr.io/divizyon/cargo-pilot-backend` | 🌐 Public |
| `ghcr.io/divizyon/cargo-pilot-frontend` | 🌐 Public |
| `ghcr.io/divizyon/cargo-pilot-dotnet-sdk` | 🌐 Public |
| `ghcr.io/divizyon/cargo-pilot-dotnet-aspnet` | 🌐 Public |

{% hint style="success" %}
Geliştiricilerin GHCR'a login olmasına veya PAT oluşturmasına **gerek yoktur.** `docker compose pull` doğrudan çalışır.
{% endhint %}

---

## Backend Local Geliştirme

`appsettings.Development.json` repoda tutulur ama yalnızca **placeholder** içerir:

```json
"Password=<REPLACE_WITH_LOCAL_SA_PASSWORD>"
```

Gerçek local SA parolasını buraya **yazma.** Bunun yerine:

{% tabs %}
{% tab title="Yöntem A — Local JSON (Önerilir)" %}
```bash
# CargoPilot.WebAPI/ dizininde oluştur:
cat > appsettings.Development.Local.json << 'EOF'
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1434;Database=CargoPilotTest;User Id=sa;Password=GERCEK_PAROLA;TrustServerCertificate=True;Encrypt=False"
  },
  "Seed": {
    "DefaultAdminPassword": "GERCEK_ADMIN_PAROLA"
  }
}
EOF
```

`appsettings.*.Local.json` pattern'i `apps/backend/.gitignore` tarafından dışlanır.

`Program.cs`'e şu satırı ekle:

```csharp
builder.Configuration
    .AddJsonFile("appsettings.Development.Local.json", optional: true, reloadOnChange: true);
```
{% endtab %}

{% tab title="Yöntem B — Ortam Değişkeni" %}
```bash
export ConnectionStrings__DefaultConnection=\
  "Server=localhost,1434;Database=CargoPilotTest;User Id=sa;Password=PAROLA;TrustServerCertificate=True;Encrypt=False"
```

ASP.NET Core ortam değişkenlerini `appsettings.json` üstüne otomatik uygular.
{% endtab %}
{% endtabs %}

---

## CI/CD Secret'ları (GitHub Actions)

GitHub → Settings → Secrets and variables → Actions

### Sunucu erişimi

| Secret | Nerede kullanılıyor | Ne işe yarar |
|--------|---------------------|--------------|
| `TEST_SSH_HOST` | `test-deploy.yml` (deploy + health check), `rollback.yml` | Test sunucusunun IP'si |
| `TEST_SSH_PRIVATE_KEY` | `test-deploy.yml`, `rollback.yml` | Test sunucusuna SSH deploy key'i |
| `PROD_SSH_HOST` | `rollback.yml` | Prod sunucusu IP'si — **henüz tanımlı değil**, prod stack kurulmadı |
| `PROD_SSH_PRIVATE_KEY` | `rollback.yml` | Prod SSH deploy key'i — **henüz tanımlı değil** |

### Geçici stack (runner içi doğrulama)

Bu değerler `test-deploy.yml`'in `deploy` job'unda runner üzerinde ayağa kaldırılan geçici
stack'e verilir. Hepsinin workflow'da CI fallback'i vardır; secret tanımlı değilse doğrulama
yine de koşar.

| Secret | Nerede kullanılıyor | Ne işe yarar |
|--------|---------------------|--------------|
| `TEST_MSSQL_SA_PASSWORD` | `test-deploy.yml` → `MSSQL_SA_PASSWORD` | Geçici MSSQL container'ının `sa` parolası |
| `TEST_MINIO_ROOT_USER` | `test-deploy.yml` → `MINIO_ROOT_USER` | Geçici MinIO root kullanıcısı |
| `TEST_MINIO_ROOT_PASSWORD` | `test-deploy.yml` → `MINIO_ROOT_PASSWORD` | Geçici MinIO root parolası |
| `SEED_DEFAULT_ADMIN_PASSWORD` | `test-deploy.yml` → `Seed__DefaultAdminPassword` | Seed edilen varsayılan admin kullanıcısının parolası |
| `JWT_SECRET` | `test-deploy.yml` | JWT imzalama anahtarı (en az 32 karakter) |
| `RESEND_API_KEY` | `test-deploy.yml` | Resend e-posta API anahtarı |
| `RESEND_FROM_EMAIL` | `test-deploy.yml` | Gönderici e-posta adresi |
| `RESEND_FROM_NAME` | `test-deploy.yml` | Gönderici adı |
| `PASSWORD_RESET_FRONTEND_URL` | `test-deploy.yml` | Şifre sıfırlama linkinin frontend adresi |
| `EMAIL_CHANGE_FRONTEND_CONFIRM_URL` | `test-deploy.yml` | E-posta değişikliği onay linkinin frontend adresi |

{% hint style="info" %}
Sunucudaki gerçek çalışma değerleri bu secret'lardan değil,
`/opt/cargo-pilot/infra/env/.env.test` dosyasından gelir. CI secret'ları yalnızca geçici
doğrulama stack'ini besler.
{% endhint %}

### Frontend build-time (VITE)

| Secret | Nerede kullanılıyor | Ne işe yarar |
|--------|---------------------|--------------|
| `VITE_API_BASE_URL` | `test-deploy.yml` (`build` + `deploy` job'larının frontend build-arg'ı) | Frontend'in çağıracağı API kök adresi |
| `VITE_OAUTH_GOOGLE_URL` | `test-deploy.yml` frontend build-arg | Google OAuth başlatma URL'si |
| `VITE_OAUTH_MICROSOFT_URL` | `test-deploy.yml` frontend build-arg | Microsoft OAuth başlatma URL'si |

{% hint style="warning" %}
`VITE_*` değerleri **secret sınıfı değildir.** Vite bunları build sırasında bundle'a gömer;
değerler hem tarayıcıya inen JS'te hem de public GHCR imajının içinde görünür. Bunları repo
**variable**'ına taşımak önerilir — secret olarak tutmak yanlış bir gizlilik beklentisi yaratır.
{% endhint %}

### Otomasyon

| Secret | Nerede kullanılıyor | Ne işe yarar |
|--------|---------------------|--------------|
| `PROMOTION_PAT` | `promote.yml` (Terfi workflow'u) | Terfi PR'ını merge eder. `GITHUB_TOKEN` ile yapılan merge hedef daldaki push-tetiklemeli workflow'ları (deploy, sürüm etiketi) tetiklemediği için ayrı bir PAT zorunludur |
| `GITHUB_TOKEN` | `test-deploy.yml`, `ci.yml`, `promote.yml`, `release-tag.yml`, `cache-cleanup.yml`, `sync-base-images.yml` | GitHub tarafından otomatik sağlanır; GHCR login ve API çağrıları için kullanılır. Manuel tanımlanmaz |

### Kaldırılan secret'lar

| Secret | Durum |
|--------|-------|
| `TEST_GHCR_PAT` | ❌ Kaldırıldı. Package'lar public yapıldığında PAT login `test-deploy.yml`'den çıkarıldı (#483, 2026-05-10); workflow artık GHCR'a `secrets.GITHUB_TOKEN` ile giriyor. Secret 2026-08-13'te repodan silindi |
| `TEST_GHCR_USER` | ❌ Kaldırıldı — aynı gerekçe, 2026-08-13'te repodan silindi |

{% hint style="info" %}
**GitHub Environment'ları (2026-08-13):** Repoda `test` ve `prod` environment'ları oluşturuldu;
`prod` required-reviewer onayı ile korunuyor. SSH secret'larının repo seviyesinden ilgili
environment seviyesine taşınması önerilir — **henüz yapılmadı**, secret'lar hâlâ repo seviyesinde.
{% endhint %}

---

## Google OAuth & Resend

### Google OAuth

| Değişken | Kapsam | Açıklama |
|----------|--------|----------|
| `GOOGLE_CLIENT_ID` | Backend runtime | Google Cloud Console → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Backend runtime | Google Cloud Console → OAuth 2.0 Client Secret |
| `VITE_OAUTH_GOOGLE_URL` | Frontend build-time | Google butonu OAuth başlatma URL'si |

### Resend E-posta

| Değişken | Kapsam | Açıklama |
|----------|--------|----------|
| `RESEND_API_KEY` | Backend runtime | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Backend runtime | Gönderici e-posta adresi |
| `RESEND_FROM_NAME` | Backend runtime | Gönderici adı |
| `PASSWORD_RESET_FRONTEND_URL` | Backend runtime | Şifre sıfırlama linki |

{% hint style="warning" %}
Domain doğrulanana kadar `RESEND_FROM_EMAIL` olarak yalnızca `onboarding@resend.dev` kullanılabilir ve yalnızca hesap sahibinin adresine gönderilebilir.
{% endhint %}

---

## Güvenlik İhlali Durumunda

{% hint style="danger" %}
Bir secret repoya commit edildiyse:

1. **Parolayı hemen döndür (rotate)** — sunucu veya servis üzerinde değiştir
2. **Commit geçmişinden temizle** — `git filter-repo` veya `BFG Repo Cleaner`
3. **GitHub Support'a bildir** — cache view temizleme gerekebilir
4. **Tüm ekibi bilgilendir** — yerel klonlar eski geçmişi içerir

`git rm` veya dosyayı düzeltmek geçmişten silmez. **Parolayı döndürmek zorunludur.**
{% endhint %}

---

## Mevcut Durum

| Bulgu | Durum |
|-------|-------|
| `appsettings.Development.json` SA parolası | ✅ Placeholder ile değiştirildi |
| SA parolası git geçmişinde | ⚠️ Döndürülmesi önerilir |
| `.env.monitoring.*` dosyaları | ✅ `.gitignore` kapsamında |
| Google OAuth credentials | ✅ Sunucudaki `.env.test`'te, repoya girmedi |
| Resend API Key | ✅ Sunucudaki `.env.test`'te, repoya girmedi |
| Resend domain doğrulaması | ⚠️ Henüz yapılmadı |
