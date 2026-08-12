# Branch Stratejisi

**Son güncelleme:** 2026-08-08 · **Durum:** Aktif

Cargo Pilot projesinde branch yapısını, geliştirme akışını ve PR kurallarını tanımlar.

**Model:** Üç dallı terfi (promotion) modeli — `dev` → `test` → `main`.
**Geçerlilik:** 2026-08-03'ten itibaren.

---

## Branch Modeli

```
feat/US-142-x ──PR (squash)──► dev ──PR (merge)──► test ──PR (merge)──► main
                                │                   │                    │
                               CI            TEST SUNUCUSU        ileride PRODUCTION
                                          (gösterim + QA testi)   (şimdilik deploy yok)
```

| Dal | Rol | Deploy hedefi | Terfi ritmi |
|-----|-----|---------------|-------------|
| `dev` | Günlük entegrasyon | Yok, sadece CI | — |
| `test` | QA / gösterim ortamı | **Test sunucusu** | İş onaylandıkça |
| `main` | Production'a hazır sürüm | *(prod sunucusu kurulunca)* | Haftalık |

{% hint style="info" %}
**Dört kritik kural:**

1. Tüm iş branch'leri **`dev`'den** açılır.
2. `test`'e **yalnızca `dev`'den** PR açılabilir. CI bunu zorunlu kılar.
3. `main`'e **yalnızca `test`'ten** veya `hotfix/*`'ten PR açılabilir.
4. `test`'e her merge, test sunucusuna otomatik deploy olur.
{% endhint %}

{% hint style="danger" %}
`dev`, `test` ve `main`'e doğrudan push yapılmaz. Ruleset engeller.
`test` ve `main` üzerinde **hiç commit üretilmez** — içerikleri yalnızca terfi ile değişir.
{% endhint %}

---

## Branch Türleri

| Branch | Rol | Açılış Noktası | Ömür |
|--------|-----|----------------|------|
| `dev` | Entegrasyon dalı | — | Kalıcı |
| `test` | QA ortamının kaynağı | — | Kalıcı |
| `main` | Production'ın kaynağı | — | Kalıcı |
| `feat/*` | Yeni özellik | `dev`'den | ≤ 3 gün |
| `fix/*` | Hata düzeltme | `dev`'den | ≤ 3 gün |
| `chore/*` | Doküman, bağımlılık, temizlik | `dev`'den | ≤ 3 gün |
| `infra/*` | CI/CD, compose, monitoring (DevOps) | `dev`'den | ≤ 3 gün |
| `hotfix/*` | Production acil düzeltme | Sürüm tag'inden | Saatler |

### Kısa ömür neden önemli

Eski modelde 1000+ commit geride kalan branch'ler birikmişti; hiçbiri rebase edilemedi ve
hepsi silinmek zorunda kaldı. **3 günden uzun yaşayan iş branch'i bir uyarı işaretidir** — işi böl.

### `dev` her an çıkılabilir olmalı

Sıra dışı bir terfi gerektiğinde (`dev → test` erken açılır) `dev`'deki **her şey** birlikte gider.
Bu yüzden yarım kalan iş `dev`'e merge edilmez; `feat/*` dalında bekler. Uzun sürecek riskli
değişiklikler için feature flag kullanın.

---

## Branch İsimlendirme

```
<tür>/<iş-kodu>-<kısa-açıklama>
```

**Doğru örnekler:**

```
feat/US-142-login-form
feat/US-211-customer-search
fix/US-188-null-check
fix/INC-002-minio-config-fix
chore/branch-temizligi
infra/prod-deploy-pipeline
hotfix/v0.4.1-share-token-401
```

{% hint style="danger" %}
**Yanlış örnekler:**

```
feat/yeni-yapi                 # iş kodu yok
Feat/US-142-Login              # büyük harf
fix/docker compose fix         # boşluk var
feat/çalışan-yapı              # Türkçe karakter
feat/us-142-login-form         # iş kodu küçük harf
```
{% endhint %}

`chore/` ve `infra/` için iş kodu zorunlu değildir.

---

## Adım Adım Geliştirme Akışı

