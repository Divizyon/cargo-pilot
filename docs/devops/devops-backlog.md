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
| 16 | Kaynak limitleri — D-39 ✅ (#1044); **D-38 kısmi**: bellek ✅, `cpus`/`pids_limit` açık | 🔴 Kritik | ⚠️ Kısmi |
| 17 | Prod öncesi zorunlular — D-47 ✅ (#1043+#1045), D-50 ✅ (#1043) | 🟠 Yüksek | ✅ Kapandı |
| 18 | Rollback güvenliği — D-24, D-25, D-27 ✅ (#1012, #1017); kalan **D-29 (tatbikat)** | 🟠 Yüksek | ⚠️ Açık |
| 19 | .NET 8 → .NET 10 LTS geçişi — D-32b, EOL **2026-11-10** | 🔴 Kritik (tarihe bağlı) | ⚠️ Açık — planlama |

Kategori 6, 2026-08-03 taramasının **17 açık** D-bulgusunu D-kodlarıyla birlikte listeler
(51'den 34'ü kapandı); yukarıdaki matris yalnızca kritik kümeleri özetler. §6.9 önceki
taramada olmayan, uygulama sırasında bulunan yedi yeni kalemi tutar.

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
bölümüne taşındı. **İkinci tur (2026-08-18, Faz 1 + Faz 4):** 13 bulgu daha kapandı —
D-08, D-30, D-31, D-32, D-33, D-34, D-37, D-39, D-46, D-47, D-48, D-49, D-50
(PR #1043, #1044, #1045, #1046, #1047, #1048, #1049). D-38 **kısmen** kapandı.
**Üçüncü tur (2026-08-18, Faz 5/6/8):** 5 bulgu daha kapandı — D-42, D-51 (#1053);
D-06, D-12, D-45 (#1054). D-13(c) **kısmen** kapandı (#1054); D-13(a) daha önceden
kapanmıştı, bugün 48/48 action SHA-pinli olarak yeniden doğrulandı. D-15 kapsamı netleşti
(#1055) ama kapanmadı — maruziyet daraltıldı, kalan zarar sürüyor. D-09 için karar verildi
(kaldırılsın); uygulama paralel bir ajanda, henüz PR yok.

**Kalan: 17 açık bulgu** — 5 kritik, 5 yüksek, 5 orta, 2 düşük.
Prod kapısının dört maddesinden dördü de kapandı; **madde 2.1 teknik olarak açık**
(sunucu teyidi için bkz. §6.8).

### 6.1 Güvenlik

| Kod | Bulgu | Bugünkü kanıt (2026-08-16) | Öncelik |
|---|---|---|---|
| D-02 | Servis portları internete açık — **kısmen kapandı (#991), sonra kısmen yeniden açıldı** | Kalan: `docker-compose.monitoring.test.yml:89` Grafana `3002:3000`; `docker-compose.test.yml:127` ERP MSSQL `1435:1433` — bu ikincisi **#938 ile geldi** ve loopback'e bağlanmamış tek port (diğer 5'i `127.0.0.1:` önekli). `profiles: ["e2e"]` arkasında ama `--profile e2e` verilirse dışarı açılır | 🔴 Kritik |
| D-15 | Workflow'da hardcoded fallback parolalar — **kapsamı netleşti (#1055)** | `docs/devops/secret-management.md:113-146` envanteri: 22 secret referansından **6'sı tanımlı**, **9'u tanımsız-fallback'li** (`test-deploy.yml:172,175,176,179,183-187,293,296,297,299`). **Maruziyet daraltıldı:** fallback'ler yalnız runner içinde yaşayan geçici stack'i besliyor (`deploy` + `e2e-smoke` job'ları, her run sonunda `docker compose down -v` ile siliniyor); gerçek `deploy-test-server` sunucusu kendi `infra/env/.env.test`'ini kullanıyor, hiç etkilenmiyor. **Asıl zarar kalıcı:** secret hiç tanımlanmamış olsa da iş yeşil geçiyor — eksikliğin fark edilmesini engelliyor, fallback'i koddan kaldırmak ayrı bir sonraki iş | 🟠 Yüksek |
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
| D-09 | `ci.yml`'daki `docker-build` job'u — **karar verildi: kaldırılacak** | Bugün yalnızca `dev` PR'ında koşuyor (`ci.yml:192,202`). Kullanıcı kararı: bu ikinci build'in değeri yok, kaldırılsın. Paralel bir ajan uyguluyor; **PR numarası henüz yok** | 🟢 Düşük |
| D-13 | Küçük CI kalemleri | **(a) kapandı** — 48/48 GitHub Action kullanımı SHA-pinli doğrulandı (`grep -c` ile yeniden sayıldı, 2026-08-18); `build-push-action` artık 8 kullanımın tamamında v7.3.0 (PR #1032, ADR-0008'in öngördüğü devralma). **(b) ölçülerek ertelendi** — `setup-dotnet`'te NuGet cache yok (`ci.yml:168`, `test-deploy.yml:48`); `dotnet restore` bugün yalnız ~8 sn sürüyor, cache eklense girdi başına ~200 MiB **(tahmin)** × ~27 aktif ref ≈ 5,4 GiB **(tahmin)** ek yük — kota zaten %82 dolu, bu %32'ye yakın ek aşım demek. Ayrıca `setup-dotnet`'in `cache: true`'su `packages.lock.json` istiyor, repoda hiç yok. Yeniden açma koşulu: lock dosyalarına geçilirse **ve** kota belirgin biçimde düşerse. **(c) kısmen kapandı (#1054)** — `migration-check` artık yalnız `dotnet restore apps/backend/CargoPilot.WebAPI/CargoPilot.WebAPI.csproj` (`test-deploy.yml:56,58`) çalıştırıyor, tüm solution'ı değil. **Tam tekilleştirme açık kalıyor:** `migration-check` (`test-deploy.yml`) ve `backend-ci` (`ci.yml`) farklı workflow dosyalarında, `needs:` yalnız aynı workflow içinde çalıştığı için iki job birleştirilemiyor. **(d) borç değil, ADR revize edildi** — ADR-0007'nin kendi yazdığı yeniden değerlendirme koşulu (#1047 ile restore/publish ayrı katmanlara bölündü) gerçekleşti; **ADR-0011** ölçerek backend'in `mode=min`'de kalmasına karar verdi (gerekçe değişti: artık ölçülmüş bir değer var — restore katmanı CACHED dönüyor — ama GHA kotası [`node-cache` tek başına kotanın %44,7'si] kaldırmıyor), frontend `mode=max` aynen sürüyor | 🟡 Orta |

### 6.5 Docker image ve build

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-35 | Docker build'de statik analiz koşuyor — **gerekçeli ertelendi** (#1049) | `Directory.Build.props:20,26,52`. Tuzak doğrulandı: `test-deploy.yml` build job'unda `needs: [backend-ci]` **eklenemiyor** — iki job farklı workflow'da, `needs:` yalnız aynı workflow içinde çalışır. Analyzer build'den çıkarılırsa `test` push'unda kalite kapısı sessizce kalkar. İki çözüm yolu **PR #1049 gövdesinde** yazılı; biri seçilmeden dokunulmamalı | 🟡 Orta |
| D-36 | Tek parça ~3.35 MB JS chunk | `apps/frontend/src/router.tsx` — `lazy(` sayısı **0**; three.js + recharts + xlsx + framer-motion + 37 sayfa tek chunk'ta. Frontend task'ı, Docker task'ı değil | 🟡 Orta |

### 6.6 Altyapı ve gözlemlenebilirlik

| Kod | Bulgu | Bugünkü kanıt | Öncelik |
|---|---|---|---|
| D-38 | Kaynak limitleri — **kısmen kapandı** (#1044) | Bellek tarafı kapandı: 22 servis tanımının tamamında `mem_limit` var (12 benzersiz servis, test 12 / prod 10). **Kalan:** `cpus` ve `pids_limit` hiçbir serviste yok — `grep -rn 'cpus\|pids_limit' infra/compose/` boş döner. CPU açlığı ve fork bombası hâlâ korumasız | 🔴 Kritik |
| D-40 | Log rotation hiçbir serviste yok | `infra/` altında `logging:`/`max-size` hiç geçmiyor — 16 servisin tamamı etkileniyor. **known-issues #7 ile aynı konu**; o madde kapsamı bu bulguya göre düzeltilmişti. ⚠️ Sunucuda `/etc/docker/daemon.json` global rotation olabilir, önce bakılmalı | 🟠 Yüksek |
| D-41 | Grafana SMTP hiç yapılandırılmamış | `infra/` altında `GF_SMTP` hiç geçmiyor; contact point ve notification policy dosyaları **mevcut**. **Bu madde 2.4'ün kanıtıdır** — teşhis oraya işlendi. Resend doğrulaması (known-issues #1) bitene kadar Slack/Discord webhook daha güvenli seçim | 🟠 Yüksek |
| D-43 | Eksik alert kuralları | `alert-rules.yml` 6 kural içeriyor. Eksik: MSSQL/MinIO container down, disk %90 critical, yedek başarısızlığı (D-20), monitoring'in kendi sağlığı, SSL bitiş tarihi. `monitoring-setup.md:157-161` hâlâ 3 kural listeliyor | 🟡 Orta |
| D-44 | Prometheus/Loki retention ve limitler | `docker-compose.monitoring.*.yml:61` yalnız `--storage.tsdb.retention.time=30d`, **boyut tavanı yok**; Prometheus kendini/Grafana'yı/Loki'yi/MinIO'yu scrape etmiyor; Loki `limits_config`'te ingestion rate limit yok | 🟡 Orta |

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

### 6.8 Prod sunucusu kurulmadan önce zorunlu — ✅ dört madde de kapandı

**D-38, D-39, D-47, D-50** kapandı; madde 2.1 (Production Stack Deploy) **teknik olarak
açık**. Kapanış kanıtları:

| Kod | PR | Kanıt |
|---|---|---|
| D-38 | #1044 | 22 servis tanımının tamamında `mem_limit` — *bellek tarafı*; `cpus`/`pids_limit` ayrı kalem olarak §6.6'da açık |
| D-39 | #1044 | `MSSQL_MEMORY_LIMIT_MB` ana MSSQL servislerinde, container tavanının altında |
| D-47 | #1043 + #1045 | `cargopilot-prod.conf` yaratıldı **ve** `setup-nginx.sh` ortam/domain parametresi alacak şekilde yeniden yazıldı — prod conf artık ulaşılabilir |
| D-50 | #1043 | `.env.prod.example` port ve MinIO yolu nginx conf'u ile hizalandı |

> ⚠️ **Sunucuda teyit gerektirenler.** Kapanış dosya düzeyindedir; aşağıdakiler ilk prod
> kurulumunda doğrulanmalı:
> - Bellek limitlerinin toplamı gerçek sunucu RAM'ine sığıyor mu (değerler varsayımla konuldu).
> - `setup-nginx.sh prod --domain <domain>` gerçek sunucuda koşuyor mu; `--dry-run` ile önce denenmeli.
> - Self-signed sertifika prod'da kabul edilebilir mi — script prod'da uyarı basıyor ama üretiyor.
> - Monitoring healthcheck'leri gerçek imajlarda geçiyor mu (probe'lar imaj başına ayrı seçildi).

---

### 6.9 İkinci ve üçüncü turdan çıkan yeni kalemler (2026-08-18)

Faz 1/4 ve Faz 5/6/8 sırasında bulunan, önceki taramada olmayan maddeler.

| Kalem | Bulgu | Öncelik |
|---|---|---|
| **Y-01 · `cpus` / `pids_limit` yok** | D-38'in kapanmayan yarısı. 22 servis tanımının hiçbirinde CPU veya süreç limiti yok (`grep -rn 'cpus\|pids_limit' infra/compose/` boş). Bellek limiti tek başına CPU açlığını ve fork bombasını engellemez | 🟠 Yüksek |
| **Y-02 · Cloudflare 524** | Nginx `proxy_read_timeout` uzatıldı (D-46), ama Cloudflare kendi **100 sn**'lik origin timeout'unda **524** döndürüyor. Uzun optimizasyon koşusu için nginx tarafındaki iyileştirme kullanıcıya ulaşmıyor. Çözüm ya asenkron iş modeli ya Cloudflare tarafında ayar | 🟠 Yüksek |
| **Y-03 · D-33 canlıda doğrulanmadı** | `imagetools create` yerelde doğrulandı; **gerçek GHCR'a karşı koşmadı**. İlk `sync-base-images` koşumunda `docker buildx imagetools inspect ghcr.io/divizyon/cargo-pilot-dotnet-sdk:8.0` ile multi-arch manifest'in korunduğu teyit edilmeli | 🟡 Orta |
| **Y-04 · Perf taban çizgisi elle güncellenecek** | `PerformansTabanCizgisiTests` eşikleri bugünkü **regresyonlu** WeightBalance ölçümünü (29 sn) taban alıyor. F2-01 süreyi 11,4 sn'ye çektiğinde eşik otomatik daralmaz — taban çizgisi **elle** güncellenmeli, yoksa regresyon penceresi 2 kat yerine 5 kat açık kalır | 🟡 Orta |
| **Y-05 · `node-cache` kotanın yarısını götürüyor, temizlik ona dokunamıyor** | Ölçüm (2026-08-18, `gh api .../actions/caches`): `node-cache-Linux-x64-npm-*` → 60 giriş / **4,468 GiB = kotanın %44,7'si** (toplam 284 giriş / 8,210 GiB / 10 GiB = %82,1). `cache-cleanup.yml`'nin boyut adımı yalnız `select(.key|startswith("buildkit-blob"))` filtresiyle çalışıyor, `node-cache` hiç süzülmüyor. Kök neden: `package-lock.json` aynı olsa bile her branch ve her PR ref'i kendi ~76 MiB kopyasını yazıyor. **Kullanıcı onayladı, paralel ajan uyguluyor:** (a) temizlik filtresine `node-cache` eklenmesi, (b) `setup-node`'un dahili cache'inin `cache/restore` (her zaman) + `cache/save` (yalnız default branch) olarak bölünmesi | 🟠 Yüksek |
| **Y-06 · `ci.yml`'de `concurrency` grubu yok** | Aynı branch'e hızlı ardışık push'lar tam CI'ı baştan koşuyor (`feat/algoritma-arama-katmani`'nda 8 koşum, ikisi saniyeler arayla). Private repoda doğrudan fatura kalemi. **Kullanıcı onayladı, paralel ajan uyguluyor** — `cancel-in-progress` yalnız `pull_request` olaylarında, aksi hâlde korunan dallarda zorunlu check `cancelled` kalıp merge'i bloke eder | 🟠 Yüksek |
| **Y-07 · promtail `mem_limit: 128m` gözden geçirilmeli** | D-45 sonrası 2 yerine ~8 container scrape edilecek; limit #1044 ile konuldu ve o zamanki kapsamı (2 container) yansıtıyor, D-45'in genişlettiği kapsamı değil | 🟡 Orta |

---

### 6.10 .NET 8 → .NET 10 LTS geçişi (D-32b)

{% hint style="danger" %}
**⚠️ Açık — yalnız planlama, geçiş kendisi başka bir görevdedir**
{% endhint %}

**Bağlam:** D-32'nin stratejik kısmı. .NET 8'in Microsoft desteği **2026-11-10**'da bitiyor;
bu maddenin yazıldığı tarih (2026-08-18) itibarıyla **~12 hafta** kaldı. .NET 10, Kasım 2025'te
çıkan bir sonraki LTS'dir (STS olan .NET 9 atlanıyor). F4-03 kapsamında yalnızca bu backlog
maddesi yazıldı; geçişin kendisi **yapılmadı** (F4-03 kapsam dışı).

**Kapsam (bugünkü kod tabanına göre doğrulandı):**

- 7 `.csproj` dosyası `net8.0` hedefliyor → `net10.0`'a çekilmeli: `CargoPilot.Domain`,
  `CargoPilot.Application`, `CargoPilot.Infrastructure`, `CargoPilot.WebAPI`,
  `CargoPilot.Engine.Tests`, `CargoPilot.Infrastructure.Tests`,
  `tests/CargoPilot.Application.Tests`.
- `Microsoft.AspNetCore.*` / `Microsoft.EntityFrameworkCore.*` NuGet paketleri (2 proje —
  muhtemelen `WebAPI` ve `Infrastructure`) 8.x → 10.x major sürüme çekilmeli; ikisi de
  runtime ile aynı major olmak zorunda.
- CI: `.github/workflows/ci.yml:170` ve `.github/workflows/test-deploy.yml:50` —
  `dotnet-version: '8.0.x'` → `'10.0.x'`.
- `apps/backend/Directory.Build.props` — `LangVersion: latest` zaten ileri sürüme otomatik
  uyar, ama `TreatWarningsAsErrors` + SonarAnalyzer 10.32 altında yeni SDK'nın getirdiği
  analyzer kuralları derlemeyi kırabilir (bu dosya F4-04'ün alanı, değişiklik oraya düşer).
  Backend'de artık aktif olarak kullanılan `EnforceCodeStyleInBuild` bu geçişte ayrıca
  gözden geçirilmeli.
- `sync-base-images.yml` (bu PR'da `imagetools create`'e geçirildi, D-33) — `dotnet/sdk:10.0`
  ve `dotnet/aspnet:10.0` için yeni bir senkron adımı eklenmeli; `apps/backend/Dockerfile`
  `${DOTNET_SDK_IMAGE}`/`${DOTNET_ASPNET_IMAGE}` build-arg'larını `:10.0` etiketine çekmeli
  (Dockerfile F4-02'nin alanı).
- Regresyon: Domain/Application/Infrastructure/WebAPI test projelerinin tamamı yeşile
  çekilmeli; EF Core major sürüm atlaması migration davranışında (ör. query translation,
  konvansiyon değişiklikleri) sessiz farklara yol açabilir.

**Riskler:**

- EF Core 8→10 major atlaması, mevcut migration'larda veya LINQ sorgu çevirisinde davranış
  farkına yol açabilir — mutlaka staging'de gerçek veriyle regresyon gerektirir.
- ASP.NET Core middleware/minimal API pipeline'ında breaking change olasılığı (her majörde
  olağan) — auth/CORS/rate-limit gibi hassas orta katmanlar önceliklendirilmeli.
- Yeni SDK'nın analyzer/SonarAnalyzer seti `TreatWarningsAsErrors` altında derlemeyi
  kırabilir; bu geçiş F4-04 (`Directory.Build.props`) ile koordine edilmeli.
- `sync-base-images.yml` → yeni `:10.0` mirror'ı olmadan `apps/backend/Dockerfile` build
  edilemez; sıralama önemli (önce base image sync, sonra Dockerfile build-arg güncellemesi).
- Rollback: ADR-0009 (health-check sonrası otomatik geri alma) bu geçişte de geçerli olmalı;
  major runtime atlaması sonrası ilk deploy için rollback provası (D-29 ile aynı disiplin)
  önerilir.
- Downtime riski düşük (aynı deploy pipeline'ı kullanılıyor) ama regresyon riski yüksek —
  major sürüm atlaması, tek tek patch güncellemesi değil.

**Efor tahmini (tümü tahmin, gerçek efor keşif sonrası netleşir):**

| Adım | Tahmini efor |
|---|---|
| NuGet/SDK sürüm bump + derleme hatalarının giderilmesi | ~1–2 gün (tahmin) |
| Test suite'in (7 proje) yeşile çekilmesi + EF Core regresyon kontrolü | ~1 gün (tahmin) |
| CI + `sync-base-images.yml` + Dockerfile build-arg zinciri güncellemesi | ~0.5–1 gün (tahmin) |
| Staging QA + rollback provası | ~1 gün (tahmin) |
| **Toplam** | **~3.5–5 iş günü (tahmin)** |

**Zamanlama önerisi:** EOL'e (2026-11-10) ~12 hafta var. Planlama ve bağımlılık taraması
(NuGet paket uyumluluğu, breaking change listesi) şimdi başlamalı; hedef, EOL'den en az
2-3 hafta önce (Ekim sonu) production'da .NET 10 üzerinde olmak — böylece beklenmedik bir
regresyon çıkarsa müdahale için tampon süre kalır.

---

## Private repo geçişi

{% hint style="warning" %}
**⚠️ Planlama — geçiş tarihi henüz kesin değil**
{% endhint %}

Depo yakında **private bir repoya, geçmiş olmadan, sıfırdan tek ilk commit** olarak
taşınacak. Bu, sıradan bir `git clone` + push değil — GitHub'ın repo geçmişine bağlı
tüm mekanizmaları sıfırlanır. Aşağıdaki liste, taşınmadan önce planlanması gereken
kayıpları ve maliyet kalemlerini kaydeder.

### Geçişte kaybolacaklar

- **17 sürüm tag'i, 6 GitHub Release, 28 `archive/*` tag'i** — `gh api /repos/Divizyon/cargo-pilot/tags`
  ve `.../releases` ile bugün doğrulandı (45 toplam tag = 17 sürüm + 28 `archive/*`; 6 release).
  GHCR'daki `v0.11`–`v0.17` imaj etiketleri de yeni repoda karşılıksız kalır (bu imajlar
  bugünkü org/paket altında duruyor, ancak yeni repo farklı bir görünürlük/paket ağacına
  taşınacaksa erişim yeniden kurulmalı) → **v0.11 ve sonrası için rollback yeteneği gidiyor.**
  D-29 (rollback tatbikatı) geçişten **önce** yapılmalı, ya da yeni repoda imaj/tag
  stratejisi baştan kurulmalı — hangisi önce olursa.
- **Dependabot ve CodeQL alert geçmişi sıfırlanır.** Yeni repo, güvenlik taramalarına
  temiz bir sayfa ile başlar; bugünkü açık/kapalı alert kaydı taşınmaz.
- **GHA cache sıfırlanır** (bugün 284 giriş / 8,21 GiB — `gh api /repos/Divizyon/cargo-pilot/actions/cache/usage`,
  2026-08-18). Bu bir kayıp değil bir fırsat: `cache-seed.yml` (D-06) ilk günden itibaren
  default branch cache'ini besleyeceği için soğuk-başlangıç sorunu bu kez hiç yaşanmaz.
- **Actions dakikaları ücretli hale gelir.** Public repo'da GitHub Actions dakikaları
  sınırsız/ücretsizdi; private repoda plana bağlı bir kotaya ve faturaya döner. Bu, CI
  süresini kısaltan her iş kalemini (D-12, Y-06, gelecekteki paralelleştirme) bir performans
  iyileştirmesinden bir **maliyet kalemine** çevirir.
- **Gerekçesi düşen kalemler:** OpenSSF Scorecard'a bağlı maddeler private repoda anlamını
  yitirir (Scorecard yalnızca public repoları puanlar) — `LICENSE` maddesi zaten yapıldı
  (✅), CODEOWNERS/zorunlu review kararı da bu gerekçeyle yeniden değerlendirilebilir. Git
  geçmişi temizliği (`git filter-repo` ile SA parolasının geçmişten silinmesi, madde 2.6)
  de anlamsızlaşır — sıfırdan tek commit zaten geçmişi siliyor.

### Gerekçesi DÜŞMEYEN kalemler

- **SA parola rotasyonu (madde 2.6).** Parola **zaten** public repoda açığa çıktı; taşınma
  bunu geri almaz, yalnızca geleceğe kapı kapatır. Rotasyon hâlâ zorunludur.
- **Sunucu tarafı maruziyet** (D-15'in gerçek zararı, `.env.test`/`.env.prod` dosyaları,
  SSH erişimi vb.) — repo geçmişiyle ilgisiz, sunucuda duruyor.
- **Yedekleme boşlukları** (D-03, D-04, D-20) — repo taşınmasıyla hiçbir ilgisi yok.

### Yeni repoda minimum secret kümesi

Yeni repoda hangi secret'ların tanımlanması gerektiği ayrıca çıkarılmadı — bu envanter
zaten `docs/devops/secret-management.md`'nin **"Yeni Repoya Geçiş — Minimum Secret Kümesi"**
bölümünde (satır 296+) mevcut ve güncel (#1055); burada tekrarlanmıyor, doğrudan oraya
bakılmalı.

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
| 2026-08-18 | **D-46** Nginx sertleştirme — `limit_req`, HSTS, CSP, gzip, `server_tokens`, `/api/` `client_max_body_size` | #1043 |
| 2026-08-18 | **D-50** `.env.prod.example` port ve MinIO yolu nginx conf'u ile hizalandı | #1043 |
| 2026-08-18 | **D-39** `MSSQL_MEMORY_LIMIT_MB` ana MSSQL servislerinde, container tavanının altında | #1044 |
| 2026-08-18 | **D-47** Prod nginx conf'u yaratıldı **ve** `setup-nginx.sh` ortam/domain parametresi alıyor | #1043 + #1045 |
| 2026-08-18 | **D-48** Config geçici dizine render edilip izole `nginx -t` ile doğrulanıyor; ancak geçerse canlıya kopyalanıyor, başarısızsa yedekten geri alınıyor | #1045 |
| 2026-08-18 | **D-49** Monitoring 12 servise healthcheck; probe'lar imaj başına seçildi, Grafana `depends_on` `service_healthy` oldu | #1045 |
| 2026-08-18 | **D-08** `normal.jpg` gerçekte 16-bit PNG'ydi, gerçek JPEG'e kodlandı | #1046 |
| 2026-08-18 | **D-30** Backend Dockerfile csproj-only restore katmanı + `--no-restore` | #1047 |
| 2026-08-18 | **D-34** Frontend `npm install` → `npm ci` | #1047 |
| 2026-08-18 | **D-33** `sync-base-images` `pull`+`tag`+`push` → `buildx imagetools create`; multi-arch manifest korunuyor | #1048 |
| 2026-08-18 | **D-31** Frontend base image `nginx:1.31-alpine` → `alpine-slim` (imaj 33 MB) | #1048 |
| 2026-08-18 | **D-32** Sync cron'u patch döngüsüne yaklaştırıldı; stratejik kısım §6.9'a ayrıldı | #1048 |
| 2026-08-18 | **D-37** `.dockerignore` hijyeni genişletildi (frontend + backend) | #1049 |
| 2026-08-18 | **D-42** Prod monitoring alerting mount'u dosya bazlı ayrıldı — prod artık yalnız kendi 6 kuralını yüklüyor (eskiden 12: 6 kendi + 6 test'in, test kuralları `prometheus-test` UID'ine bakıyordu); repo toplamı 12 kural korundu | #1053 |
| 2026-08-18 | **D-51** Ölü konfigürasyon dosyaları silindi — `infra/docker/minio/config/init-bucket.sh` ve `infra/docker/mssql/init/init.sql` (yalnız TODO yorumu, gövde yok); işlevleri `MinioStorageService.cs:66` `EnsureBucketExistsAsync()` ve `DbInitializer.cs:28` `Database.MigrateAsync()` ile karşılanıyor | #1053 |
| 2026-08-18 | **D-12** `docker-build`'in `needs: [frontend-ci, backend-ci]` zinciri kaldırıldı — `ci.yml` PR→dev duvar saati 363 → 238 sn (−%34, 4 koşum ölçümü) | #1054 |
| 2026-08-18 | **D-06** Nightly `cache-seed.yml` eklendi — default branch'te frontend `mode=max` cache'i besleniyor, iki katmanlı kota koruması (her koşumda prune + 9 GiB valfi) | #1054 |
| 2026-08-18 | **D-45** Promtail tüm `cargo-pilot-*` container'larını topluyor (canlı Loki ile doğrulandı: `cargo-pilot-loki-test` ingest edildi, `-prod` ve promtail'in kendisi filtrelendi); `positions.filename` kalıcı bind mount'a taşındı | #1054 |
