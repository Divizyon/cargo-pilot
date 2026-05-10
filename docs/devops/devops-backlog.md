# DevOps Backlog — Audit & İyileştirme Takibi

**Oluşturulma:** 2026-05-10  
**Son Güncelleme:** 2026-05-10  
**Sorumlu:** DevOps Chapter Lead

Bu doküman, 2026-05-10 tarihinde gerçekleştirilen kapsamlı DevOps audit sonucunda tespit edilen tüm uyumsuzlukları, eksikleri, güncellenmesi gereken alanları ve yeni ihtiyaçları kategorilere göre listeler. Her madde tamamlandıkça durumu güncellenir.

---

## Kategori 1 — Uyumsuzluklar (Prod / Test Farkları)

### 1.1 `docker-compose.prod.yml` — GHCR image desteği yok
**Durum:** ⚠️ Açık

`docker-compose.test.yml`'de backend ve frontend GHCR'dan image çekiyor (`ghcr.io/divizyon/...`).  
`docker-compose.prod.yml`'de ise yalnızca `build:` var — GHCR image referansı yok.

**Etki:** Prod deploy edildiğinde CI build optimizasyonundan yararlanamaz, her deploy'da local build yapılır.  
**Çözüm:** `docker-compose.prod.yml`'e `image: ghcr.io/divizyon/cargo-pilot-backend:latest` ve `image: ghcr.io/divizyon/cargo-pilot-frontend:latest` eklenmeli. Prod CI pipeline ile birlikte ele alınmalı (bkz. 4.1).

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
**Durum:** ℹ️ Dikkat

`infra/nginx/cargopilot-test.conf` (host nginx): `location /api/` — trailing slash var  
`apps/frontend/nginx.conf` (container nginx): `location /api` — trailing slash yok

**Etki:** `/api` ile `/api/` davranışı Nginx'te farklıdır; bazı endpoint'lerde 301 redirect oluşabilir.  
**Çözüm:** `apps/frontend/nginx.conf`'taki `location /api`'yi `location /api/` olarak güncelle; ya da tutarlı bir karar alınarak her iki config hizalanmalı.

---

### 1.6 `docs/setup/local-setup.md` — Branch açma komutu yanlış
**Durum:** ⚠️ Açık

`local-setup.md` Bölüm 9'da şu komut var:
```bash
git checkout --no-track -b feature/US-XXX-description origin/dev
```
`BRANCHING.md`'ye göre tüm feature branch'ler `origin/test`'ten açılmalı.

**Etki:** Yeni başlayan geliştirici yanlış base'den branch açar, `enforce-test-base` CI job'u fail eder.  
**Çözüm:** `local-setup.md` Bölüm 9'daki komut `origin/test` olarak güncellenmeli.

---

### 1.7 `docs/setup/local-setup.md` — GHCR login artık gerekmiyor
**Durum:** ⚠️ Açık

`local-setup.md` Bölüm 4'te GHCR PAT gereksinimiyle ilgili not var. GHCR package'ları public yapıldığından bu bilgi artık geçersiz.

**Etki:** Gereksiz adım geliştiricileri karıştırır.  
**Çözüm:** GHCR PAT notu kaldırılmalı, yerine "image'lar public, login gerekmez" notu eklenmeli.

---

## Kategori 2 — Eksikler (Hiç Yapılmamış)

### 2.1 Production Stack Deploy Edilmedi
**Durum:** ⚠️ Açık — Kritik

Sunucuda production ortamı hiç kurulmamış. `.env.prod` dosyası yok, `docker-compose.prod.yml` hiç çalıştırılmamış.

**Etki:** `https://cargopilot.divizyon.org`'da yalnızca test ortamı çalışıyor; production DB ve storage başlatılmamış.  
**Çözüm:** `.env.prod.example` → `.env.prod` oluşturulmalı, değerler doldurulmalı, `docker-compose.prod.yml` ayağa kaldırılmalı.  
**Bkz.:** [server-requirements.md](server-requirements.md), [PRODUCTION_DEPLOYMENT_INFO.md](../../PRODUCTION_DEPLOYMENT_INFO.md)

---

### 2.2 Production CI/CD Pipeline Yok
**Durum:** ⚠️ Açık — Kritik

`test-deploy.yml`'de yalnızca test ortamına deploy var. `main` branch'e merge sonrası production'a otomatik deploy yapan bir job yok.

