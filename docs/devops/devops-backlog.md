# DevOps Backlog — Audit & İyileştirme Takibi

**Oluşturulma:** 2026-05-10  
**Son Güncelleme:** 2026-05-10  
**Sorumlu:** DevOps Chapter Lead

Bu doküman, 2026-05-10 tarihinde gerçekleştirilen kapsamlı DevOps audit sonucunda tespit edilen tüm uyumsuzlukları, eksikleri, güncellenmesi gereken alanları ve yeni ihtiyaçları kategorilere göre listeler. Her madde tamamlandıkça durumu güncellenir.

---

## Kategori 1 — Uyumsuzluklar (Prod / Test Farkları)

### 1.1 `docker-compose.prod.yml` — GHCR image desteği yok
**Durum:** ✅ Tamamlandı — PR #488

`docker-compose.prod.yml`'e backend ve frontend için `image: ghcr.io/${GHCR_OWNER:-divizyon}/cargo-pilot-{service}:${IMAGE_TAG:-prod}` eklendi. `build:` alanı local build fallback olarak korundu. Prod pipeline hazır olduğunda `docker compose pull` ile GHCR'dan çekilebilir.

---

### 1.2 `docker-compose.prod.yml` — Backend healthcheck yok
**Durum:** ⚠️ Açık

Test'te backend için healthcheck tanımlı. Prod'da backend service'inde `healthcheck:` bloğu eksik.

**Etki:** Prod'da container ayağa kalksa bile backend hazır olmadan dependent service'ler başlayabilir; deploy sonrası sağlık doğrulaması yapılamaz.  
**Çözüm:** Test compose ile aynı `healthcheck:` bloğu prod'a eklenmeli.

---

### 1.3 `docker-compose.prod.yml` — MSSQL healthcheck env var uyumsuzluğu
**Durum:** ⚠️ Açık

Test'te: `MSSQL_SA_PASSWORD: ${MSSQL_SA_PASSWORD}` + healthcheck'te `$${MSSQL_SA_PASSWORD}`  
Prod'da: `SA_PASSWORD: ${MSSQL_SA_PASSWORD}` ama healthcheck'te `$${SA_PASSWORD}` — env var adı farklı.

**Etki:** Prod MSSQL healthcheck'i daima fail edebilir, bağımlı servisler başlamaz.  
**Çözüm:** Prod'da `SA_PASSWORD` ile `MSSQL_SA_PASSWORD`'u hizala; healthcheck komutundaki değişken adını güncelle.

---

### 1.4 `docker-compose.prod.yml` — OAuth, CORS, Resend env vars eksik
**Durum:** ⚠️ Açık

Backend servisinde test'te olan aşağıdaki env var'lar prod'da yok:
- `OAuth__Google__ClientId`, `OAuth__Google__ClientSecret`, `OAuth__Google__CallbackUrl`, `OAuth__Google__FrontendCallbackUrl`
- `Cors__AllowedOrigins__0`
- `Resend__ApiKey`, `Resend__FromEmail`, `Resend__FromName`
- `PasswordReset__FrontendResetUrl`
- `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD`

**Etki:** Prod'da Google OAuth, e-posta gönderimi ve CORS ayarları çalışmaz.  
**Çözüm:** Test compose'daki tüm backend env var'ları prod'a da eklenmeli; `.env.prod.example` da güncellenmeli.

---

### 1.5 `apps/frontend/nginx.conf` — `/api` proxy trailing slash farkı
**Durum:** ✅ Tamamlandı — PR #442 (bugfix/chore-nginx-api-proxy-test)

`apps/frontend/nginx.conf`'taki `location /api` → `location /api/` olarak güncellendi. Host nginx ve container nginx hizalandı.

---

### 1.6 `docs/setup/local-setup.md` — Branch açma komutu yanlış
**Durum:** ✅ Tamamlandı — PR #480

`local-setup.md`'deki branch komutu `origin/dev` → `origin/test` olarak düzeltildi.

---

### 1.7 `docs/setup/local-setup.md` — GHCR login artık gerekmiyor
**Durum:** ✅ Tamamlandı — PR #480

GHCR PAT notu kaldırıldı. Package'lar public yapıldığından developer login gerektirmez bilgisi eklendi.

---

## Kategori 2 — Eksikler (Hiç Yapılmamış)

### 2.1 Production Stack Deploy Edilmedi
**Durum:** ⚠️ Açık — Kritik

Sunucuda production ortamı hiç kurulmamış. `.env.prod` dosyası yok, `docker-compose.prod.yml` hiç çalıştırılmamış.

