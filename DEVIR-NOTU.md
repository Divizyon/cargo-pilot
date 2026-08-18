# Devir Notu — Cargo Pilot DevOps + Algoritma Çalışması

**Son güncelleme:** 2026-08-15 (akşam) · **Oturum 2:** `80a7c72a-5400-43ab-b82a-0f4876e1197e`
**Durum:** **TAMAMLANDI.** 11 PR merge edildi, `dev → test` terfisi yapıldı, test sunucusuna deploy indi.

Bu dosya işi başka bir oturumda sürdürmek içindir. Önce **§1 Ortam** ve **§2 Git durumu**'nu oku.

> Oturum 1'in (`a648d5f4`) `discovery/*.md` keşif notları `/private/tmp` temizliğinde **kayboldu**.
> Panel hakem kararları kurtarıldı (§6). Bu dosyadaki sayılar 2026-08-15'te yeniden ölçülmüştür.

---

## 0. Orijinal görev ve ilerleme

| # | İstek | Durum |
|---|---|---|
| 1 | İki artifact raporunu incele | ✅ |
| 2 | DevOps + algoritma tarafını incele, tüm md'leri oku | ✅ 47 md envanterlendi (iki turda) |
| 3 | Çoklu model/subagent ile tartışarak ilerle, ana oturum orkestrasyon | ✅ 12 ajan koştu (Opus+Sonnet karma) |
| 4 | Limit dolunca bekle, sıfırlanınca devam | ✅ |
| 5 | Tüm md'leri güncelle — "bayat bilgi olsun istemiyorum" | ✅ **iki tur**: #993 (19 dosya) + #1007 (11 dosya) |
| 6 | Grafik + sayısal ağırlıklı raporlar üret | ✅ 2 rapor (§10) |

---

## 1. Ortam

