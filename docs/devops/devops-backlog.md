# DevOps Backlog

**Oluşturulma:** 2026-05-10 | **Son güncelleme:** 2026-05-16\
**Sorumlu:** DevOps Chapter Lead

---

## Öncelik Matrisi

| # | Madde | Öncelik | Durum |
|---|-------|---------|-------|
| 1 | Production Stack Deploy | 🔴 Kritik | ⚠️ Açık |
| 2 | Production CI/CD Pipeline | 🔴 Kritik | ⚠️ Açık |
| 3 | Prod GHCR Image Pipeline | 🔴 Kritik | ⚠️ Açık |
| 4 | `docker-compose.prod.yml` — healthcheck, OAuth/CORS/Resend env | 🔴 Kritik | ⚠️ Açık |
| 5 | MSSQL SA Parolası Döndürme | 🔴 Güvenlik | ⚠️ Açık |
| 6 | Grafana Alert Contact Point | 🟠 Yüksek | ⚠️ Açık |
| 7 | Resend Domain Doğrulaması | 🟠 Yüksek | ⚠️ Açık |
| 8 | SSL — self-signed → gerçek sertifika | 🟡 Orta | ⚠️ Açık |
| 9 | `PRODUCTION_DEPLOYMENT_INFO.md` güncelle | 🟡 Orta | ⚠️ Açık |
| 10 | `monitoring-setup.md` — contact point adımları | 🟡 Orta | ⚠️ Açık |
| 11 | Node.js 20 → 22 geçişi | 🟢 Düşük | ⚠️ Açık |

---

## Kategori 1 — Uyumsuzluklar (Prod / Test Farkları)

### 1.1 `docker-compose.prod.yml` — GHCR image desteği

{% hint style="success" %}
**✅ Tamamlandı — PR #488**
{% endhint %}

`docker-compose.prod.yml`'e backend ve frontend için GHCR image referansı eklendi.

---

### 1.2 `docker-compose.prod.yml` — Backend healthcheck yok

{% hint style="warning" %}
**⚠️ Açık**
{% endhint %}

Test'te backend için healthcheck tanımlı. Prod'da `healthcheck:` bloğu eksik.

**Etki:** Container ayağa kalksa bile backend hazır olmadan dependent servisler başlayabilir.\
**Çözüm:** Test compose ile aynı `healthcheck:` bloğu prod'a eklenmeli.

---

### 1.3 `docker-compose.prod.yml` — MSSQL healthcheck env var uyumsuzluğu

{% hint style="warning" %}
**⚠️ Açık**
{% endhint %}

Test'te `MSSQL_SA_PASSWORD`, prod'da `SA_PASSWORD` kullanılıyor — healthcheck komutuyla uyumsuz.

**Etki:** Prod MSSQL healthcheck daima fail edebilir, bağımlı servisler başlamaz.\
**Çözüm:** `SA_PASSWORD` → `MSSQL_SA_PASSWORD` olarak hizalanmalı.

---

### 1.4 `docker-compose.prod.yml` — OAuth, CORS, Resend env var eksik

{% hint style="warning" %}
**⚠️ Açık**
{% endhint %}

Prod backend'de test'teki şu env var'lar yok:
`OAuth__Google__*`, `Cors__AllowedOrigins__0`, `Resend__*`, `PasswordReset__FrontendResetUrl`, `MSSQL_HOST/PORT/DATABASE/USER/PASSWORD`

**Etki:** Prod'da Google OAuth, e-posta ve CORS çalışmaz.\
**Çözüm:** Test compose'daki tüm backend env var'ları prod'a eklenmeli.

---

### 1.5 `apps/frontend/nginx.conf` — `/api` proxy trailing slash

{% hint style="success" %}
**✅ Tamamlandı — PR #442**
{% endhint %}

`location /api` → `location /api/` güncellendi.

---

## Kategori 2 — Eksikler (Hiç Yapılmamış)

### 2.1 Production Stack Deploy Edilmedi

{% hint style="danger" %}
**⚠️ Açık — Kritik**
{% endhint %}

Sunucuda production ortamı hiç kurulmamış. `.env.prod` yok, compose hiç çalıştırılmamış.

**Çözüm:** `.env.prod.example` → `.env.prod` oluşturulmalı, değerler doldurulmalı, prod compose ayağa kaldırılmalı.

---

### 2.2 Production CI/CD Pipeline Yok

{% hint style="danger" %}
**⚠️ Açık — Kritik**
{% endhint %}

`main` branch'e merge sonrası production'a otomatik deploy eden job yok.

**Çözüm:** `main`'e push tetikleyicisi ile prod image build + GHCR push + SSH deploy job'u eklenmeli. `PROD_SSH_HOST` ve `PROD_SSH_PRIVATE_KEY` GitHub Secrets'a eklenmeli.

---

### 2.3 Production GHCR Image Pipeline Yok

{% hint style="danger" %}
**⚠️ Açık — Kritik**
{% endhint %}

Test için `:test` tag'i push ediliyor. Production için `:prod` veya `:{git-tag}` push edilmiyor.

**Çözüm:** `main`'e push'ta image'ların `:prod` ve `:prod-{sha}` olarak GHCR'a push edilmesi sağlanmalı.