**Adım 1 — `dev`'den branch aç:**

```bash
git fetch origin
git checkout -b feat/US-142-login-form origin/dev
```

**Adım 2 — Geliştir ve commit at:**

```bash
git add <dosyalar>
git commit -m "login form eklendi"
git push origin feat/US-142-login-form
```

Push anında CI çalışır (lint, format, TypeScript, test, backend build).

**Adım 3 — `dev`'e PR aç:**

```bash
gh pr create --base dev --head feat/US-142-login-form
```

**Merge yöntemi: squash.** Branch'teki dağınık commit'ler tek, okunabilir commit'e iner.

**Adım 4 — İş onaylandığında `test`'e terfi et:**

```bash
gh pr create --base test --head dev --title "Terfi: dev → test"
```

PR açıldıktan ve CI (zorunlu kontroller) çalışmaya başladıktan sonra **Terfi** workflow'unu
tetikleyin (Actions → Terfi → Run workflow, hedef: `dev-test`). Workflow kontrollerin
yeşile dönmesini bekler ve PR'ı merge commit ile birleştirir.

**Merge yöntemi: merge commit.** Squash yapılırsa `test`, `dev`'de olmayan yeni bir commit alır
ve dallar kalıcı olarak ayrışır.

Merge sonrası test sunucusuna otomatik deploy olur — geliştiriciler ve QA burada test eder.

**Adım 5 — Haftalık görevler bitince `main`'e terfi et:**

```bash
gh pr create --base main --head test --title "Sürüm: test → main"
```

PR açıldıktan sonra **Terfi** workflow'unu tetikleyin (Actions → Terfi → Run workflow,
hedef: `test-main`).

Merge sonrası CI otomatik `v0.<n>.0` sürüm etiketi atar.

{% hint style="warning" %}
**Bu PR'ları elle `gh pr merge` ile merge ETMEYİN.** Merge-commit ile terfi modelinde
`test`/`main` dalı `dev`/`test`'te olmayan bir merge commit içerir; bu yüzden terfi PR'ının
`mergeStateStatus` değeri kalıcı olarak `BEHIND` görünür ve `gh pr merge`'ün istemci tarafı
kontrolü merge'i şu hatayla reddeder:

```
X Pull request #928 is not mergeable: the head branch is not up to date with the base branch.
```

Bu bir ruleset arızası değildir (üç ruleset'te de `strict_required_status_checks_policy`
kapalıdır) — `BEHIND` durumu, merge-commit ile terfi modelinin doğal ve zararsız sonucudur.
Doğru yol yukarıdaki **Terfi** workflow'udur (`.github/workflows/promote.yml`). Workflow
kullanılamıyorsa GitHub REST API (`gh api repos/<org>/<repo>/pulls/<PR>/merge -X PUT -f
merge_method=merge`) veya GitHub arayüzündeki **"Merge pull request"** düğmesi kullanılabilir
— ikisi de `gh pr merge`'ün istemci tarafı kontrolünü uygulamaz. Korumaları atlamak için
**`--admin` veya bypass kullanılmaz.**
{% endhint %}

---

## Bug Test Ortamında Bulunursa

Test sunucusunda bulunan bir hata **`test` dalında düzeltilmez.**

```bash
git checkout -b fix/INC-004-aciklama origin/dev   # dev'den aç
# düzelt, PR → dev, merge
gh pr create --base test --head dev               # yeniden terfi et
```

