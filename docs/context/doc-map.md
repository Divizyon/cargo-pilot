# Doküman Haritası

Repodaki tüm `.md` dosyaları, ne içerdikleri ve hangi soruda açılacakları.
**Toplam 25 dosya / ~4.600 satır.** Tarama: 2026-08-03.
**Güncelleme 2026-08-04:** `iyilestirme-analizi-2026-08.md`, 3 algoritma tasarım arşivi ve
`docs/context/kod-taramasi-2026-08.md` haritaya eklendi.

---

## Kök

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `README.md` | 93 | Ürün tanıtımı, hızlı başlangıç (3 komut), stack tablosu, repo ağacı, ortam durumu | Projeye ilk bakış |
| `SUMMARY.md` | 22 | GitBook içindekiler tablosu | Yeni doküman eklerken (buraya da satır eklenmeli) |
| `PRODUCTION_DEPLOYMENT_INFO.md` | 159 | Test/prod servis adresleri, compose başlat-durdur komutları, sunucudaki env yolları, migration'ı SDK container'ı ile çalıştırma, CI/CD akış tablosu | Deploy / sunucu operasyonu |
| `CLAUDE.md` | — | **Frontend** geliştirme kuralları (AI asistan talimatı). Kapsam, stack, sınırlar, veri kuralları, 3D invariant'ları, kalite kapıları | Frontend'e kod yazmadan önce |

## docs/conventions

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `BRANCHING.md` | 182 | **Mevcut** branch modeli: `test`'ten feature aç → PR `dev` → aynı branch'ten PR `test` → PR `main`. Branch isimlendirme (iş kodu zorunlu, büyük harf/Türkçe karakter/boşluk yasak), PR onay kuralları, branch-ortam ilişkisi, merge commit tercihi | Branch/PR açarken. **Değişiklik önerisi:** `../context/branching-proposal.md` |
| `COMMITS.md` | 105 | Sade + açıklayıcı mesaj, atomic commit (1 değişiklik = 1 commit), Türkçe tercih, "fix/update/son" gibi mesajlar yasak, PR öncesi geçmiş temizliği | Commit atmadan önce |

## docs/setup

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `local-setup.md` | 273 | Ön koşullar, `.env.test` hazırlama, iki çalışma modu (tam Docker / Vite+Docker hibrit), migration & seed, default login, sık komutlar, 4 sık sorun çözümü | Yeni geliştirici onboarding |

## docs/devops

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `server-requirements.md` | 97 | Sunucu donanımı (8 vCPU/16 GB/147 GB), bileşen bazlı CPU-RAM-disk gereksinimleri, ortam-port matrisi, aktif servis listesi | Kapasite planlama |
| `server-access.md` | 239 | SSH erişimi ve yetkili key'ler, UFW port tablosu, fail2ban, nginx reverse proxy path'leri (`/api/`, `/media/`, `/`), ağ diyagramı, monitoring stack başlatma, DIVIZYON ERP DB restore, DB yedekleme cron'ları, GitHub Actions deploy key | Sunucuya bağlanma, ağ/proxy sorunu |
| `secret-management.md` | 167 | "Repoya secret girmez" kuralı, env dosya tablosu, GHCR public durumu, backend local secret yöntemleri (User Secrets / Local JSON), GitHub Actions secret listesi, Google OAuth + Resend değişkenleri, ihlal prosedürü | Secret ekleme/döndürme |
| `monitoring-setup.md` | 239 | Prometheus/Loki/Promtail/Grafana mimarisi, ilk kurulum, toplanan metrikler, 3 alert kuralı, sorun giderme (Loki log şişmesi dahil) | Alert/dashboard işleri |
| `known-issues.md` | 160 | 8 açık sorun + çözülenler tablosu | **Her sprint başında.** Özeti: `project-snapshot.md` §5 |
| `devops-backlog.md` | 237 | 11 maddelik öncelik matrisi + kategori bazlı detay (uyumsuzluklar, eksikler, güncellenecekler, GHCR, operasyonel). **Not:** 1.2-1.4 maddeleri PR #908 ile kapandı ama hâlâ "Açık" işaretli | DevOps planlaması |
| `iyilestirme-analizi-2026-08.md` | ~900 | **51 bulguluk** kapsamlı devops analizi (2026-08-03): compose, CI/CD, güvenlik, monitoring, doküman tutarsızlıkları; bazı bulgular "doğrulanmadı" işaretli | DevOps iyileştirme planlarken — en güncel ve en detaylı kaynak |

## infra

| Dosya | Satır | Özet |
|-------|------:|------|
| `infra/env/README.md` | 144 | `.env.*.example` → `.env.*` kopyalama akışı, değişken referansı (genel/DB/MinIO/güvenlik/OAuth/monitoring), güvenlik kuralları, ortam farkları, sunucuda kurulum |