**Etki:** `https://cargopilot.divizyon.org`'da yalnızca test ortamı çalışıyor; production DB ve storage başlatılmamış.  
**Çözüm:** `.env.prod.example` → `.env.prod` oluşturulmalı, değerler doldurulmalı, `docker-compose.prod.yml` ayağa kaldırılmalı.  
**Bkz.:** [server-requirements.md](server-requirements.md)

---

### 2.2 Production CI/CD Pipeline Yok
**Durum:** ⚠️ Açık — Kritik

`test-deploy.yml`'de yalnızca test ortamına deploy var. `main` branch'e merge sonrası production'a otomatik deploy yapan bir job yok.

**Etki:** Production'a deploy tamamen manuel yapılmak zorunda; `main`'e merge otomasyonu sağlanmamış.  
**Çözüm:** `main`'e push tetikleyicisi ile prod image build + GHCR push + sunucuya SSH deploy yapan bir job eklenmeli. `PROD_SSH_HOST` ve `PROD_SSH_PRIVATE_KEY` GitHub secrets'a eklenmeli.

---

### 2.3 Production için GHCR Image Pipeline Yok
**Durum:** ⚠️ Açık

Test için `ghcr.io/divizyon/cargo-pilot-backend:test` tag'i CI'da push ediliyor. Production için `:prod` veya `:{git-tag}` tag'i push edilmiyor.

**Etki:** `docker-compose.prod.yml`'e `image:` alanı eklendi (madde 1.1) ancak bu image'ı GHCR'a push eden CI job'u henüz yok.  
**Çözüm:** `main`'e push'ta image'ların `:prod` ve `:prod-{sha}` olarak GHCR'a push edilmesi sağlanmalı.

---

### 2.4 Grafana Alert Bildirim Kanalı (Contact Point) Yok
**Durum:** ⚠️ Açık

3 alert kuralı provisioning ile yüklü (5xx hataları, error log, backend health). Ancak `contact-points.yml` dosyası yok — alertler tetiklense de e-posta/Slack/webhook'a bildirim gitmiyor.

**Etki:** Backend çöktüğünde ekip haberdar edilemiyor.  
**Çözüm:** `infra/docker/grafana/provisioning/alerting/contact-points.yml` oluşturulmalı. Kanal kararı (e-posta/Slack/webhook) alınmalı.

---

### 2.5 `test` Branch'ine Direct Push Koruması Eksik
**Durum:** ✅ Tamamlandı — GitHub API ile uygulandı

`test` branch'ine branch protection kuralı GitHub API üzerinden eklendi. PR zorunluluğu ve required status check'ler (`Test PR Dev Kontrolü`, `Image Build`, `Deploy (Test)`) aktif.

---

### 2.6 MSSQL SA Parolası Git Geçmişinde
**Durum:** ⚠️ Açık — Güvenlik

`appsettings.Development.json`'da eski SA parolası repoya commit edilmişti. Dosya güncellendi ama git geçmişinde hala görünür.

**Etki:** Geçmişe erişimi olan biri parolayı görebilir.  
**Çözüm:** Sunucudaki SA parolası döndürülmeli (rotate). Geçmiş temizliği için `git filter-repo` gerekebilir ancak tüm ekibin klonunu güncellemesi gerekir. Minimum aksyon: **parolayı döndür**.

---

### 2.7 Resend Domain Doğrulaması Tamamlanmadı
**Durum:** ⚠️ Açık

`cargopilot.divizyon.org` Resend'de doğrulanmamış. Gönderici `onboarding@resend.dev` ile sınırlı.

**Etki:** Production kullanıcılarına şifre sıfırlama e-postası gönderilemez.  
**Çözüm:** resend.com → Domains → `divizyon.org` için DNS kayıtları eklenmeli. `RESEND_FROM_EMAIL` güncellenmeli.

---

### 2.8 SSL Sertifikası Self-Signed
**Durum:** ℹ️ Dikkat

`infra/nginx/cargopilot-test.conf`'ta self-signed sertifika kullanılıyor. Cloudflare Full SSL modu ile şimdilik çalışıyor.

**Etki:** Cloudflare önünden geçilmeden erişimde güvensiz bağlantı uyarısı; Cloudflare Full (Strict) mod kullanılamıyor.  
**Çözüm:** Cloudflare Origin Certificate veya Let's Encrypt sertifikası kullanılmalı. Strict SSL modu aktif edilmeli.

---

## Kategori 3 — Güncellenmesi Gerekenler

### 3.1 `docs/setup/local-setup.md` — Vite Dev Proxy Belgelenmemiş
**Durum:** ✅ Tamamlandı — PR #480

`local-setup.md`'ye "Frontend Vite ile, Backend Docker'da" başlıklı bölüm eklendi. `VITE_DEV_PROXY_TARGET` kullanımı ve port tablosu belgelendi.

---