**Etki:** Production'a deploy tamamen manuel yapılmak zorunda; `main`'e merge otomasyonu sağlanmamış.  
**Çözüm:** `main`'e push tetikleyicisi ile prod image build + GHCR push + sunucuya SSH deploy yapan bir job eklenmeli. `PROD_SSH_HOST` ve `PROD_SSH_PRIVATE_KEY` GitHub secrets'a eklenmeli.

---

### 2.3 Production için GHCR Image Pipeline Yok
**Durum:** ⚠️ Açık

Test için `ghcr.io/divizyon/cargo-pilot-backend:test` tag'i CI'da push ediliyor. Production için `:latest` veya `:v{version}` tag'i push edilmiyor.

**Etki:** Prod deploy edildiğinde build'i nereden alacağı belirsiz.  
**Çözüm:** `main`'e push'ta image'ların `:latest` ve `:{git-tag}` olarak GHCR'a push edilmesi sağlanmalı.

---

### 2.4 Grafana Alert Bildirim Kanalı (Contact Point) Yok
**Durum:** ⚠️ Açık

3 alert kuralı provisioning ile yüklü (5xx hataları, error log, backend health). Ancak `contact-points.yml` dosyası yok — alertler tetiklense de e-posta/Slack/webhook'a bildirim gitmiyor.

**Etki:** Backend çöktüğünde ekip haberdar edilemiyor.  
**Çözüm:** `infra/docker/grafana/provisioning/alerting/contact-points.yml` oluşturulmalı. Kanal kararı (e-posta/Slack/webhook) alınmalı.

---

### 2.5 `test` Branch'ine Direct Push Koruması Eksik
**Durum:** ⚠️ Açık

GitHub branch protection'da `test` branch'i için "Require a pull request" kuralı aktif değil. `git push origin test` ile doğrudan push yapılabilir; `enforce-test-base` CI job'u tetiklenmez.

**Etki:** Branch stratejisi devre dışı bırakılabilir.  
**Çözüm:** GitHub → Settings → Branches → `test` → Branch protection rule:
- "Require a pull request before merging" ✅
- Required status checks: `Test PR Dev Kontrolü`, `Image Build`, `Deploy (Test)` ✅

---

### 2.6 MSSQL SA Parolası Git Geçmişinde
**Durum:** ⚠️ Açık — Güvenlik

`appsettings.Development.json`'da eski SA parolası repoya commit edilmişti. Dosya güncellendi ama git geçmişinde hala görünür.

**Etki:** Geçmişe erişimi olan biri parolayı görebilir.  
**Çözüm:** Sunucudaki SA parolası döndürülmeli (rotate). Geçmiş temizliği için `git filter-repo` gerekebilir ancak tüm ekibin klonunu güncellemesi gerekirk. Minimum aksyon: **parolayı döndür**.

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
**Durum:** ⚠️ Açık

`vite.config.ts`'te `VITE_DEV_PROXY_TARGET` env var'ı ile local backend proxy konfigürasyonu mevcut. Bu özellik `local-setup.md`'de hiç belgelenmemiş.

**Çözüm:** `local-setup.md`'ye "Frontend Vite ile, Backend Docker'da" başlıklı bir bölüm eklenmeli:
```bash
# .env.local veya shell'de:
VITE_DEV_PROXY_TARGET=http://localhost:8081
npm run dev
```

---

### 3.2 `infra/env/.env.test.example` — `VITE_DEV_PROXY_TARGET` eksik
**Durum:** ⚠️ Açık

`vite.config.ts`'te `VITE_DEV_PROXY_TARGET` kullanılıyor ama `.env.test.example`'da bu değişken yok.

**Çözüm:** `.env.test.example`'a aşağıdaki satır eklenmeli:
```
# ─── Vite Dev Proxy (local frontend geliştirme) ──────
# npm run dev ile çalışırken /api istekleri bu adrese proxy edilir
VITE_DEV_PROXY_TARGET=http://localhost:8081
```

---

### 3.3 `docs/devops/secret-management.md` — GHCR packages public bilgisi yok
**Durum:** ⚠️ Açık

GHCR package'lar 2026-05-10 tarihinde public yapıldı. `secret-management.md`'de bununla ilgili bilgi yok; eski dokümanda PAT gereksinimi ima ediliyor.

