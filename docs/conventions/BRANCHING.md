# Branching Strategy

Bu doküman, Cargo Pilot projesinde branch yapısını, isimlendirme kurallarını, geliştirme akışını, Pull Request yaklaşımını ve branch–ortam ilişkisini tanımlar. Amaç; tüm geliştiricilerin aynı standartla çalışmasını sağlamak, kod akışını izlenebilir kılmak ve `main` branch'ini her zaman stabil tutmaktır.

---

## 1. Amaç ve Kapsam

Bu branching stratejisinin amacı:

- geliştirme sürecini sade ve anlaşılır hale getirmek
- tüm ekip için ortak bir branch standardı oluşturmak
- `main` branch'ini stabil tutmak
- merge öncesi kontrol ve review süreçlerini zorunlu kılmak
- test ortamına yalnızca seçilen işin kontrollü şekilde çıkarılmasını sağlamak
- dev branch'inde bulunan diğer geliştirmelerin yanlışlıkla test ortamına taşınmasını önlemek

Bu doküman, repository üzerinde çalışan tüm geliştiriciler için geçerlidir.

---

## 2. Branch Modeli

Projede aşağıdaki branch türleri kullanılır:

- `main`
- `test`
- `dev`
- `feature/*`
- `bugfix/*`

Bu modelde iki kritik nokta şudur:

> **1. Feature branch'leri `dev`'den değil, `test` branch'inden açılır.**
> **2. `test` branch'ine PR, feature branch'in önce `dev`'e merge edildiği aynı feature branch'ten açılır. `dev` branch'inden `test`'e PR atılamaz.**

Bunun temel sebebi, `dev` branch'inin birden fazla geliştiricinin işlerini barındırabilmesi ve buradan açılan branch'lerin zaman içinde başka işlerin commit'lerini de dolaylı olarak taşıma riski oluşturmasıdır. `test` branch'inden açılan feature branch ise yalnızca ilgili işin test tabanlı ve kontrollü bir kopyası olur. Aynı feature branch dev'de doğrulandıktan sonra test'e de PR atar; böylece dev'de biriken başka işler test'e taşınmaz, ama yine de dev doğrulaması zorunlu tutulur (CI kontrol eder).

---

## 3. Branch Türleri

### 3.1 `main`

`main` branch'i production ortamını temsil eder.

Özellikleri:
- canlıya çıkan kod burada bulunur
- her zaman stabil tutulmalıdır
- doğrudan geliştirme yapılmaz
- doğrudan push yapılmaz
- yalnızca onaylı ve yayınlanabilir içerik bu branch'e alınır

---

### 3.2 `test`

`test` branch'i test ortamının temel referans branch'idir.

Özellikleri:
- test ortamına çıkacak işler bu branch üzerinden yönetilir
- **feature branch'lerin başlangıç noktası burasıdır**
- test ortamına deployment pipeline'ı bu branch üzerinden tetiklenir
- **`test` branch'ine PR yalnızca dev'e merge edilmiş feature/bugfix branch'ten açılabilir** (CI'da `enforce-test-base` job'u ile doğrulanır)
- `dev` branch'inden `test` branch'ine doğrudan PR açılamaz

Buradaki amaç, geliştiricinin işini test tabanlı ve izole bir şekilde başlatmasıdır. Böylece `dev` branch'inde bulunan ve henüz test ortamına çıkması istenmeyen başka geliştirmeler, yeni feature branch'e taşınmaz.

---

### 3.3 `dev`

`dev` branch'i bu modelde klasik anlamda "tüm geliştirmelerin toplandığı sürekli entegrasyon branch'i" **değildir**.

Bu branch'in rolü:
- feature tamamlandıktan sonra teknik olarak kontrol edilmesi
- ortak yapıyla uyumunun görülmesi
- geliştiricinin işinin temel doğrulamasının yapılması
- test'e çıkış için ön koşul kapısı olması (CI, test PR'ında commit'in dev'de olup olmadığını kontrol eder)

> **Önemli:** `dev`, test ortamına çıkacak tüm işlerin kalıcı toplama alanı değildir; geliştirme sonrası doğrulama amacıyla kullanılan bir ara kontrol branch'idir. Ancak test'e çıkarılacak her feature branch'in commit'i dev'de bulunmak zorundadır.

Bu tanım yapılmazsa ekip zaman içinde `dev`'i klasik entegrasyon alanı gibi kullanmaya başlayabilir ve süreç bozulur.

