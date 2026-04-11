# Branching Strategy

Bu doküman, Cargo Pilot projesinde branch yapısını, isimlendirme kurallarını, geliştirme akışını, Pull Request yaklaşımını ve branch–ortam ilişkisini tanımlar. Amaç; tüm geliştiricilerin aynı standartla çalışmasını sağlamak, kod akışını izlenebilir kılmak ve `main` branch'ini her zaman stabil tutmaktır.

---

## 1. Amaç ve Kapsam

Bu branching stratejisinin amacı:

- geliştirme sürecini sade ve anlaşılır hale getirmek
- tüm ekip için ortak bir branch standardı oluşturmak
- `main` branch'ini stabil tutmak
- merge öncesi kontrol ve review süreçlerini zorunlu kılmak
- branch yapısını ortam yönetiminden ayırarak gereksiz karmaşıklığı önlemek

Bu doküman, repository üzerinde çalışan tüm geliştiriciler için geçerlidir.

---

## 2. Branch Modeli

Projede aşağıdaki branch türleri kullanılır:

- `main`
- `feature/*`
- `bugfix/*`

Bu proje için ek olarak farklı branch isimleri kullanılmaz.

Tercih edilen yaklaşım sade ve düşük karmaşıklıklı bir modeldir:
- tek stabil ana dal: `main`
- yeni geliştirmeler için: `feature/*`
- hata düzeltmeleri için: `bugfix/*`

---

## 3. Branch Türleri

### 3.1 `main`

`main`, projenin ana ve stabil branch'idir.

Özellikleri:
- her zaman mümkün olduğunca stabil tutulmalıdır
- deploy edilebilir referans branch olarak kabul edilir
- doğrudan geliştirme yapılmaz
- doğrudan push yapılmaz
- yalnızca Pull Request üzerinden güncellenir

`main` branch'i, doğrulama ve review süreçlerinden geçmiş değişikliklerin birleştirildiği ana hattır.

---

### 3.2 `feature/*`

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

---

### 3.3 `bugfix/*`

Hata düzeltmeleri için kullanılır.

Örnek kullanım alanları:

* test ortamında bulunan hata düzeltmeleri
* geliştirme ortamında tespit edilen fonksiyonel sorunlar
* container, config, network veya integration problemleri
* canlıya çıkmış bir problemin düzeltmesi

İsim formatı:

```text
bugfix/<iş-kodu>-<kısa-açıklama>
```

Örnekler:

```text
bugfix/US-D04c-backend-test-failure
bugfix/US-D03b-api-container-port-fix
bugfix/INC-001-prod-auth-validation-fix
```

---

## 4. Kullanılmayan Branch Türleri

Bu projede aşağıdaki branch türleri kullanılmaz:

* `develop`
* `test`
* `release`
* `hotfix`

Neden:

* süreç karmaşıklığını azaltmak
* gereksiz merge zincirlerini önlemek
* ortam yönetimini branch sayısı artırmadan çözmek
* onboarding sürecini kolaylaştırmak

Ortamlar branch ile değil, CI/CD pipeline ve deployment kuralları ile yönetilir.

---

## 5. Branch İsimlendirme Kuralları

Tüm branch isimleri aşağıdaki kurallara uymalıdır:

* branch prefix ve açıklama kısmı küçük harf olmalıdır
* iş kodu orijinal haliyle yazılır (örn. `US-D02b`, `INC-001`)
* boşluk kullanılmaz
* Türkçe karakter kullanılmaz
* kelimeler `-` ile ayrılır
* branch isminde ilgili iş kodu veya task kodu yer almalıdır

Doğru örnekler:

```text
feature/US-D02b-branch-strategy-definition
feature/US-D03e-docker-compose-setup
bugfix/US-D04c-backend-pipeline-failure
bugfix/INC-002-minio-config-fix
```

Yanlış örnekler:

```text
feature/yeni-yapi                          # iş kodu yok
Feature/US-D02a-Monorepo                   # prefix ve açıklama büyük harf
bugfix/docker compose fix                  # boşluk var
feature/eyup/US-D02a-monorepo-setup        # kullanıcı adı var
feature/çalışan-yapı                       # Türkçe karakter
feature/us-d02a-monorepo-setup             # iş kodu küçük harfe çekilmiş
```

