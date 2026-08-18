# DevOps Backlog

**Son güncelleme:** 2026-08-18 · **Durum:** Aktif · **Oluşturulma:** 2026-05-10 · **Sorumlu:** DevOps Chapter Lead

Bu doküman DevOps ekibinin açık ve tamamlanmış iyileştirme maddelerini önceliklendirilmiş şekilde takip eder.

**Rol ayrımı (2026-08-16):** Bu dosya **canlı plandır** — ne yapılacağını, hangi öncelikle
ve hangi bağımlılıkla yapılacağını tutar. Bir sorunun **belirtisi, etkisi ve kök nedeni**
[`known-issues.md`](known-issues.md)'de, numaralı sicilde durur. Çakışan maddelerde tam
kayıt orada, plan burada; ikisi arasında tekrar bırakılmaz.

| Konu | Sorun kaydı | Plan |
|---|---|---|
| Resend domain doğrulaması | `known-issues.md` #1 | madde 2.7 |
| Production stack kurulmadı | `known-issues.md` #2 | madde 2.1–2.3 |
| MSSQL SA parolası git geçmişinde | `known-issues.md` #3 | madde 2.6 |
| Node.js 20 deprecation | `known-issues.md` #4 | Kategori 3 |
| Log rotation yok | `known-issues.md` #7 | Kategori 6.6 (D-40) |
| Image CVE'leri | `known-issues.md` #8 | Kategori 6.5 (D-31, D-32) |

---

## Öncelik Matrisi

