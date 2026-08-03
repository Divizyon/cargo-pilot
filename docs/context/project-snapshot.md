# Proje Anlık Görüntüsü

**Kaynak tarama:** 2026-08-03 · `test` @ `3c42f65a` · Repodaki 25 `.md` dosyası okundu.

---

## 1. Ürün

Cargo Pilot — yük planlama süreçlerini dijitalleştiren ve 3D olarak görselleştiren web platformu.
Monorepo: `apps/frontend` (React) + `apps/backend` (.NET 8) + `infra` (Docker/CI) + `database`.

---

## 2. Teknoloji

| Katman | Teknoloji | Kritik kural |
|--------|-----------|--------------|
| Frontend | React 18 + Vite + TS strict | `any` yasak, barrel export yasak, default export yasak |
| UI | Tailwind v3 + shadcn/ui + Radix | Sıfırdan UI bileşeni yazılmaz, `cn()` zorunlu, `@apply` yasak |
| Form | react-hook-form + zod | Tip `z.infer`'den türetilir, manuel interface yazılmaz |
| Server state | TanStack Query v5 | Tuple query key, API verisi Zustand'a **kopyalanmaz** |
| Client state | Zustand v4 | Sadece UI state; access token yalnızca `useAuthStore` (localStorage yasak) |
| 3D | Three.js + R3F + drei | cm birimi; X=genişlik, Y=yükseklik, Z=derinlik; origin **sol-alt-arka** |
| Export | react-pdf, SheetJS | PDF `React.lazy`, Canvas `preserveDrawingBuffer: true` |
| Backend | .NET 8, Clean Architecture | Domain ← Application ← Infrastructure/WebAPI; MediatR **yok**, service-based |
| Backend hata | `Result<T>` + `Error` + `ErrorType` | Exception ile akış kontrolü yapılmaz |
| Validation | FluentValidation (BE) / Zod (FE) | — |
| DB | SQL Server 2022 + EF Core | Soft delete global query filter, `BaseEntity` audit alanları |
| Storage | MinIO | Bucket policy public, nginx `/media/` proxy |
| Paket | npm (pnpm/yarn yasak) | — |

**3D pivot farkı:** Three.js pivot merkezde, backend pivot sol-alt-arka köşede.
`BoxWrapper` / merkezi `lib/config/scene-config.ts` ile çözülür. 50+ kutuda `InstancedMesh` zorunlu.

---

## 3. Ortamlar

| Ortam | Branch | URL | Durum |
|-------|--------|-----|-------|
| Test | `test` | http://cargopilot.divizyon.org · 104.247.163.42 | ✅ Aktif (demo da buradan yapılıyor) |
| Production | `main` | 104.247.163.42:80 | ❌ **Hiç deploy edilmedi** |

**Sunucu:** tek makine, Ubuntu 24.04, 8 vCPU / 16 GB / 147 GB SSD. Prod ve test aynı host'ta.

| Servis | Test portu | Prod portu |
|--------|-----------|-----------|
| Frontend | 3001 | 80 |
| Backend API | 8081 | 8080 |
| MSSQL | 1434 (`CargoPilotTest`) | 1433 (`CargoPilot`) |
| MinIO API / Console | 9002 / 9003 | 9000 / 9001 |
| Grafana / Prometheus | 3002 / 9091 | 3000 / 9090 |