### 3.2 `infra/env/.env.test.example` — `VITE_DEV_PROXY_TARGET` eksik
**Durum:** ✅ Tamamlandı — PR #480

`.env.test.example`'a `VITE_DEV_PROXY_TARGET=http://localhost:8081` eklendi.

---

### 3.3 `docs/devops/secret-management.md` — GHCR packages public bilgisi yok
**Durum:** ✅ Tamamlandı — PR #480

`secret-management.md`'ye GHCR public package bilgisi ve developer'ların login gerektirmediğine dair bölüm eklendi.

---

### 3.4 `PRODUCTION_DEPLOYMENT_INFO.md` — Güncel değil
**Durum:** ⚠️ Açık

Doküman prod stack'in kurulmadığını belirtiyor ancak prod deploy prosedürü, gerekli secrets ve adım adım checklist eksik.

**Çözüm:** Prod deploy checklist'i eklenmeli; `PROD_SSH_HOST`, `PROD_SSH_PRIVATE_KEY` secrets'larının eklenmesi gerektiği belirtilmeli.

---

### 3.5 `docs/devops/monitoring-setup.md` — Contact point ekleme adımları eksik
**Durum:** ⚠️ Açık

Doküman "bildirim kanalı tanımlanmadı" diyor ama nasıl ekleneceği anlatılmamış.

**Çözüm:** `contact-points.yml` örneği ve Grafana UI'dan manuel ekleme adımları belgelenmeli.

---

### 3.6 `infra/scripts/rollback.sh` — Test ortamında local build yapıyordu
**Durum:** ✅ Tamamlandı — PR #484

`rollback.sh` test ortamında `--build` yerine GHCR'dan `test-{sha}` immutable tag çekecek şekilde güncellendi. Prod ortamı için `--build` davranışı korundu (prod pipeline hazır değil).

---

### 3.7 Node.js 20 → 22 Geçişi (CI)
**Durum:** ℹ️ Öneri

`ci.yml` ve `Dockerfile`'da Node.js 20 kullanılıyor. Node.js 20 EOL yaklaşıyor (2026-04). Node.js 22 LTS aktif.

**Çözüm:** `ci.yml`'de `node-version: '22'`, `Dockerfile`'da `FROM node:22-slim` olarak güncellenmeli. Build ve testlerin 22 ile geçtiği doğrulanmalı.

---

### 3.8 `TEST_GHCR_PAT` Sona Erme Tarihi Takibi
**Durum:** ✅ Çözüldü — PR #483

GHCR package'lar public yapıldığından `test-deploy.yml`'deki PAT login adımı kaldırıldı. `TEST_GHCR_PAT` ve `TEST_GHCR_USER` secret'larına artık ihtiyaç yoktur.

---

## Kategori 4 — GHCR Yapısı İyileştirmeleri (2026-05-10 Audit)

### 4.1 GHCR — Immutable tag yok, rollback riskli
**Durum:** ✅ Tamamlandı — PR #483

`test-deploy.yml` build job'u artık her push'ta hem `:test` (mutable/latest) hem `:test-{7-char-sha}` (immutable) tag'i GHCR'a push ediyor. Deploy job `IMAGE_TAG` output'u ile immutable tag'i sunucuya taşıyor.

---

### 4.2 GHCR — Deploy'da PAT login
**Durum:** ✅ Tamamlandı — PR #483

Package'lar public yapıldığından `deploy-test-server` job'undaki GHCR PAT login adımı kaldırıldı. Sunucu artık login olmadan image çekiyor.

---

### 4.3 GHCR — `sync-base-images.yml` eski branch trigger
**Durum:** ✅ Tamamlandı — PR #485

Artık kullanılmayan `bugfix/INC-003-mcr-rate-limit-fix` branch push tetikleyicisi kaldırıldı.

---

### 4.4 GHCR — Base image'larda immutable tarih etiketi yok
**Durum:** ✅ Tamamlandı — PR #485

`sync-base-images.yml` artık `:8.0` floating tag yanında `:8.0-YYYYMMDD` immutable tarih etiketi de push ediyor.

---

### 4.5 GHCR — `.env.test.example`'da `GHCR_OWNER` ve `IMAGE_TAG` eksik
**Durum:** ✅ Tamamlandı — PR #486

`.env.test.example`'a `GHCR_OWNER=divizyon` ve `IMAGE_TAG=test` eklendi. Rollback kullanımı ve CI davranışı açıklandı.

---

### 4.6 GHCR — CI `docker-build` job'unda GHA cache yok
**Durum:** ✅ Tamamlandı — PR #487

`ci.yml`'deki `docker-build` job'u `docker/build-push-action@v6` + `docker/setup-buildx-action@v3` ile yenilendi. GHA cache (`scope: cargo-pilot-backend-ci` / `frontend-ci`) eklendi.

