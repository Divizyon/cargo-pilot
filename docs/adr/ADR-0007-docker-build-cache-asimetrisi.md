# ADR-0007 — Docker build cache asimetrisi: backend `mode=min`, frontend `mode=max`

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-15 (K3 panel kararı ve PR #992)
- **Kapsam:** `.github/workflows/ci.yml`, `.github/workflows/test-deploy.yml`,
  `apps/backend/Dockerfile`, `apps/frontend/Dockerfile`
- **Not:** Bu ADR geriye dönük yazılmıştır. Karar PR #992 ile uygulandı; gerekçesi yalnızca
  panel kararında ve uygulama raporunda duruyordu, bu yüzden "tutarsızlık" olarak birkaç kez
  yeniden gündeme geldi (bkz. D-13(d)).

## Bağlam

GitHub Actions cache bütçesi repo başına 10 GiB'dir. 2026-08-15'te canlı ölçüldüğünde
(`gh api /repos/Divizyon/cargo-pilot/actions/cache/usage` + sayfalanmış `actions/caches` listesi):

| Metrik | Değer |
|---|---|
| Toplam giriş | 228 (GH sayacı 229) |
| Toplam boyut | **9,652 GiB** |
| 10 GiB bütçe doluluğu | **%96,5** |

Byte'ın tamamına yakınını `buildkit` blob'ları tutuyordu (196 giriş / 7,350 GiB); `infra`
prefix'i 3 giriş / 1,983 GiB, `node` 3 giriş / 0,318 GiB, scope'lu `index` girişleri 26 adet
ve toplam ~0,0002 GiB idi. Bütçe dolduğunda GitHub en eski girişleri atar; yani cache
büyüklüğü doğrudan cache **isabet oranını** düşürür.

Aynı anda dört ayrı `cache-to` satırı vardı ve **dördü de `mode=max`** yazıyordu. `mode=max`
nihai imaj katmanlarına ek olarak tüm ara katmanları da dışa aktarır — en pahalı moddur.
Kararın konusu: bu dört satırın modu nasıl seçilmeli?

Bugünkü hâl (asimetrik):

| Konum | Scope | Mod |
|---|---|---|
| `ci.yml:229` | `cargo-pilot-backend-ci` | `mode=min` |
| `ci.yml:240` | `cargo-pilot-frontend-ci` | `mode=max` |
| `test-deploy.yml:127` | `backend-test` | `mode=min` |
| `test-deploy.yml:145` | `frontend-test` | `mode=max` |

## Karar

### 1. Backend `cache-to` `mode=min` kullanır

Gerekçe — `apps/backend/Dockerfile` yapısından doğrudan çıkar:

- `apps/backend/Dockerfile:7` tek bir `COPY . .` ile tüm backend ağacını kopyalar.
- `apps/backend/Dockerfile:12-21` **tek bir `RUN` içinde** `dotnet restore` **ve**
  `dotnet publish` çalıştırır (Web API projesini `find`/`grep` ile bulup yayınlar).
- Sonuç: ayrılabilir, çapraz-commit yeniden kullanılabilir bir `restore` katmanı **yoktur**.
  `apps/backend` içeriği değiştiğinde build stage'in tamamı geçersiz olur; değişmediğinde ise
  `mode=min`'in zaten dışa aktardığı nihai katmanlar tam isabet verir.
- Yani backend'de `mode=max`'ın sakladığı ara katmanların çapraz-commit değeri ~0'dır, buna
  karşılık maliyeti yüksektir: ölçülen en büyük blob'lar 347–358 MB bandındadır (16 adet
  > 200 MB).

Sonuçları:

- Backend'de `mode=min` neredeyse kayıpsız, yüksek byte tasarrufu sağlar.
- "`mode=min` dotnet restore cache'ini kaybettirir" itirazı backend için **geçersizdir**;
  kaybedilecek ayrı bir restore katmanı yoktur.
- Backend Dockerfile'ı ileride `restore` ve `publish`'i ayrı `RUN` katmanlarına bölerse bu
  madde yeniden değerlendirilmelidir — o zaman `mode=max`'ın gerçek bir karşılığı olur.

### 2. Frontend `cache-to` `mode=max` kullanır

Gerekçe — `apps/frontend/Dockerfile` yapısından doğrudan çıkar:

- `apps/frontend/Dockerfile:1-5` ayrı bir `deps` stage tanımlar: `COPY package*.json ./`
  ardından `npm install --ignore-scripts --no-audit --no-fund`.
- Bu, `package-lock.json` değişmedikçe **çapraz-commit yeniden kullanılabilen tek gerçek ara
  katmandır** ve nihai imajda yer almaz (nihai imaj `nginx:1.31-alpine` üzerine yalnız
  `dist/` kopyalar — `Dockerfile:21-23`).
- `mode=min` bu katmanı dışa aktarmaz; sonuç her build'de sıfırdan `npm install` olur.

Sonuçları:

- Frontend'de `mode=max` bir israf değil, tek anlamlı cache kazancının ön koşuludur.
- Frontend blob'ları backend'inkilerden belirgin biçimde küçüktür; `mode=max`'ın byte maliyeti
  burada karşılanabilir.

### 3. Asimetri bir tutarsızlık değil, Dockerfile yapısının yansımasıdır

Cache modu bir stil tercihi değil, **imajın katman yapısına verilen cevaptır**. İki Dockerfile
farklı yapıda olduğu için modları da farklıdır.

Sonuçları:

