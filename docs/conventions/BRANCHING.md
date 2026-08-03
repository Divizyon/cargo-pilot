# Branching Strategy

Bu doküman, Cargo Pilot projesinde branch yapısını, geliştirme akışını ve PR kurallarını tanımlar.

**Model:** Trunk-based — tek uzun ömürlü branch (`main`), kısa ömürlü iş branch'leri.
**Geçerlilik:** 2026-08-03'ten itibaren. Önceki `feature → dev → test → main` modeli kaldırılmıştır.

---

## Branch Modeli

```
main ──► feat/US-142-login-form ──► PR → main ──► test ortamına otomatik deploy
                                          │
                                          └──► v1.4.0 tag'i → production (onaylı)
```

{% hint style="info" %}
**Üç kritik kural:**

1. Tüm iş branch'leri **`main`'den** açılır.
2. Tek PR açılır: iş branch'i → `main`. İkinci bir doğrulama dalı yoktur.
3. `main`'e her merge, **test ortamına** otomatik deploy olur.
{% endhint %}

**`test` bir ORTAM adıdır, branch değil.** Docker image tag'leri (`:test`, `:test-{sha}`),
compose dosyaları (`docker-compose.test.yml`) ve env dosyaları (`.env.test`) ortamı ifade eder.

---

## Branch Türleri

| Branch | Rol | Açılış Noktası | Ömür |
|--------|-----|----------------|------|
| `main` | Trunk — tek gerçek kaynak, test ortamının kaynağı | — (doğrudan push yok) | Kalıcı |
| `feat/*` | Yeni özellik | `main`'den | ≤ 3 gün |
| `fix/*` | Hata düzeltme | `main`'den | ≤ 3 gün |
| `hotfix/*` | Production acil düzeltme | Production tag'inden | Saatler |
| `chore/*` | Doküman, bağımlılık, temizlik | `main`'den | ≤ 3 gün |
| `infra/*` | CI/CD, compose, monitoring (DevOps) | `main`'den | ≤ 3 gün |

{% hint style="danger" %}
`main`'e doğrudan push yapılmaz. Ruleset engeller.
{% endhint %}

### Kısa ömür neden önemli

Eski modelde 1000+ commit geride kalan branch'ler birikmişti; hiçbiri rebase edilemedi ve
hepsi silinmek zorunda kaldı. **3 günden uzun yaşayan branch bir uyarı işaretidir** — işi böl.

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
hotfix/v1.3.1-share-token-401
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

**Adım 1 — Branch aç:**

```bash
git fetch origin
git checkout -b feat/US-142-login-form origin/main
```

**Adım 2 — Geliştir ve commit at:**

```bash
git add <dosyalar>
git commit -m "login form eklendi"
git push origin feat/US-142-login-form
```

Push anında CI çalışır (lint, format, TypeScript, test, backend build, image build).

**Adım 3 — `main`'e PR aç:**

```bash
gh pr create --base main --head feat/US-142-login-form
```

**Adım 4 — Review ve merge:**

- En az 1 approving review
- Tüm required check'ler yeşil
- Merge sonrası branch **otomatik silinir**

**Adım 5 — Doğrula:** Merge test ortamına otomatik deploy olur —
[cargopilot.divizyon.org](http://cargopilot.divizyon.org)

---

## PR Kuralları

| Kural | Detay |
|-------|-------|
| Açıklama | İş kodu + ne yapıldığı |
| Onay | En az 1 approving review |
| Required checks | `Frontend CI`, `Backend CI`, `Pending Migration Kontrolü`, `Image Build`, `Deploy (Test)` |
| Push sonrası | Eski onaylar düşer, yeniden review gerekir |
| Review thread | Tümü çözülmüş olmalı |
| UI değişikliği | Ekran görüntüsü zorunlu |
| 3D / algoritma değişikliği | Öncesi–sonrası plan karşılaştırması zorunlu |

---

## Branch — Ortam İlişkisi

| Tetikleyici | Ortam | Çalışan Pipeline |
|-------------|-------|------------------|
| `feat/*`, `fix/*`, `chore/*`, `infra/*` push | — | `CI` (lint + build + test + image build) |
| PR → `main` | — | `CI` + `Pending Migration Kontrolü` + `Image Build` + `Deploy (Test)` doğrulaması |
| push `main` | **Test** | `Image Build` → GHCR push → test sunucusuna deploy |
| `v*` tag | **Production** | _(Production pipeline henüz yok — bkz. devops-backlog 2.2)_ |

---

## Production'a Çıkış

Production pipeline'ı henüz kurulmamıştır (`docs/devops/devops-backlog.md` madde 2.2, 2.3).
Kurulduğunda akış:

```bash
# main üzerinde, test ortamında doğrulanmış commit'te
git tag v1.4.0
git push origin v1.4.0
```

Tag, `production` GitHub Environment'ını tetikler; zorunlu onaylayıcı deploy'u başlatır.
Rollback tag tabanlıdır (`.github/workflows/rollback.yml`).

### Hotfix

```bash
git checkout -b hotfix/v1.3.1-aciklama v1.3.0
# düzelt
gh pr create --base main --head hotfix/v1.3.1-aciklama
# merge sonrası
git tag v1.3.1 && git push origin v1.3.1
```

---

## Merge Stratejisi

**Tercih edilen: Merge Commit.** Branch commit geçmişi korunur, `git bisect` çalışır.

{% hint style="info" %}
PR açmadan önce anlamsız commit'leri temizleyin (bkz. [Commit Kuralları](COMMITS.md)).
Tek mantıksal değişiklik için 10 ayrı "prettier düzeltmesi" commit'i bırakmayın.
{% endhint %}

---

## Eski Modelden Geçiş

`dev` ve `test` branch'leri artık **kullanılmıyor**. `main` ile aynı içeriği taşıyan
dondurulmuş kopyalardır ve CI tetiklemezler; ekip onayıyla silineceklerdir.

Eskiden silinen tüm branch'ler `archive/<branch-adı>` tag'i olarak korunmaktadır:

```bash
git fetch --tags
git checkout -b feat/US-XXX-devam archive/feature/eski-branch-adi
```

Geçiş gerekçesi ve ölçümler: `docs/context/branching-proposal.md`.

---

## İlgili Dokümanlar

{% content-ref url="COMMITS.md" %}
[Commit Kuralları](COMMITS.md)
{% endcontent-ref %}