**Çözüm:** `secret-management.md`'ye GHCR public package bilgisi ve developer'ların login gerektirmediğine dair not eklenmeli.

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

### 3.6 `infra/scripts/rollback.sh` — Prod'da local build yapıyor
**Durum:** ⚠️ Açık

`rollback.sh`'ta `docker compose ... up -d --build` komutu var. Prod'da GHCR image kullanılacaksa `--build` kaldırılmalı; belirli bir tag'in image'ı pull edilmeli.

**Çözüm:** Rollback script'i GHCR tag bazlı image pull'u desteklemeli. `docker compose pull` + `up -d --no-build` akışına geçilmeli.

---

### 3.7 Node.js 20 → 22 Geçişi (CI)
**Durum:** ℹ️ Öneri

`ci.yml` ve `Dockerfile`'da Node.js 20 kullanılıyor. Node.js 20 EOL yaklaşıyor (2026-04). Node.js 22 LTS aktif.

**Çözüm:** `ci.yml`'de `node-version: '22'`, `Dockerfile`'da `FROM node:22-slim` olarak güncellenmeli. Build ve testlerin 22 ile geçtiği doğrulanmalı.

---

### 3.8 `TEST_GHCR_PAT` Sona Erme Tarihi Takibi
**Durum:** ℹ️ Bilgi

`TEST_GHCR_PAT` classic PAT'ın süresi dolduğunda CI pipeline fail eder.

**Çözüm:** PAT sona erme tarihi takvime eklenmeli. Süresi dolmadan önce yenilenmeli ve `TEST_GHCR_PAT` + `TEST_GHCR_USER` secret'ları güncellenmeli.

---

## Öncelik Matrisi

| # | Madde | Kategori | Öncelik | İş Kodu |
|---|-------|----------|---------|---------|
| 1 | Production Stack Deploy | Eksik | 🔴 Kritik | — |
| 2 | Production CI/CD Pipeline | Eksik | 🔴 Kritik | — |
| 3 | Prod GHCR Image Pipeline | Eksik | 🔴 Kritik | — |
| 4 | `docker-compose.prod.yml` — healthcheck, env, GHCR | Uyumsuzluk | 🔴 Kritik | — |
| 5 | MSSQL SA Parolası Döndürme | Eksik | 🔴 Güvenlik | — |
| 6 | `test` Branch Direct Push Koruması | Eksik | 🟠 Yüksek | — |
| 7 | Grafana Alert Contact Point | Eksik | 🟠 Yüksek | — |
| 8 | Resend Domain Doğrulaması | Eksik | 🟠 Yüksek | — |
| 9 | `local-setup.md` — branch komutu düzelt | Güncelleme | 🟠 Yüksek | — |
| 10 | `local-setup.md` — Vite proxy belgele | Güncelleme | 🟠 Yüksek | — |
| 11 | `.env.test.example` — VITE_DEV_PROXY_TARGET | Güncelleme | 🟡 Orta | — |
| 12 | `nginx.conf` — trailing slash hizalama | Uyumsuzluk | 🟡 Orta | — |
| 13 | `secret-management.md` — GHCR public notu | Güncelleme | 🟡 Orta | — |
| 14 | `PRODUCTION_DEPLOYMENT_INFO.md` güncelle | Güncelleme | 🟡 Orta | — |
| 15 | `rollback.sh` — prod GHCR pull desteği | Güncelleme | 🟡 Orta | — |
| 16 | SSL sertifikası (self-signed → gerçek) | Eksik | 🟡 Orta | — |
| 17 | `monitoring-setup.md` — contact point adımları | Güncelleme | 🟡 Orta | — |
| 18 | Node.js 20 → 22 geçişi | Güncelleme | 🟢 Düşük | — |
| 19 | `TEST_GHCR_PAT` sona erme takvimi | Bilgi | 🟢 Düşük | — |

---

## Tamamlananlar

| Tarih | Madde | PR |
|-------|-------|-----|
| 2026-05-10 | Nginx `/api` proxy — frontend container'da CORS kökten çözüldü | #440 |
| 2026-05-10 | `VITE_API_BASE_URL` build arg `:-` → `-` (boş geçişe izin ver) | #440 |
| 2026-05-10 | GHCR packages public yapıldı — developer login gerekmez | — |
| 2026-05-10 | `CORS_ALLOWED_ORIGIN_1` workaround kaldırıldı | #442 |