---

## 6. Branch Açma Kuralları

Branch açarken aşağıdaki kurallara uyulmalıdır:

* her iş için ayrı branch açılmalıdır
* bir branch içinde birden fazla bağımsız iş biriktirilmemelidir
* branch açılmadan önce güncel `main` alınmalıdır
* task tamamlandığında ilgili branch kapatılmalıdır
* uzun süre yaşayan, amacı belirsiz branch'lerden kaçınılmalıdır

Doğru yaklaşım:

* 1 iş / 1 task / 1 branch

Yanlış yaklaşım:

* aynı branch içinde hem frontend geliştirmesi hem backend değişikliği hem unrelated refactor yapılması

---

## 7. Geliştirme Akışı

Standart geliştirme akışı aşağıdaki gibidir:

1. remote güncellenir
2. güncel `main`'den yeni branch açılır
3. geliştirme yapılır
4. commit'ler atılır
5. gerekirse branch güncel `main` ile senkronize edilir
6. push yapılır
7. Pull Request açılır
8. review ve kontroller tamamlanır
9. `main` branch'ine merge edilir
10. branch silinir

### Yeni Branch Açma

```bash
git fetch origin
git checkout -b feature/US-D02a-monorepo-setup origin/main
```

Bu komut:
* remote'u günceller
* `origin/main`'in son halinden yeni branch oluşturur
* mevcut çalışmayı bozmaz, `main`'e geçmeye gerek yoktur

### İş Tamamlandıktan Sonra

Push etmeden önce, çalışılan süreçte `main`'e başkalarının kodu merge etmiş olabileceği göz önünde bulundurularak bir senkron yapılır:

```bash
git pull origin main
```

Conflict varsa çözülür, ardından push yapılır:

```bash
git push origin feature/US-D02a-monorepo-setup
```

Ardından Pull Request açılır.

---

## 8. Pull Request Zorunluluğu

Bu projede tüm değişiklikler `main` branch'ine Pull Request üzerinden alınır.

Kurallar:

* `main` branch'ine doğrudan push yapılmaz
* doğrudan merge yapılmaz
* her değişiklik için PR açılır
* PR açıklaması doldurulmalıdır
* ilgili iş kodu belirtilmelidir
* mümkünse PR tek amaçlı ve küçük tutulmalıdır

PR yaklaşımının amacı:

* review sürecini zorunlu kılmak
* kalite kontrollerini merge öncesi çalıştırmak
* hatalı veya eksik değişikliklerin ana dala doğrudan gitmesini önlemek

---

## 9. Merge Stratejisi

Tercih edilen merge yöntemi:

### Merge Commit

GitHub üzerinde **"Create a merge commit"** seçeneği kullanılır.

Bu yöntemin tercih edilme nedenleri:

* branch commit geçmişi korunur
* COMMITS.md ile tanımlanan commit kurallarına uygun yazılmış commit'ler `main` tarihçesinde görünür kalır
* `git bisect` ile hata tespiti commit seviyesinde yapılabilir
* ek bir karar veya aksiyon gerektirmez

Bu nedenle PR merge edilirken her commit olduğu gibi `main`'e aktarılır.

Commit geçmişinin anlamlı kalması için branch içindeki commit'lerin COMMITS.md kurallarına uygun yazılması yeterlidir.

---

## 10. Doğrudan Push Kuralı

Aşağıdaki branch'e doğrudan push yapılmaz:

* `main`

Tüm değişiklikler Pull Request üzerinden geçmelidir.

Bu kuralın amacı:

* review yapılmadan kod alınmasını önlemek
* pipeline doğrulamasını zorunlu kılmak
* ana dalın stabilitesini korumaktır

---

## 11. Main Branch Koruma Kuralları

`main` branch için aşağıdaki korumalar önerilir:

* direct push kapalı olmalı
* en az 1 approval zorunlu olmalı
* PR olmadan merge yapılamamalı
* pipeline başarısızsa merge engellenmeli

Takım büyüklüğü veya ihtiyaç arttıkça bu korumalar genişletilebilir.

