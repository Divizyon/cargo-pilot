# Bilinen Sorunlar ve Geçici Çözümler

Bu doküman, Cargo Pilot altyapısında tespit edilmiş bilinen sorunları ve mevcut geçici çözümleri listeler.

**Son güncelleme:** 2026-05-10

> Geliştirme backlog'u ve iyileştirme maddeleri için bkz. [devops-backlog.md](devops-backlog.md)

---

## 1. `test` Branch'ine Doğrudan Push Koruması Eksik

**Durum:** ⚠️ Açık

**Açıklama:**
`test` branch'inde doğrudan push'u engelleyen bir branch protection kuralı henüz yapılandırılmamıştır.

**Etkisi:**
- `git push origin test` ile doğrudan push mümkündür; `enforce-test-base` tetiklenmez.

**Geçici Çözüm:**
Ekip olarak doğrudan `test`'e push yapılmamaktadır.

**Kalıcı Çözüm:**
GitHub → Settings → Branches → `test` branch protection rule:
- "Require a pull request before merging" aktif edilmeli
- Required status checks: `Test PR Dev Kontrolü`, `Image Build`, `Deploy (Test)` eklenmeli

---

## 2. Resend Domain Doğrulaması Tamamlanmadı

**Durum:** ⚠️ Açık

**Açıklama:**
`cargopilot.divizyon.org` domain'i Resend üzerinde doğrulanmadığından e-posta gönderiminde `onboarding@resend.dev` adresi kullanılmaktadır.

**Etkisi:**
- Şifre sıfırlama e-postası yalnızca Resend hesap sahibinin e-posta adresine gönderilebilir.

**Geçici Çözüm:**
Test ortamında `RESEND_FROM_EMAIL=onboarding@resend.dev` olarak bırakılmıştır.

**Kalıcı Çözüm:**
resend.com → Domains → `divizyon.org` için DNS kayıtları eklenmeli. `RESEND_FROM_EMAIL` güncellenmeli.

---

## 3. Production Stack Henüz Deploy Edilmedi

**Durum:** ⚠️ Açık — Kritik

**Açıklama:**
Sunucuda `.env.prod` dosyası ve production stack hiç kurulmamıştır.

**Etkisi:**
- Production veritabanı ve object storage başlatılmamış.
- `https://cargopilot.divizyon.org` yalnızca test ortamını sunuyor.

**Geçici Çözüm:**
Test ortamı ürün demosu için kullanılmaktadır.

**Kalıcı Çözüm:**
`infra/env/.env.prod.example` → `.env.prod` oluşturulmalı, `docker-compose.prod.yml` ayağa kaldırılmalı. Detaylar: [devops-backlog.md](devops-backlog.md) madde 1–4.

---

## 4. MSSQL SA Parolası Git Geçmişinde

**Durum:** ⚠️ Açık — Güvenlik

**Açıklama:**
`appsettings.Development.json`'da eski SA parolası daha önce repoya commit edilmişti. Dosya güncellendi ancak git geçmişinde hala görünür.

**Etkisi:**
- Geçmişe erişimi olan biri eski parolayı görebilir.

**Geçici Çözüm:**
Dosyadaki parola placeholder ile değiştirildi.

**Kalıcı Çözüm:**
Sunucudaki SA parolası döndürülmeli (rotate). Geçmiş temizliği için `git filter-repo` kullanılabilir; ancak tüm klonların güncellenmesi gerekir. Minimum aksyon: **parolayı döndür**.

---

## 5. Node.js 20 Deprecation Uyarısı (CI)

**Durum:** ℹ️ Bilgi

**Açıklama:**
CI pipeline'da Node.js 20 kullanılıyor; deprecation uyarısı alınmaktadır. Build'i bozmaz.

**Kalıcı Çözüm:**
`ci.yml` ve `Dockerfile`'da Node.js 22'ye geçilmeli. Bkz. [devops-backlog.md](devops-backlog.md) madde 18.

---

## 6. `TEST_GHCR_PAT` Sona Erme Tarihi

**Durum:** ℹ️ Bilgi

**Açıklama:**
Sunucunun GHCR'dan image çekmek için kullandığı `TEST_GHCR_PAT` classic PAT'ın süresi dolabilir.

**Etkisi:**
Süresi dolduğunda `test-deploy.yml` pipeline fail eder; sunucu image çekemez.

**Kalıcı Çözüm:**
PAT sona erme tarihi takvime eklenmeli; dolmadan `TEST_GHCR_PAT` ve `TEST_GHCR_USER` secret'ları güncellenmeli.

---

## ✅ Çözülenler

| Tarih | Sorun | Çözüm |
|-------|-------|-------|
| 2026-05-10 | Frontend local dev CORS sorunu | Nginx `/api` proxy (#440) + Vite proxy (`vite.config.ts` zaten mevcuttu) |
| 2026-05-10 | GHCR developer login gerekliliği | Package'lar public yapıldı |
| 2026-04-25 | `appsettings.Development.json` SA parolası | Placeholder ile değiştirildi (git geçmişi hala sorunlu — madde 4) |
