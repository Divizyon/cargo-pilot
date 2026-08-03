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

| Ortam | Kaynak | URL | Durum |
|-------|--------|-----|-------|
| Test | `main` push | http://cargopilot.divizyon.org · 104.247.163.42 | ✅ Aktif (demo da buradan yapılıyor) |
| Production | `v*` tag (pipeline yok) | 104.247.163.42:80 | ❌ **Hiç deploy edilmedi** |

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

Workflow'lar ayrıca: `release-tag.yml` (2026-08-03'te eklendi).

| Tetikleyici | Sonuç |
|-------------|-------|
| push `feat/**`, `fix/**`, `hotfix/**`, `chore/**`, `infra/**` (+ eski `feature/**`, `bugfix/**`) | CI + geçici stack doğrulaması (inline build) |
| PR → `dev` | CI + Docker Image Build |
| PR → `test` | CI + Terfi Zinciri + Migration + Image Build + Deploy (Test) |
| push `test` | Image Build → GHCR → **test sunucusuna deploy** |
| PR → `main` | CI + Terfi Zinciri + Migration |
| push `main` | `v0.<n>.0` sürüm etiketi (deploy yok) |
| `v*` tag | **hiçbir şey — production pipeline yok** (devops-backlog 2.2) |

- `enforce-test-base` job'u kaldırıldı; yerine **`Terfi Zinciri Kontrolü`** (`ci.yml`) geldi:
  `test`'e yalnızca `dev`'den, `main`'e yalnızca `test` veya `hotfix/*` üzerinden PR açılabilir.
  2026-08-03'te boş bir PR ile fiilen doğrulandı (PR #904 engellendi).
- GHCR image'ları **public**; geliştirici login'i gerekmiyor. Immutable tag: `test-{sha}`.
- Koruma **repository ruleset** ile yapılıyor (klasik branch protection API'si 404 döner — yanıltıcıdır):
  `main-protection`, `test-protection`, `dev-protection` aktif; `freeze` kapalı.

| Ruleset | Merge yöntemi | Required check |
|---------|---------------|----------------|
| `dev-protection` | sadece **squash** | `Frontend CI`, `Backend CI` |
| `test-protection` | sadece **merge commit** | `Terfi Zinciri`, `Frontend CI`, `Backend CI`, `Migration`, `Image Build`, `Deploy (Test)` |
| `main-protection` | sadece **merge commit** | `Terfi Zinciri`, `Frontend CI`, `Backend CI`, `Migration` |

Merge yöntemi kısıtı kritik: terfi PR'ında squash yapılırsa hedef dal, kaynakta olmayan yeni bir
commit alır ve dallar kalıcı ayrışır. Ruleset yanlış seçimi mümkün kılmıyor.

Üçünde de: PR zorunlu, 1 onay + son push onayı, push'ta eski onaylar düşer, review thread'leri
çözülmüş olmalı, branch silme ve force-push kapalı, bypass **sadece PR ile** (eski `always` kaldırıldı).
`main`'de ayrıca `update` kuralı → doğrudan push engelli.
`strict_required_status_checks_policy` üçünde de **false** — aksi hâlde her terfiden sonra
geri-merge zorunlu olurdu.

- `delete_branch_on_merge` = **true**.

---

## 5. Açık Riskler (docs/devops/known-issues.md + devops-backlog.md özeti)

| # | Risk | Seviye |
|---|------|--------|
| 1 | Production stack hiç deploy edilmedi (`.env.prod` yok, compose çalışmadı) | 🔴 Kritik |
| 2 | Production CI/CD ve prod GHCR image pipeline'ı yok | 🔴 Kritik |
| 3 | ~~`docker-compose.prod.yml` eksik~~ → 2026-08-03'te giderildi (`Minio__*`, `OAuth__Google__*`, `Cors__*`, `Resend__*`, backend healthcheck). **Sahada hiç çalıştırılmadı.** | 🟠 Yüksek |
| 4 | MSSQL SA parolası git geçmişinde — **rotate edilmedi** | 🔴 Güvenlik |
| 5 | Docker image CVE: backend 4 CRITICAL/18 HIGH, frontend 6 CRITICAL/29 HIGH (Trivy, 2026-05-16) | 🟠 Yüksek |
| 6 | Grafana alert var ama contact point yok → bildirim gitmiyor | 🟠 Yüksek |
| 7 | Resend domain doğrulanmadı → prod'da şifre sıfırlama e-postası gönderilemez | 🟠 Yüksek |
| 8 | SSL self-signed (Cloudflare Full, Strict değil) | 🟡 Orta |
| 9 | Loki/cAdvisor log rotation yok (bir kez 960 MB'a çıkıp Grafana'yı düşürdü) | 🟡 Orta |
| 10 | Node.js 20 deprecation (CI + Dockerfile) | 🟢 Düşük |

---

## 6. Branch Modeli — Üç Dallı Terfi (2026-08-03'ten itibaren)

```
feat/* ──PR(squash)──► dev ──PR(merge)──► test ──PR(merge)──► main
                        │                  │                    │
                       CI          TEST SUNUCUSU         ileride PRODUCTION
                                (gösterim + QA testi)    (şimdilik sadece tag)
```

| Dal | Rol | Deploy hedefi | Terfi ritmi |
|-----|-----|---------------|-------------|
| `dev` | Günlük entegrasyon | Yok, sadece CI | — |
| `test` | QA / gösterim ortamı | Test sunucusu | İş onaylandıkça |
| `main` | Production'a hazır sürüm | *(prod sunucusu yok)* | Haftalık |

- `main` **default** branch ve production'a ayrılmış. Prod sunucusu kurulana kadar deploy tetiklemez;
  her terfide `release-tag.yml` otomatik `v0.<n>.0` etiketi atar (ilk etiket: `v0.1.0`).
- `test` ve `main` üzerinde **commit üretilmez** — içerikleri yalnızca terfi ile değişir.
  Test ortamında bulunan bug `dev`'den açılan `fix/*` ile düzeltilip yeniden terfi edilir.
- `hotfix/*` → `main` tek istisna; ardından `main → test → dev` geri-merge **zorunlu**.
- `dev` her an çıkılabilir olmalı: erken terfide `dev`'deki her şey birlikte gider.
- Silinen tüm eski branch'ler `archive/<branch-adı>` tag'i olarak korunuyor (28 tag).
- Kurallar: [BRANCHING.md](../conventions/BRANCHING.md) · Karar geçmişi: [branching-proposal.md](branching-proposal.md)

**Not:** 2026-08-03 sabahı kısa süreliğine trunk modeline (`main` tek dal) geçildi, aynı gün
üç dallı modele dönüldü. Gerekçe: test ortamı fiilen müşteriye gösterilen yüzey ve ayrı bir
QA adımı var — dondurulabilir bir dal gerekiyor. Detay: [branch-audit.md](branch-audit.md) §8–§9.

---

## 7. Squad / Sorumluluk Haritası (frontend)

| Klasör | Sahip | Kapsam |
|--------|-------|--------|
| `features/data-management` | Squad 3 | Ürün, araç, kısıt, import, ERP ekranları |
| `features/planning` | Squad 2 | Plan sihirbazı, optimizasyon, 3D viewer, manuel yerleştirme |
| `features/platform` | Squad 1 | Auth, kullanıcı, billing, ayarlar, rapor, paylaşım |
| `components/shared`, `lib/*` | Ortak | Paylaşılan UI + altyapı |
