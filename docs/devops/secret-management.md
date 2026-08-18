# Secret Yönetimi

**Son güncelleme:** 2026-08-18 · **Durum:** Aktif · **Görev:** US-D23-S, F8-04

Bu doküman repoya girmemesi gereken secret'ları, ortam dosyalarının konumunu, GHCR/CI-CD secret'larını ve bir secret ihlali durumunda izlenecek adımları açıklar.

{% hint style="danger" %}
**F8-04 envanteri (2026-08-18):** Workflow'lar **22** benzersiz `secrets.*` adına atıfta
bulunuyor, repoda **6** tanesi tanımlı. Denetimde (F8 audit) bu oran 19/8'di —
**makas kapanmadı, açıldı.** Aşağıdaki "Envanter ve Sınıflandırma" bölümü 22 adın tamamını
kapsar. Bu görev sırasında hiçbir secret DEĞERİ okunmadı veya yazılmadı; yalnızca
"tanımlı/tanımsız" bilgisiyle çalışıldı (`gh secret list`, `gh api .../environments`,
workflow kaynak kodu, `gh run view --log` maskeleme durumu).
{% endhint %}

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

### Envanter ve Sınıflandırma (22 ad — 2026-08-18)

Sınıflar: **tanımlı** (repo seviyesinde `gh secret list`'te görünüyor) · **tanımsız-fallback'li**
(secret yok ama workflow'da `secrets.X || 'literal'` deseni var, iş yeşil geçer ama fallback
değeri fiilen kullanılır) · **tanımsız-boş** (fallback yok, değer boş string olarak enjekte
edilir, iş kırılmaz ama özellik sessizce bozulur) · **tanımsız-iş atlanıyor** (workflow kendi
kontrolüyle adımı atlar, iş yeşil kalır) · **tanımsız-iş kırılıyor** (fallback yok, iş kırmızı
biter) · **otomatik** (GitHub tarafından sağlanır, repo secret olarak tanımlanmaz) ·
**variable olmalı** (gizli değil, secret olarak tutmak yanlış).

| # | Ad | Kullanıldığı yer | Tanımlı mı | Tanımsızsa sonuç | Sınıf |
|---|----|--------------------|:----------:|-------------------|-------|
| 1 | `JWT_SECRET` | `test-deploy.yml:181,300` | ✅ | — | tanımlı |
| 2 | `PROMOTION_PAT` | `promote.yml:71,142` | ✅ | — | tanımlı |
| 3 | `TEST_SSH_HOST` | `test-deploy.yml:435`, `rollback.yml:68` | ✅ | — | tanımlı |
| 4 | `TEST_SSH_PRIVATE_KEY` | `test-deploy.yml:437`, `rollback.yml:70` | ✅ | — | tanımlı |
| 5 | `VITE_API_BASE_URL` | `test-deploy.yml:139,232` (frontend build-arg) | ✅ | — | tanımlı → **variable olmalı** |
| 6 | `VITE_OAUTH_GOOGLE_URL` | `test-deploy.yml:140,233` (frontend build-arg) | ✅ | — | tanımlı → **variable olmalı** |
| 7 | `VITE_OAUTH_MICROSOFT_URL` | `test-deploy.yml:141,234` (frontend build-arg) | ❌ | `--build-arg VITE_OAUTH_MICROSOFT_URL=` boş enjekte edilir (log'da doğrulandı); Microsoft OAuth butonu sessizce boş URL'e gider | tanımsız-boş → **variable olmalı** |
| 8 | `TEST_MSSQL_SA_PASSWORD` | `test-deploy.yml:172,293` | ❌ | hardcoded fallback kullanılır (D-15) | tanımsız-fallback'li |
| 9 | `TEST_MINIO_ROOT_USER` | `test-deploy.yml:175,296` | ❌ | hardcoded fallback kullanılır (D-15) | tanımsız-fallback'li |
| 10 | `TEST_MINIO_ROOT_PASSWORD` | `test-deploy.yml:176,297` | ❌ | hardcoded fallback kullanılır (D-15) | tanımsız-fallback'li |
| 11 | `SEED_DEFAULT_ADMIN_PASSWORD` | `test-deploy.yml:179,299,388` (ayrıca E2E admin login) | ❌ | hardcoded fallback kullanılır (D-15) | tanımsız-fallback'li |
| 12 | `RESEND_API_KEY` | `test-deploy.yml:183` (`deploy` job; `e2e-smoke` job'da zaten literal, secret'a hiç bakmıyor) | ❌ | hardcoded fallback kullanılır (D-15) | tanımsız-fallback'li |
| 13 | `RESEND_FROM_EMAIL` | `test-deploy.yml:184` | ❌ | hardcoded fallback kullanılır | tanımsız-fallback'li (gizli değil, variable adayı) |
| 14 | `RESEND_FROM_NAME` | `test-deploy.yml:185` | ❌ | hardcoded fallback kullanılır | tanımsız-fallback'li (gizli değil, variable adayı) |
| 15 | `PASSWORD_RESET_FRONTEND_URL` | `test-deploy.yml:186` | ❌ | hardcoded fallback kullanılır | tanımsız-fallback'li (gizli değil, variable adayı) |
| 16 | `EMAIL_CHANGE_FRONTEND_CONFIRM_URL` | `test-deploy.yml:187` | ❌ | hardcoded fallback kullanılır | tanımsız-fallback'li (gizli değil, variable adayı) |
| 17 | `GITHUB_TOKEN` | `test-deploy.yml`, `ci.yml`, `promote.yml`, `release-tag.yml`, `cache-cleanup.yml`, `sync-base-images.yml` | n/a | — | **otomatik** — GitHub her run'da otomatik sağlar, `gh secret list` göstermez, repo secret olarak eklenmez |
| 18 | `PROD_SSH_HOST` | `rollback.yml:91` | ❌ | fallback yok → `prod` hedefiyle manuel dispatch edilirse ssh-action adımı kırmızı biter | tanımsız-iş kırılıyor → **environment'a taşınmalı (`prod`)** |
| 19 | `PROD_SSH_PRIVATE_KEY` | `rollback.yml:93` | ❌ | aynı — iş kırılıyor | tanımsız-iş kırılıyor → **environment'a taşınmalı (`prod`)** |
| 20 | `ALGO_SUITE_API_URL` | `algorithm-suite.yml:71,104` | ❌ | `if [ -z ... ]` kontrolü `configured=false` üretir, adım atlanır, iş **yeşil** kalır (satır 66-67 yorumu: "zamanlanmış iş yapılandırılmamış diye kırmızı yanmamalı") | tanımsız-iş atlanıyor (tanımlanması **F8-03** kapsamında, kapsam dışı) |
| 21 | `ALGO_SUITE_EMAIL` | `algorithm-suite.yml:72,105` | ❌ | aynı — atlanıyor | tanımsız-iş atlanıyor (F8-03) |
| 22 | `ALGO_SUITE_PASSWORD` | `algorithm-suite.yml:73,106` | ❌ | aynı — atlanıyor | tanımsız-iş atlanıyor (F8-03) |

**Ölü ad:** Bu 22'nin içinde yok. `TEST_GHCR_PAT`/`TEST_GHCR_USER` zaten workflow'lardan
çıkarılmış ve repodan silinmiş durumda (aşağıdaki "Kaldırılan secret'lar" bölümü zaten
güncel) — bu envanterde ayrıca listelenmiyor çünkü artık hiçbir `.github/workflows/*.yml`
onlara atıfta bulunmuyor.

### Sunucu erişimi

| Secret | Nerede kullanılıyor | Ne işe yarar |
|--------|---------------------|--------------|
| `TEST_SSH_HOST` | `test-deploy.yml` (deploy + health check), `rollback.yml` | Test sunucusunun IP'si |
| `TEST_SSH_PRIVATE_KEY` | `test-deploy.yml`, `rollback.yml` | Test sunucusuna SSH deploy key'i |
| `PROD_SSH_HOST` | `rollback.yml` | Prod sunucusu IP'si — **henüz tanımlı değil**, prod stack kurulmadı |
| `PROD_SSH_PRIVATE_KEY` | `rollback.yml` | Prod SSH deploy key'i — **henüz tanımlı değil** |

{% hint style="warning" %}
**Environment'a taşıma önerisi:** `PROD_SSH_HOST` / `PROD_SSH_PRIVATE_KEY` repo seviyesi
yerine `prod` GitHub environment'ına tanımlanmalı. Bugün `prod` environment'ı
`required_reviewers` korumasıyla var ama içinde **hiç secret yok** — yani koruma şu an
yalnızca boş bir onay diyaloğu, korunan bir kaynak yok. Bu iki secret `prod`'a taşınınca
required-reviewer onayı gerçek bir kapıya dönüşür: prod sunucusuna SSH erişimi, onaysız
tetiklenemez hâle gelir. (`test`, `prod`, `copilot` — üç environment de bugün 0 secret
içeriyor; bu öneri yalnızca `PROD_SSH_*` içindir.)
{% endhint %}

### Geçici stack (runner içi doğrulama) — D-15

Bu değerler `test-deploy.yml`'in `deploy` ve `e2e-smoke` job'larında **runner üzerinde
ayağa kaldırılan geçici stack'e** verilir; bu stack her run'ın sonunda `docker compose down -v`
ile yok edilir (satır 273) — **gerçek test sunucusunu etkilemez**, sunucudaki değerler
`/opt/cargo-pilot/infra/env/.env.test`'ten gelir (bkz. aşağıdaki bilgi kutusu).

{% hint style="danger" %}
**D-15'in gerçek kapsamı (2026-08-18 doğrulandı):** Aşağıdaki 7 secret'ın hiçbiri repoda
tanımlı değil (`gh secret list`) ve hepsinin workflow'da `secrets.X || 'literal'` fallback'i
var (`test-deploy.yml:172,175,176,179,183-187,293,296,297,299`). Bu, teoride bir olasılık
değil — `gh run view --log` ile alınan gerçek bir run'da (2026-08-18, `test` dalı push'u)
bu fallback literal'lerin **maskelenmeden** log'a düştüğü doğrulandı: değerler `secrets.*`
context'inden gelmediği için GitHub bunları secret olarak tanımıyor ve maskelemiyor. Yani:

- `MSSQL_SA_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`,
  `Seed__DefaultAdminPassword`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`
  **her koşuda** workflow kaynağındaki hardcoded fallback değerleriyle çalışıyor — secret
  hiç tanımlanmamış olsa da iş yeşil geçiyor, bu da eksikliğin fark edilmesini engelliyor.
- Etkilenen job'lar: `deploy` (satır 165-187) ve `e2e-smoke` (satır 287-310); ikisi de
  yalnızca GitHub Actions runner'ı üzerinde yaşayan, işten sonra silinen geçici bir
  container stack'i besliyor. **Gerçek test sunucusuna deploy** (`deploy-test-server` job'u,
  satır 414-538) bu secret'lara hiç bakmıyor; SSH ile bağlanıp sunucudaki
  `infra/env/.env.test` dosyasını kullanıyor.
- Sonuç: fallback parolalar "prod'a sızmış bir sır" değil, ama **repoda açık, tahmin
  edilebilir, sabit parolalarla çalışan bir CI deseni** — secret mekanizmasının amacını
  fiilen boşaltıyor. Repo private olsa da bu davranış aynen kalır (D-15, kapsam dışı
  değişiklik: fallback'leri koddan kaldırmak bu envanterden SONRAKİ ayrı bir iştir).
- `JWT_SECRET` bu 7'nin dışında: o **tanımlı** (yukarıdaki envanter tablosuna bakın), yani
  gerçek değeri kullanılıyor, fallback'e düşmüyor.
{% endhint %}

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

**Durum (2026-08-18):** `VITE_API_BASE_URL` ve `VITE_OAUTH_GOOGLE_URL` bugün tanımlı ama
secret olarak; `VITE_OAUTH_MICROSOFT_URL` hiç tanımlı değil ve `test-deploy.yml`'de fallback'i
de yok, bu yüzden frontend build-arg'ına **boş string** olarak geçiyor (Microsoft OAuth
butonu sessizce boş URL'e gider). Üçü de repo **variable**'ına taşınmalı: (1) gizlilik
sağlamıyorlar, (2) variable'a taşınınca PR'lardan/fork'lardan da okunabilir hâle gelir ki
zaten public bilgi, (3) Actions log'unda `***` ile maskelenmedikleri için debug daha kolay
olur.
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
**GitHub Environment'ları (2026-08-18 doğrulandı):** Repoda üç environment var — `test`,
`prod`, `copilot`. `prod` `required_reviewers` korumasıyla tanımlı (tek reviewer). **Üçünde
de 0 secret var** (`gh api repos/.../environments/{env}/secrets --jq .total_count` → hepsi
`0`) — bugün her şey repo seviyesinde duruyor. Bu yüzden `prod` üzerindeki required-reviewer
koruması şu an korunan hiçbir kaynağı yok; yalnızca boş bir onay diyaloğu. SSH secret'larının
repo seviyesinden ilgili environment seviyesine taşınması önerilir (bkz. yukarıdaki
"Environment'a taşıma önerisi" kutusu) — **henüz yapılmadı**.
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

## Yeni Repoya Geçiş — Minimum Secret Kümesi

Bu repo private bir repoya, **git geçmişi taşınmadan, sıfırdan ilk commit** olarak
aktarılacak. Yeni repoda **hiçbir secret olmayacak** — bugünkü 6 tanımlı secret dahil hepsi
elle yeniden girilmeli. Aşağıdaki liste, `ci.yml` + `test-deploy.yml` + `promote.yml`'in
ilk günden çalışması için gereken minimumu, öncelik sırasına göre verir.

### Zorunlu — bunlar olmadan ilgili workflow amacını yerine getiremez

| Secret/Ayar | Neden zorunlu |
|---|---|
| `PROMOTION_PAT` | `promote.yml` bunu `-z` kontrolüyle ister; tanımsızsa iş `exit 1` ile kırmızı biter (fallback yok, `GITHUB_TOKEN` ile merge test/main push-tetiklemeli workflow'ları tetiklemediği için bilinçli tasarım) |
| `TEST_SSH_HOST`, `TEST_SSH_PRIVATE_KEY` | `test-deploy.yml`'in `deploy-test-server` job'u ve `rollback.yml` bunları fallback'siz kullanır; tanımsızsa gerçek sunucuya deploy/rollback kırılır |
| GHCR Actions izinleri (secret değil, repo ayarı) | `ci.yml`/`test-deploy.yml` GHCR login'i `secrets.GITHUB_TOKEN` ile yapar (otomatik) — yeni repoda Settings → Actions → Workflow permissions → "Read and write" işaretli olmalı, aksi hâlde `packages: write` gerektiren push adımları 403 ile kırılır |

### Güçlü öneri — tanımsız olsa da iş yeşil kalır ama gerçek işlev bozulur

| Secret | Tanımsızsa ne olur (bugünkü davranış) |
|---|---|
| `JWT_SECRET` | Fallback var (`ci-test-secret-key-...`); yeni repoda "sıfırdan temiz başlangıç" fırsatını kaçırmamak için gerçek bir değerle tanımlanmalı |
| `VITE_API_BASE_URL` | Fallback yok, boş build-arg → deploy edilen frontend gerçek API'ye bağlanamaz |
| `VITE_OAUTH_GOOGLE_URL` | Aynı — Google login butonu boş URL'e gider |
| `TEST_MSSQL_SA_PASSWORD`, `TEST_MINIO_ROOT_USER`, `TEST_MINIO_ROOT_PASSWORD`, `SEED_DEFAULT_ADMIN_PASSWORD` | Fallback var (D-15) — yeni repoda bu hardcoded fallback'lerle başlamak yerine gerçek değer tanımlamak, deseni ilk günden kırar |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `PASSWORD_RESET_FRONTEND_URL`, `EMAIL_CHANGE_FRONTEND_CONFIRM_URL` | Fallback var; e-posta gönderimi gerçek test edilmek isteniyorsa tanımlanmalı, aksi hâlde placeholder ile devam edilebilir |

### İlk günden gerekmez

| Secret | Neden erteleniyor |
|---|---|
| `PROD_SSH_HOST`, `PROD_SSH_PRIVATE_KEY` | Yalnızca `rollback.yml`'in manuel `prod` dispatch'i kullanır; prod sunucusu kurulana kadar anlamsız — kurulduğunda repo secret'ı olarak değil, doğrudan `prod` environment secret'ı olarak tanımlanmalı |
| `ALGO_SUITE_API_URL`, `ALGO_SUITE_EMAIL`, `ALGO_SUITE_PASSWORD` | Tanımlanması **F8-03** kapsamında; workflow zaten tanımsızlığı zarifçe atlıyor |
| `VITE_OAUTH_MICROSOFT_URL` | Bugün de tanımlı değil, Microsoft OAuth henüz devrede değilse ertelenebilir — ama **variable** olarak eklenmeli, secret olarak değil |

### Variable olarak (secret olarak DEĞİL) taşınmalı

`VITE_API_BASE_URL`, `VITE_OAUTH_GOOGLE_URL`, `VITE_OAUTH_MICROSOFT_URL` — bkz. yukarıdaki
"Frontend build-time (VITE)" bölümü. Bu üçü yeni repoda hiç secret olarak girilmemeli,
doğrudan repo/environment **variable**'ı olarak eklenmeli; bu hem yanlış gizlilik beklentisini
önler hem de geçiş sırasında "bunu secret mi variable mı gireyim" belirsizliğini ortadan
kaldırır.

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
