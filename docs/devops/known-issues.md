# Bilinen Sorunlar

**Son güncelleme:** 2026-05-16

> Geliştirme backlog'u ve iyileştirme maddeleri için bkz. [DevOps Backlog](devops-backlog.md).

---

## Açık Sorunlar

### 0 — Sunucuda Bayat GHCR Kimlik Bilgisi (INC-003)

{% hint style="success" %}
**Durum:** ✅ Çözüldü — doğrulandı (2026-08-03)
{% endhint %}

2026-08-03'te test sunucusuna deploy `error from registry: denied` ile kırıldı. Son başarılı
deploy 2026-05-20'ydi.

**Kök neden:** GHCR paketleri 2026-05-10'da public yapıldı ve `TEST_GHCR_PAT` login'i
`test-deploy.yml`'den kaldırıldı (#483). Ancak sunucudaki `~/.docker/config.json` içinde eski
PAT kimlik bilgisi kaldı. PAT'in süresi dolunca docker anonim pull'a **düşmedi**; geçersiz
kimlik bilgisiyle deneyip `denied` aldı.

**Etkisi:** Test ortamı 2026-05-20'den beri yeni image almıyordu.

**Not:** Bu sorun trunk branch geçişinden **önce** de mevcuttu — aynı hata `test` branch'inde de
alınmıştı (run 30809546247). Geçişten kaynaklanmadı.

**Uygulanan çözüm:** Deploy script'ine pull öncesi `docker logout ghcr.io || true` eklendi.

**Manuel alternatif:** Sunucuda bir kez `docker logout ghcr.io`.

---

### 1 — Resend Domain Doğrulaması Tamamlanmadı

{% hint style="warning" %}
**Durum:** ⚠️ Açık
{% endhint %}

`cargopilot.divizyon.org` domain'i Resend üzerinde doğrulanmadığından e-posta gönderiminde `onboarding@resend.dev` adresi kullanılmaktadır.

**Etkisi:** Şifre sıfırlama e-postası yalnızca Resend hesap sahibinin adresine gönderilebilir.

**Kalıcı çözüm:** resend.com → Domains → `divizyon.org` için DNS kayıtları eklenmeli. `RESEND_FROM_EMAIL` güncellenmeli.

---

### 2 — Production Stack Henüz Deploy Edilmedi

{% hint style="danger" %}
**Durum:** ⚠️ Açık — Kritik
{% endhint %}

Sunucuda `.env.prod` dosyası ve production stack hiç kurulmamıştır.

**Etkisi:**
- Production veritabanı ve object storage başlatılmamış.
- `https://cargopilot.divizyon.org` yalnızca test ortamını sunuyor.

**Geçici çözüm:** Test ortamı ürün demosu için kullanılmaktadır.

**Kalıcı çözüm:** `infra/env/.env.prod.example` → `.env.prod` oluşturulmalı, `docker-compose.prod.yml` ayağa kaldırılmalı. Detaylar: [devops-backlog.md](devops-backlog.md) madde 2.1–2.3.

---

### 3 — MSSQL SA Parolası Git Geçmişinde

{% hint style="danger" %}
**Durum:** ⚠️ Açık — Güvenlik
{% endhint %}

`appsettings.Development.json`'da eski SA parolası daha önce repoya commit edilmişti. Dosya güncellendi ancak git geçmişinde hâlâ görünür.

**Etkisi:** Geçmişe erişimi olan biri eski parolayı görebilir.

**Kalıcı çözüm:** Sunucudaki SA parolasını döndür (rotate). Geçmiş temizliği için `git filter-repo` kullanılabilir; ancak tüm klonların güncellenmesi gerekir. **Minimum aksyon: parolayı döndür.**

---

### 4 — Node.js 20 Deprecation Uyarısı (CI)

{% hint style="info" %}
**Durum:** ℹ️ Bilgi — Build'i bozmaz
{% endhint %}

CI pipeline'da Node.js 20 kullanılıyor; deprecation uyarısı alınmaktadır.

**Kalıcı çözüm:** `ci.yml` ve `Dockerfile`'da Node.js 22'ye geçilmeli.

---

### 5 — `docker-compose.prod.yml` Eksiklikleri

{% hint style="success" %}
**Durum:** ✅ Giderildi (2026-08-03) — sahada doğrulanmadı, prod stack hâlâ kurulmadı
{% endhint %}

Prod compose, test compose ile karşılaştırıldığında şunlar eksikti:

| Eksik | Etkisi |
|-------|--------|
| `Minio__Endpoint/AccessKey/SecretKey/BucketName` | **Dosya yükleme ve PDF hiç çalışmazdı** — backend `MINIO_*` değil `Minio__*` okuyor |
| `OAuth__Google__*` (4 değişken) | Google ile giriş çalışmazdı |
| `Cors__AllowedOrigins__0` | Ayrı origin kullanılırsa frontend API'ye ulaşamazdı |
| `Resend__*`, `PasswordReset__*`, `EmailChange__*` | Şifre sıfırlama ve e-posta değiştirme kırıktı |
| Backend `healthcheck:` | Deploy "hazır mı" bilemezdi; `depends_on` sağlık koşulu kurulamazdı |
| `platform: linux/amd64` | Mimari uyuşmazlığı riski |

**Uygulanan çözüm:** Prod compose'un backend servisi test compose ile birebir aynı anahtar
kümesine getirildi; healthcheck eklendi; frontend `backend`'in sağlıklı olmasını bekliyor.
MSSQL'de hem `MSSQL_SA_PASSWORD` hem `SA_PASSWORD` set ediliyor (2022 image'ı ilkini bekler),
healthcheck `MSSQL_SA_PASSWORD` kullanıyor. Bağlantı dizesi artık compose içinde kuruluyor —
parola `.env.prod`'da tek yerde duruyor. `.env.prod.example` yeni değişkenlerle tamamlandı.