Ek: `DIVIZYON` ERP veritabanı (müşteri `.bak` restore'u) test MSSQL container'ında — sadece geliştirme içindir.

---

## 4. CI/CD

Workflow'lar: `ci.yml`, `test-deploy.yml`, `cache-cleanup.yml`, `sync-base-images.yml`, `rollback.yml`.

| Tetikleyici | Sonuç |
|-------------|-------|
| push `feature/**`, `bugfix/**` | CI + Deploy (Test) — inline build |
| PR → `dev` | CI + Deploy (Test) |
| PR → `test` | `enforce-test-base` + Image Build + Deploy (Test) |
| push `test` | Image Build → GHCR → Deploy (Test) |
| push `main` | **hiçbir şey — production pipeline yok** |

- `enforce-test-base`: head `dev` olamaz + PR commit'i `origin/dev`'de bulunmalı. `sync/*` muaf.
- GHCR image'ları **public**; geliştirici login'i gerekmiyor. Immutable tag: `test-{sha}`.
- Koruma **repository ruleset** ile yapılıyor (klasik branch protection API'si 404 döner — yanıltıcıdır):
  `main-protection`, `test-protection`, `dev-protection` aktif; `freeze` kapalı.

| Ruleset | PR zorunlu | Onay | Required check | Bypass |
|---------|-----------|------|----------------|--------|
| `main-protection` | ✅ | 1 + son push onayı | **yok** | Team / sadece PR ile |
| `test-protection` | ✅ | 1 + son push onayı | `Deploy (Test)`, `Image Build`, `Test PR Dev Kontrolü` (strict) | Team / **her zaman** |
| `dev-protection` | ✅ | 1 + son push onayı | `Deploy (Test)` | Team / **her zaman** |

Üçünde de: sadece merge commit, push'ta eski onaylar düşer, review thread'leri çözülmüş olmalı,
branch silme ve force-push kapalı. `main`'de ayrıca `update` kuralı → doğrudan push engelli.

- Boşluk: `main`'de hiç required status check yok — CI geçmeden merge edilebilir.
- `delete_branch_on_merge` = **false** → merge sonrası branch'ler birikiyor.

---

## 5. Açık Riskler (docs/devops/known-issues.md + devops-backlog.md özeti)

| # | Risk | Seviye |
|---|------|--------|
| 1 | Production stack hiç deploy edilmedi (`.env.prod` yok, compose çalışmadı) | 🔴 Kritik |
| 2 | Production CI/CD ve prod GHCR image pipeline'ı yok | 🔴 Kritik |
| 3 | `docker-compose.prod.yml` eksik: backend healthcheck yok, OAuth/CORS/Resend env yok, `SA_PASSWORD` vs `MSSQL_SA_PASSWORD` uyumsuz | 🔴 Kritik |
| 4 | MSSQL SA parolası git geçmişinde — **rotate edilmedi** | 🔴 Güvenlik |
| 5 | Docker image CVE: backend 4 CRITICAL/18 HIGH, frontend 6 CRITICAL/29 HIGH (Trivy, 2026-05-16) | 🟠 Yüksek |
| 6 | Grafana alert var ama contact point yok → bildirim gitmiyor | 🟠 Yüksek |
| 7 | Resend domain doğrulanmadı → prod'da şifre sıfırlama e-postası gönderilemez | 🟠 Yüksek |
| 8 | SSL self-signed (Cloudflare Full, Strict değil) | 🟡 Orta |
| 9 | Loki/cAdvisor log rotation yok (bir kez 960 MB'a çıkıp Grafana'yı düşürdü) | 🟡 Orta |
| 10 | Node.js 20 deprecation (CI + Dockerfile) | 🟢 Düşük |

---

## 6. Süreç Gözlemi

- Mevcut model: `test`'ten branch aç → PR `dev` → **aynı branch'ten** PR `test` → PR `test→main`.
- Bu model her iş için **2 PR** üretiyor. PR numaraları 887'yi geçmiş; son 40 PR'da 13 branch
  birden fazla PR açmış, son 30 PR'ın 10'u merge edilmeden kapatılmış.
- Bilinen yan etki (known-issues #6): `dev` ile `test` ayrışabiliyor. **Şu an ayrışma yok** —
  iki branch'in ağacı birebir aynı (bkz. [branch-audit.md](branch-audit.md) §3.1).
- Öneri ve gerekçe: [branching-proposal.md](branching-proposal.md).

---

## 7. Squad / Sorumluluk Haritası (frontend)

| Klasör | Sahip | Kapsam |
|--------|-------|--------|
| `features/data-management` | Squad 3 | Ürün, araç, kısıt, import, ERP ekranları |
| `features/planning` | Squad 2 | Plan sihirbazı, optimizasyon, 3D viewer, manuel yerleştirme |
| `features/platform` | Squad 1 | Auth, kullanıcı, billing, ayarlar, rapor, paylaşım |
| `components/shared`, `lib/*` | Ortak | Paylaşılan UI + altyapı |
