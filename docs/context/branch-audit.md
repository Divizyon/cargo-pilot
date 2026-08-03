# Branch & PR Denetimi

**Tarih:** 2026-08-03 · **Referans:** `origin/test` @ `3c42f65a`
**Durum:** 🔍 Analiz — **hiçbir branch silinmedi, hiçbir PR kapatılmadı.** Bu doküman karar önerisidir.

---

## 1. Özet

| Ölçüt | Değer |
|-------|------:|
| Remote branch | 29 |
| Uzun ömürlü branch | 3 (`main`, `test`, `dev`) |
| İş branch'i | 26 |
| Açık PR | 2 (ikisi de aynı branch'ten, ikisi de CONFLICTING) |
| En eski açık branch | 2026-04-28 (97 gün) |
| Doğrudan silinebilir (içeriği `test`'te) | 7 |
| Eskimiş / yerini almış, silinebilir | 11 |
| Silinebilir ama işi backlog'a taşınmalı | 4 |
| **Kurtarılması gereken gerçek iş** | **4** |

**Kritik bulgu:** `dev` branch'inde `test`'te olmayan bir refresh-token güvenlik düzeltmesi var (§3).

---

## 2. Açık PR'lar

| PR | Branch | Hedef | Durum | Öneri |
|----|--------|-------|-------|-------|
| #835 | `feature/US-XXX-coklu-arac` | `test` | CONFLICTING · 49 dosya · +4184/−671 | **Kapat** |
| #834 | `feature/US-XXX-coklu-arac` | `dev` | CONFLICTING · aynı diff | **Kapat** |

**Gerekçe:** Branch `test`'in 161 commit gerisinde, iki PR da conflict veriyor ve branch'in son commit'i
`Revert "branch içerigi test ile hizalandi ve ci derleme hatalari giderildi"` — yani hizalama denemesi
geri alınmış durumda. Bu haliyle merge edilemez.
**Ama içerik gerçek:** `LoadingPlanVehicle` entity'si, çoklu araç migration'ı ve ilgili frontend
`test`'te **yok**. Öneri: PR'ları kapat, işi `test`'ten açılan taze bir branch'e yeniden uygula (§5).

> Bu iki PR, mevcut "her iş için 2 PR" modelinin maliyetinin somut örneği: aynı diff iki kez
> review kuyruğunda bekliyor.

---

## 3. Uzun Ömürlü Branch'ler

| Branch | test'e göre | Durum |
|--------|-------------|-------|
| `test` | — | Default branch. Korumalı (1 review + 3 required check). Aktif, güncel. |
| `dev` | 3 geride / **9 önde** | Aşağıya bak. Korumasız. |
| `main` | 2051 geride / 0 önde | 2026-04-11'den beri dokunulmamış. **Korumasız.** Production hiç deploy edilmedi. |

### 3.1 `dev`'de kalan, `test`'e hiç geçmemiş iş 🔴

İçerik farkı sadece 2 dosya (36 satır) ama işlevsel olarak önemli:

```
CargoPilot.Application/Common/Errors/AuthErrors.cs   +10
CargoPilot.Infrastructure/Auth/AuthService.cs        +29/−3
```

İki commit — `MusabDINC`, 2026-05-19, PR #878 ile `dev`'e girmiş:

1. `fix: refresh token 401 - spesifik hata kodları eklendi (REFRESH_TOKEN_EXPIRED, REFRESH_TOKEN_REVOKED)`
2. `fix: refresh token race condition - atomik revoke ile es zamanli istek korumasi`

İkincisi `session.Revoke()` yerine `ExecuteUpdateAsync` ile **atomik revoke** yapıyor; eş zamanlı iki
refresh isteğinde kullanıcının tüm oturumlarının hatalı şekilde kapanmasını engelliyor.
Aynı branch'in `test` PR'ı (#879) bu iki commit'ten **önceki** halden merge edilmiş.

**Aksiyon:** `dev` kapatılmadan önce bu iki commit `test`'e taşınmalı. Aksi hâlde kullanıcılar
sekme/istek yarışında oturum kaybetmeye devam eder. `known-issues.md` #6'da tarif edilen
"dev–test ayrışması" riskinin gerçekleşmiş hâli.

### 3.2 `main`

`main`, `test`'in tam atası — yani `git push origin test:main` **fast-forward** olarak çalışır,
çakışma riski yok. Şu an korumasız ve boş bir kabuk. Karar: ya trunk yapılacak (§6 önerisi)
ya da en azından branch protection eklenecek.

---

## 4. Silinebilir Branch'ler

### 4.1 İçeriği zaten `test`'te — risk yok (7)

| Branch | Kanıt |
|--------|-------|
| `copilot/investigate-server-http-500` | 0 benzersiz commit |
| `feature/US-3D-01-3d-sahne-arac-onizleme` | 0 benzersiz commit |
| `feature/US-USR-01-user-management-profile` | 0 benzersiz commit |
| `feature/US-VY-29-3d-arac-silüet-onizleme` | 0 benzersiz commit · PR #404/#405 merged |
| `feature/US-VY-99-arac-kapi-yonu` | 0 benzersiz commit |
| `feature/BE-3D-03-3-optimization-integration` | Patch `test`'te mevcut (`git cherry` −) |
| `feature/erp-kaynak-badge-ve-paylasim-duzeltmeleri` | Patch `test`'te mevcut · PR #778/#780 merged |

### 4.2 Yerini alan iş `test`'e girmiş — eskimiş (11)

| Branch | Yaş / geride | Neden eskimiş |
|--------|-------------|---------------|
| `bugfix/US-AUTH-03-US-AUTH-04-endpoint-fix` | 1515 | Google OAuth `test`'te kurulu (`GoogleOAuthService`), `useAuth.ts` mevcut |
| `feature/US-VY-27-final2` | 1315 | `GetVehicleByIdQuery` `test`'te var |
| `feature/US-VY-27-get-vehicle-by-id` | 1314 | Aynı işin ikinci kopyası — aynı story için 2 branch |
| `feature/US-VY-INF-15-urun-havuzu-listeleme` | 1624 | `SearchItems` akışı yerini aldı · PR #227/#228 CLOSED |
| `feature/BE-NTF-01-4-5-rbac-policy-hangfire-setup` | 1100 | `NotificationVisibilityPolicy` ve Hangfire `test`'te mevcut |
| `feature/US-3D-XX-door-panel-mesh-visual` | 1076 | `ContainerMesh`/`ContainerBody` `test`'te defalarca değişti, rebase maliyeti > değeri |
| `feat/3D-container-steel-texture-floor-grid` | 1129 | `SceneFloor` `test`'te var. Ayrıca **8 MB binary texture** taşıyor — bu dosyalar repoya değil LFS/CDN'e ait |
| `feature/3D_Packing_Algorithm` | 1327 | `test`'teki `OptimizationEngine` extreme-point + CoG + grup zone'lu tam implementasyon; branch'teki `PackingEngine` iskeleti geride kaldı. ⚠️ **Önce dokümanları kurtar** (aşağı bak) |
| `copilot/investigate-door-direction-issue` | 50 | Kapı yönü düzeltmesi `test`'e #874 ile ayrıca geldi. PR #861 ve #867 CLOSED. ⚠️ Branch 3 migration dosyasını siliyor (−2873 satır) — merge edilmesi tehlikeli |
| `copilot/fix-ci-cd-errors-another-one` | 44 | PR hiç açılmamış. İçinde `test-deploy.yml`'e *copilot branch muafiyeti* var — kalıcı olmamalı |
| `copilot/resolve-conflicts-with-test-branch` | 161 | PR hiç açılmamış. Commit mesajı `Changes before error encountered` — yarım kalmış otomatik conflict çözümü, 72 dosya |

> ⚠️ **Silmeden önce kurtarılacak:** `feature/3D_Packing_Algorithm` branch'i şu üç dosyayı
> içeriyor ve bunlar `test`'te yok:
> `apps/backend/docs/matematiksel_model.md` (425 satır),
> `apps/backend/docs/sistem_mimarisi.md` (330),
> `apps/backend/docs/bin_packing_implementation_plan.md` (405).
> Toplam 1.160 satır algoritma tasarım dokümanı. Algoritma geliştiricisi için değerli olabilir —
> silmeden önce ayrı bir doküman PR'ı ile `test`'e alınmalı.

### 4.3 Branch silinsin, iş backlog'a taşınsın (4)

Bu dörtte iş **gerçekten `test`'te yok** ama branch'ler o kadar geride ki rebase maliyeti
sıfırdan yazmaktan yüksek. Branch'i saklamak kimseyi kurtarmıyor; story'yi saklamak kurtarıyor.

| Branch | Geride | `test`'te eksik olan | Backlog kaydı |
|--------|-------:|----------------------|---------------|
| `feature/US-AUTH-05-hesap-kitleme-mekanizması` | 1666 | IP bazlı lockout (`IpLoginAttempt`). Kullanıcı bazlı lockout (5 deneme / 15 dk) `test`'te **var** | "IP bazlı brute-force koruması" — kalan iş küçük |
| `feature/US-VY-DAT-01-item-list-api` | 1659 | `DimensionUnit` / `WeightUnit` / `StockStatus` alanları ve cm/kg normalizasyonu | "Ürün birim normalizasyonu + stok durumu" |
| `feature/US-VY-36-erp-vehicle-upsert-clean` | 970 | `PendingVehicleMapping` entity'si, ERP araç upsert + approve endpoint'i | "ERP araç senkronizasyonu" — `docs/erp-integration/` ile birlikte planlanmalı |
| `feature/US-SUB-02-paytr-subscription-backend` | 656 | PayTR ödeme entegrasyonunun tamamı (`test`'te "PayTR" kelimesi hiç geçmiyor) | "Abonelik/ödeme" — önce ürün kararı: bu sürümde var mı? |

---

## 5. Kurtarılması Gereken İş (4)

Bunlar silinmeden önce sahipleriyle konuşulmalı.

| Branch | Sahip | Ne var | Öneri |
|--------|-------|--------|-------|
| `feature/lifo-kapi-zekasi-eklendi` | İbrahim Nuryağınlı | LIFO algoritmasının kapı yönüne göre zone + skor hesabı, `SideBoth` kapı tipinin kaldırılması, `DebugStepPanel` (yerleştirme adım debug paneli). 12 commit, sadece 206 geride — **en taze iş** | `test`'ten yeni branch, 12 commit'i **tek commit'e squash** (10'u prettier/TS düzeltmesi), PR aç |
| `feature/US-XXX-coklu-arac` | Çağrı Tekin / İbrahim N. | Çoklu araç desteği: `LoadingPlanVehicle` entity + migration + plan UI. Açık PR #834/#835 | PR'ları kapat, işi `test` üzerine yeniden uygula, tek PR aç |
| `feature/US-XXX-container-collision-rear-door` | şeyma | PR #522/#523 merge edildikten **sonra** eklenen 5 commit: `/share` sayfasına salt-okunur 3D viewer (`test`'teki `SharePage.tsx`'te Canvas yok), kamera preset sadeleştirmesi | 3D viewer parçası değerli — ayrı branch'e taşınıp PR açılmalı |
| `bugfix/Responsive` | akgunege1 | PR #698/#701 merge edildikten sonra 1 commit: `LandingPage` `CraneAnimation` z-index düzeltmesi (2 satır) | 2 satır — yeni bugfix branch'ine taşı, sonra sil |

---

## 6. Önerilen Uygulama Sırası

Her adım ayrı ve geri alınabilir tutulmalı.

| # | Adım | Risk |
|---|------|------|
| 1 | `dev`'deki 2 refresh-token commit'ini `test`'e taşı (§3.1) | Düşük — 36 satır |
| 2 | `feature/3D_Packing_Algorithm`'daki 3 algoritma dokümanını `test`'e al | Yok — sadece doküman |
| 3 | §5'teki 4 branch için sahipleriyle 15 dk'lık karar toplantısı | Yok |
| 4 | Açık PR #834/#835'i gerekçeli kapat | Düşük |
| 5 | §4.1'deki 7 branch'i sil | Yok |
| 6 | §4.2'deki 11 branch'i sil (2. adımdan sonra) | Düşük |
| 7 | §4.3'teki 4 story'yi backlog'a yaz, sonra branch'leri sil | Düşük |
| 8 | `delete_branch_on_merge` ayarını **açık** hale getir | Yok — birikmeyi kökten keser |
| 9 | Branch stratejisi kararı → [branching-proposal.md](branching-proposal.md) | — |

> Silmeden önce güvenlik ağı: `git tag archive/<branch-adı> origin/<branch-adı> && git push origin --tags`.
> Tag'ler commit'leri kalıcı tutar, branch listesini kirletmez, gerektiğinde geri alınır.

---

## 7. Kök Neden

Bu tablonun 26 iş branch'iyle oluşmasının üç nedeni var; hiçbiri kişi kaynaklı değil:

1. **`delete_branch_on_merge` kapalı** → merge edilmiş 7 branch hâlâ listede duruyor.
2. **Her iş için 2 PR** (`dev` + `test`) → biri merge edilip diğeri unutulduğunda iş yarım kalıyor;
   `dev`'deki refresh-token fix'i tam olarak bu şekilde kayboldu.
3. **Uzun ömürlü branch'ler** → 1000+ commit geride kalan branch rebase edilemiyor, kimse silmeye de
   cesaret edemiyor, süresiz duruyor.

Üçünün de yapısal karşılığı [branching-proposal.md](branching-proposal.md)'de.