---

### 2.4 Grafana Alert Bildirim Kanalı (Contact Point) Yok

{% hint style="warning" %}
**⚠️ Açık**
{% endhint %}

3 alert kuralı mevcut. Ancak `contact-points.yml` yok — alertler tetiklense de bildirim gitmiyor.

**Çözüm:** `infra/docker/grafana/provisioning/alerting/contact-points.yml` oluşturulmalı.

---

### 2.5 `test` Branch Direct Push Koruması

{% hint style="success" %}
**✅ Tamamlandı — GitHub API ile uygulandı**
{% endhint %}

Branch protection ve required status check'ler aktif.

---

### 2.6 MSSQL SA Parolası Git Geçmişinde

{% hint style="danger" %}
**⚠️ Açık — Güvenlik**
{% endhint %}

`appsettings.Development.json`'daki eski SA parolası git geçmişinde görünür durumdadır.

**Çözüm:** SA parolasını döndür (rotate). Geçmiş temizliği için `git filter-repo` gerekebilir.

---

### 2.7 Resend Domain Doğrulaması

{% hint style="warning" %}
**⚠️ Açık**
{% endhint %}

`cargopilot.divizyon.org` Resend'de doğrulanmamış. Production kullanıcılarına şifre sıfırlama e-postası gönderilemez.

**Çözüm:** resend.com → Domains → `divizyon.org` için DNS kayıtları eklenmeli.

---

### 2.8 SSL Sertifikası Self-Signed

{% hint style="info" %}
**ℹ️ Dikkat**
{% endhint %}

Self-signed sertifika kullanılıyor. Cloudflare Full SSL modu ile şimdilik çalışıyor; Full (Strict) mod kullanılamıyor.

**Çözüm:** Cloudflare Origin Certificate veya Let's Encrypt sertifikası kullanılmalı.

---

## Kategori 3 — Güncellenmesi Gerekenler

| Madde | Durum | PR |
|-------|-------|-----|
| `local-setup.md` — Branch açma komutu düzeltildi | ✅ | #480 |
| `local-setup.md` — GHCR login artık gerekmiyor | ✅ | #480 |
| `local-setup.md` — Vite dev proxy belgelendi | ✅ | #480 |
| `.env.test.example` — `VITE_DEV_PROXY_TARGET` eklendi | ✅ | #480 |
| `secret-management.md` — GHCR public bölümü eklendi | ✅ | #480 |
| `PRODUCTION_DEPLOYMENT_INFO.md` — Prod deploy checklist eksik | ⚠️ Açık | — |
| `monitoring-setup.md` — Contact point ekleme adımları eksik | ⚠️ Açık | — |
| Node.js 20 → 22 geçişi (CI + Dockerfile) | ⚠️ Açık | — |

---

## Kategori 4 — GHCR İyileştirmeleri

| Madde | Durum | PR |
|-------|-------|-----|
| GHCR — Immutable tag (`test-{sha}`) + PAT login kaldırıldı | ✅ | #483 |
| `rollback.sh` — test ortamında GHCR pull kullanıyor | ✅ | #484 |
| `sync-base-images.yml` — eski trigger silindi + tarih etiketi eklendi | ✅ | #485 |
| `.env.test.example` — `GHCR_OWNER`, `IMAGE_TAG` eklendi | ✅ | #486 |
| CI `docker-build` — buildx + GHA cache eklendi | ✅ | #487 |
| `docker-compose.prod.yml` — GHCR image referansı eklendi | ✅ | #488 |

---

## Kategori 5 — Operasyonel İyileştirmeler

| Madde | Durum | PR |
|-------|-------|-----|
| GHA cache cleanup workflow eklendi (PR kapanınca + haftalık temizlik) | ✅ | #489/#492 |
| `dev` branch test ile hizalandı (`sync/test-to-dev`) | ✅ | #493 |

---

## Tamamlananlar (Tarih Sırası)

| Tarih | Madde | PR / Aksiyon |
|-------|-------|--------------|
| 2026-05-10 | Nginx `/api` proxy — CORS kökten çözüldü | #440 |
| 2026-05-10 | `VITE_API_BASE_URL` build arg düzeltildi | #440 |
| 2026-05-10 | GHCR packages public yapıldı | GitHub org ayarı |
| 2026-05-10 | `CORS_ALLOWED_ORIGIN_1` workaround kaldırıldı | #442 |
| 2026-05-10 | `local-setup.md` düzeltildi + Vite proxy belgelendi | #480 |
| 2026-05-10 | `test` branch direct push koruması eklendi | GitHub API |
| 2026-05-10 | GHCR immutable tag + PAT login kaldırıldı | #483 |
| 2026-05-10 | `rollback.sh` GHCR pull kullanıyor | #484 |
| 2026-05-10 | `sync-base-images.yml` güncellendi | #485 |
| 2026-05-10 | CI buildx + GHA cache | #487 |
| 2026-05-10 | `docker-compose.prod.yml` GHCR image | #488 |
| 2026-05-10 | GHA cache cleanup | #489/#492 |
| 2026-05-10 | `dev` branch hizalandı | #493 |