Pipeline durumu:
- `dev`'e açılan PR'da **sadece deploy job** (inline build + healthcheck) çalışır
- `dev` branch'inde otomatik prod deploy pipeline çalıştırılmaz
- `dev` branch'inden `test` branch'ine PR atılamaz

---

### 3.4 `feature/*`

Yeni geliştirmeler için kullanılır.

Örnek kullanım alanları:
- yeni ekran geliştirme
- yeni API endpoint ekleme
- yeni servis veya modül geliştirme
- yeni entegrasyon ekleme
- teknik iyileştirme veya yeni yetenek geliştirme

İsim formatı:

```text
feature/<iş-kodu>-<kısa-açıklama>
```

Örnekler:

```text
feature/US-D02a-monorepo-setup
feature/US-D03e-local-docker-compose
feature/US-D05c-health-check-endpoint
```

> **Bu branch'ler `test` branch'inden açılır.**

---

### 3.5 `bugfix/*`

Hata düzeltmeleri için kullanılır.

Örnek kullanım alanları:
- test ortamında bulunan hata düzeltmeleri
- geliştirme ortamında tespit edilen fonksiyonel sorunlar
- container, config, network veya integration problemleri
- canlıya çıkmış bir problemin düzeltmesi

İsim formatı:

```text
bugfix/<iş-kodu>-<kısa-açıklama>
```

Örnekler:

```text
bugfix/US-188-null-check
bugfix/US-233-timeout-fix
bugfix/INC-001-prod-auth-validation-fix
```

> **Bu branch'ler de `test` branch'inden açılır.**

---

## 4. Kullanılmayan Branch Türleri

Bu projede aşağıdaki branch türleri kullanılmaz:

- `develop` (dev farklı bir rol üstlenir)
- `release`
- `hotfix`

Neden:
- süreç karmaşıklığını azaltmak
- gereksiz merge zincirlerini önlemek
- onboarding sürecini kolaylaştırmak

---

## 5. Branch İsimlendirme Kuralları

Tüm branch isimleri aşağıdaki kurallara uymalıdır:

- branch prefix ve açıklama kısmı küçük harf olmalıdır
- iş kodu orijinal haliyle yazılır (örn. `US-142`, `INC-001`)
- boşluk kullanılmaz
- Türkçe karakter kullanılmaz
- kelimeler `-` ile ayrılır
- branch isminde ilgili iş kodu veya task kodu yer almalıdır

Doğru örnekler:

```text
feature/US-142-login-form
feature/US-211-customer-search
bugfix/US-188-null-check
bugfix/INC-002-minio-config-fix
```

Yanlış örnekler:

```text
feature/yeni-yapi                          # iş kodu yok
Feature/US-142-Login                       # prefix ve açıklama büyük harf
bugfix/docker compose fix                  # boşluk var
feature/eyup/US-142-login                  # kullanıcı adı var
feature/çalışan-yapı                       # Türkçe karakter
feature/us-142-login-form                  # iş kodu küçük harfe çekilmiş
```

---

## 6. Branch Açma Kuralları

Branch açarken aşağıdaki kurallara uyulmalıdır:

- **her yeni geliştirme branch'i yalnızca `test` branch'inden açılır**
- her iş için ayrı branch açılmalıdır
- bir branch içinde birden fazla bağımsız iş biriktirilmemelidir
- branch açılmadan önce güncel `test` alınmalıdır
- task tamamlandığında ilgili branch kapatılmalıdır
- uzun süre yaşayan, amacı belirsiz branch'lerden kaçınılmalıdır

Doğru yaklaşım:
- 1 iş / 1 task / 1 branch

Yanlış yaklaşım:
- aynı branch içinde hem frontend geliştirmesi hem backend değişikliği hem unrelated refactor yapılması

---

## 7. Geliştirme Akışı

### 7.1 Genel Akış Özeti

```
test ──► feature/* ──► PR: feature → dev (teknik doğrulama) ──► PR: aynı feature → test (QA) ──► PR: test → main (prod)
```

Önemli: `test`'e PR aynı feature branch'ten atılır. Ancak CI, bu branch'in commit'inin `dev`'de bulunup bulunmadığını zorunlu olarak doğrular (dev'e merge edilmemiş bir branch test'e PR atamaz). `dev`'den doğrudan `test`'e PR açılamaz.

### 7.2 Adım Adım Akış

#### Adım 1: Feature Branch Açılması

Yeni iş başladığında ilgili geliştirici `test` branch'ini baz alarak kendi feature branch'ini oluşturur.

