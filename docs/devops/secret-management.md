# Secret Yönetimi

**Son güncelleme:** 2026-04-25 · **Durum:** Aktif · **Görev:** US-D23-S

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

| Secret | Kullanım |
|--------|---------|
| `TEST_SSH_HOST` | Sunucu IP |
| `TEST_SSH_PRIVATE_KEY` | SSH deploy key |
| `JWT_SECRET` | JWT imzalama anahtarı |
| `TEST_GHCR_PAT` | GHCR image pull (classic PAT, `read:packages`) |
| `TEST_GHCR_USER` | PAT sahibi GitHub kullanıcı adı |
| `VITE_API_BASE_URL` | Frontend build-time API URL |
| `VITE_OAUTH_GOOGLE_URL` | Frontend build-time Google OAuth URL |

{% hint style="info" %}
`TEST_GHCR_PAT` classic PAT olmalıdır. Fine-grained token GHCR ile çalışmaz.
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