Doğrudan `test`'e commit atmak veya `feat/*`'ten `test`'e PR açmak dalları ayrıştırır.
Bu repoda bir kez yaşandı (#482 `dev`'i atladı → `sync/test-to-dev` yaması gerekti).
CI artık bunu engelliyor.

---

## Hotfix

Production'da acil bir hata için sıra beklenmez:

```bash
git checkout -b hotfix/v0.4.1-aciklama v0.4.0
# düzelt
gh pr create --base main --head hotfix/v0.4.1-aciklama
```

{% hint style="danger" %}
**Merge sonrası geri-merge ZORUNLU.** Atlanırsa `test` ve `dev` düzeltmeyi kaçırır ve
bir sonraki terfide düzeltme geri alınır:

```bash
gh pr create --base test --head main --title "Geri-merge: hotfix v0.4.1"
gh pr create --base dev  --head test --title "Geri-merge: hotfix v0.4.1"
```
{% endhint %}

---

## Merge Stratejisi

| PR | Yöntem | Neden |
|----|--------|-------|
| `feat/*` → `dev` | **Squash** | Temiz geçmiş; iş başına tek commit |
| `dev` → `test` | **Merge commit** | Commit kimliği korunmalı |
| `test` → `main` | **Merge commit** | Commit kimliği korunmalı |
| `hotfix/*` → `main` | **Merge commit** | Geri-merge edilebilir kalmalı |

Ruleset her dalda yalnızca doğru yöntemi açık bırakır; yanlış seçim yapılamaz.

---

## PR Kuralları

| Kural | Detay |
|-------|-------|
| Açıklama | İş kodu + ne yapıldığı |
| Onay | Zorunlu review yok (2026-08-08'de kaldırıldı) — CI kapıları geçen PR merge edilebilir; riskli veya geniş kapsamlı işlerde review istemek önerilir |
| UI değişikliği | Ekran görüntüsü zorunlu |
| 3D / algoritma değişikliği | Öncesi–sonrası plan karşılaştırması zorunlu |

### Required check'ler

| Hedef dal | Zorunlu kontroller |
|-----------|--------------------|
| `dev` | `Frontend CI`, `Backend CI` |
| `test` | `Frontend CI`, `Backend CI`, `Terfi Zinciri Kontrolü`, `Pending Migration Kontrolü`, `Image Build`, `Deploy (Test)` |
| `main` | `Frontend CI`, `Backend CI`, `Terfi Zinciri Kontrolü`, `Pending Migration Kontrolü` |

`main`'de image build ve deploy koşmaz — içerik `test`'te zaten build edilip çalıştırılmıştır.

---

## Branch — Ortam İlişkisi

| Tetikleyici | Ortam | Çalışan Pipeline |
|-------------|-------|------------------|
| `feat/*`, `fix/*`, `chore/*`, `infra/*` push | — | `CI` + geçici stack doğrulaması |
| PR → `dev` | — | `CI` |
| PR → `test` | — | `CI` + migration + `Image Build` + geçici stack |
| push `test` | **Test sunucusu** | Build → GHCR push → deploy |
| PR → `main` | — | `CI` + migration + terfi zinciri |
| push `main` | — | `v0.<n>.0` sürüm etiketi |
| Sürüm tag'i | **Production** | _(Pipeline henüz yok — bkz. devops-backlog 2.2)_ |

---

## Production Durumu

{% hint style="warning" %}
Production ortamı **henüz kurulmamıştır.** `main`'e terfi bugün deploy tetiklemez;
yalnızca sürüm etiketi üretir.

Eksikler: prod sunucusu, `PROD_SSH_HOST` / `PROD_SSH_PRIVATE_KEY` secret'ları,
`.env.prod`, prod nginx/TLS yapılandırması, `prod-deploy.yml` workflow'u ve
`docker-compose.prod.yml`'deki eksik env değişkenleri.

Detay: [devops-backlog.md](../devops/devops-backlog.md) madde 2.1–2.3,
[known-issues.md](../devops/known-issues.md) madde 2 ve 5.
{% endhint %}

Prod açıldığında `main` → production deploy'u `production` GitHub Environment'ı
üzerinden zorunlu onaylayıcı ile çalışacaktır. Rollback tag tabanlıdır
(`.github/workflows/rollback.yml`, `infra/scripts/rollback.sh`).

---

## Arşivlenmiş Branch'ler

2026-08-03 temizliğinde silinen tüm branch'ler `archive/<branch-adı>` tag'i olarak korunmaktadır:

```bash
git fetch --tags
git checkout -b feat/US-XXX-devam archive/feature/eski-branch-adi
```

---

## İlgili Dokümanlar

{% content-ref url="commits.md" %}
[Commit Kuralları](commits.md)
{% endcontent-ref %}
