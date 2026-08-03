# Branch Stratejisi Önerisi — 5 Kişilik Ekip

**Tarih:** 2026-08-03 · **Durum:** ✅ **Kabul edildi ve uygulandı** (production pipeline hariç)
**Ekip:** DevOps · Backend · Algoritma · Frontend (4 rol / 5 kişi)

Yürürlükteki kurallar artık [`docs/conventions/BRANCHING.md`](../conventions/BRANCHING.md)'de.
Bu doküman **gerekçe ve ölçüm kaydı** olarak duruyor.
Uygulama detayı: [branch-audit.md](branch-audit.md) §8.

---

## 1. Neden Değişsin

Mevcut model kalabalık ekip için tasarlandı: `test` → `feature/*` → PR `dev` → **aynı branch'ten**
PR `test` → PR `main`. `dev` bir "teknik doğrulama kapısı", `test` ise hem ortam hem başlangıç noktası.

Bu modelin 5 kişide taşıdığı maliyet, ölçülebilir hâliyle:

| Sorun | Kanıt |
|-------|-------|
| Her iş **2 PR** üretiyor | Son 40 PR'da **13 branch birden fazla PR** açmış; #834/#835, #878/#879, #886/#887 aynı işin çiftleri |
| Çift PR akışı gürültü üretiyor | Son 30 PR'ın **10'u merge edilmeden kapatıldı**. `bugfix/refresh-yeni` tek iş için 4 PR (#876/#877 kapatıldı, #878/#879 merge), `US-XXX-planning-3d-ui-revize-coklu-arac` 5 PR |
| İki dal ayrışma riski taşıyor | `known-issues.md` #6 bu riski kayıt altına almış, `sync/test-to-dev` diye bir yama akışı doğmuş. (Bugün fiilî ayrışma yok — ama riski taşımanın karşılığı yukarıdaki PR maliyeti) |
| `enforce-test-base` CI job'u ek karmaşıklık | "head `dev` olamaz + commit `origin/dev`'de bulunmalı" kuralı, `sync/*` muafiyeti, `copilot/*` muafiyet denemesi |
| `main` ölü | 2026-04-11'den beri dokunulmamış, korumasız, production pipeline'ı yok |
| Branch'ler birikiyor | `delete_branch_on_merge` kapalı → 29 branch, 7'si zaten merge edilmiş |

`dev` kapısının varlık nedeni review'ı ölçeklemekti. 5 kişilik ekipte review zaten tek adımda yapılabilir —
kapı, faydasından çok gecikme üretiyor.

---

## 2. Önerilen Model — Tek Trunk

```
main (trunk, korumalı, default)
 ├── feat/<kod>-<açıklama>      ─┐
 ├── fix/<kod>-<açıklama>        │  kısa ömürlü (hedef ≤ 3 gün)
 ├── chore/<açıklama>            │  main'den açılır → PR → main (squash)
 └── infra/<açıklama>           ─┘
        │
        ├─ merge → test ortamına OTOMATİK deploy
        └─ v1.4.0 tag'i → production'a ONAYLI deploy
```

**Tek uzun ömürlü branch: `main`.** `dev` ve `test` branch olarak kalkar; "test" bir **ortam** olur,
branch değil. Ortamlar branch'lerle değil, deploy hedefleriyle ayrılır.

### Branch türleri

| Önek | Kullanım | Örnek |
|------|----------|-------|
| `feat/` | Yeni özellik | `feat/US-142-coklu-arac-plani` |
| `fix/` | Hata düzeltme | `fix/INC-001-refresh-token-race` |
| `hotfix/` | Production acil düzeltme | `hotfix/v1.3.1-share-token-401` |
| `chore/` | Doküman, bağımlılık, temizlik | `chore/branch-temizligi` |
| `infra/` | CI/CD, compose, monitoring (DevOps) | `infra/prod-deploy-pipeline` |

İsimlendirme kuralları `BRANCHING.md`'den aynen korunur: küçük harf, Türkçe karakter yok, boşluk yok,
iş kodu büyük harf.

### Sürüm

- `main`'e her merge → `test` ortamına otomatik deploy (bugünkü `test` branch davranışı).
- Production'a çıkış: `main` üzerinde `v<major>.<minor>.<patch>` tag'i → GitHub Environment
  `production` (zorunlu onaylayıcı) → prod deploy. Rollback zaten tag tabanlı (`rollback.yml`).
- Hotfix: prod tag'inden `hotfix/*` aç → düzelt → `main`'e PR → yeni patch tag'i.

---

## 3. Rol Bazlı Kurallar

Branch'i role göre bölmek yerine **sahipliği CODEOWNERS ile** tanımla. Yeni `.github/CODEOWNERS`:

```
apps/frontend/                @frontend-gelistirici
apps/backend/                 @backend-gelistirici
apps/backend/**/Packing/      @algoritma-gelistirici
apps/backend/**/Services/OptimizationEngine.cs  @algoritma-gelistirici
infra/  .github/  database/   @devops
docs/                         @takim-lideri
```

Böylece PR açıldığında doğru kişi otomatik reviewer olur — kimin bakacağı tartışılmaz.

| Rol | Tipik branch | Notu |
|-----|--------------|------|
| DevOps | `infra/` | Prod pipeline, secret rotation, image CVE'leri (bkz. `project-snapshot.md` §5) |
| Backend | `feat/`, `fix/` | Clean Architecture kuralları `apps/backend/docs/architecture.md` |
| Algoritma | `feat/` | Optimizasyon değişikliği + öncesi/sonrası plan karşılaştırması PR'da zorunlu |
| Frontend | `feat/`, `fix/` | UI değişikliğinde ekran görüntüsü PR'da zorunlu |

---

## 4. Koruma ve Otomasyon Ayarları

Koruma zaten **repository ruleset** ile yapılıyor (`main-protection`, `test-protection`,
`dev-protection`). Değişmesi gerekenler:

| Ayar | Şu an | Olması gereken |
|------|-------|----------------|
| Default branch | `test` | `main` |
| `main` required checks | ❌ **hiç yok** | ✅ `Frontend CI`, `Backend CI`, `Image Build`, `Deploy (Test)` |
| `dev-protection` ruleset | Aktif | Sil (`dev` kalkıyor) |
| `test-protection` ruleset | Aktif | Sil, kuralları `main-protection`'a taşı |
| Bypass aktörleri | `dev`/`test`'te Team → **her zaman** bypass | `always` yerine `pull_request` (kural fiilen işlesin) |
| `delete_branch_on_merge` | ❌ kapalı | ✅ açık |
| Merge yöntemi | Ruleset sadece merge commit'e izin veriyor | **Squash**'a izin ver ve varsayılan yap |
| Stale review dismissal | ✅ zaten açık | Değişiklik yok |

**Squash neden:** `feature/lifo-kapi-zekasi-eklendi` branch'inde 12 commit'in 10'u prettier/TS düzeltmesi.
`COMMITS.md`'nin "atomic commit + PR öncesi temizlik" hedefini squash otomatik olarak sağlıyor.
`main` geçmişi PR başına tek, okunabilir commit olur ve `git bisect` daha da iyi çalışır.

---

## 5. Geçiş Planı

`main`, `test`'in tam atası — fast-forward mümkün, çakışma riski yok (doğrulandı).

| # | Adım | Komut / yer |
|---|------|-------------|
| 1 | `main`'i `test` seviyesine getir | `main-protection`'daki `update` kuralı doğrudan push'u engeller → `test` → `main` PR'ı aç (fast-forward, çakışma yok) veya kuralı geçici kaldır |
| 2 | Default branch'i `main` yap | GitHub → Settings → Branches |
| 3 | `main`'e branch protection uygula (§4) | GitHub API / UI |
| 4 | Workflow tetikleyicilerini güncelle | `ci.yml`, `test-deploy.yml`: `test`/`dev` → `main`; `enforce-test-base` job'unu **sil** |
| 5 | Production pipeline'ı ekle | `v*` tag → prod image build + `production` environment ile deploy |
| 6 | Branch temizliğini uygula | `branch-audit.md` §6 |
| 7 | `test` ve `dev` branch'lerini arşivle | `git tag archive/test origin/test`, sonra branch'leri sil |
| 8 | `BRANCHING.md`'yi yeni modelle yeniden yaz | `docs/conventions/BRANCHING.md` |
| 9 | Ekibe 15 dk'lık aktarım | — |

**Sıra önemli:** 4. adım (workflow'lar) 2. adımdan (default branch) önce yapılırsa deploy kırılır.
5. adım tamamlanana kadar production deploy'u zaten manuel; yeni model bunu kötüleştirmiyor.

`dev`'in kapatılması kod kaybı doğurmaz: `dev` ile `test` ağaçları bugün birebir aynı
(`branch-audit.md` §3.1).

---

## 6. Karşılaştırma

| | Mevcut (feature→dev→test→main) | Önerilen (trunk) |
|---|---|---|
| İş başına PR | 2 | 1 |
| Uzun ömürlü branch | 3 | 1 |
| Ayrışma riski | Var (gerçekleşti) | Yapısal olarak yok |
| CI özel kuralı | `enforce-test-base` + muafiyetler | Yok |
| Prod'a çıkış | `test → main` PR (pipeline yok) | Tag + onaylı environment |
| Rollback | Tag tabanlı | Aynı (değişmiyor) |
| Review kalitesi | 2 kapı, ikisi de zayıf | 1 kapı + CODEOWNERS |
| Ne zaman doğru | 15+ kişi, ayrı QA fazı | 5 kişi, sürekli teslim |

---

## 7. Bu Öneriyi Reddetmenin Makul Nedeni

Ayrı bir QA ekibi gelir ve "test ortamında dondurulmuş bir sürüm üzerinde regresyon koşulacak"
gereksinimi doğarsa, `release/*` branch'leri geri gelmeli — ama `dev` yine gerekmez.
O senaryoda model: `main` (trunk) + `release/v1.4` (QA dondurma) + `hotfix/*`.

Ayrıca §5 adım 6 (production pipeline) **her hâlükârda** yapılmalı; branch stratejisi kararından
bağımsız olarak açık kritik risk (`devops-backlog.md` madde 2.2).