## apps/backend/docs

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `architecture.md` | 188 | Clean Architecture 4 katman + referans yönü, katman içerikleri, **kararlar:** service-based (MediatR yok), aggregate-specific repository, FluentValidation, `Result<T>`, composition root, dev'de InMemory repo. Yeni use-case 8 adımı. Scope dışı: CQRS, domain event, Scrutor, generic repository | Backend'e yeni özellik eklemeden önce |
| `developer-setup.md` | 74 | Visual Studio workload'ları, `global.json` ile SDK pinleme, doğrulama komutları, CI SDK sabitleme | Backend ortam kurulumu |
| `environment-variables.md` | 163 | `Section__SubSection__Key` naming standardı ve neden `__`, yapılandırma öncelik sırası, ortam bazlı secret kaynakları, User Secrets kurulumu, prod bağlantı akışı, secret policy, zorunlu/opsiyonel değişken tablosu | Env var eklerken |
| `database-migrations.md` | 235 | `dotnet-ef` kurulumu, connection string kaynakları, migration üretme/uygulama/geri alma, isimlendirme, ortam bazlı akış, SQL script üretme, 6 yaygın hata | Migration işleri |
| `user-story-tracker.md` | 528 | 17 story'nin alt iş bazında durum takibi (✅/🟡/⬜) + kanıt dosya listesi. Açık kalanlar: Story 8 "validation hatalarını envelope'a bağla", Story 9 correlation id + exception testleri | Backend ilerleme durumu |
| `erp-integration/data-model.md` | 53 | `Integration`, `SyncLog`, `ErpUserMapping` entity'leri + `Item`/`Vehicle`'a eklenecek alanlar | ERP entegrasyonu |
| `erp-integration/erp-schema-divizyon.md` | 455 | Müşteri ERP şeması: `TBLSTSABIT` (stok, 134 kolon), `TBLSIPAMAS` (sipariş başlığı, 106), `TBLSIPATRA` (satırlar, 97), boyut birimi notu, sync ve delta-sync sorguları | ERP alan eşlemesi |
| `matematiksel_model.md` | 443 | **Tasarım arşivi** — bin packing matematiksel modeli (EP, dominance, maliyet fonksiyonu). Kod hem ileride hem geride; arşiv notundaki "MediatR kullanılmaz" cümlesi hatalı. Fark listesi: `docs/context/kod-taramasi-2026-08.md` §4 | Algoritma tarihçesi |
| `sistem_mimarisi.md` | 348 | **Tasarım arşivi** — planlanan packing mimarisi; `PackingEngine` sınıfı hiç yazılmadı, gerçek motor `OptimizationEngine.cs` | Algoritma tarihçesi |
| `bin_packing_implementation_plan.md` | 423 | **Tasarım arşivi** — uygulama planı; güncel implementasyonla birebir değil | Algoritma tarihçesi |

## apps/frontend (AI asistan kuralları)

| Dosya | Satır | Özet |
|-------|------:|------|
| `.claude/CLAUDE.md` | 588 | **Frontend standartlarının ana kaynağı.** Klasör yapısı, isimlendirme, TS kuralları (enum yerine `as const`), shadcn kuralları, tasarım token'ları, Zustand slice tablosu, TanStack Query kuralları, form + bağımlı alan tuzağı, 3D standartları (koordinat, `BoxWrapper`, Canvas, `InstancedMesh`, dispose, raycasting, katman), routing/RBAC/JWT, abonelik kilit modal pattern'i, PDF/Excel export, `/share/:token` kuralları |
| `src/features/data-management/schemas/CLAUDE.md` | 49 | Squad 1 — form şeması, bağımlı alan (fragility ≥ 1 → Z rotasyon kilidi), Figma referansı |
| `src/features/planning/components/CLAUDE.md` | 141 | Squad 2 — `scene-config.ts`, koordinat & `BoxWrapper`, Canvas, `InstancedMesh` + raycaster, animasyon state machine, `useFrame` kuralları, violation, memory & snapshot |

## .github

| Dosya | Özet |
|-------|------|
| `pull_request_template.md` | Özet / user story / değişiklik tipi / test edildi mi / 5 maddelik kontrol listesi. **Not:** ekran görüntüsü alanı yok, CLAUDE.md UI değişikliklerinde görsel istiyor — şablona eklenmesi öneri |

---

## Doküman Sağlığı — Tespit Edilen Boşluklar

| Bulgu | Etki |
|-------|------|
| `SUMMARY.md` (GitBook ToC) backend ve ERP dokümanlarını hiç listelemiyor | Backend dokümanları GitBook'ta görünmüyor |
| `main` ve production akışını anlatan doküman yok; `BRANCHING.md` "Production pipeline henüz yok" diyor | Prod release süreci yazılı değil |
| `docs/conventions/BRANCHING.md` iki entegrasyon dalı tarif ediyor, `known-issues.md` #6 bu modelin ayrışma ürettiğini kayıt altına almış | Doküman kendi içinde çelişkiyi kabul ediyor, çözüm yazılı değil |
| ~~Algoritma tasarım dokümanları sadece `feature/3D_Packing_Algorithm` branch'inde~~ | ✅ Çözüldü — 1.160 satır PR #888 ile `test`'e taşınıyor, her dosyaya "tasarım arşivi" durum notu eklendi |
| PR şablonunda ekran görüntüsü alanı yok | UI PR'larında görsel kanıt atlanıyor |
