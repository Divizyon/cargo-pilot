# Bilinen Sorunlar ve Geçici Çözümler

Bu doküman, Cargo Pilot altyapısında tespit edilmiş bilinen sorunları ve mevcut geçici çözümleri listeler.

**Son güncelleme:** 2026-04-30

---

## 1. `test` Branch'ine Doğrudan Push Koruması Eksik

**Durum:** ⚠️ Açık

**Açıklama:**
`test` branch'inde doğrudan push'u engelleyen bir branch protection kuralı henüz yapılandırılmamıştır. Bu durum, feature branch olmadan doğrudan `test`'e commit push edilmesine olanak tanıyabilir.

**Etkisi:**
- CI pipeline `enforce-test-base` job'ı sayesinde PR'lardaki commit'lerin `dev`'den geçtiği doğrulanır.
- Ancak `git push origin test` ile doğrudan push hâlâ mümkündür; bu durumda `enforce-test-base` tetiklenmez.

**Geçici Çözüm:**
Ekip olarak doğrudan `test`'e push yapılmamaktadır. Feature branch → `dev` PR → `test` PR akışı zorunlu kabul edilmektedir.

**Kalıcı Çözüm:**
GitHub → Settings → Branches → `test` branch protection rule:
- "Require a pull request before merging" aktif edilmeli
- "Require status checks to pass" altına `enforce-test-base` eklenmeli

---

## 2. Resend Domain Doğrulaması Tamamlanmadı

**Durum:** ⚠️ Açık

**Açıklama:**
`cargopilot.divizyon.org` domain'i Resend üzerinde doğrulanmadığından e-posta gönderiminde `onboarding@resend.dev` adresi kullanılmaktadır.

**Etkisi:**
- Şifre sıfırlama e-postası yalnızca Resend hesap sahibinin e-posta adresine gönderilebilir.
- Üretim kullanıcılarına e-posta gönderilemez.

**Geçici Çözüm:**
Test ortamında `RESEND_FROM_EMAIL=onboarding@resend.dev` olarak bırakılmıştır.

**Kalıcı Çözüm:**
resend.com → Domains → Add Domain adımları izlenerek `divizyon.org` veya `cargopilot.divizyon.org` için DNS kayıtları eklenmeli ve doğrulama tamamlanmalıdır. Ardından `RESEND_FROM_EMAIL` güncellenmeli ve sunucuya yansıtılmalıdır.

---

## 3. Production Stack Henüz Deploy Edilmedi

**Durum:** ⚠️ Açık

**Açıklama:**
Sunucuda `.env.prod` dosyası ve `docker-compose.prod.yml` ile çalışan production ortamı henüz kurulmamıştır.

**Etkisi:**
- `https://cargopilot.divizyon.org` üzerinde yalnızca test ortamı erişilebilir durumdadır.
- Production veritabanı ve object storage başlatılmamıştır.

**Geçici Çözüm:**
Test ortamı (`test` branch) ürün demosu ve geliştirme onayı için kullanılmaktadır.

**Kalıcı Çözüm:**
`infra/env/.env.prod.example` kopyalanarak sunucuda `.env.prod` oluşturulmalı ve `docker-compose.prod.yml` çalıştırılmalıdır. Bkz. [Sunucu Gereksinimleri](server-requirements.md).

---

## 4. Node.js 20 Deprecation Uyarısı (npm ci)

**Durum:** ℹ️ Bilgi

**Açıklama:**
CI pipeline'da `npm ci` çalıştırılırken Node.js 20 ile ilgili deprecation uyarısı alınmaktadır. Bu durum build'i bozmaz.

**Etkisi:**
Yalnızca uyarı niteliğindedir; `npm ci` başarıyla tamamlanmaktadır.

**Geçici Çözüm:**
Şu an için herhangi bir aksiyon gerekmemektedir.

**Kalıcı Çözüm:**
`package.json` veya workflow'daki `node-version` değeri Node.js 22+ olarak güncellenebilir. Frontend testleri ve build'in bu sürümle uyumlu olduğu doğrulanmalıdır.

---

## 5. GHCR PAT Yenilenmesi

**Durum:** ℹ️ Bilgi

**Açıklama:**
`TEST_GHCR_PAT` GitHub secret'ı olarak tanımlanan classic PAT'ın bir son geçerlilik tarihi olabilir.

**Etkisi:**
PAT süresi dolduğunda sunucu GHCR'dan image çekemez ve `test-deploy.yml` CI pipeline'ı başarısız olur.

**Geçici Çözüm:**
Şu an için herhangi bir sorun yoktur.

**Kalıcı Çözüm:**
PAT'ın son geçerlilik tarihi takip edilmeli; süresi dolmadan yenisi oluşturularak `TEST_GHCR_PAT` ve `TEST_GHCR_USER` GitHub Actions secret'ları güncellenmeli.