---

## 12. Main ile Senkron Kalma

Uzun süren branch'lerde güncel `main` ile senkron kalınmalıdır. Böylece büyük conflict'ler işin sonuna bırakılmaz.

Başlangıç aşamasında daha anlaşılır ve güvenli olduğu için aşağıdaki yaklaşım tercih edilir:

* `main`'in son halini mevcut branch'e çekmek

Örnek:

```bash
git pull origin main
```

Bu komut:
* remote'dan `main`'in son halini çeker ve mevcut branch'e merge eder
* `main`'e geçmeye gerek yoktur, mevcut branch'te kalınır

---

## 13. Ortamlar ile Branch Yapısı Aynı Şey Değildir

Bu projede branch stratejisi ile ortam yönetimi birbirinden ayrıdır.

Branch'ler:

* geliştirme işinin nasıl organize edildiğini belirler

Ortamlar:

* kodun nereye deploy edileceğini ve hangi konfigürasyonla çalışacağını belirler

Bu nedenle:

* dev ortamı var diye `develop` branch'i açılmaz
* test ortamı var diye `test` branch'i açılmaz
* prod ortamı için ayrı bir branch zorunlu değildir

Ortamlar, CI/CD pipeline ve deployment kuralları ile yönetilir.

---

## 14. Branch ve Ortam İlişkisi

Bu projede önerilen ilişki aşağıdaki gibidir:

### `feature/*`

* geliştirme burada yapılır
* build, test ve kalite kontrolleri burada çalışabilir
* doğrudan ortama deployment yapılması zorunlu değildir

### `bugfix/*`

* hata düzeltmeleri burada yapılır
* build, test ve kalite kontrolleri burada çalışabilir
* doğrudan ortama deployment yapılması zorunlu değildir

### `main`

* onaylanmış ve review edilmiş değişiklikler burada birikir
* dev ortamına deployment için referans branch olarak kullanılabilir
* test ve prod ortamlarına geçiş pipeline veya onay mekanizması ile yönetilir

Bu yaklaşım sayesinde branch modeli sade kalırken ortam yönetimi kontrollü şekilde yürütülür.

---

## 15. Dev, Test ve Prod Ortamları Branch ile Değil Pipeline ile Yönetilir

Bu projede:

* `dev`
* `test`
* `prod`

ortamları bulunabilir; ancak bunlar için ayrı branch açılması gerekmez.

Önerilen yaklaşım:

* `feature/*` ve `bugfix/*` branch'lerinde CI çalışır
* `main` branch'i dev ortamı için referans olabilir
* test ortamına geçiş, pipeline adımı veya onaylı promotion ile yapılır
* prod ortamına geçiş, kontrollü onay mekanizması ile yapılır

Bu yaklaşımın avantajları:

* daha az branch karmaşası
* daha basit merge akışı
* ortam yönetiminin deployment seviyesi üzerinden yapılması
* gereksiz `develop` / `test` / `release` branch yükünün önlenmesi

---

## 16. İyi Uygulamalar

Önerilen pratikler

* branch isimleri kısa ama açıklayıcı olsun
* branch açmadan önce `main` güncellensin
* büyük işler küçük PR'lara bölünsün
* tek branch'te farklı konular karıştırılmasın
* merge sonrası branch silinsin
* branch adı iş kodu içersin
* PR açıklamaları eksiksiz doldurulsun

---

## 17. Özet

Bu projede kullanılan branch yapısı aşağıdaki gibidir:

* `main` → stabil ana dal
* `feature/*` → yeni geliştirmeler
* `bugfix/*` → hata düzeltmeleri

Temel kararlar:

* `main` branch'ine direct push yapılmaz
* tüm değişiklikler PR ile alınır
* ortamlar branch ile değil, pipeline ve deployment kuralları ile yönetilir

Bu strateji, proje başlangıç aşaması ve mevcut ekip yapısı için sade, anlaşılır ve sürdürülebilir bir yaklaşım sunar.

---

## İlgili Dokümanlar

* [Commit Conventions](./COMMITS.md) — Commit mesajı kuralları ve örnekleri
