# ADR-0003 — LIFO Bölge Kısıtı: İki Kademeli Sert Kısıt

- **Durum:** Yerini aldı: [ADR-0010](ADR-0010-duvar-orucu-ve-arama-katmani.md) *(2026-08-18 — Kararın kendisi (bölge sert kısıttır) yürürlükte; bu ADR'nin anlattığı **greedy mekanizması** silindi)*
- **Tarih:** 2026-08-15 *(karar tarihi; ADR 2026-08-17'de geriye dönük yazıldı)*
- **Kapsam:** OPT-02 · PR #990 (`b12a2e0f`), PR #1002 (`7b699f35`)
- **Etkilediği kod:** `CargoPilot.Application/Common/Optimization/LifoPlacement.cs`,
  `.../OptimizationEngine.cs`

> **Geriye dönük kayıt.** Karar 2026-08-15'te alınıp uygulandı; bu ADR sonradan yazıldı.
> Ölçümler gerçek `dotnet test` koşularından alınmıştır (.NET 8.0.419).

## Bağlam

LIFO kriterinde her boşaltma grubuna araç uzunluğu üzerinde bir Z bölgesi ayrılır
(`LifoPlacement.ComputeGroupZones`). Amaç, ilk inecek grubun kapıya en yakın, son inecek grubun
en uzakta durmasıdır — operatör kamyonu doğru sırayla boşaltabilsin diye.

Bölge disiplini **yumuşak ceza** ile uygulanıyordu: bölgeden taşan her santimetre skora
`2 000` ekliyordu. Aynı skor toplamında yerçekimi terimi ise `1 000 000` katsayılıydı
(`OptimizationEngine.cs:11` `GravityCoefficient = 1_000_000m`, `LifoPlacement.cs:29`
`ZoneOverflowPenaltyPerCm = 2_000m`). Yani bölge cezası yerçekiminden **500× zayıftı**.

Sonuç analitik olarak nettir: her iki terim de cm'de lineerdir, dolayısıyla motor
`taşma_cm × 2 000 < yükselme_cm × 1 000 000` olduğu sürece **ihlali seçer**. 1 cm yükselmekten
kaçınmak 500 cm taşmayı affeder. Pratikte bu, çok katmanlı LIFO planlarında bölgenin daima
ihlal edilmesi demekti.

Üç ek tespit kararı belirledi:

1. **LIFO'nun dikey yarısı zaten sert kısıttı.** `OptimizationEngine.cs`'te
   `ViolatesStackability` aday elemeyle (`continue`) çalışıyor; yatay yarısının yumuşak kalması
   mimari tutarsızlıktı.
2. **Kodun kendi testi sert kısıt iddia ediyordu.** `GroupZoneTests.cs:46`
   (bugün, PR #1002'nin test yenilemesinden sonra `:55`) kesin içerme assert'i yapıyor:
   `Assert.True(placement.Z >= zoneStart && placement.Z + placement.Length <= zoneEnd, …)`.
   Sözleşme sert, uygulama yumuşaktı.
3. **Test korpusu bu çatışmayı hiç tetiklemiyordu.** 5 LIFO golden-master snapshot'ının
   tamamında tek Y değeri vardı ve o da `0`'dı; çok katmanlı LIFO senaryosu adedi **0**.
   `GroupZoneTests.cs`'te de araç yüksekliği kutu yüksekliğine eşitti, yani `:46`'daki sert
   assert **tesadüfen** geçiyordu.

## Karar

### 1. Bölge, iki kademeli aday seçimiyle sert kısıt yapıldı

Aday tarama iki en-iyi tutar: genel en iyi (`best`) ve bölge içi en iyi (`bestInZone`).
Tarama bittiğinde bölge içi geçerli bir aday varsa **yalnızca o kazanır**.

- `OptimizationEngine.cs:99-100` — `PlacedBox? bestInZone = null; var bestInZoneScore = decimal.MaxValue;`
- `OptimizationEngine.cs:158-162` — mevcut `if (score < bestScore)` bloğu **aynen korunarak**
  ikinci kademe eklendi: `if (LifoPlacement.IsInsideZone(...) && score < bestInZoneScore) …`
- `OptimizationEngine.cs:167` — kısıtın sertleştiği tek satır: `best = bestInZone ?? best;`
- `LifoPlacement.cs:127` — yeni saf yüklem `IsInsideZone(zoneStart, zoneEnd, ez, length)`

Gerekçe:

- Bölge içi aday yoksa (bölge kutudan dar kalabilir) bugünkü cezalı skorlamaya düşülür, yani
  **kutu yalnızca bölgesi yüzünden düşmez.** Kapasite kaybı riski böyle kapatıldı.
- Katı `<` karşılaştırması ikinci kademede de korundu; eşit skorlu adaylarda ilk gelen kazanır,
  determinizm bozulmaz (`DeterminizmTests` yeşil kaldı).
- Ek maliyet aday başına O(1) karşılaştırmadır.

Sonuçları:

- Ölçülen düzelme: bölge ihlali **P1 4/8 → 0/8**, **P2 2/5 → 0/5**.
- Yerleşen kutu ve doluluk **birebir aynı kaldı**: P1 8 kutu / FillRate 1,0 · P2 5 kutu /
  FillRate 0,2125. Sert kısıt hiçbir kutu kaybettirmedi; bu parite test içinde assert olarak
  kilitlendi (`LifoBolgeKisitiTests.cs`).
- **Snapshot kayması 0.** `git status --short apps/backend/CargoPilot.Engine.Tests/Snapshots/`
  → boş çıktı; 5 LIFO golden-master yeniden üretilmeden geçti.
- Performans regresyonu yok: LIFO 500 kutu 9 777 ms → 8 107 ms, VolumeFirst 10 058 → 9 855 ms,
  WeightBalance 20 968 → 20 771 ms (farklar ölçüm gürültüsü mertebesinde, üst sınır 120 000 ms).
- Yedek kademeye düşen yerleşim **hiçbir yere raporlanmıyor**; kullanıcı planın bölge dışına
  taştığını göremiyor. Bilinçli kapsam sınırı, aşağıda açık konu.

### 2. Bölge katsayısı 2 000'de kaldı

`LifoPlacement.cs:29` `ZoneOverflowPenaltyPerCm = 2_000m` — değer **değişmedi**, yalnızca
literal isimlendirildi.

Gerekçe:

- Katsayı artık diğer terimlerin akranı değil; yalnızca **yedek kademede** adayları kendi
  aralarında sıralar. Bölge içi aday varsa o skorun bölge terimi zaten `0`'dır.
- Katsayıyı büyütmek ölçülerek elendi (aşağıya bakınız). Yerçekimi katsayısıyla yarışan bir
  sayı seçmek, kararın gerçek dayanağını (sözleşme sertliği) kalibrasyona bırakmak olurdu.

Sonuçları:

- `OptimizationEngine.cs:256-264`'teki maliyet fonksiyonu yorumu bunu yazılı hale getirdi:
  "BÖLGE TERİMİ ARTIK DİĞERLERİNİN AKRANI DEĞİLDİR… Katsayının yerçekimi katsayısından küçük
  olması bu nedenle bölge disiplinini zayıflatmaz."
- `ScoringWeights.Zone > Gravity` biçiminde bir sıra testi **yazılmadı** ve yazılmamalıdır;
  yanlış invaryantı kilitler (aşağıya bakınız).

## Ölçüm — üç varyantın karşılaştırması

İki senaryo, gerçek `dotnet test` ile üç kod durumunda koşuldu.

- **P1** — araç 100×200×200, 2 grup × 4 kutu (100×50×100), `Fixed`, `Rear`, `clusterGroups: true`.
  Taşma büyüklüğü 100 cm, kat yüksekliği 50 cm.
- **P2** (ayırt edici) — araç 100×200×200, grup1 4×(50×50×60), grup2 1×(50×50×100).
  Grup1'in ikinci sıra kutusu bölgesini yalnız **20 cm** aşar; bölge içi alternatif bir kat
  yukarıdadır (50 cm).

| Varyant | P1 ihlal | P1 yerleşen / fill | P2 ihlal | P2 yerleşen / fill |
|---|---|---|---|---|
| Mevcut (katsayı 2 000) | 4/8 | 8 / 1,0 | 2/5 | 5 / 0,2125 |
| Katsayı 2 000 000 | 0/8 | 8 / 1,0 | **1/5** | 5 / 0,2125 |
| **İki kademeli sert kısıt** | **0/8** | 8 / 1,0 | **0/5** | 5 / 0,2125 |

P2'deki kalan ihlal tam olarak analitik eşikte: taşma 20 cm < kat yüksekliği 50 cm ÷ 2 = 25 cm.
Yani sonlu hiçbir katsayı garanti üretmiyor; yalnızca eşiği kaydırıyor.

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| **Katsayıyı 2 000 → 2 000 000 yapmak** (bölgeyi yerçekiminin üstüne çıkarmak) | **Ölçülerek elendi.** P1'i düzeltiyor (4/8 → 0/8) ama **P2'de 1/5 ihlal bırakıyor**. Sebep yapısal: her iki terim de cm'de lineer, dolayısıyla sonlu hiçbir K değeri garanti vermez — yalnızca affedilen taşma eşiğini `500 cm/cm`'den `0,5 cm/cm`'ye çeker. |
| **Koşulsuz sert eleme** (bölge dışı adayı `continue` ile atmak) | **Ölçülerek elendi.** `Lifo_KumelemeKapali` senaryosunda araç uzunluğu 100, 2 bölge → `zoneSize = 50`, kutu uzunluğu 100; **hiçbir aday bölge içinde değil**. Koşulsuz elemede FillRate **0,5 → 0** olurdu ve snapshot bozulurdu. İki kademeli biçim tam da bunun için seçildi ve o snapshot'ı bit-birebir korudu. |
| **`ScoringWeights.Zone > Gravity` sıra testi eklemek** | İnvaryantın kendisini değil vekilini test eder: P2'de bu assert yeşil yanarken plan bozuktu. Ayrıca önerinin kendi kaynağının dayattığı `Gravity > Zone` sırasının tersini kilitliyordu. |
| **Bölgeleri grup hacmine orantılı bölmek** (`zoneSize = vehicleLength / orders.Count` yerine) | Kanıt yetersiz. Bu yolu savunan iki bağımsız analiz de kendi risk bölümlerinde karşı-örnek verdi: biri 8 → 4 yerleşime düşen bir kombinasyon, diğeri ihlali **artıran** bir kombinasyon. Ayrı iş kalemi olarak bırakıldı. |
| **Hiçbir şey yapmamak / snapshot'ları yeni davranışa göre yenilemek** | Bugün sessizce yanlış olan davranış hiçbir snapshot'ta kayıtlı değildi (5/5 snapshot tek katmanlı, tümü `Y: 0`). Snapshot yenilemek, `GroupZoneTests`'in sert içerme sözleşmesiyle çelişen davranışı kalıcılaştırırdı. |

## Neden bu karar doğru zamanda alındı

PR #997 (`fix/koordinat-z-ekseni`) bölge **geometrisini** ters çevirirken grup **yerleştirme
sırasını** (`ItemOrdering.SortForGroupPlacement`) değiştirmiyordu. Kendi dalında yeşildi, çünkü
o dalda sert kısıt yoktu ve iki LIFO snapshot'ı yeni davranışa göre yeniden üretilmişti.
`dev` ile birleştirildiğinde `LifoBolgeKisitiTests` her iki senaryoda **P1 8/8 ve P2 5/5** ihlal
ölçtü — yani kutuların %100'ü kendi bölgesinin dışındaydı, tam ters yükleme.

Yumuşak ceza altında bu hata görünmez olurdu: snapshot yeniden üretilir, ters yükleme sabitlenirdi.
Sert kısıt onu derleme sonrası ilk test koşusunda görünür kıldı.

## Açık konular

- **Kapsam yalnız `LoadingType.Rear`.** `LifoPlacement.cs`'te bölge hesabı arka kapı dışında
  hiç çalışmıyor; 5 yükleme tipinin 4'ünde bölge oluşmuyor. LIFO vaadi bu karardan sonra da
  kısmi (OPT-10).
- **Eşit bölme kusuru duruyor.** `LifoPlacement.cs:80` `zoneSize = vehicleLength / orders.Count`
  grup hacmini görmüyor. Bölge kutudan dar kaldığında yedek kademe devreye girer ve ihlal
  sessizce sürer.
- **Sessiz yedek kademe.** `OptimizationEngine.cs:167`'de `bestInZone` null kalıp yedek kademeye
  düşen yerleşim raporlanmıyor. Çözüm yeni bir `UnplacedReason` değildir (kutu düşmüyor);
  `LoadingPlanWarnings` üzerinden uyarı gerekir.
- **Sentinel kusuru (OPT-14).** `OptimizationEngine.cs:85`
  `groupZones.TryGetValue(item.UnloadingOrder ?? -1, out var zone)` — bölge sözlüğü
  `GroupId + UnloadingOrder` ikilisinden kuruluyor ama arama anahtarı yalnız `UnloadingOrder`.
  İki kademeli biçimde zararsız, semantik olarak yanlış.
- **Ölçüm kapsamı:** iki senaryo ölçüldü, geniş bir senaryo taraması yapılmadı. Yön kesin
  (0 ihlal, 0 kutu kaybı); greedy yol bağımlılığının genel olarak zararsız olduğu
  **kanıtlanmadı**.
- **Karar sonrası değişiklik:** PR #1013 (koordinat standardı) bölge geometrisini
  `LifoPlacement.cs:93-94`'te yeniden yazdı (`zStart = isLast ? 0m : vehicleLength - (i+1)*zoneSize`).
  Bu ADR'nin kararı — bölgenin *sert* olması — değişmedi; değişen, bölgenin nerede olduğudur.