```bash
git fetch origin
git checkout -b feature/US-142-login-form origin/test
```

Bu noktadan sonra geliştirme yalnızca bu branch üzerinde devam eder.

#### Adım 2: Geliştirmenin Tamamlanması

Geliştirici ilgili geliştirmeyi kendi feature branch'inde bitirir. Kod, lokal ortamda çalıştırılır; temel testler ve kontroller yapılır.

#### Adım 3: PR ile Dev Branch'ine Alınması

Geliştirme tamamlandıktan sonra feature branch doğrudan `test`'e değil, önce `dev` branch'ine PR açar.

```bash
git push origin feature/US-142-login-form
# GitHub/GitLab üzerinden dev branch'ine PR aç
```

Amaç:
- kodun teknik olarak kontrol edilmesi
- varsa temel entegrasyon problemlerinin görülmesi
- ekip içi review sürecinin işletilmesi
- gerekiyorsa dev ortamında hızlı doğrulama yapılması

> **Önemli:** Bu PR, "iş artık test ortamına hazır" anlamına gelmez. Bu PR, öncelikle "iş teknik olarak kontrol edilmeye hazır" anlamına gelir.

#### Adım 4: Dev Üzerinde Doğrulama

Feature branch `dev`'e alındıktan sonra aşağıdaki kontroller yapılır:

- kod review tamamlanmış mı
- temel build problemi var mı
- ilgili geliştirme dev ortamında beklenen davranışı gösteriyor mu
- kritik bir yan etki oluşturuyor mu
- teknik açıdan test ortamına çıkarılabilecek yeterlilikte mi

#### Adım 5: Aynı Feature Branch'in Test'e PR'ı

`dev` üzerinde yapılan kontroller sonucunda işte problem görülmüyorsa, **aynı feature branch** bu kez `test` branch'ine PR açar.

```bash
# GitHub üzerinden: base=test, compare=feature/US-142-login-form
```