| # | Madde | Öncelik | Durum |
|---|-------|---------|-------|
| 1 | Production Stack Deploy | 🔴 Kritik | ⚠️ Açık |
| 2 | Production CI/CD Pipeline | 🔴 Kritik | ⚠️ Açık |
| 3 | Prod GHCR Image Pipeline | 🔴 Kritik | ⚠️ Açık |
| 4 | `docker-compose.prod.yml` — healthcheck, OAuth/CORS/Resend env | 🔴 Kritik | ✅ PR #908 |
| 5 | MSSQL SA Parolası Döndürme | 🔴 Güvenlik | ⚠️ Açık |
| 6 | Grafana Alert Contact Point | 🟠 Yüksek | ⚠️ Açık |
| 7 | Resend Domain Doğrulaması | 🟠 Yüksek | ⚠️ Açık |
| 8 | SSL — self-signed → gerçek sertifika | 🟡 Orta | ⚠️ Açık |
| 9 | `deployment.md` güncelle | 🟡 Orta | ⚠️ Açık |
| 10 | `monitoring-setup.md` — contact point adımları | 🟡 Orta | ⚠️ Açık |
| 11 | Node.js 20 → 22 geçişi | 🟢 Düşük | ⚠️ Açık |
| 12 | xlsx → exceljs geçişi (Dependabot izlenebilirliği) | 🟡 Orta | ⚠️ Açık |
| 13 | three.js r162 → r185 yükseltmesi (3D QA'li) | 🟡 Orta | ⚠️ Açık |
| 14 | CORS `AllowAnyOrigin()` geri dönüş yolu — fail-fast'e çevrilmeli | 🟠 Güvenlik | ⚠️ Açık |
| 15 | Yedekleme veri kaybı kümesi — D-03 (MinIO yedeği), D-04 (off-site), D-20 (bildirim) | 🔴 Kritik | ⚠️ Açık |
| 16 | Kaynak limitleri — D-38 (limit yok), D-39 (`MSSQL_MEMORY_LIMIT_MB`) | 🔴 Kritik | ⚠️ Açık |
| 17 | Prod öncesi zorunlular — D-47 (prod nginx conf), D-50 (port/path uyumsuzluğu) | 🟠 Yüksek | ⚠️ Açık |
| 18 | Rollback güvenliği — D-24, D-25, D-27 ✅ (#1012, #1017); kalan **D-29 (tatbikat)** | 🟠 Yüksek | ⚠️ Açık |

Kategori 6, 2026-08-03 taramasının **35 açık** D-bulgusunu D-kodlarıyla birlikte listeler
(51'den 16'sı kapandı); yukarıdaki matris yalnızca kritik kümeleri özetler.

---

## Kategori 1 — Uyumsuzluklar (Prod / Test Farkları)

### 1.1 `docker-compose.prod.yml` — GHCR image desteği

{% hint style="success" %}
**✅ Tamamlandı — PR #488**
{% endhint %}

`docker-compose.prod.yml`'e backend ve frontend için GHCR image referansı eklendi.

---

### 1.2 `docker-compose.prod.yml` — Backend healthcheck yok

{% hint style="success" %}
**✅ Tamamlandı — PR #908 (2026-08-03)**
{% endhint %}

Backend `healthcheck:` bloğu prod compose'a eklendi. **Not:** Prod stack sahada hiç
çalıştırılmadığı için healthcheck fiilen doğrulanmadı.

---

### 1.3 `docker-compose.prod.yml` — MSSQL healthcheck env var uyumsuzluğu

{% hint style="success" %}
**✅ Tamamlandı — PR #908 (2026-08-03)**
{% endhint %}

`MSSQL_SA_PASSWORD` ve `SA_PASSWORD` hizalandı; healthcheck `MSSQL_SA_PASSWORD` kullanıyor.

---

### 1.4 `docker-compose.prod.yml` — OAuth, CORS, Resend env var eksik

{% hint style="success" %}
**✅ Tamamlandı — PR #908 (2026-08-03)**
{% endhint %}

`OAuth__Google__*`, `Cors__*`, `Resend__*` ve MinIO env var'ları prod compose'a eklendi.
**Not:** Değerlerin sahada dolu bir `.env.prod` ile doğrulanması madde 2.1'e bağlı.

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

**Ön koşul:** Kategori 6.8 — D-38, D-39, D-47, D-50 bu maddeden önce kapatılmalı.

`.env.prod` yokluğunun yan etkisi olan gece cron hataları (D-21) **#1012 ile ayrıca kapatıldı**:
`setup-backup-cron.sh` prod cron'larını yalnız `.env.prod` varsa kuruyor. Yani bu madde artık
alarm yorgunluğu üretmiyor; kurulum gerçekleştiğinde cron'lar kendiliğinden devreye girer.

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

### 2.4 Grafana Alert Bildirimi Gitmiyor (SMTP eksik)

{% hint style="warning" %}
**⚠️ Açık — kapsam güncellendi (2026-08-04)**
{% endhint %}

6 alert kuralı mevcut (5xx, error log, backend up, CPU, RAM, disk). `contact-points.yml` ve
`notification-policies.yml` dosyaları **oluşturulmuş durumda** — eksik olan, hiçbir compose
dosyasında `GF_SMTP_*` env var'larının tanımlı olmaması. E-posta contact point'i yapılandırılı
ama gönderemiyor.

**Çözüm:** Grafana servisine `GF_SMTP_HOST/USER/PASSWORD/FROM_ADDRESS` env var'ları eklenmeli
ve test bildirimi doğrulanmalı.

**D-41** (2026-08-03 taraması) bu maddenin kanıt kaydıdır — kapsam düzeltmesi oradan geldi.
D-20 (yedek başarısızlığı alert'i) bu maddeye bağımlıdır: çalışan bir bildirim kanalı olmadan
yedek alert'i sessiz kalır.

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

Sorunun tam kaydı — iki dosya, dört commit, 2026-08-15 yeniden doğrulaması —
[`known-issues.md`](known-issues.md) **madde 3**'tedir; burada tekrarlanmaz.

**Rotasyon hâlâ yapılmadı.** Bu madde kapatılmamıştır.

**Çözüm (plan):** Sunucudaki SA parolasını döndür. Geçmiş temizliği için `git filter-repo`
gerekebilir ama minimum aksiyon rotasyondur.

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
| `deployment.md` — Prod deploy checklist eksik | ⚠️ Açık | — |
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
| xlsx → exceljs geçişi | ⚠️ Açık | — |

**xlsx → exceljs bağlamı (2026-08-13):** xlsx, npm registry'de 0.18.5'te takılı kaldığı için
(2 high advisory, fix yalnız SheetJS CDN'inde) bağımlılık CDN tarball'ına taşındı
(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) — açıklar kapandı ancak URL bağımlılığını
Dependabot izleyemez; gelecekteki xlsx CVE'leri SheetJS changelog'undan elle takip edilmeli.
Kalıcı çözüm: 5 dosyadaki ~38 çağrının (`BulkImportDialog`, `VehicleBulkImportDialog`,
`export-utils`, `exportVehiclesToExcel`, `useReports`) exceljs'e taşınması. Asıl maliyet kod değil
QA: Excel export'ları müşteriye giden çıktılar — kolon düzeni/format birebir doğrulanmalı.
Import/export ekranına dokunulan bir sprint'te ele alınması önerilir.

---

### 5.1 three.js r162 → r185 Yükseltmesi

{% hint style="warning" %}
**⚠️ Açık — 3D manuel QA zorunlu** · Tespit: 2026-08-13 (Dependabot ilk turu, PR #951)
{% endhint %}

Mevcut sürüm `three@^0.162.0`; güncel r185. Aradaki 23 sürüm **kırıcı değişiklik içeriyor** ancak
semver bunu göstermiyor: three 0.x sürümlemesi kullandığı için `0.162 → 0.185` teknik olarak
*minor* sayılır. Bu yüzden yükseltme, "npm-minor-patch" etiketli bir grup PR'ının içinde
manuel QA görmeden gelmişti; `dependabot.yml`'de three ailesi için minor da ignore edilerek
kapatıldı (PR #964).

**Doğrulanmış kırılma:** `apps/frontend/src/features/planning/scene/SceneFloor.tsx:101` —
r185'te `ShaderMaterialParameters.extensions` içinden `derivatives` kaldırıldı (r163'te WebGL1
desteği düştüğü için `fwidth` artık GLSL ES 3.0'da core). TypeScript build'i `TS2739` ile kırıldı.
Bu, **derleyicinin yakalayabildiği tek sorun**; r163→r185 aralığı TypeScript'in doğrulayamayacağı
çok sayıda runtime davranış değişikliği içeriyor.

**Kapsam ve QA gereksinimi:**

- `scene-config.ts` koordinat/pivot eşlemesi — sahne sözleşmesi (cm, X=width, Y=height, Z=length)
  bozulmamalı
- `InstancedMesh` ile çizilen kutular: konum, rotasyon, renk ve seçim (raycast) davranışı
- `BoxWrapper` pivot offset'i — backend pozisyonları origin'e en yakın köşe `(min x, min y, min z)` referanslı
- Zemin ızgarası shader'ı (`fwidth` tabanlı) — kırılmanın tespit edildiği kod yolu
- Manuel edit akışı: sürükleme, çakışma/violation geri bildirimi
- Bellek: manuel oluşturulan Three.js kaynaklarının dispose'u (`ResourceTracker`)

**Önerilen yöntem:** tek seferde r185'e atlamak yerine ara sürümlerde (r170, r178) durup sahneyi
görsel olarak doğrulamak; her adımda bir plan yükleyip 3D görüntüleyicide kontrol etmek.
3D/canvas değişiklikleri için `CLAUDE.md` snapshot benzeri doğrulama veya manuel QA şart koşuyor.

---

### 5.2 CORS `AllowAnyOrigin()` Geri Dönüş Yolu

{% hint style="danger" %}
**⚠️ Açık — Güvenlik** · Tespit: 2026-08-13 (SonarAnalyzer 10.32 yükseltmesi, PR #955)
{% endhint %}

`apps/backend/CargoPilot.WebAPI/DependencyInjection.cs` içinde CORS yapılandırması şu şekilde:

```csharp
if (corsOrigins.Length > 0)
    builder.WithOrigins(corsOrigins!).AllowCredentials();
else
    builder.AllowAnyOrigin();   // S5122 — pragma ile susturuldu
```

`CORS_ALLOWED_ORIGIN_*` değişkenleri tanımlı değilse API **tüm origin'lere açılır**. Analyzer
yükseltmesi bunu S5122 olarak yakaladı; bağımlılık PR'ında çalışma zamanı davranışı
değiştirilmemesi için `#pragma warning disable` ile susturuldu ve buraya taşındı.

**Risk:** Kuralın güvenliği bir *varsayıma* dayanıyor — "dağıtım ortamlarında origin listesi her
zaman verilir". Bu bir garanti değil; prod stack kurulurken (madde 1-2) env dosyası eksik
hazırlanırsa API sessizce herkese açık başlar ve hiçbir uyarı üretmez.

**Önerilen çözüm:** Geri dönüş yolunu ortama duyarlı hale getir — `Development` dışında origin
listesi boşsa uygulama **başlatmayı reddetsin** (fail-fast), yalnızca development'ta
`AllowAnyOrigin()` kalsın. Böylece pragma da kaldırılabilir.

**Aynı PR'da susturulan, incelenmiş ve kabul edilmiş diğer kurallar** (bunlar için aksiyon
gerekmiyor, kayıt amaçlı):

- `AuthController` S2092 ×3 — `Secure = !_env.IsDevelopment()`; kod zaten doğru, analyzer
  ifadeyi statik olarak çözemiyor. Sabit `true` yazmak lokal HTTP geliştirmeyi kırardı.
- `MinioHealthCheck` S5332 — küme içi ağda MinIO sağlık ucuna düz HTTP; istek konteyner
  ağından dışarı çıkmıyor.

---

## Kategori 6 — DevOps Taraması Bulguları (D-01 … D-51)

**Kaynak:** 2026-08-03 tarihli dört paralel DevOps taraması
([`../archive/devops-iyilestirme-analizi-2026-08.md`](../archive/devops-iyilestirme-analizi-2026-08.md), 51 madde).
O doküman bir **anlık görüntü**dür ve canlı takip yapmaz; bulguların açık olanları
izlenebilirlik için **D-kodları korunarak** buraya taşındı (triyaj tarihi: 2026-08-16).
Her satırın kanıtı `dosya:satır` düzeyinde yeniden doğrulandı — kapananlar aşağıda değil,
kaynak dokümanda `✅` ile işaretlidir.

**Triyaj sonucu (2026-08-16):** 51 bulgudan **6'sı kapandı** (D-01, D-05, D-07, D-10, D-11, D-16),
**45'i açık** (6'sı kısmen kapandı, kalan kapsamıyla listede duruyor).

**Güncel durum (2026-08-18):** Triyajdan sonra **10 bulgu daha kapandı** — Dalga 1
(D-18, D-21, D-22, D-23, D-25 · #1012) ve Dalga 2 (D-14 · #1016; D-24, D-26, D-27, D-28 · #1017).
Kapanan satırlar aşağıdaki tablolardan çıkarıldı ve [Tamamlananlar](#tamamlananlar-tarih-sırası)
bölümüne taşındı. **Kalan: 35 açık bulgu** — 6 kritik, 13 yüksek, 11 orta, 5 düşük.
Kapananların hiçbiri kritik değildi; altı kritiğin dördü sunucuya SSH erişimi olmadan kapanmıyor.

### 6.1 Güvenlik

| Kod | Bulgu | Bugünkü kanıt (2026-08-16) | Öncelik |
|---|---|---|---|
| D-02 | Servis portları internete açık — **kısmen kapandı (#991), sonra kısmen yeniden açıldı** | Kalan: `docker-compose.monitoring.test.yml:89` Grafana `3002:3000`; `docker-compose.test.yml:127` ERP MSSQL `1435:1433` — bu ikincisi **#938 ile geldi** ve loopback'e bağlanmamış tek port (diğer 5'i `127.0.0.1:` önekli). `profiles: ["e2e"]` arkasında ama `--profile e2e` verilirse dışarı açılır | 🔴 Kritik |
| D-15 | Workflow'da hardcoded fallback parolalar | `.github/workflows/test-deploy.yml:172,176,179,181,183` — `gh secret list`'te `TEST_MSSQL_SA_PASSWORD`/`TEST_MINIO_*`/`SEED_*` yok (2026-08-18: repoda tanımlı 6 secret var, bunlar arasında değil) → fallback'ler her koşuda fiilen kullanılıyor | 🟠 Yüksek |
| D-17 | MSSQL container'ı root çalışıyor — **kapsam büyüdü** | `docker-compose.test.yml:90,118,147`, `docker-compose.prod.yml:92` — `user: root`. Sayı 2'den **4'e** çıktı: `:118` (`erp-mssql`) ve `:147` (`erp-mssql-init`) #938 ile eklendi. Prod'a geçmeden düzeltilmeli | 🟢 Düşük |

### 6.2 Yedekleme ve veri kaybı

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-03 | MinIO verisi hiç yedeklenmiyor | `infra/scripts/*.sh` içinde `minio` geçmiyor; yedeklenen tek şey MSSQL. DB restore edilse bile görsel/PDF referansları kırık gelir | 🔴 Kritik |
| D-04 | Yedeklerin off-site kopyası yok | `restic`/`rclone`/`s3 sync` repoda hiç geçmiyor; yedekler DB ile aynı diskte, retention 7 gün → fiili RPO = ∞ | 🔴 Kritik |
| D-19 | Yedek doğrulaması yüzeysel — **kısmen kapandı** (#994) | `WITH CHECKSUM` eklendi (`backup-db.sh:61`, `verify-backup.sh:98`). Kalan: gerçek restore tatbikatı yok, yalnızca **en son** yedek kontrol ediliyor | 🟠 Yüksek |
| D-20 | Yedek başarısızlığında hiçbir bildirim yok | Script'lerde `node_exporter`/textfile metriği yok, Prometheus'ta yedek alert kuralı yok, `MAILTO` yok → 42 günlük olay sessizce tekrar edebilir. **Ön koşul:** D-41 | 🔴 Kritik |

### 6.3 Rollback ve deploy güvenliği

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-29 | Rollback hiç denenmedi | `rollback.yml` bugüne kadar hiç çalıştırılmadı (2026-08-18 doğrulaması: `gh run list --workflow=rollback.yml` boş). Ön koşulları D-24/D-25 ile kapandı — runbook yazıldı, yedeksiz devam engellendi — yani **tatbikatın önünde artık teknik engel yok**. Kalan: planlı tatbikat, `target_ref=v0.15.0` ile denenebilir | 🟠 Yüksek |

### 6.4 CI/CD süresi

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-06 | Default branch'te GHA cache hiç yazılmıyor | Default branch `main`; hiçbir workflow `main` push'unda build etmiyor (`ci.yml:6-20`, `test-deploy.yml:13`) → `cache-from` iş branch'lerinde soğuk başlar. Düzeltme: nightly veya `main` push'unda seed job | 🟡 Orta |
| D-09 | `ci.yml`'daki `docker-build` job'u — **kısmen kapandı** (#992) | Artık yalnızca `dev` PR'ında koşuyor (`ci.yml:204`); iş branch'i push'undaki kopya build kaldırıldı. Kalan soru: `dev` kapısındaki build'in değeri | 🟢 Düşük |
| D-12 | Gereksiz seri `needs:` zinciri | `ci.yml:196` — `docker-build`, `needs: [frontend-ci, backend-ci]`; docker build bu job'ların çıktısına bağımlı değil | 🟢 Düşük |
| D-13 | Küçük CI kalemleri | (a) `test-deploy.yml:327,340` hâlâ `build-push-action` **v5.4.0**, diğer 6 kullanım v7.3.0 — sürüm ayrışması. **PR #1032 (Dependabot) bunu ve 6 action'ı daha hizalıyor; ADR-0008'in öngördüğü devralma**; (b) `setup-dotnet`'te NuGet cache yok (`ci.yml:168`, `test-deploy.yml:48`); (c) `migration-check` + `backend-ci` aynı solution'ı Release'de iki kez derliyor; (d) frontend scope'ları hâlâ `mode=max` (`ci.yml:240`, `test-deploy.yml:145`) | 🟡 Orta |

### 6.5 Docker image ve build

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-08 | Frontend texture israfı — **kısmen kapandı** (#995) | (a) `public/textures/` silindi. (b) **Kalan:** `apps/frontend/src/assets/textures/container-steel/normal.jpg` gerçekte **19.4 MB, 2048×2048 16-bit RGBA PNG** (`file` çıktısı); kardeşleri 87–539 KB gerçek JPEG. JPEG q92'ye kodlanırsa ~890 KB | 🟠 Yüksek |
| D-30 | Backend restore katmanı hiç cache'lenmiyor | `apps/backend/Dockerfile:7` — `COPY . .` restore'dan önce; tek `.cs` değişikliği `dotnet restore`'u sıfırdan koşturuyor. Düzeltme: csproj-only restore katmanı + `--no-restore` | 🟠 Yüksek |
| D-31 | nginx base image — **kısmen kapandı** | `apps/frontend/Dockerfile:21` artık `nginx:1.31-alpine` (1.27'den yükseltildi). **Kalan:** `alpine` varyantı njs → `libxml2`/`libxslt` getiriyor; `alpine-slim`'e geçilirse known-issues #8'deki o CVE sınıfı paket ortadan kalktığı için kapanır (~−36 MB) | 🟠 Yüksek |
| D-32 | Base image mirror'ı bayat + .NET 8 EOL | `sync-base-images.yml` haftalık (Pazar) koşuyor, Microsoft patch'leri ayın 2. Salı'sı çıkıyor → 5 güne kadar bayat. **Stratejik:** .NET 8 desteği **2026-11-10**'da bitiyor; .NET 10 LTS geçiş planı gerekli | 🟠 Yüksek |
| D-33 | `sync-base-images.yml` verimsiz | `pull` + `tag` + `push` tüm layer'ları runner'a indiriyor ve **multi-arch manifest'i kaybediyor**. `docker buildx imagetools create` layer indirmez, manifest list'i korur | 🟡 Orta |
| D-34 | `npm install` → `npm ci` | `apps/frontend/Dockerfile:5` — `npm install --ignore-scripts` lock'u yazabilir; image içi bağımlılıklar CI'daki `npm ci` sonucundan sapabilir | 🟡 Orta |
| D-35 | Docker build'de statik analiz koşuyor | `Directory.Build.props:20,26,52` — `EnforceCodeStyleInBuild`, `TreatWarningsAsErrors`, SonarAnalyzer 10.32. Kalite kapısı zaten `backend-ci`'de. ⚠️ `test-deploy.yml` build job'unda `needs: [backend-ci]` yok → kaldırılırsa `test` push'unda analyzer hiç koşmaz | 🟡 Orta |
| D-36 | Tek parça ~3.35 MB JS chunk | `apps/frontend/src/router.tsx` — `lazy(` sayısı **0**; three.js + recharts + xlsx + framer-motion + 37 sayfa tek chunk'ta. Frontend task'ı, Docker task'ı değil | 🟡 Orta |
| D-37 | `.dockerignore` boşlukları | `apps/frontend/.dockerignore` yalnız 4 satır (`node_modules`, `dist`, `.env*.local`, `*.log`); `.claude`, `coverage`, `**/*.test.tsx` yok. Değeri boyut değil, `COPY . .` katmanının test dosyasında invalidate olmaması | 🟢 Düşük |

### 6.6 Altyapı ve gözlemlenebilirlik

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-38 | Hiçbir serviste kaynak limiti yok | `infra/compose/` içinde `mem_limit`/`cpus`/`pids_limit`/`deploy:` hiç geçmiyor → tek kaçak servis sunucuyu götürür. **Prod öncesi zorunlu** | 🔴 Kritik |
| D-39 | `MSSQL_MEMORY_LIMIT_MB` ana MSSQL'de tanımlı değil | Yalnız ERP servisinde var (`docker-compose.test.yml:125`); ana `mssql` servislerinde yok → SQL Server host RAM'inin %80'ini hedefler. `server-requirements.md:43`'teki "MSSQL × 2 ≈ 4 GB" varsayımı bu yüzden yanlış. **Prod öncesi zorunlu** | 🔴 Kritik |
| D-40 | Log rotation hiçbir serviste yok | `infra/` altında `logging:`/`max-size` hiç geçmiyor — 16 servisin tamamı etkileniyor. **known-issues #7 ile aynı konu**; o madde kapsamı bu bulguya göre düzeltilmişti. ⚠️ Sunucuda `/etc/docker/daemon.json` global rotation olabilir, önce bakılmalı | 🟠 Yüksek |
| D-41 | Grafana SMTP hiç yapılandırılmamış | `infra/` altında `GF_SMTP` hiç geçmiyor; contact point ve notification policy dosyaları **mevcut**. **Bu madde 2.4'ün kanıtıdır** — teşhis oraya işlendi. Resend doğrulaması (known-issues #1) bitene kadar Slack/Discord webhook daha güvenli seçim | 🟠 Yüksek |
| D-42 | Prod monitoring, test alert kurallarını da yüklüyor | `docker-compose.monitoring.prod.yml:83` alerting dizininin tamamını mount ediyor; dizinde `*.test.yml` dosyaları da var → prod Grafana `prometheus-test` UID'lerine bakan kuralları yükler, contact point UID'leri çakışır | 🟠 Yüksek |
| D-43 | Eksik alert kuralları | `alert-rules.yml` 6 kural içeriyor. Eksik: MSSQL/MinIO container down, disk %90 critical, yedek başarısızlığı (D-20), monitoring'in kendi sağlığı, SSL bitiş tarihi. `monitoring-setup.md:157-161` hâlâ 3 kural listeliyor | 🟡 Orta |
| D-44 | Prometheus/Loki retention ve limitler | `docker-compose.monitoring.*.yml:61` yalnız `--storage.tsdb.retention.time=30d`, **boyut tavanı yok**; Prometheus kendini/Grafana'yı/Loki'yi/MinIO'yu scrape etmiyor; Loki `limits_config`'te ingestion rate limit yok | 🟡 Orta |
| D-45 | Promtail sadece 2 container'ı topluyor | `infra/docker/promtail/promtail.{test,prod}.yml:19` — yalnız backend/frontend. MSSQL, MinIO ve monitoring logları hiç toplanmıyor. Ayrıca `:6` `positions.filename: /tmp/positions.yaml` volume'suz → her restart'ta pozisyon kaybı | 🟡 Orta |
| D-46 | Nginx eksikleri | `infra/nginx/cargopilot-test.conf` — `/api/` altında `client_max_body_size` **yok** (nginx default 1 MB → Excel/ERP import 413); `limit_req` yok (brute-force); HSTS/CSP/Referrer-Policy/Permissions-Policy yok; `:58` `proxy_read_timeout 60s` uzun optimizasyonda 504; gzip/brotli yok; `server_tokens off` yok | 🟠 Yüksek |
| D-47 | Prod nginx conf'u yok, setup script'i sabit test conf'u kopyalıyor | `infra/nginx/` yalnız `cargopilot-test.conf` içeriyor; `infra/scripts/setup-nginx.sh:12` sabit olarak onu gösteriyor → prod sunucusunda çalıştırılırsa prod domain'i test container'larına proxy eder. **Prod öncesi zorunlu** | 🟠 Yüksek |
| D-48 | `setup-nginx.sh` canlı config'i test etmeden üzerine yazıyor | `:52` `cp`, `:65` `nginx -t` — sıra ters; bozuk config yerinde kalır, sonraki reload nginx'i düşürür. Ayrıca `:72` `ufw status \| grep 443`, UFW pasifse `set -e` altında exit 1 → restart adımına hiç gelinmez | 🟡 Orta |
| D-49 | Healthcheck kapsamı eksik | `docker-compose.test.yml` 4 healthcheck; `docker-compose.monitoring.{test,prod}.yml` **0**. Frontend'de de yok. Grafana `depends_on: [prometheus, loki]` koşulsuz | 🟡 Orta |
| D-50 | `.env.prod.example` port ve path uyumsuzlukları | `:22` `FRONTEND_PORT=80` — nginx host'ta 80/443 dinliyor → port çakışması; `:46` `MINIO_PUBLIC_ENDPOINT=…/files` ama nginx'te tanımlı path `/media/` → tüm dosya linkleri 404. **Prod öncesi zorunlu** | 🟠 Yüksek |
| D-51 | Ölü konfigürasyon dosyaları | `infra/docker/minio/config/init-bucket.sh` ve `infra/docker/mssql/init/init.sql` hiçbir compose'da mount edilmiyor (`grep` sıfır sonuç) | 🟢 Düşük |

### 6.7 Doküman düzeltmeleri (kaynak §8)

| Kod | Dosya | Sorun | Durum |
|---|---|---|---|
| — | `known-issues.md:100` | "diğer container'larda log rotation tanımlı" ifadesi | ✅ Düzeltildi |
| — | `devops-backlog.md` 2.4 + `monitoring-setup.md:164` | "Contact point yok" — var; gerçek eksik SMTP | ✅ 2.4 düzeltildi · `monitoring-setup.md:164` **açık** |
| — | `devops-backlog.md` 1.2/1.3/1.4 | PR #908 ile kapandı | ✅ Düzeltildi |
| — | `monitoring-setup.md:157-161` | 3 kural yazıyor, dosyada 6 var | ⚠️ Açık |
| — | `server-requirements.md:43` | "MSSQL × 2 ≈ 4 GB" varsayımı D-39 ile çelişiyor | ⚠️ Açık |
| — | `secret-management.md:107-114` | `TEST_GHCR_*`'ı aktif secret olarak listeliyor — secret'lar silindi (D-07) | ⚠️ Açık |
| — | `server-access.md` | `SSH_HOST`/`SSH_PRIVATE_KEY` diyor; gerçek adlar `TEST_SSH_*` | ⚠️ Açık |
| D-24 | [`rollback-runbook.md`](rollback-runbook.md) | Rollback runbook'u yok | ✅ Yazıldı (#1017) |

### 6.8 Prod sunucusu kurulmadan önce zorunlu

**D-38, D-39, D-47, D-50** — bunlar olmadan prod stack kalkarsa ya port çakışır ya OOM olur.
Madde 2.1 (Production Stack Deploy) bu dördüne bağımlıdır.

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
| 2026-08-16 | **D-18** ERP `DIVIZYON` yedek kapsamına alındı — `backup-db.sh:41` `DATABASES` dizisi | #1012 |
| 2026-08-16 | **D-21** Prod cron'ları yalnız ortam hazırsa kuruluyor — `setup-backup-cron.sh:49` `ortam_hazir()` | #1012 |
| 2026-08-16 | **D-22** Parola okunamazsa sessiz çıkış kalktı — üç script'te `$(grep … \|\| true)` | #1012 |
| 2026-08-16 | **D-23** Yedek izinleri sıkılaştırıldı — `umask 077`, dizin `700`, dosya `600` | #1012 |
| 2026-08-16 | **D-25** Yedeksiz rollback artık duruyor; `--skip-backup` bilinçli kaçış yolu | #1012 |
| 2026-08-16 | **D-14** `rollback.yml` girdileri `env:` üzerinden geçiyor, shell injection kapandı | #1016 |
| 2026-08-17 | **D-24** Rollback runbook'u yazıldı — migration matrisi ve tatbikat senaryoları | #1017 |
| 2026-08-17 | **D-26** Deploy `down`'sız tek `up` — kesinti 2-3 dk'dan **2,8 sn**'ye | #1017 |
| 2026-08-17 | **D-27** Health başarısızsa otomatik geri alma — `PREV_IMAGE_REF` çıpası, ADR-0009 | #1017 |
| 2026-08-17 | **D-28** `docker image prune` health OK'ten sonraya alındı | #1017 |
