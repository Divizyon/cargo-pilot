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

## 3. Backend Geliştirme (Local .NET)

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

## 4. CI/CD Secret'ları (GitHub Actions)

| Secret | Kullanıldığı Yer |
|--------|-----------------|
| `TEST_SSH_HOST` | test-deploy.yml — sunucu IP |
| `TEST_SSH_PRIVATE_KEY` | test-deploy.yml — SSH deploy key |
| `TEST_MSSQL_SA_PASSWORD` | test-deploy.yml — test DB parolası |
| `TEST_MINIO_ROOT_USER` | test-deploy.yml — test MinIO kullanıcısı |
| `TEST_MINIO_ROOT_PASSWORD` | test-deploy.yml — test MinIO parolası |
| `SEED_DEFAULT_ADMIN_PASSWORD` | test-deploy.yml — seed admin parolası |

GitHub → Settings → Secrets and variables → Actions altında yönetilir.
CI secret yoksa fallback değerler devreye girer (sadece CI ortamı için geçerli, prod için kullanılmaz).

---

## 5. Güvenlik İhlali Durumunda

Bir secret repoya commit edildiyse:

1. **Parolayı hemen döndür** (rotate) — sunucu/servis üzerinde değiştir
2. **Commit geçmişinden temizle:** `git filter-repo` veya `BFG Repo Cleaner` kullan
3. **GitHub Support'a bildir** (gerekirse cached view temizleme için)
4. **Tüm ekip üyelerini bilgilendir** — yerel klonlar eski geçmişi içerir

> ⚠️ `git rm` veya dosyayı düzeltmek geçmişten silmez. Parolayı döndürmek zorunludur.

---

## 6. Mevcut Durum (2026-04-25)

| Bulgu | Durum |
|-------|-------|
| `appsettings.Development.json` — SA parolası repoya commit edilmişti | ✅ Placeholder ile değiştirildi |
| `appsettings.Development.json` — Seed parolası `Admin123!` commit edilmişti | ✅ Belgelenmiş default `Admin@CargoPilot1!` ile değiştirildi |
| `.env.monitoring.test` — Grafana parolası repoya girmedi | ✅ `.gitignore` kapsamında |
| Sunucudaki SA parolası | ⚠️ Döndürülmesi önerilir (git geçmişinde görünür) |