- **.NET SDK 8.0.419**: `~/.dotnet` (PATH'te DEĞİL). Her komuttan önce:
  ```bash
  export PATH="$HOME/.dotnet:$PATH"; export DOTNET_CLI_TELEMETRY_OPTOUT=1; export DOTNET_NOLOGO=1
  ```
- ⚠️ `dotnet build CargoPilot.slnx` **çalışmıyor** (`MSB4068` — SDK 8.0.419 `.slnx` desteklemiyor).
  Proje düzeyinde koş: `dotnet test apps/backend/CargoPilot.Engine.Tests`
- `brew` yok. Node yerelde **v24.18.0**, CI'da **20** (bilinen sapma).
- `gh` CLI yetkili. GHCR anonim token'ı ile tag listesi çekilebiliyor — **`?n=1000` şart**, yoksa yalnız ilk 100 tag gelir.
- **Oturum 1'in Python-portu ölçümleri GEÇERSİZ.** Bu oturumun tüm algoritma sayıları gerçek `dotnet test` ile alındı.

---

## 2. Git durumu — 11 PR `dev`'e MERGE EDİLDİ ✅

Hepsi **squash** ile (kural: `feat/fix/chore/infra → dev` squash). Merge sırası riske göre seçildi:
düşük riskli doküman/temizlik önce, motor değişiklikleri en sonda temiz bir `dev` üzerine.

| Sıra | PR | Dal | Konu | `dev` commit |
|---|---|---|---|---|
| 1 | [#993](https://github.com/Divizyon/cargo-pilot/pull/993) | `chore/dokuman-tazeleme` | 20 dosyadaki bayat bilgi | `dc9c8913` |
| 2 | [#995](https://github.com/Divizyon/cargo-pilot/pull/995) | `chore/olu-texture-temizligi` | Ölü texture, dist 46→26 MB | `5635d8d9` |
| 3 | [#994](https://github.com/Divizyon/cargo-pilot/pull/994) | `infra/yedekleme-rollback-sertlestirme` | rollback.sh SHA düzeltmesi | `29ffc8cd` |
| 4 | [#992](https://github.com/Divizyon/cargo-pilot/pull/992) | `infra/ci-cache-ve-deploy-sirasi` | Cache bütçesi + çifte build | `79bd75a4` |
| 5 | [#991](https://github.com/Divizyon/cargo-pilot/pull/991) | `infra/guvenlik-sertlestirme` | Port maruziyeti + deploy gate | `5f2f8ee6` |
| 6 | [#989](https://github.com/Divizyon/cargo-pilot/pull/989) | `fix/OPT-01-…` | Denge takası destek doğrulaması | `72e9fdfa` |
| 7 | [#990](https://github.com/Divizyon/cargo-pilot/pull/990) | `fix/OPT-02-…` | LIFO bölge sert kısıtı | `b12a2e0f` |

**Merge sonrası `dev` doğrulaması (`b12a2e0f`):**
`Engine.Tests` **61/61 yeşil** · `Infrastructure.Tests` **20/20 yeşil** · **snapshot kayması 0** ·
çalışma ağacı temiz. İki motor düzeltmesi birbirini bozmadı.

**Sonradan eklenen 4 PR:**

| PR | Konu | `dev` commit |
|---|---|---|
| [#1002](https://github.com/Divizyon/cargo-pilot/pull/1002) | Bölge testi sınırları motorun kodundan okunuyor | `7b699f35` |
| [#997](https://github.com/Divizyon/cargo-pilot/pull/997) | Koordinat standardı Z ekseni (KN-1) — başkasının PR'ı, `dev` ile uyumlulaştırıldı | `62be448f` |
| [#1006](https://github.com/Divizyon/cargo-pilot/pull/1006) | `.claude/` gitignore'a | `829fb539` |
| [#1007](https://github.com/Divizyon/cargo-pilot/pull/1007) | Doküman tazeleme **ikinci tur** | `d3033c6f` |

⚠️ Araya başkalarının işi girdi: **#996** (algoritma test aracı), **#998** (içeriksiz `test→dev`),
**#1004** (koordinat bekleyen kararlar + demo seed kaldırıldı). **#999** ve **#1000** içeriksiz oldukları
için gerekçeyle kapatıldı. **#1005** (koordinat doküman senkronu) hâlâ AÇIK ve #1007 ile 6 dosyada
örtüşüyor, 3'ünde çakışıyor — yazarına ne yapılacağı yorumla bildirildi.

**#997 uyumlulaştırmasında yakalanan tuzak:** dalın `BalanceScoring.cs` sürümü
`if (a.Height != b.Height)` içeriyordu — yani OPT-01'in düzelttiği hatanın yeniden adlandırılmış hâli.
Çakışma çözümünde `dev`'in mantığı korundu; gözden kaçsaydı OPT-01 sessizce geri alınmış olacaktı.

**Terfi:** `dev → test` (#1003) Terfi workflow'u ile yapıldı, **test sunucusuna deploy başarıyla indi**
(`Deploy (Test Server): success`). `gh pr merge` terfi PR'larında çalışmaz — bkz. `branching.md`.

**Not:** `docs/dokuman-tazeleme` dalı `chore/dokuman-tazeleme` olarak yeniden adlandırıldı —
`branching.md` izin verilen türleri `feat/fix/chore/infra/hotfix` ile sınırlıyor, `docs/` yok.

**Push sonrası çıkan tek hata (düzeltildi):** OPT-01 dalı `dev`'in 2 commit gerisindeydi; `dev`'in yeni
ERP commit'leri `OptimizationItemInput`'tan `ImageUrl` alanını kaldırmıştı ve test girdisi onu
kullanıyordu (`CS1739`). `dev` merge edildi, alan çıkarıldı, **59/59 yeşil, snapshot kayması 0**
(commit `5f2b49eb`). Yerelde görülememesinin sebebi dalın eski `dev`'den açılmış olmasıydı.

### Dal içerikleri

| Dal | Commit'ler | İçerik | Net diff |
|---|---|---|---|
| `fix/OPT-01-denge-takas-destek-dogrulamasi` | `f9a4383d` test · `a7b4a53a` düzeltme | Denge takasında atlanan destek + taşıyıcı yönü doğrulaması | 7 dosya, +726/−38 |
| `fix/OPT-02-lifo-bolge-sert-kisiti` | `3d074d2c` test · `af6ac08f` düzeltme | LIFO bölge kısıtı iki kademeli sert kısıt oldu | 3 dosya, +185/−1 |
| `infra/guvenlik-sertlestirme` | `1e4d0f34` · `773f67e4` · `649f054a` | Loopback health check + 13/14 port `127.0.0.1` + deploy gate | 5 dosya, +22/−28 |
| `infra/ci-cache-ve-deploy-sirasi` | `2d1992a7` | Cache yazıcısı susturuldu, `infra-images` bloğu kaldırıldı, çifte build tekilleştirildi | 3 dosya, +33/−38 |
| `chore/dokuman-tazeleme` | 10 commit | 20 bayat md dosyasının düzeltilmesi (#993) | 19 dosya, +333/−74 |
| `infra/yedekleme-rollback-sertlestirme` | `89b4b2bb` · `6f2925d0` | **Oturum 1'den** — rollback.sh `^2` SHA türetmesi + exec-bit + `WITH CHECKSUM` | — |
| `chore/olu-texture-temizligi` | `94036039` | **Oturum 1'den** — 4 ölü texture; dist 46 MB → 26 MB | — |

**Birleştirme sırası notu:** `infra/guvenlik-sertlestirme` ve `infra/ci-cache-ve-deploy-sirasi` ikisi de
`test-deploy.yml`'e dokunuyor ama **farklı bölgelerine** — güvenlik 442/447/497-505 (`deploy-test-server` job'u),
cache ~77-146 (`build` job'u). Çakışma yok, sıra serbest.

`fix/OPT-02-...` `dev`'den dallandı, OPT-01'i **içermiyor**. İkisi bağımsız; ayrı ayrı alınabilir.

**Proje kuralları:** iş dalları `dev`'den; izin verilen türler **yalnız** `feat/fix/chore/infra/hotfix`
(`docs/` YOK — doküman işi `chore/`); commit mesajları Türkçe, sade, atomic;
`feat→dev` squash, terfiler merge commit. **AI imzası / co-author trailer YASAK.**

---

## 3. Bu oturumda uygulanan 4 karar

### K1 · OPT-01 — denge takasında atlanan destek doğrulaması 🔴→✅
`BalanceScoring.ImproveBalance`, eşit yükseklikli kutu takaslarında (`if (a.H != b.H)`) destek kontrolünü
atlıyordu → **fiziksel olarak geçersiz plan** ("kutu havada") kullanıcıya "denge iyileştirildi" diye sunuluyordu.

| Ölçüm | Önce | Sonra |
|---|---|---|
| Engine testleri | 57 geçti / **2 kaldı** | **59 / 0** |
| Snapshot kayması | — | **0** (16/16 golden yeşil) |
| PERF 500 kutu WeightBalance | 20 562 ms | 29 453 ms (**1,43×**) |
| Doluluk (3 kriter) | %58,4 | %58,4 — değişmedi |

**Hata sentetik değildi:** `InvariantTests(Buyuk500_WeightBalance)` — 500 kutuluk gerçekçi planda 1 kutu
havada kalıyordu (destek oranı 0,6667 < 0,80 eşiği). Bu bug üretimde plan üretiyordu.
Yapılan: `a.H != b.H` kaldırıldı · `others` → `othersA`/`othersB` (a↔b kör noktası kapandı) ·
`PlacementValidator.ViolatesLoadAbove` eklendi (erken çıkışlı O(n)).

### K2 · Güvenlik sertleştirme — kısmi ✅
13/14 compose port satırı `127.0.0.1`'e çekildi; istisna `docker-compose.monitoring.test.yml:89` (Grafana 3002,
ikame erişim yolu yok). SSH içi loopback health check eklendi (**port kapatmadan ÖNCEKİ commit** — sıra kritikti).
`deploy-test-server` artık sağlık doğrulama job'unu bekliyor (CI-03 kapandı).
**Ertelendi:** 4 fallback parolanın temizliği — gereken 4 GitHub secret tanımlı değil, uygulanırsa CI kırılır.
Secret adları, 9 satır numarası ve hazır diff `k2-guvenlik.md` raporunda.

### K3 · Cache + çifte build ✅
Cache **%96,5 dolu** (228 giriş, 9,652 GiB / 10 GiB). `infra-images` tek başına 1,983 GiB = bütçenin %20,5'i;
kaldırılan adımla artık okunmayacak, ~7 günde organik düşecek. Net **−5 satır**.
`ci.yml` başarı oranı **%58,8** ölçüldü (oturum 1'in %55,9'u çürütüldü; iki bağımsız ajan aynı sayıyı buldu).

### K4 · OPT-02 — LIFO bölge cezası 🟠→✅
Oturum 1'de hakem limitte düşmüştü; bu oturumda yeniden koşuldu ve **gerçek `dotnet test` ile ölçerek** karar verdi.

Bölge cezası (2 000) yerçekiminden (1 000 000) **500× zayıftı** → zeminde yer varken bölge daima ihlal ediliyordu.
**Kazanan çözüm: iki kademeli aday seçimi** — bölge içi geçerli aday varsa yalnız onlar; hiç yoksa bugünkü
skorlamaya düş. **Katsayı 2 000'de KALDI.**

| Ölçüm | Önce | Sonra |
|---|---|---|
| P1 bölge ihlali | 4/8 kutu | **0/8** |
| P2 bölge ihlali | 2/5 kutu | **0/5** |
| FillRate (P1 / P2) | 1,0 / 0,2125 | **aynı** — kapasite kaybı yok |
| Snapshot kayması | — | **0 bayt** |
| LIFO perf 500 kutu | 9 777 ms | **8 107 ms** (hızlandı) |

**Çürütülen savunma:** "katsayıyı 2 000 000 yap" önerisi P1'i düzeltiyor ama P2'de **1/5 ihlal bırakıyor**
— eşik kaydırması, garanti değil. Koşulsuz sert eleme de reddedildi: `Lifo_KumelemeKapali`'nin FillRate'ini
0,5 → 0 yapardı.
**Belirleyici dayanak:** `GroupZoneTests.cs:46` zaten kesin bölge içermesi iddia ediyor
(`Z >= zoneStart && Z+Depth <= zoneEnd`) — kodun kendi testi sert kısıt bekliyor, üretim kodu yumuşak ceza
uyguluyordu. Tutarsızlık.

---

## 4. 🔴 AÇIK GÜVENLİK KONUSU — kullanıcı aksiyonu gerekiyor

Oturum 1'in paneli "SA parolası git geçmişinde" bulgusunu **çürütmüştü** ("yalnız artık var olmayan
`.env.dev.example` içindeydi"). **Bu çürütme YANLIŞ.**

Bağımsız `git log --all -p -S` kanıtı parolanın gerçekten commit edildiğini gösteriyor:
- `apps/backend/CargoPilot.WebAPI/appsettings.Development.json` — `fe4c7a65` → `998e04ba`
- `PRODUCTION_DEPLOYMENT_INFO.md` — `520da7ae`

`docs/devops/known-issues.md` ve `docs/devops/devops-backlog.md`'deki **orijinal uyarı geçerlidir**.
**Parola rotasyonu hâlâ gerekli.** Git geçmişinden temizlemek ayrı bir iş (history rewrite) ve
push edilmiş geçmişi etkiler — kullanıcı kararı.

---

## 5. Taze ölçümler (2026-08-15) — oturum 1'in çürütülen sayıları

| Konu | Oturum 1'de yazan | **Gerçek** |
|---|---|---|
| Motor boyutu | 927 → "düzeltilmiş" 915 satır | **`dev`'de 915 satır**, 7 dosya (261/240/207/91/71/28/17). 981 ve 986 ölçümleri OPT-01 çalışma ağacının anlarıdır — `dev` değil |
| Cache doluluk | %107,8 → "düzeltilmiş" %100,35 | **%96,5** — 228 giriş, 9,652 GiB |
| 7+ gün eski cache | 0 | `created_at`'e göre 5; **`cache-cleanup`'ın kullandığı `last_accessed_at`'e göre 0** → orijinal bulgu ayakta |
| `ci.yml` başarı | %98,9 (denetim raporu) / %55,9 | **%58,8** (34 koşum) — pencereye göre %81'e kadar |
| `test-deploy.yml` başarı | %100 | **%96,7** (29/30) |
| Engine testleri | 33 | **35** attribute |
| Frontend testleri | 166 test | 16 dosya / **~151** test-case (alt sınır) |
| GHCR | 171 tag, 3 sürüm | **173 tag** (backend+frontend ayrı), 168 `test-*`, **4** sürüm |
| Rollback kapsamı | "v0.11+ çalışır" | git'te **14** sürüm tag'i, GHCR'de yalnız **4**'ünün imajı → v0.1–v0.10 rollback İMKÂNSIZ |
| CodeQL zorunlu check | "PR kapısında" | **değil** — 4 ruleset'in hiçbirinde |
| Ruleset sayısı | 3 | **4** (`freeze` disabled) |
| `contents: read` | 8/8 workflow | **7/8** (`promote.yml:55` `contents: write`, meşru) |
| Açık dependabot PR / alert | — | **0 / 0** |
| Repo md | 41 dosya / 10.125 satır | **45 / 11.056** (git-takipli, `dev`) — tazeleme sonrası 45 / 11.315 |

Retention **YOK** — 168 `test-*` tag sınırsız birikiyor.
Son 20 merge PR'ın **20/20'si review'suz**; 4 ruleset'in hepsinde `required_approving_review_count: 0`.
Son 90 günde **568** commit. En uzun kırmızı seri: **12 ardışık**, `feat/ERP-toplu-iyilestirme`, `Frontend CI` işi.

---

## 6. Kurtarılan panel kararları (oturum 1)

```
~/.claude-divizyon/projects/-Users-dogancanyildiz-Dev-Divizyon-cargo-pilot/
  a648d5f4-2481-47c8-a4a9-e524645b5ebc/subagents/workflows/wf_70be7dea-22a/journal.jsonl
```
49 satır; 18 `result` girdisi = 15 savunma + 3 hakem kararı. Hakem kararları `karar`,
`uygulama_adimlari`, `kabul_kriterleri`, `yapilmayacaklar` alanları içeriyor, dosya:satır düzeyinde.
Çıkarma scripti oturum 2'nin scratchpad'inde (`panel/e39.json` = K1, `e40` = K2, `e41` = K3).

---

## 7. Bilinen borç (bilinçli kapsam dışı bırakıldı)

| ID | Borç | Yer |
|---|---|---|
| **OPT-14** | `item.UnloadingOrder ?? -1` sentinel'i GroupId kontrolü yapmıyor | `OptimizationEngine.cs:72` |
| **OPT-10** | Bölge kısıtı yalnız `LoadingType.Rear` kapsıyor; 5 yükleme tipinin 4'ünde bölge hiç oluşmuyor | `LifoPlacement.cs:53` |
| — | Eşit bölge bölme kusuru; bölge dar kaldığında yedek kademe devreye giriyor ve ihlal **raporlanmadan** sürüyor | `LifoPlacement.cs:66` |
| — | Yedek kademeye düşen yerleşim hiçbir yere yazılmıyor — uyarı mekanizması gerekiyor (yeni `UnplacedReason` DEĞİL) | `OptimizationEngine.cs` |
| — | `ViolatesLoadAbove` için kırılganlık / `MaxWeightOnTop` odaklı doğrudan takas testi yok | `PlacementValidator.cs` |
| **OPT-05** | `FragilityType`'ın 10 üyesinden 9'u motorda etkisiz; kod yorumu tersini iddia ediyor | `ContaminationFilter.cs` |

**0-efor ekler (kod değişikliği yok, repo ayarı):** CodeQL'i 3 aktif ruleset'e zorunlu check yap ·
`apps/backend/.github/workflows/ci.yml` ölü workflow'unu sil (olmayan `develop` dalını hedefliyor).

**YAPMA listesi (ölçüldü, değmez):** extreme-point projeksiyonu (4 senaryoda 0,00 puan kazanç) ·
NuGet cache (cache bütçesi doluyken durumu kötüleştirir) · OPT-04 çoklu-başlangıç (OPT-03 çözülmeden 3-4× süre) ·
bölge katsayısını 2 000 000 yapmak (P2'de ölçülerek yetersiz çıktı).

---

## 8. Kalan iş

1. **Parola rotasyonu** — §4, kullanıcı aksiyonu. HÂLÂ AÇIK.
2. **4 GitHub secret tanımı** — sonra K2'nin ertelenen parola temizliği uygulanabilir (`k2-guvenlik.md`'de hazır diff).
3. **SHA pinleme boşluğu (YENİ):** `test-deploy.yml` e2e job'unda **7 action mutable tag'de**
   (`:314,317,320,327,340,354,397`). Denetim raporunun "32/32 pinli" iddiası gerçekte **38/45**.
   Denetimden sonra eklenen job olduğu için ilk pinleme turuna (#942) girmemiş.
4. **0-efor repo ayarları** — CodeQL'i zorunlu check yap · ölü `apps/backend/.github/workflows/ci.yml`'i sil.
5. **ClickUp yeniden yapılandırma** — rate limit nedeniyle yarım kaldı, bkz. `CLICKUP-YAPILACAK.md`.
6. **Borç kalemleri** — §7.

## 10. Üretilen raporlar

| Rapor | Konu | URL |
|---|---|---|
| **Denetimin Denetimi** | DevOps: denetim iddiaları vs ölçüm, 3 düzeltme, doküman tazeleme | https://claude.ai/code/artifact/348c0bfb-3dfa-4a5e-8f6e-e5c8a37872a6 |
| **Kutu Havada, Yük Ters** | Motor: OPT-01 + OPT-02, testle ispat, snapshot güvencesi | https://claude.ai/code/artifact/2c023693-3c38-4087-84ef-cc412c48656f |

İkisi de grafik + sayısal ağırlıklı, kaynak veri `SCRATCH/out/` altındaki ölçüm dosyalarından.
Kaynak HTML'ler: `out/rapor-devops.html`, `out/rapor-motor.html`.

## 11. Ajan worktree'leri

4 ajan izole `git worktree` kullandı: `.claude/worktrees/agent-*`. **Commit'ler dallarda güvende**,
worktree'ler silinebilir:
```bash
git worktree list          # önce bak
git worktree remove .claude/worktrees/agent-<id>
```

## 9. Yeni oturuma öneri

Kullanıcı çoklu subagent + tartışma istiyor; ana oturum **orkestratör** kalmalı.
Limit riskine karşı her fazı ayrı ajan grubu olarak koş. Hakem/karar ajanlarına **kod değiştirtme** —
yalnız karar verdir, uygulamayı ayrı ajana yaptır; bu oturumda bu ayrım iyi işledi.
Ajanlara verdiğin "düzeltme"leri körü körüne kabul ettirme: K3 ajanı benim cache düzeltmemi
`last_accessed_at` ile sınayıp reddetti ve haklı çıktı.
</content>
