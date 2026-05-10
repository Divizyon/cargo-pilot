# Bilinen Sorunlar ve Geçici Çözümler

Bu doküman, Cargo Pilot altyapısında tespit edilmiş bilinen sorunları ve mevcut geçici çözümleri listeler.

**Son güncelleme:** 2026-05-10

> Geliştirme backlog'u ve iyileştirme maddeleri için bkz. [devops-backlog.md](devops-backlog.md)

---

## 1. Resend Domain Doğrulaması Tamamlanmadı

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

## 2. Production Stack Henüz Deploy Edilmedi

**Durum:** ⚠️ Açık — Kritik

**Açıklama:**
Sunucuda `.env.prod` dosyası ve production stack hiç kurulmamıştır.

**Etkisi:**
- Production veritabanı ve object storage başlatılmamış.
- `https://cargopilot.divizyon.org` yalnızca test ortamını sunuyor.

**Geçici Çözüm:**
Test ortamı ürün demosu için kullanılmaktadır.

**Kalıcı Çözüm:**
`infra/env/.env.prod.example` → `.env.prod` oluşturulmalı, `docker-compose.prod.yml` ayağa kaldırılmalı. Detaylar: [devops-backlog.md](devops-backlog.md) madde 2.1–2.3.

---

## 3. MSSQL SA Parolası Git Geçmişinde

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

## 4. Node.js 20 Deprecation Uyarısı (CI)

**Durum:** ℹ️ Bilgi

**Açıklama:**
CI pipeline'da Node.js 20 kullanılıyor; deprecation uyarısı alınmaktadır. Build'i bozmaz.

**Kalıcı Çözüm:**
`ci.yml` ve `Dockerfile`'da Node.js 22'ye geçilmeli. Bkz. [devops-backlog.md](devops-backlog.md) madde 3.7.

---

## 5. `docker-compose.prod.yml` — Eksik Env Var'lar ve Healthcheck

**Durum:** ⚠️ Açık

**Açıklama:**
Prod compose'da backend için healthcheck bloğu yok; OAuth, CORS, Resend ve MSSQL env var'ları eksik. MSSQL healthcheck'te `SA_PASSWORD` ile `MSSQL_SA_PASSWORD` uyumsuzluğu var.

**Etkisi:**
- Prod deploy edildiğinde Google OAuth, e-posta gönderimi ve CORS ayarları çalışmaz.
- MSSQL healthcheck fail ederse bağımlı servisler başlamaz.

**Kalıcı Çözüm:**
Bkz. [devops-backlog.md](devops-backlog.md) madde 1.2, 1.3, 1.4.

---

## 6. `dev` Branch'inin Test'in Gerisine Düşme Riski

**Durum:** ℹ️ Süreç Uyarısı

**Açıklama:**
`US-REP-04` (#482) dev'i atlayarak doğrudan test'e merge edildi. Bu, dev'in test'in gerisinde kalmasına neden oldu. PR #493 (`sync/test-to-dev`) ile giderildi.

**Etkisi:**
- Dev'den test'e geçmek isteyen PR'lar, dev'de olmayan commit'leri içerebilir.
- `enforce-test-base` CI kontrolü yanlış sonuç verebilir.

**Süreç Kuralı:**
Feature branch'ler **her zaman** önce `dev`'e, ardından aynı branch'ten `test`'e PR açılmalı. Hiçbir değişiklik dev'i atlayarak test'e gitmemelidir.

**Geçici Çözüm:**
Uyumsuzluk tespit edildiğinde `sync/test-to-dev` branch'i açılarak test → dev sync yapılır.

---

## ✅ Çözülenler

| Tarih | Sorun | Çözüm |
|-------|-------|-------|
| 2026-05-10 | Frontend local dev CORS sorunu | Nginx `/api/` proxy (#440) + Vite proxy |
| 2026-05-10 | GHCR developer login gerekliliği | Package'lar public yapıldı |
| 2026-05-10 | `test` branch'ine direct push koruması yoktu | GitHub branch protection kuralı eklendi |
| 2026-05-10 | `TEST_GHCR_PAT` sona erme riski | Package'lar public; PAT login `test-deploy.yml`'den kaldırıldı (#483) |
| 2026-05-10 | GHCR rollback için immutable tag yoktu | `test-{sha}` tag CI'da üretiliyor (#483) |
| 2026-05-10 | GHA cache 10 GB limitine yaklaşmıştı (320 cache) | Cache cleanup workflow eklendi (#489/#492) |
| 2026-05-10 | `dev` branch test'in gerisine düştü | `sync/test-to-dev` PR açıldı (#493) |
| 2026-04-25 | `appsettings.Development.json` SA parolası | Placeholder ile değiştirildi (git geçmişi hala sorunlu — madde 3) |