**Kalan iş:** Prod stack hiç ayağa kaldırılmadığı için bu yapılandırma **çalışır hâlde
görülmedi**. İlk deploy'da doğrulanmalı. Bkz. madde 2 ve [devops-backlog.md](devops-backlog.md) 2.1.

---

### 6 — `dev` Branch'inin Test'in Gerisine Düşme Riski

{% hint style="success" %}
**Durum:** ✅ Yapısal olarak engellendi (2026-08-03)
{% endhint %}

`US-REP-04` (#482) dev'i atlayarak doğrudan test'e merge edildi. Bu, dev'in test'in gerisinde kalmasına neden oldu. PR #493 ile giderildi.

**Uygulanan çözüm:** `ci.yml`'deki **`Terfi Zinciri Kontrolü`** job'u bunu artık CI seviyesinde engelliyor: `test`'e yalnızca `dev`'den, `main`'e yalnızca `test` veya `hotfix/*` üzerinden PR açılabilir. Ayrıca ruleset terfi PR'larında squash'ı kapatıyor — squash, kaynakta bulunmayan yeni bir commit üreterek aynı ayrışmayı yaratırdı.

**Süreç kuralı:** İş branch'leri yalnızca `dev`'e PR açar. `dev → test` ve `test → main` ayrı terfi PR'larıdır. Test ortamında bulunan bug `test`'te değil, `dev`'den açılan `fix/*` ile düzeltilir.

**Kalan risk:** `hotfix/* → main` sonrası `main → test → dev` geri-merge'ünün unutulması. Bu adım otomatikleştirilmedi — bkz. [BRANCHING.md](../conventions/BRANCHING.md) "Hotfix".

---

### 7 — Loki / cAdvisor Log Rotation Tanımlı Değil

{% hint style="warning" %}
**Durum:** ⚠️ Açık
{% endhint %}

`docker-compose.monitoring.test.yml`'de `loki` ve `cadvisor` servislerinde `logging:` bloğu eksik. Diğer container'larda `max-size: 100m, max-file: 3` tanımlı.

**Etkisi:** 2026-05-16'da Loki 960 MB log biriktirmiş, Grafana datasource'u 503 vermiş, alertlar `DatasourceNoData` durumuna düşmüştü.

**Geçici çözüm:** Log dosyası truncate edildi, Loki restart edildi.

**Kalıcı çözüm:** `docker-compose.monitoring.test.yml` ve `docker-compose.monitoring.prod.yml`'deki `loki` ve `cadvisor` servislerine şu blok eklenmeli:

```yaml
logging:
  driver: json-file
  options:
    max-size: "100m"
    max-file: "3"
```

---

### 8 — Docker Image Vulnerability'leri

{% hint style="warning" %}
**Durum:** ⚠️ Açık
{% endhint %}

2026-05-16 Trivy taramasında tespit edilen bulgular:

| Image | CRITICAL | HIGH |
|-------|----------|------|
| `cargo-pilot-backend:test` | 4 | 18 |
| `cargo-pilot-frontend:test` | 6 | 29 |

Kritik CVE'ler: `zlib1g` (backend), `openssl` + `libxml2` (frontend), `System.Security.Cryptography.Xml` (.NET 8.0.2 → 8.0.3 gerekli).

**Geçici çözüm:** Test ortamı production trafiği taşımadığından anlık risk düşük.

**Kalıcı çözüm:** Frontend Dockerfile'da Alpine base image güncellenmeli. Backend için .NET 8.0.3+ aspnet image'a geçilmeli.

---

## Çözülenler

| Tarih | Sorun | Çözüm |
|-------|-------|-------|
| 2026-05-16 | Backup script execute izni eksikti, 42 gündür yedek alınamıyordu | `chmod +x` düzeltildi, ilk yedek alındı |
| 2026-05-16 | Loki 960 MB log biriktirdi, Grafana DatasourceNoData | Log truncate + container restart |
| 2026-05-16 | `VITE_OAUTH_GOOGLE_URL` CI'da build-args'a geçilmiyordu | `test-deploy.yml`'e build-args eklendi (#549/#550) |
| 2026-05-16 | `EmailChange__FrontendConfirmUrl` env var eksikti | `docker-compose.test.yml` + `test-deploy.yml` güncellendi (#557/#558) |
| 2026-05-16 | DIVIZYON ERP DB sunucuda yoktu | `DIVIZYON.bak` restore edildi (`cargo-pilot-mssql-test`) |
| 2026-05-10 | Frontend local dev CORS sorunu | Nginx `/api/` proxy (#440) + Vite proxy |
| 2026-05-10 | GHCR developer login gerekliliği | Package'lar public yapıldı |
| 2026-05-10 | `test` branch'ine direct push koruması yoktu | GitHub branch protection kuralı eklendi |
| 2026-05-10 | `TEST_GHCR_PAT` sona erme riski | Package'lar public; PAT login `test-deploy.yml`'den kaldırıldı (#483) |
| 2026-05-10 | GHCR rollback için immutable tag yoktu | `test-{sha}` tag CI'da üretiliyor (#483) |
| 2026-05-10 | GHA cache 10 GB limitine yaklaşmıştı (320 cache) | Cache cleanup workflow eklendi (#489/#492) |
| 2026-05-10 | `dev` branch test'in gerisine düştü | `sync/test-to-dev` PR açıldı (#493) |
| 2026-04-25 | `appsettings.Development.json` SA parolası | Placeholder ile değiştirildi (git geçmişi hâlâ sorunlu — bkz. madde 3) |