> **Kural:** `test` branch'ine PR yalnızca dev'e merge edilmiş feature/bugfix branch'ten açılabilir. CI'daki `enforce-test-base` job'u şu iki kontrolü yapar:
> - head branch `dev` olamaz (`dev → test` PR'ı yasaktır)
> - PR commit'i `origin/dev`'in ataları arasında olmalı (branch önce dev'e merge edilmiş olmalı)

Bu yaklaşım sayesinde test ortamına tüm `dev` branch'i değil, yalnızca istenen iş taşınır; ancak dev doğrulamasının atlanmaması da garantidir.

#### Adım 6: Test Sonrası Branch'in Silinmesi

Feature branch hem gerekli review'lardan geçmiş hem de `test` branch'ine merge edilmişse, artık görevini tamamlamış kabul edilir ve silinir.

---

## 8. Pull Request Zorunluluğu

Bu projede tüm değişiklikler PR üzerinden alınır.

### Feature → Dev PR

Amaç:
- teknik review
- temel kalite kontrolü
- dev doğrulaması

Beklenenler:
- açıklayıcı PR description
- ilgili iş kodu / task referansı
- gerekiyorsa ekran görüntüsü / test notu
- en az 1 onay

### Feature → Test PR

Amaç:
- dev'de doğrulanmış feature'ın test ortamına alınması

Kural:
- `test` branch'ine PR yalnızca dev'e merge edilmiş feature/bugfix branch'ten açılabilir (CI'daki `enforce-test-base` doğrular)
- `dev` branch'inden doğrudan `test`'e PR açılamaz
- feature branch dev'e merge edilmeden test'e PR atılamaz

Beklenenler:
- dev doğrulamasının geçtiğinin belirtilmesi
- test ortamına çıkış notu
- gerekiyorsa QA notu

### Test → Main PR

Amaç:
- test geçen işin production'a alınması

Beklenenler:
- QA onayı
- production deployment hazırlığı

---

## 9. Merge Stratejisi

Tercih edilen merge yöntemi: **Merge Commit**

GitHub üzerinde **"Create a merge commit"** seçeneği kullanılır.

Bu yöntemin tercih edilme nedenleri:
- branch commit geçmişi korunur
- COMMITS.md ile tanımlanan commit kurallarına uygun yazılmış commit'ler tarihçede görünür kalır
- `git bisect` ile hata tespiti commit seviyesinde yapılabilir

Alternatif olarak çok kirli commit geçmişi varsa **squash merge** tercih edilebilir. Ancak karışık kullanım geçmişi okunmaz hale getirir; ekip tek bir yaklaşımda kalmalıdır.

---

## 10. Doğrudan Push Kuralı

Aşağıdaki branch'lere doğrudan push yapılmaz:

- `main`
- `test`
- `dev`

Tüm değişiklikler Pull Request üzerinden geçmelidir.

---

## 11. Branch Koruma Kuralları

### 11.1 Genel Kurallar

Tüm korunan branch'ler (`main`, `test`, `dev`) için:
- direct push kapalıdır
- PR olmadan merge yapılamaz

### 11.2 Dev Branch Kuralları

`dev` branch'ine açılan PR'lar için:

- repository üzerinde yazma yetkisine sahip ekip üyeleri tarafından review edilebilir
- en az **1 approving review** ile merge edilebilir
- herhangi bir yetkili geliştirici merge yapabilir

```
feature/* ──► dev
             │
             ├─ PR açılır
             ├─ Ekipten herkes review verebilir
             ├─ 1 onay gerekir
             └─ Herkes merge yapabilir
```

### 11.3 Test Branch Kuralları

`test` branch'ine açılan PR'lar için:

- **PR yalnızca dev'e merge edilmiş feature/bugfix branch'ten açılabilir** (CI'daki `enforce-test-base` job'u şunları kontrol eder: head `dev` değil + PR commit'i `origin/dev`'de)
- `dev` → `test` doğrudan PR'ı yasaktır
- review herkes tarafından verilebilir
- ancak **merge işlemi yalnızca Chapter Lead ve DevOps ekipleri** tarafından gerçekleştirilebilir
- direct push yasaktır
- pipeline başarısızsa merge engellenir (required status checks: `Test PR Dev Kontrolü`, `Image Build`, `Deploy (Test)`)

```
feature/* (dev'e merge edilmiş) ──► test
                                   │
                                   ├─ PR açılır (dev değil, aynı feature branch)
                                   ├─ enforce-test-base doğrular (commit dev'de mi?)
                                   ├─ build + deploy job'ları çalışır
                                   ├─ Ekipten herkes review verebilir
                                   ├─ 1 onay gerekir
                                   └─ Sadece Chapter Lead / DevOps merge yapabilir
```

### 11.4 Main Branch Kuralları

`main` branch'ine açılan PR'lar için:

- merge işlemi yalnızca **Chapter Lead ve DevOps ekipleri** tarafından gerçekleştirilebilir
- pipeline başarısızsa merge engellenir
- production deployment onayı gerekir

### 11.5 GitHub Yapılandırması

GitHub'da branch protection rules ayarlanırken:

| Branch | Require PR | Min Reviews | Restrict Push | Status Checks (Required) |
|--------|------------|-------------|---------------|--------------------------|
| `dev` | ✅ | 1 | ❌ (herkes) | `Deploy (Test)` |
| `test` | ✅ | 1 | ✅ (Chapter Lead, DevOps) | `Test PR Base Kontrolü`, `Image Build`, `Deploy (Test)` |
| `main` | ✅ | 1 | ✅ (Chapter Lead, DevOps) | ✅ Zorunlu |

> **Not:** Organization olmadan "Teams" kullanılamaz. Bunun yerine **Settings → Collaborators** üzerinden kişi bazlı yetkilendirme yapılır. Chapter Lead ve DevOps kişileri "Restrict who can push" listesine eklenir.

> **Önemli:** Required status check'lerin etkili olabilmesi için GitHub'da ilgili job adlarının (workflow'daki `name:` alanları) tam olarak eşleşmesi gerekir. CI'daki deploy başarısızsa merge butonu pasif hale gelir; dolayısıyla "deploy fail → merge engellenir" kuralı bu ayar üzerinden işler.

---

## 12. Branch ve Ortam İlişkisi

| Branch | Ortam | Pipeline | Açıklama |
|--------|-------|----------|----------|
| `feature/*`, `bugfix/*` | - | Sadece `Deploy (Test)` (push'ta) | Geliştirme |
| `dev` | Dev | Sadece `Deploy (Test)` (PR'da) | Teknik doğrulama |
| `test` | Test | `Image Build` + `Deploy (Test)` (PR'da ve push'ta) | QA ortamı |
| `main` | Production | ✅ Prod deployment | Canlı |

---

## 13. Pipeline Yaklaşımı

CI workflow'u (`.github/workflows/test-deploy.yml`) aşağıdaki kuralları uygular:

| Tetikleyici | Çalışan Job'lar |
|-------------|-----------------|
| `feature/*`, `bugfix/*` branch'ine push | `Deploy (Test)` |
| `dev` branch'ine açılan PR | `Deploy (Test)` |
| `test` branch'ine açılan PR | `Test PR Base Kontrolü` + `Image Build` + `Deploy (Test)` |
| `test` branch'ine push (merge sonrası) | `Image Build` + `Deploy (Test)` |

### Feature / Bugfix Branch

- Push sırasında tek job (`Deploy (Test)`) çalışır — inline image build + docker compose up + healthcheck
- Deploy fail olursa PR açılmaya izin verilmez (branch protection required check)

### Dev Branch

- Dev'e açılan PR'da sadece `Deploy (Test)` çalışır
- Otomatik prod deploy pipeline çalıştırılmaz
- Deploy fail olursa merge engellenir

### Test Branch

- Test'e PR yalnızca `dev`'den açılabilir (`enforce-test-base` job'u doğrular)
- Hem `Image Build` hem `Deploy (Test)` çalışır
- QA süreçleri bu branch üzerinden yürütülür

### Main Branch

- Production deployment pipeline tetiklenir
- Yalnızca test geçen kod buraya alınır

---

## 14. Bu Modelin Avantajları

1. **Teste yalnızca seçilen iş çıkar** - dev branch'inin tamamı test ortamına taşınmaz
2. **Feature izole kalır** - branch test tabanlı olduğu için daha temiz bir başlangıç yapar
3. **Dev ortamı kalite kapısı gibi kullanılır** - test öncesi teknik kontrol yapılır
4. **Küçük ve orta ekipte uygulanabilir** - paralel iş sayısı yönetilebilir seviyedeyse çalışır

---

## 15. Bu Modelin Dikkat Edilmesi Gereken Yönleri

1. **Branch akışı standart değildir** - branch test'ten doğup dev'e gidip tekrar test'e döner
2. **Aynı feature branch iki farklı hedefe gider** - süreç iyi anlatılmazsa kafa karıştırabilir
3. **Dev'in rolü yanlış anlaşılabilir** - dokümantasyon net olmalı
4. **Süreç disiplini ister** - branch'ler yanlış tabandan açılırsa izlenebilirlik zorlaşır

---

## 16. Temel Kurallar Özeti

| Kural | Açıklama |
|-------|----------|
| 1 | Her yeni geliştirme branch'i yalnızca `test` branch'inden açılır |
| 2 | Feature branch önce `dev`'e alınmadan `test`'e alınmaz |
| 3 | `test` branch'ine PR yalnızca `dev` branch'inden açılabilir (CI doğrular) |
| 4 | `dev` branch'i kalıcı release toplama alanı değildir; test'e promosyonun tek kapısıdır |
| 5 | `dev` üzerinde sorun bulunan iş, aynı feature branch üzerinde düzeltilir |
| 6 | `test`'e merge edilen branch'ler süreç tamamlandıktan sonra silinir |
| 7 | `dev`'e merge edildikten sonra `dev`'e ek kapsam dışı commit atılmamalıdır |

---

## 17. İyi Uygulamalar

Önerilen pratikler:

- branch isimleri kısa ama açıklayıcı olsun
- branch açmadan önce `test` güncellensin
- büyük işler küçük PR'lara bölünsün
- tek branch'te farklı konular karıştırılmasın
- merge sonrası branch silinsin
- branch adı iş kodu içersin
- PR açıklamaları eksiksiz doldurulsun
- dev doğrulamasından sonra branch'e ek commit atılmamalı (atılacaksa review edilmeli)

---

## 18. Özet

Bu projede kullanılan branch yapısı:

- `main` → production ortamı
- `test` → test ortamı referans branch'i (feature'lar buradan açılır)
- `dev` → teknik doğrulama branch'i
- `feature/*` → yeni geliştirmeler
- `bugfix/*` → hata düzeltmeleri

Temel akış:

```
test ──► feature/* ──► PR → dev (doğrulama) ──► PR: dev → test (QA) ──► PR: test → main (prod)
```

Bu modelin amacı:

> Feature branch'leri `test`'ten açarak dev'deki diğer işlerin yanlışlıkla taşınmasını önlemek; `test`'e promosyonu yalnızca `dev` üzerinden yaparak tek doğrulama kapısı tutmak; CI'daki `Deploy (Test)` job'unu required status check yaparak başarısız deploy'lu işlerin merge edilmesini engellemektir.

---

## İlgili Dokümanlar

- [Commit Conventions](./COMMITS.md) — Commit mesajı kuralları ve örnekleri
