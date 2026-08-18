# ADR-0011 — Docker build cache modu: backend restore katmanı ayrıldıktan sonra yeniden değerlendirme

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-18 (bu ADR'nin ölçümleri ve kararı aynı gün alındı)
- **Kapsam:** `.github/workflows/ci.yml`, `.github/workflows/test-deploy.yml`,
  `apps/backend/Dockerfile`, `apps/frontend/Dockerfile` · Tetikleyen: PR #1047 (D-30) ·
  **ADR-0007'nin tamamının yerini alır**

## Bağlam

ADR-0007 karar #1 (backend `cache-to` `mode=min`) şu öncüle dayanıyordu: `apps/backend/Dockerfile`
tek bir `RUN` içinde hem `dotnet restore` hem `dotnet publish` çalıştırıyordu, dolayısıyla
ayrılabilir, çapraz-commit yeniden kullanılabilir bir restore katmanı **yoktu**
(ADR-0007 `## Karar` madde 1, satır 47-49). ADR-0007 kendi yeniden değerlendirme koşulunu
açıkça yazmıştı (satır 61-62):

> "Backend Dockerfile'ı ileride `restore` ve `publish`'i ayrı `RUN` katmanlarına bölerse bu
> madde yeniden değerlendirilmelidir — o zaman `mode=max`'ın gerçek bir karşılığı olur."

**Bu koşul gerçekleşti.** PR #1047 (D-30, "Backend Dockerfile csproj-only restore katmanı +
`--no-restore`") tam bunu yaptı. Bugün doğrulandı (`apps/backend/Dockerfile`):

- `:11-15` yalnızca restore grafiğini etkileyen dosyalar kopyalanıyor: `global.json`,
  `Directory.Build.props`, `CargoPilot.slnx` ve dört `.csproj` (Domain/Application/
  Infrastructure/WebAPI).
- `:21-29` **ayrı bir `RUN`** bloğu; `:29` `dotnet restore "$project"` ile bitiyor.
- `:35` `COPY . .` — kaynak ağacı restore'dan **sonra** kopyalanıyor.
- `:37-40` **ikinci, ayrı bir `RUN`** bloğu; `:39` `dotnet publish ... --no-restore` çalıştırıyor.

Yani karar #1'in "ayrılabilir restore katmanı yok" öncülü artık **yanlış**. Karar #1'in
gerekçesi düştü; kararın kendisinin de düşüp düşmediği ölçülerek test edilmesi gerekiyordu —
bu ADR'nin konusu budur.

Karar #2 (frontend `mode=max`) bu değişiklikten etkilenmedi: `apps/frontend/Dockerfile` hâlâ
ayrı bir `deps` stage kullanıyor, yapısı değişmedi.

**Neden ADR-0007'nin tamamı yerini alıyor, yalnız `Durum` satırı değil:** Konvansiyon
(`docs/adr/README.md:66-73`) kabul edilmiş bir ADR'nin gövdesinin düzenlenemeyeceğini, yalnız
`Durum` satırının `Yerini aldı: ADR-XXXX` olarak güncellenebileceğini söylüyor. Ama ADR-0007
**iki bağımsız karar** içeriyor ve yalnızca biri (karar #1) yeniden değerlendirmeyi
gerektiriyordu; dört durum değeri (`Önerildi` / `Kabul edildi` / `Reddedildi` /
`Yerini aldı: ADR-XXXX`) kısmi devralmayı ifade edemiyor — "ADR-0007 sadece karar #1 için
yerini aldı" diye bir ara durum yok. En temiz çözüm: bu ADR, ADR-0007'nin **tamamının**
yerini alır; karar #2'yi (frontend `mode=max`) ve karar #3/#4'ün hâlâ geçerli olan
sonuçlarını kendi içinde yeniden ifade edip yürürlükte tutar. Böylece güncel cache
politikasını anlatan **tek bir yürürlükteki ADR** kalır; ADR-0007'nin `Durum` satırı
`Yerini aldı: ADR-0011` olur, gövdesi değiştirilmez.

## Karar

### 1. Backend `cache-to` `mode=min`'de kalır — gerekçe değişti, sonuç değişmedi

Kod: `.github/workflows/ci.yml:233` (`type=gha,mode=min,scope=cargo-pilot-backend-ci`),
`.github/workflows/test-deploy.yml:135` (`type=gha,mode=min,scope=backend-test`).

Gerekçe:

- **Değer artık var (ölçüldü).** Restore katmanı ayrıldığı için `mode=max`'ın artık gerçek
  bir çapraz-commit karşılığı var — bu, ADR-0007 karar #1'in öncülünü geçersiz kılan doğrudan
  kanıt: local `docker buildx build ./apps/backend/` üzerinde yalnız bir `.cs` dosyası
  (`CargoPilot.WebAPI/Program.cs`, restore grafiğinin parçası değil — geçici olarak
  değiştirilip ölçüm sonrası geri alındı) değiştirilip yeniden build edildiğinde:
  `--cache-from type=local,src=<mode=min export>` ile restore `RUN` katmanı
  (`Dockerfile:21-29`) **CACHE MISS** verdi (11,6 sn yeniden çalıştı, adım `DONE 11.6s`);
  aynı build `--cache-from type=local,src=<mode=max export>` ile aynı adımda **CACHE HIT**
  verdi (`#16 ... CACHED`, 0 sn). İki `docker buildx build` komutunun ham çıktısı bu ölçümün
  kaynağıdır (2026-08-18, Docker 29.7.2, buildx v0.36.1, `docker-container` sürücüsü).
- **Ama byte maliyeti orantısız.** Aynı local ortamda tek bir backend imajı için
  `--cache-to type=local,dest=...` export boyutu: `mode=min` → **97,4 MiB** (12 blob, `du -sk`
  99.784 KB), `mode=max` → **684,7 MiB** (25 blob, `du -sk` 701.180 KB). Fark
  **~587,3 MiB / generation**. Bu, `type=gha` export'unun byte maliyeti için iyi bir vekildir
  (aynı buildkit cache mekanizması, aynı ara katmanlar; GHA'nın kendi ağ/sıkıştırma
  davranışıyla birebir aynı olmayabilir — bkz. Açık konular).
- **Kota bugün doluluğa çok yakın.** `gh api /repos/Divizyon/cargo-pilot/actions/cache/usage`
  (2026-08-18): 284 giriş / **8,210 GiB / 10 GiB bütçe = %82,1**. Sayfalanmış
  `actions/caches` dökümünde `node-cache-*` 60 giriş / **4,468 GiB** (kotanın **%44,7**'si,
  aktif kullanımın **%54,4**'ü); `buildkit-blob-*` 192 giriş / 3,667 GiB.
- **Aktif ref/generation sayısı.** `gh api .../actions/caches -q '.actions_caches[].ref' | sort -u | wc -l`
  ile bugün **37** farklı ref (branch/PR) aktif cache tutuyor. Bunlardan yalnızca backend
  scope'ları (`cargo-pilot-backend-ci` + `backend-test`) için gerçek "index" girişi taşıyanlar
  **13** — yani bugün fiilen 13 farklı ref/PR için canlı bir backend cache generation'ı var.
- **Extrapolasyon iki senaryoyla:** 587,3 MiB × 13 (bugün canlı backend generation sayısı)
  ≈ **7,46 GiB** ek yük; bugünkü 8,21 GiB toplam kullanıma eklenirse **~15,67 GiB**, 10 GiB
  bütçenin **%157'si**. Daha geniş 37 aktif ref varsayımıyla (her ref'in er ya da geç backend
  cache'i tetikleyeceği kötü senaryosu) 587,3 MiB × 37 ≈ **21,2 GiB** — bütçenin **>2 katı**.
  Her iki senaryoda da mode=max'a geçiş kotayı kesin olarak patlatır; ara bir orta yol yok.
- Node-cache'in tek başına kotanın %44,7'sini tuttuğu (Y-05, ayrı ve henüz kapanmamış bir
  borç — bkz. `docs/devops/devops-backlog.md` §6.9) bir ortamda backend'e 7,5–21 GiB ek yük
  eklemek bugün kabul edilemez.

Sonuçları:

- ADR-0007'nin karar #1'i **yeniden değerlendirildi ve korundu**; gerekçesi "ayrılabilir
  restore katmanı yok" (artık yanlış) yerine **"değer var, ama kota buna izin vermiyor"**
  oldu. Bu meşru bir ADR sonucudur — koşul gerçekleşti, karar aynı kaldı, gerekçe değişti.
  Kod tarafında hiçbir satır değişmiyor: `mode=min` zaten yürürlükte.
- Bu karar, node-cache borcu (Y-05) kapanıp kota belirgin biçimde düşmedikçe ve/veya aktif
  ref sayısı önemli ölçüde azalmadıkça geçerlidir (bkz. Açık konular — yeniden açma koşulu).
- Backend'de yalnız kaynak (`.cs`) değişen build'lerde restore adımı her seferinde ~11,6 sn
  maliyetli çalışmaya devam eder; bu, kota tasarrufunun kabul edilen bedelidir.

### 2. Frontend `cache-to` `mode=max`'ta kalır — ADR-0007 karar #2'nin devamı

Kod: `.github/workflows/ci.yml:244` (`type=gha,mode=max,scope=cargo-pilot-frontend-ci`),
`.github/workflows/test-deploy.yml:153` (`type=gha,mode=max,scope=frontend-test`).

Gerekçe (ADR-0007'den değişmeden devralındı, bugün yeniden doğrulandı):

- `apps/frontend/Dockerfile` ayrı bir `deps` stage tanımlar (`COPY package*.json ./` ardından
  `npm ci`, D-34 ile `npm install`'dan değişti); bu, `package-lock.json` değişmedikçe
  çapraz-commit yeniden kullanılabilen tek gerçek ara katmandır ve nihai imajda yer almaz.
- `mode=min` bu katmanı dışa aktarmaz; sonuç her build'de sıfırdan `npm ci` olur.
- Frontend blob'ları backend'inkilerden küçüktür (D-06/`cache-seed.yml` yorumu: tek
  generation ≈ 250–300 MiB, **tahmin**); `mode=max`'ın byte maliyeti burada karşılanabilir —
  nitekim `cache-seed.yml` (D-06) zaten yalnızca frontend'i nightly besliyor.

Sonuçları: Frontend'de `mode=max` bir israf değil, tek anlamlı cache kazancının ön koşulu
— değişmedi.

### 3. Asimetri korunuyor; gerekçesi "yapı farkı"ndan "yapı farkı + kota"ya genişledi

Backend'de artık `mode=max`'ın ölçülmüş bir değeri var (karar #1), ama byte maliyeti kotanın
kaldıramayacağı büyüklükte. Frontend'de değer var **ve** byte maliyeti karşılanabilir (küçük
`deps` katmanı, tek generation ~250-300 MiB tahmini backend'in 684,7 MiB ölçülen mode=max
export'undan belirgin biçimde küçük).

Sonuçları:

- D-13(d)'nin "asimetri = borç" iddiası ADR-0007'de bir kez, bu ADR'de ikinci kez ve daha
  güçlü (byte + kota ölçümüyle) gerekçeyle reddedildi.
- Asimetriyi "hizalamak" (dördünü `mode=max` ya da dördünü `mode=min` yapmak) hâlâ bir
  gerileme olur — ADR-0007'nin bu konudaki sonucu değişmedi.

### 4. Deploy job'u cache okur, yazmaz — ADR-0007 karar #4'ün devamı

Kod: `test-deploy.yml:229,245` (`cache-from`, deploy job) ve `:345,359` (e2e job) — bu
job'larda `cache-to` yok.

Gerekçe (ADR-0007'den değişmeden devralındı): Deploy job'u zaten build job'un yazdığı
katmanları tüketir; ikinci kez yazması aynı içeriği farklı ref altında çoğaltır. Bu ADR'nin
kota ölçümleri (bugün %82,1 dolu) bu kararı daha da güçlendiriyor — ikinci bir yazım noktası
bugünkü koşullarda çok daha maliyetli olurdu.

Sonuçları: Değişmedi — cache yazımı tek noktada (build job) toplu.

## Ölçüm — kararın dayandığı sayılar

| Ölçüm | Değer | Kaynak |
|---|---|---|
| Backend `mode=min` local cache export boyutu | 97,4 MiB (12 blob) | `docker buildx build ./apps/backend/ --cache-to type=local,dest=...,mode=min` + `du -sk`, 2026-08-18 |
| Backend `mode=max` local cache export boyutu | 684,7 MiB (25 blob) | Aynı komut, `mode=max`, 2026-08-18 |
| Fark (mode=max ek maliyeti / generation) | ~587,3 MiB | Yukarıdaki iki ölçümün farkı |
| Restore katmanı CACHE durumu, `mode=min` cache-from | **MISS** — 11,6 sn yeniden çalıştı | `docker buildx build --cache-from type=local,src=<cmin>` sonrası `.cs` değişikliğiyle, ham build log |
| Restore katmanı CACHE durumu, `mode=max` cache-from | **HIT** — `CACHED`, 0 sn | Aynı senaryo, `--cache-from type=local,src=<cmax>` |
| GHA cache toplam kullanım (2026-08-18) | 284 giriş / 8,210 GiB / 10 GiB = **%82,1** | `gh api /repos/Divizyon/cargo-pilot/actions/cache/usage` |
| `node-cache-*` payı | 60 giriş / 4,468 GiB (kotanın %44,7'si, aktif kullanımın %54,4'ü) | `gh api .../actions/caches` (paginate), prefix toplamı |
| `buildkit-blob-*` payı | 192 giriş / 3,667 GiB | Aynı döküm |
| Aktif ref sayısı (tüm scope'lar) | 37 | `gh api .../actions/caches -q '.actions_caches[].ref' \| sort -u \| wc -l` |
| Bugün canlı backend cache generation sayısı | 13 (`cargo-pilot-backend-ci` + `backend-test` index girişleri) | Aynı döküm, `grep -c` |
| Extrapolasyon — 13 generation senaryosu | 587,3 MiB × 13 ≈ 7,46 GiB ek → toplam ~15,67 GiB (**%157** bütçe) | Yukarıdaki ölçümlerden türetildi |
| Extrapolasyon — 37 ref senaryosu | 587,3 MiB × 37 ≈ 21,2 GiB ek → bütçenin **>2 katı** | Yukarıdaki ölçümlerden türetildi |
| Frontend tek generation boyutu | ≈250–300 MiB (**tahmin**) | `cache-seed.yml` yorum satırı; bu ADR'de yeniden ölçülmedi |

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| Backend `cache-to`'yu da `mode=max`'a çevirmek | **Ölçümle elendi.** Restore katmanının artık gerçek değeri var (CACHED vs 11,6 sn MISS), ama 587,3 MiB/generation × 13 canlı generation ≈ 7,46 GiB ek yük, kota zaten %82,1 dolu — toplam bütçenin %157'sine çıkar |
| Backend cache'ini tamamen kapatmak (`cache-to` satırını silmek, yalnız `cache-from` bırakmak — deploy job'undaki gibi) | Restore katmanının artık ölçülmüş bir cross-commit değeri var; kapatmak bu kazancı da siler ve net bir gerileme olurdu, mevcut `mode=min` bu değerin bir kısmını (final image katmanları) zaten koruyor |
| Dört cache satırının hepsini `mode=min`'e "hizalamak" | ADR-0007'den değişmeden devralındı: frontend `deps` stage'i dışa aktarılmaz, her build'de sıfırdan `npm ci` — frontend'de gerçek gerileme |
| Node-cache temizliğiyle (Y-05) eşzamanlı olarak backend'i mode=max'a geçirmek | Y-05 paralel bir ajanın kapsamında ve henüz kapanmadı; ayrıca node-cache temizliği (~4,47 GiB kazanç) tek başına backend'in 7,5+ GiB'lik ek yükünü karşılamaya yetmiyor — iki değişikliği birleştirmek bu ADR'nin ölçüm tarihindeki kota durumuyla hâlâ negatif sonuç verir |

*Dört elenen alternatif listelendi (şablonun istediği en az iki alternatifin üzerinde).*

## Açık konular

- Bu ADR'nin byte ölçümü **local `type=local` cache export**'a dayanır; gerçek GHA
  `type=gha` export'u ağ sıkıştırması ve chunk boyutu farklarıyla sistematik olarak sapabilir.
  Bir GHA ortamında `mode=max` ile gerçek bir backend build koşup `actions/caches` üzerinden
  doğrulamak yapılmadı — bu ADR'nin sayısı bir **vekil ölçümdür**, birebir GHA doğrulaması
  değildir.
- "13 canlı backend generation" ve "37 aktif ref" rakamları 2026-08-18 anlık ölçümleridir;
  branch/PR trafiğiyle günden güne değişir. Karar bu ölçümün büyüklük mertebesine
  (kotanın kesin olarak aşılacağı) dayanır, tam sayıya değil.
- **Yeniden açma koşulu:** node-cache borcu (Y-05, `docs/devops/devops-backlog.md` §6.9)
  kapanıp kota kalıcı biçimde ~%50'nin altına inerse **ve** aktif backend generation sayısı
  bugünkünün belirgin altındaysa, backend `mode=max` sorusu gerçek bir GHA ölçümüyle
  yeniden açılabilir.
- Frontend tek generation boyutu (~250-300 MiB) bu ADR'de yeniden ölçülmedi; `cache-seed.yml`
  yorumundan alınan bir tahmindir.
- Repo yakında private + geçmişsiz bir depoya taşınacak (bkz. `docs/devops/devops-backlog.md`
  "Private repo geçişi" bölümü); taşınma sonrası kota sıfırlanacağı için bu ADR'nin
  extrapolasyon rakamları (13/37 aktif ref) o noktada geçersiz olur ve karar taze bir
  ölçümle gözden geçirilmelidir.
