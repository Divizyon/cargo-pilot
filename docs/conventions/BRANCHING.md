# Branching Strategy

Bu doküman, Cargo Pilot projesinde branch yapısını, geliştirme akışını ve PR kurallarını tanımlar.

---

## Branch Modeli

```
test ──► feature/* ──► PR → dev ──► PR: aynı feature → test ──► PR: test → main
```

{% hint style="info" %}
**İki kritik kural:**

1. Feature branch'ler **`test` branch'inden** açılır (`dev`'den değil).
2. `test`'e PR, feature branch'in **önce `dev`'e merge edildiği aynı branch'ten** açılır. `dev`'den `test`'e doğrudan PR açılamaz.
{% endhint %}

Neden `test`'ten açılır? `dev` birden fazla geliştiricinin işlerini barındırır. `dev`'den açılan branch zaman içinde başka commit'leri taşır. `test`'ten açılan branch yalnızca o işin kopyasıdır — temiz ve izole.

---

## Branch Türleri

| Branch | Rol | Açılış Noktası |
|--------|-----|----------------|
| `main` | Production | — (doğrudan push yok) |
| `test` | Test ortamı + feature başlangıç noktası | — |
| `dev` | Teknik doğrulama kapısı | — |
| `feature/*` | Yeni geliştirme | `test`'ten |
| `bugfix/*` | Hata düzeltme | `test`'ten |

### `main`

{% hint style="danger" %}
Doğrudan push yapılmaz. Yalnızca onaylı, production'a hazır içerik alınır.
{% endhint %}

### `test`

- Test ortamının referans branch'i.
- Feature branch'lerin başlangıç noktası.
- CI/CD pipeline buradan tetiklenir.
- `dev` branch'inden doğrudan PR açılamaz; `enforce-test-base` CI job'u bunu denetler.

### `dev`

- Kalıcı entegrasyon alanı değil — teknik doğrulama kapısı.
- Feature branch `dev`'e merge edildikten sonra kod review ve temel doğrulama yapılır.
- `test`'e çıkış için ön koşul: commit `origin/dev`'de bulunmak zorunda (CI kontrol eder).

---

## Branch İsimlendirme

```
feature/<iş-kodu>-<kısa-açıklama>
bugfix/<iş-kodu>-<kısa-açıklama>
```

**Doğru örnekler:**

```
feature/US-142-login-form
feature/US-211-customer-search
bugfix/US-188-null-check
bugfix/INC-002-minio-config-fix
```

{% hint style="danger" %}
**Yanlış örnekler:**

```
feature/yeni-yapi              # iş kodu yok
Feature/US-142-Login           # büyük harf
bugfix/docker compose fix      # boşluk var
feature/çalışan-yapı           # Türkçe karakter
feature/us-142-login-form      # iş kodu küçük harf
```
{% endhint %}

---

## Adım Adım Geliştirme Akışı

**Adım 1 — Branch aç:**

```bash
git fetch origin
git checkout -b feature/US-142-login-form origin/test
```

**Adım 2 — Geliştir ve commit at:**

```bash
git add <dosyalar>
git commit -m "login form eklendi"
git push origin feature/US-142-login-form
```

**Adım 3 — `dev`'e PR aç (teknik doğrulama):**

```bash
gh pr create --base dev --head feature/US-142-login-form
```

**Adım 4 — dev'de doğrula:**

- Kod review tamamlandı mı?
- Build hatası var mı?
- Kritik yan etki oluşturuyor mu?

**Adım 5 — Aynı branch'ten `test`'e PR aç:**

```bash
gh pr create --base test --head feature/US-142-login-form
```

{% hint style="warning" %}
`test`'e PR yalnızca dev'e merge edilmiş branch'ten açılabilir. CI'daki `enforce-test-base` job'u şunları kontrol eder:

- Head branch `dev` olamaz
- PR commit'i `origin/dev`'de bulunmalı
{% endhint %}

**Adım 6 — Merge sonrası branch'i sil.**

---

## PR Kuralları

### Feature → Dev

| Kural | Detay |
|-------|-------|
| Açıklama | İş kodu + ne yapıldığı |
| Onay | En az 1 approving review |
| Merge eden | Herhangi bir geliştirici |

### Feature → Test

| Kural | Detay |
|-------|-------|
| Ön koşul | Dev'e merge edilmiş olmalı (CI kontrol eder) |
| Onay | En az 1 approving review |
| Merge eden | Yalnızca Chapter Lead / DevOps |
| Required checks | `Test PR Base Kontrolü`, `Image Build`, `Deploy (Test)` |

### Test → Main

| Kural | Detay |
|-------|-------|
| Ön koşul | QA onayı |
| Merge eden | Yalnızca Chapter Lead / DevOps |

---

## Branch — Ortam İlişkisi

| Branch | Ortam | Çalışan Pipeline |
|--------|-------|-----------------|
| `feature/*`, `bugfix/*` | — | Sadece `Deploy (Test)` (inline build) |
| `dev` | Dev | Sadece `Deploy (Test)` (PR'da) |
| `test` | Test | `Image Build` + `Deploy (Test)` |
| `main` | Production | _(Production pipeline henüz yok)_ |

---

## Merge Stratejisi

**Tercih edilen: Merge Commit**

GitHub'da "Create a merge commit" seçeneği kullanılır. Branch commit geçmişi korunur, `git bisect` ile hata tespiti yapılabilir.

---

## İlgili Dokümanlar

{% content-ref url="COMMITS.md" %}
[Commit Kuralları](COMMITS.md)
{% endcontent-ref %}