- Bu asimetri sonradan D-13(d) olarak "eksiklik/borç" biçiminde raporlandı. **Borç değildir**;
  K3'ün kabul kriteri bunu açıkça doğru sayar ve 4/4 geçmiştir
  (`SCRATCH/out/k3-cache.md:96` — "Asimetrik mod: backend=min ×2, frontend=max ×2 → 4/4 doğru").
  Backlog'da eksiklik olarak duran satır düşülmelidir.
- Dört satırı `mode=max`'a "hizalamak" bütçeyi tekrar şişirir; dördünü `mode=min`'e
  "hizalamak" frontend'de her build'de `npm install`'ı geri getirir. İki yönde de hizalama
  bir gerileme olur.

### 4. Deploy job'u cache **okur**, cache **yazmaz**

Deploy job'undaki `cache-to` satırları kaldırıldı; yalnız `cache-from` kaldı
(`test-deploy.yml:221`, `:237` ve e2e job'unda `:337`, `:351`).

Gerekçe:

- Ölçülen 6,56 GB'lık en büyük tek kaynak, build job'un hiç çalışmadığı uzun ömürlü bir iş
  dalıydı; o blob'ları yazan tek şey deploy job'unun `cache-to` satırlarıydı.
- Deploy job'u zaten build job'un yazdığı katmanları tüketir; ikinci kez yazması aynı içeriği
  farklı ref altında çoğaltır.

Sonuçları:

- Cache yazımı tek noktada (build job) toplandı; bütçe tüketimi öngörülebilir hâle geldi.
- `cache-from`'un isabet alabilmesi için deploy'un build'den **sonra** koşması şarttır
  (`needs: [migration-check, build]`); sıralama aynı PR'da düzeltildi.

## Ölçüm — kararın dayandığı sayılar

| Ölçüm | Değer | Kaynak |
|---|---|---|
| Cache doluluğu (2026-08-15 13:34 UTC) | 9,652 GiB / 10 GiB = **%96,5** | `SCRATCH/out/k3-cache.md:13-18` |
| `buildkit` blob payı | 196 giriş / 7,350 GiB | `k3-cache.md:31-36` |
| `infra-images` payı | 3 giriş / 1,983 GiB (bütçenin %20,5'i) | `k3-cache.md:34,56` |
| En büyük tek ref | 4,16 GiB / 111 giriş (tek iş dalı) | `k3-cache.md:22` |
| Net satır değişimi (PR #992) | −5 satır (33 ekleme / 38 silme) | `k3-cache.md:81-88` |
| `ci.yml` kopya build tasarrufu | başarılı push başına ~210,6 sn runner (n=5) | `k3-cache.md:108` |

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| Dört satırın hepsi `mode=max` (mevcut hâl) | Ölçülen bütçe %96,5 doluydu; backend'de `mode=max`'ın çapraz-commit değeri ~0 iken blob'ları 347–358 MB bandında |
| Dört satırın hepsi `mode=min` | `apps/frontend/Dockerfile:1-5`'teki `deps` stage dışa aktarılmaz; her build'de sıfırdan `npm install` — frontend'de gerçek gerileme |
| **Cache scope'larını birleştirme** (4 scope → 2) | **Ölçümle çürütüldü.** Byte'ı tutan girişler `buildkit-blob-1-sha256:<digest>` biçiminde, **içerik adresli ve scope'suz**; scope'a bağlı `index-*` girişlerinin ölçülen boyutu ~0 byte. Üstelik GHA cache **ref-izole**, scope-izole değil. Birleştirme byte kazandırmaz. Ayrıca frontend build-arg'ları `ci.yml` ile `test-deploy.yml` arasında farklı (`VITE_API_BASE_URL` vd.) ve buildkit cache anahtarı build-arg'ı içerdiği için scope birleştirilse de blob'lar ayrışmaya devam eder. Zamanlama tarafında da aynı scope'u paylaşan ikinci build daha yavaş ölçüldü (Image Build 95 sn / 100 sn'e karşılık Deploy 118 sn / 112 sn) |
| NuGet paket cache'i eklemek (D-13(b)) | Cache bütçesi %96,5 doluyken durumu kötüleştirir; açık "yapma" listesinde |
| Deploy için ayrı GHCR-pull dallanması | Gereksiz: `Deploy (Test Server)` zaten `needs: [migration-check, build]` ve GHCR'dan `image_tag` ile çekiyor; ölçümde geçici doğrulamadan 100 sn önce bitiyor. Saf karmaşıklık |
| `infra-images` cache'ini korumak | 1,983 GiB = bütçenin %20,5'i. `docker-compose.test.yml`'de `mssql` ve `minio` servislerinin `build:` bölümü yok; `up -d --no-build --wait` varsayılan `--pull missing` ile bu imajları kendisi çeker. Kaldırıldı |

## Açık konular

- Kaldırılan `infra` prefix'indeki 3 giriş (1,983 GiB) anında silinmez; artık hiç okunmadığı
  için GitHub'ın yerleşik "7 gün erişilmezse sil" politikasıyla ~1 hafta içinde organik olarak
  düşer.
- `cache-cleanup.yml` yaş kriteri `last_accessed_at` alanına bakar (`created_at`'e değil);
  bu kriterle ölçüm anında **0 giriş** siliniyordu. Boyut eşiği bu yüzden eklendi; eşiğin
  gerçek etkisi bir `test` push'uyla ölçülmedi.
- Sıralama düzeltmesinin (`deploy` artık `build`'den sonra) beklenen ~200 sn/test-push kazancı
  **tahmindir**, ölçülmedi.