---

## Kategori 5 — Operasyonel İyileştirmeler

### 5.1 GHA Cache Birikimi — 10 GB Limitine Yaklaşma
**Durum:** ✅ Tamamlandı — PR #489 / #492

`cache-cleanup.yml` workflow'u eklendi:
- PR kapanınca (merge/close): `refs/pull/<n>/merge` ve `refs/pull/<n>/head` cache'leri anında silinir (sadece aynı repo PR'ları, fork koruması mevcut)
- Her Pazartesi 03:00 UTC: orphan branch cache'leri + 7 günden eski cache'ler temizlenir
- Tab-delimited jq çıktısı ile ref null durumunda awk kayması önlendi

---

### 5.2 `dev` Branch'i Test'in Gerisine Düştü
**Durum:** ✅ Çözüldü — PR #493

`US-REP-04` (#482) dev'i atlayarak doğrudan test'e merge edilmesinden kaynaklanan uyumsuzluk `sync/test-to-dev` PR'ı ile giderildi.

**Süreç Kuralı:** Feature branch'ler her zaman önce `dev`'e, ardından aynı branch'ten `test`'e PR açılmalı. `sync/` branch'leri `enforce-test-base` kontrolünü atlasa da bu kural sağlıklı geçmiş için zorunludur.

---

## Öncelik Matrisi

| # | Madde | Kategori | Öncelik | Durum |
|---|-------|----------|---------|-------|
| 1 | Production Stack Deploy | Eksik | 🔴 Kritik | ⚠️ Açık |
| 2 | Production CI/CD Pipeline | Eksik | 🔴 Kritik | ⚠️ Açık |
| 3 | Prod GHCR Image Pipeline | Eksik | 🔴 Kritik | ⚠️ Açık |
| 4 | `docker-compose.prod.yml` — healthcheck, OAuth/CORS/Resend env | Uyumsuzluk | 🔴 Kritik | ⚠️ Açık |
| 5 | MSSQL SA Parolası Döndürme | Güvenlik | 🔴 Güvenlik | ⚠️ Açık |
| 6 | Grafana Alert Contact Point | Eksik | 🟠 Yüksek | ⚠️ Açık |
| 7 | Resend Domain Doğrulaması | Eksik | 🟠 Yüksek | ⚠️ Açık |
| 8 | SSL — self-signed → gerçek sertifika | Eksik | 🟡 Orta | ⚠️ Açık |
| 9 | `PRODUCTION_DEPLOYMENT_INFO.md` güncelle | Güncelleme | 🟡 Orta | ⚠️ Açık |
| 10 | `monitoring-setup.md` — contact point adımları | Güncelleme | 🟡 Orta | ⚠️ Açık |
| 11 | Node.js 20 → 22 geçişi | Güncelleme | 🟢 Düşük | ⚠️ Açık |

---

## Tamamlananlar

| Tarih | Madde | PR / Aksiyon |
|-------|-------|--------------|
| 2026-05-10 | Nginx `/api` proxy — frontend container'da CORS kökten çözüldü | #440 |
| 2026-05-10 | `VITE_API_BASE_URL` build arg `:-` → `-` | #440 |
| 2026-05-10 | GHCR packages public yapıldı | GitHub org ayarı |
| 2026-05-10 | `CORS_ALLOWED_ORIGIN_1` workaround kaldırıldı | #442 |
| 2026-05-10 | nginx.conf trailing slash hizalandı | #442 |
| 2026-05-10 | `local-setup.md` branch komutu düzeltildi, Vite proxy belgelendi | #480 |
| 2026-05-10 | `.env.test.example` — `VITE_DEV_PROXY_TARGET` eklendi | #480 |
| 2026-05-10 | `secret-management.md` — GHCR public bölümü eklendi | #480 |
| 2026-05-10 | `test` branch direct push koruması eklendi | GitHub API |
| 2026-05-10 | GHCR immutable tag (`test-{sha}`) + PAT login kaldırıldı | #483 |
| 2026-05-10 | `rollback.sh` test ortamında GHCR pull kullanıyor | #484 |
| 2026-05-10 | `sync-base-images.yml` eski trigger silindi + tarih etiketi eklendi | #485 |
| 2026-05-10 | `.env.test.example` — `GHCR_OWNER`, `IMAGE_TAG` eklendi | #486 |
| 2026-05-10 | CI `docker-build` — buildx + GHA cache eklendi | #487 |
| 2026-05-10 | `docker-compose.prod.yml` — GHCR image referansı eklendi | #488 |
| 2026-05-10 | GHA cache cleanup workflow eklendi | #489 / #492 |
| 2026-05-10 | `dev` branch test ile hizalandı | #493 |
