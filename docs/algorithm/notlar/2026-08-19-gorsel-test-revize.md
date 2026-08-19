# Görsel test revizesi — 19 Ağustos 2026

**Geçici dosya.** BR tohum verisiyle arayüzü gözle test ederken çıkan kusurlar burada birikir.
Her bulgu için *belirti → teşhis → olası sebep → doğrulanacaklar* tutulur. **Düzeltme yapılmaz;**
liste dolduğunda toplu bir araştırma + geliştirme turu yapılır ve kalıcı olanlar
[02-kararlar.md](../02-kararlar.md) ile [01-kurallar.md](../01-kurallar.md)'e taşınıp bu dosya silinir.

## Bulgu listesi

| # | Belirti | Alan | Durum |
|---|---|---|---|
| `G-1` | Plana farklı bir ürün eklenince **ekranda** yerleşim bozuluyor, kutular havada/kademeli duruyor | Frontend, manuel yerleşim önizlemesi | **Teşhis edildi** — kod tarafında doğrulandı |
| `G-2` | İlk duvarda boşluk varken motor yeni duvar açıyor | **Motor**, duvar örücü | **Ölçüldü ve doğrulandı** — boşluk gerçek, kutu sığıyor |
| `G-3` | Küçük kutu dik konunca kesitte kullanılamaz şerit kalıyor | **Motor**, yönelim + kesit döşemesi | **Ölçüldü** — `DR-57`'nin F6-3'ü kapatma gerekçesiyle çelişiyor |
| `G-4` | Yarım dolu araçta yük bütün uzunluğa yayılıyor; `DepthSlack` tutmuyor | **Motor**, derinlik bütçesi | **16 planda ölçüldü** — yayılma boşlukla birlikte artıyor |

---

## `G-1` — Manuel ürün ekleme motoru değil, ayrı bir yerleştirici kullanıyor

### Belirti

`%25 hedef · aynı yük (1 tip) · BR0` planı açılıp içine 5 adet `BR15-T007` eklendiğinde yerleşim
bozuldu: yeni kutular mevcut yığının yanında/üstünde kademeli bir blok olarak belirdi, aralarında
boşluk kaldı ve görüntü fiziksel olarak tutarsız hâle geldi.

### Teşhis

**Arayüzde iki ayrı yerleştirme algoritması var ve aynı sahnede çalışıyorlar.**

| Yol | Yerleştirici | Nerede |
|---|---|---|
| Plan açılışı | **Motor** (duvar örücü + beam) | `pages/plans/NewPlanPage.tsx:85` → `setPlacements(data.placements)` |
| Ürün ekleme / adet değiştirme | **Frontend'in kendi paketleyicisi** | `lib/store/usePlanStore.ts:87` `buildPlacements(...)` |

Yani kullanıcı planı açtığında motorun ürettiği yerleşimi görüyor; bir ürün eklediğinde ise o
yerleşimin **üstüne** tamamen başka bir algoritma yazıyor. İkisi birbirinin varsayımlarını
bilmiyor.

### Kusurun mekanizması

`buildPlacements` imleci mevcut yerleşimden şöyle türetiliyor (`usePlanStore.ts:103-104`):

```ts
const curY_init = valid.length > 0 ? Math.max(...valid.map((p) => p.positionY)) : 0;
const curZ_init = maxZInLayer(valid, curY_init);
```

- `curY_init` — mevcut kutuların **en yüksek origin Y'si**. Kutunun üstü değil, tabanı.
- `maxZInLayer(valid, curY_init)` — yalnızca `positionY` bu değere **tam eşit** olan kutulara bakar.

Bu imleç modeli, sahnenin **düz katmanlardan** oluştuğunu varsayar: her katmanın tek bir `Y`'si
vardır ve o katman `Z` boyunca dolar. Frontend kendi ürettiği yerleşimde bu doğrudur.

**Motorun çıktısında doğru değildir.** Duvar örücü kule ve blok kurar; kutuların `positionY`
değerleri düzensizdir ve aynı `Y`'de yalnızca birkaç kutu bulunur. Sonuç:

1. İmleç, sahnedeki **en yüksek tabana** sıçrar — boş hacmin nerede olduğuyla ilgisi yoktur.
2. `maxZInLayer` o `Y`'deki *birkaç* kutuyu görür, gerisini görmez → `Z` imleci anlamsız bir yere düşer.
3. Yeni kutular `x = 0`'dan başlayıp genişlik boyunca dizilir; altları düzensiz olduğu için
   `gravityY` her kutuyu farklı yüksekliğe oturtur → **kademeli görüntü**.
4. Ekrandaki boşluk gerçek boşluk değil; imleç oraya hiç bakmadı.

### Yan bulgular (aynı kod yolundan)

Manuel yol motorun kapılarını uygulamıyor. `computeViolations` (`lib/utils/geometry/geometry.ts:25`)
**yalnızca kutu çakışmasına** bakıyor.

| Kapı | Motor | Manuel yol |
|---|---|---|
| Çakışma | var | **var** |
| Ağırlık limiti | var | **var** (`buildPlacements`, araç toplamı) |
| Yönelim izni | var | kısmen — kutu **hep `orientationIndex: 0`** ile konuyor, döndürme hiç denenmiyor |
| İstiflenebilirlik | var | kısmen — yalnız yeni katman gerektiğinde bakılıyor |
| Destek oranı (%80) | var | **yok** — köşesiyle değen kutu geçerli sayılıyor |
| Kırılganlık | var | **yok** |
| Azami istif adedi | var | **yok** |
| Üst ağırlık limiti | var | **yok** |
| LIFO bölgesi | var | **yok** |
| Uyumsuz grup | var | **yok** |

Bu, `CLAUDE.md`'deki bağlayıcı kuralla doğrudan çelişiyor:

> Manuel 3D edits must preserve the same validation and violation feedback.

Ayrıca `buildPlacements`'in çalışma biçimi (satır → `Z` ilerlet → yeni `Y` katmanı) **katman
örmedir** — müşterinin fiziksel olarak imkânsız bulduğu ve `DR-12` ile kalıcı olarak yasaklanan
model. Motordan kaldırıldı, arayüzde duruyor.

### Olası sebepler / düzeltme seçenekleri *(henüz seçilmedi)*

1. **Manuel ekleme de motora gitsin.** Ürün eklenince plan yeniden optimize edilsin
   (`PUT /loading-plans/{id}`). Tek yerleştirici kalır, tüm kapılar uygulanır.
   *Bedeli:* her eklemede ~2-4 sn gecikme ve mevcut yerleşimin tamamen değişmesi — kullanıcı
   "elle koyduğum kutu nereye gitti" der.
2. **Artımlı motor çağrısı.** Mevcut yerleşim sabitlenip yalnızca yeni kutular yerleştirilsin.
   Motorda karşılığı zaten var: `WallBuilderPlacement.Run(..., PlacementState? start, ...)` —
   beam bunun için yazıldı, yarım durumdan devam edebiliyor. Sunulmuş bir uç nokta yok.
   *Bedeli:* yeni API sözleşmesi; en temiz sonuç bu.
3. **Frontend paketleyicisini boşluk tabanlı hâle getir.** İmleç yerine mevcut yerleşimden boş
   hacim çıkarılıp kutu oraya konsun.
   *Bedeli:* motorun `SpaceLedger`'ının ikinci bir uygulaması — iki yerde bakım, kaçınılmaz sapma.
4. **En azından kapıları paylaş.** Hangi seçenek olursa olsun destek oranı, kırılganlık, istif ve
   bölge kontrolleri manuel yola da girmeli; bugün sessizce geçiliyor.

### Doğrulanacaklar

- [x] **Manuel eklenen kutular kaydedilirken motora gidiyor.** `G-2`'de ölçüldü: kaydedilmiş plan,
      aynı ürün listesiyle sıfırdan üretilen motor çıktısıyla **bit birebir aynı**. Yani yerel
      koordinatlar veritabanına yazılmıyor; kayıtta motorun üretemeyeceği plan **yok**.
      → Kusur veri değil **önizleme** kusuru: kullanıcı kaydedene kadar gerçek olmayan bir yerleşim
      görüyor. Şiddeti düşürür, gerekliliğini düşürmez.
- [ ] Adet değiştirme (`+`/`−`) ile ürün ekleme aynı yolu mu kullanıyor.
- [ ] `orientationIndex: 0` sabitinin, dönmeden sığmayan kutuyu "sığmadı" saydığı senaryo.

---

## `G-2` — İlk duvar dolmadan yeni duvar açılıyor *(motor)*

### Belirti

`%25 hedef · az farklı (3 tip) · BR1` planına 4 adet `A11-F15` eklenip kaydedildi. İlk duvarda
gözle görülür boşluk varken yük ikinci duvara taştı.

### Bu `G-1` değil — motorun kendi çıktısı

Kaydedilmiş plan API'den okundu, aynı ürün listesiyle sıfırdan bir plan daha ürettirildi:

```
kutu  mevcut=55 yeni=55   fillRate mevcut=0.4292 yeni=0.4292
YERLESIM BIREBIR AYNI MI: True
```

Ekrandaki yerleşimin tamamı motordan geliyor. (Yan kazanç: determinizm sözleşmesi `R-C02` uçtan
uca, API üzerinden de doğrulanmış oldu.)

### Ölçüm — kesit kaplama profili

Araç 233 × 220 × 587 cm. Yük 12,91 m³ (aracın %42,9'u), 55 kutu, hepsi yerleşti.

| Bölge | z aralığı | Kesit kaplama |
|---|---|---|
| **1. duvar** | 0 – 120 cm | **%78,6** |
| 2. duvar | 120 – 212 cm | %89,6 |
| 3. bölge | 212 – 288 cm | %90,4 |
| kuyruk | 288 – 313 cm | %27,7 |

**İlk duvar en kötü paketlenen bölge** ve motor onu bırakıp ikinciyi %89,6'ya kadar doldurmuş.
İlk duvardaki boş hacim **1,32 m³**.

### Boşluk gerçek mi, ölü hava mı? — Gerçek

Uç nokta taramasıyla ilk duvarın (z < 120) her boş konumu, her kutu tipi ve 6 yönelim için denendi
(yalnız geometri: araç içinde mi, çakışıyor mu):

```
ILK DUVAR (z < 120)
  sigmaz A11-F15    (6 yonelimin hicbiri)
  SIGAR  BR1-T001   rot=1 -> (80, 160, 0)   76x30x108
  SIGAR  BR1-T002   rot=1 -> (80, 160, 0)   25x43x110
  SIGAR  BR1-T003   rot=0 -> (80, 162, 0)   81x55x92
```

Dört tipin **üçü sığıyor.** `BR1-T003` 0,41 m³'lük bir kutu. Yani boşluk ne tavan artığı ne kenar
şeridi — **kullanılabilir cep** ve motor onu atlayıp z = 120'de yeni duvar açmış.

`(80, 160, 0)` özellikle can sıkıcı: orada zaten üç `BR1-T001` üst üste duruyor (y = 70/100/130,
üstü y = 160). Dördüncüsü **%100 destekle** oturacaktı; motor onun yerine kalan yedisini z = 212'ye
taşımış.

### Sıralayıcı değil, yerleştirici

Aynı yük üç sıralayıcıyla koşuldu:

| Sıralayıcı | Kutu | Doluluk | z erişim | 1. duvar (z<120) |
|---|---|---|---|---|
| Static | 55 | %42,9 | 313 cm | %78,3 |
| GRASP | 55 | %42,9 | 413 cm | %81,6 |
| **Beam** | 55 | %42,9 | 313 cm | **%78,3** |

Üçü de aynı cebi bırakıyor. **Sorun arama katmanında değil, duvar örücüde.**

### Kök neden adayı 1 — *amaç fonksiyonu bu senaryoda kör* **(en güçlü aday)**

Üç sıralayıcının **doluluğu birebir aynı: %42,9.** Sebebi basit: yük araca sığıyor, 55 kutunun 55'i
yerleşiyor. Doluluk = *yerleşen hacim / araç hacmi* olduğuna göre, **kutular nereye konursa konsun
skor aynı.**

Yani arama katmanının optimize edecek bir şeyi yok; taban çözümü aynen döndürüyor. Sıkılık
(kompaktlık) amaç fonksiyonunda **hiç yer almıyor**.

Bu, ölçtüğümüz her şeyin neden bunu göstermediğini de açıklıyor: BR korpusunda yük konteynerden
büyüktür, her zaman taşma vardır, dolayısıyla doluluk her zaman ayırt edicidir. **%25/%50 gibi
yarım dolu araçlarda korpusun hiç sınamadığı bir rejime giriyoruz** — ve üretimdeki planların çoğu
bu rejimde.

`DepthSlack = 1.05` tam bu iş için konmuştu: yük 12,91 m³ ise ideal derinlik
`12,91e6 / (233×220) = 252 cm`, pay ile 265 cm. Yük **313 cm**'ye yayılmış, yani derinlik bütçesi
gevşetilmiş (`DepthRelaxStep` döngüsü). Bütçe kutu yerleşemediği için gevşiyor; cep dolmadığı için
kutu yerleşemiyor — kısır döngü.

### Kök neden adayı 2 — duvar bandına giriş koşulu

`WallBuilderPlacement.cs` ana döngüsü her kutu için önce mevcut duvarları tarıyor
(`TryPlace(..., wall.Start, wall.End, ...)`), sığmazsa `OpenNewWall()` / `ScanPockets()`.
Görünüşte dördüncü `BR1-T001`'in wall-1 taramasında `(80, 160, 0)`'ı bulması gerekirdi. Bulamadıysa
sebep aday üretiminde:

- `SpaceLedger`'da o bölgeyi kapsayan azami boşluk kayıtlı değil (parçalanma), veya
- `FootprintMatch = 0.85` blok yükseltmede adayı eliyor (`WallBuilderPlacement.cs:571`), veya
- `VCS` aday değeri, yeni duvarın büyük temiz boşluğunu küçük cebe tercih ediyor.

Bu üçü **enstrümantasyon olmadan ayrıştırılamaz.**

### Doğrulanacaklar

- [ ] `(80, 160, 0)` adayı `SpaceLedger`'da hiç üretiliyor mu? Üretilip eleniyorsa hangi kapıda?
- [ ] Amaç fonksiyonuna sıkılık terimi (z erişimi veya ağırlık merkezi) eklendiğinde `%25/%50`
      planları düzeliyor mu, BR sayıları bozuluyor mu? **İkisi birlikte ölçülmeli.**
- [ ] Kıyas korpusuna **yarım dolu** rejim eklenmeli: `--load-ratio` bayrağı zaten var, ama gecelik
      kapı yalnız taşan yükle koşuyor. `%25/%50/%75` yük oranları kapıya girmeli — yoksa bu
      rejimdeki hiçbir gerileme görünmüyor.
- [ ] GRASP z = 413 cm'ye yayılıyor (beam 313). Yarım dolu rejimde GRASP **belirgin biçimde daha
      kötü** ve bunu bugün hiçbir ölçüm yakalamıyor.

---

## `G-3` — Yönelim kutu kutu seçiliyor, kesiti döşemeye göre değil *(motor)*

### Belirti

İlk duvarda küçük kutu (`BR1-T002`, 110 × 43 × 25) dik konumlandırılmış; yanında hiçbir kutunun
giremeyeceği şeritler kalmış. Kullanıcının okuması: *"onu oraya değil farklı bir yere koysaydı ya
da yatay koysaydı bir sürü daha alan mevcuttu."*

### Ölçüm — `z = 0` yüzünde genişlik kullanımı

Araç genişliği 233 cm. Yüzü soldan sağa şeritlere ayırınca:

| x aralığı | Genişlik | y kaplama | Ne var |
|---|---|---|---|
| 0 – 80 | 80 cm | %95 | `A11-F15` ×3 kule |
| 80 – 156 | 76 cm | %73 | `A11-F15` + `BR1-T001` Yaw ×3 |
| **156 – 160** | **4 cm** | %32 | — **ölü şerit** |
| **160 – 162** | **2 cm** | %74 | — **ölü şerit** |
| 162 – 205 | 43 cm | %96 | `BR1-T002` YawPitch |
| 205 – 215 | 10 cm | %74 | `BR1-T003` kuyruğu |
| **215 – 233** | **18 cm** | **%0** | — **tamamen boş** |

Yükteki kutuların en kısa kenarı **25 cm**. Yani 25 cm'den dar her şerit **kesin kayıp**:
4 + 2 + 18 = **24 cm**, aracın genişliğinin %10,3'ü. İlk duvar derinliği boyunca ≈ **0,63 m³**.

### Şeritler nereden çıkıyor — zincir

1. `A11-F15` (80 cm) iki sütun → x = 0..160, geriye **73 cm** kalıyor.
2. 73 cm'ye `BR1-T003` **Roll** (55 cm) konuyor → x = 160..215, geriye **18 cm**.
3. `BR1-T001` **Yaw** (76 cm), 80 cm'lik `A11` ayak izinin üstüne biniyor → **4 cm** artık.

Adım 2 seçilebilirdi: aynı 73 cm'ye `BR1-T002` yatay (43 cm) + `BR1-T002` dik (25 cm) = **68 cm**
konsa artık **18 değil 5 cm** olurdu. Üstelik hacimce de iyi: iki `T003` Roll = 0,82 m³, buna
karşılık 43'lük sütun (8 kutu) + 25'lik sütun (5 kutu) = **1,54 m³**. Neredeyse iki katı.

Yani kullanıcının gözle gördüğü şey doğru: **73 cm'lik artığı daha iyi döşeyen bir kombinasyon
vardı ve seçilmedi.**

### Neden seçilmedi — `G-2` ile aynı kök

Yönelim ve konum **kutu başına, açgözlü** seçiliyor. Aday değerlendirme (`BlockValue`, VCS) bir
adayın *kendi* hacmine, temasına ve arkasında bıraktığı artığa bakıyor; **kesitin bütününü nasıl
döşediğine bakmıyor.** `UnusableResidual` yalnızca "hiç kutu girmez" dilimini yakalıyor, "girer ama
73 cm'yi kötü böler" durumunu yakalamıyor.

Ve `G-2`'deki kör amaç fonksiyonu burada da geçerli: yük araca sığdığı için 55 kutunun 55'i
yerleşiyor, doluluk **%42,9** — hangi döşeme seçilirse seçilsin skor aynı. Arama daha iyi döşemeyi
tercih edecek bir sebep göremiyor.

### ⚠ Bu, `DR-57`'nin F6-3'ü kapatma gerekçesiyle çelişiyor

`F6-3` (duvar yüzü 2B tam kaplama) `DR-57` ile **kapsam dışı** bırakılmıştı. Gerekçe:

> doluluk arttıkça duvar kaplaması **düşüyor** (static %83,40/%85,8 → beam %89,40/%74,6). Yüz
> kaplaması doluluk kalitesinin değil **duvar disiplininin** göstergesiymiş ve arama onu bilerek
> feda ediyor. Dayanak kalmadı.

Ama `DR-47` (`DepthSlack`) daha önce şunu yazmıştı:

> esneme defalarca tetikleniyor çünkü kutular yukarı yığılamıyor (yığın %51'de takılı) — yani
> darboğaz derinlik değil, `DR-44`'ün ölçtüğü **kesit döşemesi**.

**İkisi farklı rejimlerde ölçüldü.** `DR-57`'nin ölçümü BR korpusundadır: yük konteynerden büyüktür,
her zaman taşma vardır, doluluk her zaman ayırt edicidir. `DR-47`'nin "çeyrek yük" gözlemi ise tam
tersi rejimde. F6-3, **taşan yük rejiminde** ölçülüp reddedildi ve sonuç **yarım dolu rejime de**
uygulandı — hâlbuki `DR-47` bu rejimde darboğazın tam olarak kesit döşemesi olduğunu söylüyordu.

`G-3` bunun görsel kanıtı. **F6-3 ölü değil; yanlış rejimde ölçülmüş.**

### Doğrulanacaklar

- [ ] `--load-ratio 0.25/0.50/0.75` ile F6-3 yeniden ölçülmeli. Reddin geçerli olduğu tek rejim
      taşan yüktür; yarım yükte kazanç var mı, **ölçülmedi**.
- [ ] `UnusableResidual`'a "artık şerit en kısa kenardan dar" ölçütünün yanına "artık şerit kalan
      kutuların hiçbir kombinasyonuyla döşenemiyor" ölçütü eklenirse ne olur (kaynaktaki `L(b)`
      knapsack terimi — `DR-52`'de reddedilmişti, yine taşan yük rejiminde).
- [ ] Kesit döşemesi bir **kombinasyon** kararı: 73 cm'ye 55 mi, 43+25 mi? Bu, kutu başına
      değerlendirmeyle çözülemez; şerit genişliği üzerinden küçük bir knapsack gerekir.
- [ ] `A11-F15` 80 cm × 2 = 160, artık 73 — ilk kutunun genişliği bütün kesiti belirliyor.
      İlk sütunun seçimi de aramaya açılmalı mı?

---

## `G-4` — Yarım dolu araçta yük bütün uzunluğa yayılıyor *(motor)*

### Belirti

`%75 hedef · çok farklı (20 tip) · BR7` planında yük aracın **neredeyse tamamına** yayılmış.
Beklenen: %75 yük, kabul edilebilir kayma payı ×1,17 → uzunluğun ~%87'si. Gerçekleşen: **%98**.

### Ölçüm — 16 planın tamamı

`yayılma = gerçek z erişimi / ideal derinlik`, `ideal = yük hacmi / (genişlik × yükseklik)`.
`dilim doluluğu` = kullanılan `z` diliminin içindeki gerçek doluluk.

| Hedef | Yük tipi | Yerleşen | z erişim | İdeal | **Yayılma** | Dilim doluluğu |
|---|---|---|---|---|---|---|
| %25 | aynı (BR0) | 35/35 | 326 cm | 176 cm | **×1,85** | %53,9 |
| %25 | az farklı (BR1) | 55/55 | 313 cm | 252 cm | ×1,24 | %80,5 |
| %25 | çok farklı (BR7) | 28/28 | 244 cm | 147 cm | **×1,66** | %60,1 |
| %25 | tamamen farklı (BR15) | 30/30 | 298 cm | 147 cm | **×2,03** | %49,2 |
| %50 | aynı (BR0) | 61/61 | 368 cm | 293 cm | ×1,26 | %79,6 |
| %50 | az farklı (BR1) | 56/56 | 335 cm | 293 cm | ×1,14 | %87,4 |
| %50 | çok farklı (BR7) | 57/57 | 399 cm | 293 cm | ×1,36 | %73,5 |
| %50 | tamamen farklı (BR15) | 63/63 | 491 cm | 293 cm | **×1,67** | %59,7 |
| %75 | aynı (BR0) | 91/91 | 540 cm | 437 cm | ×1,24 | %81,0 |
| %75 | az farklı (BR1) | 85/85 | 546 cm | 438 cm | ×1,25 | %80,3 |
| %75 | çok farklı (BR7) | 87/87 | **577 cm** | 440 cm | **×1,31** | %76,3 |
| %75 | tamamen farklı (BR15) | 93/93 | **586 cm** | 440 cm | **×1,33** | %75,1 |
| %100 | aynı (BR0) | 112/122 | 584 cm | 538 cm | **×1,09** | **%92,1** |
| %100 | az farklı (BR1) | 101/113 | 584 cm | 540 cm | **×1,08** | **%92,5** |
| %100 | çok farklı (BR7) | 98/113 | 585 cm | 542 cm | **×1,08** | **%92,6** |
| %100 | tamamen farklı (BR15) | 85/120 | 587 cm | 512 cm | ×1,15 | %87,2 |

**Araç boşaldıkça yayılma büyüyor — istisnasız:**

| Hedef | Ortalama yayılma | Ortalama dilim doluluğu |
|---|---|---|
| %25 | **×1,70** | %60,9 |
| %50 | ×1,36 | %75,1 |
| %75 | ×1,28 | %78,2 |
| **%100** | **×1,10** | **%91,1** |

Motor **taşan yükte mükemmele yakın** paketliyor (×1,08-1,15, dilim doluluğu %92). Aynı motor
yarım dolu araçta ×1,7-2,0'a çıkıyor. Kod aynı, davranış farklı — çünkü **hedef farklı.**

### Neden — `DepthSlack` sessizce çözülüyor

Mekanizma `DR-47`'de bilinçli olarak "sert sınır değil **tercih**" tasarlandı:

> kutu sığmazsa hedef `×1,10` büyür ve yeniden denenir, böylece **doluluk asla düşmez**

Taşan yükte bu doğru: gevşetmezsen kutu dışarıda kalır, doluluk düşer. Ama yarım dolu araçta
**doluluk zaten düşemez** — 55 kutunun 55'i yerleşiyor. Yani gevşetmenin amaç fonksiyonunda
**hiçbir bedeli yok**; bütçe serbestçe büyüyor ve yayılma bedava geliyor.

Üç bulgu tek zincire bağlanıyor:

1. `G-3` — kesit iyi döşenmiyor, kullanılamaz şeritler kalıyor
2. → kutu mevcut duvara sığmıyor, derinlik bütçesi gevşiyor (`DepthRelaxStep`)
3. → `G-2` — yeni duvar açılıyor, önceki yarım kalıyor
4. → `G-4` — yük bütün uzunluğa yayılıyor
5. `G-2`'nin kör amaç fonksiyonu yüzünden **hiçbir adımda ceza yok**

### En temiz asgari yeniden üretim

`%25 hedef · aynı yük · BR0` (kullanıcının 5 adet `BR15-T007` eklediği hâli):

```
z=    0   5 kutu  derinlik  98  x=[0, 72]     y-kat=4     <- 98 cm'lik dilimde YALNIZ 5 kutu
z=   98  14 kutu  derinlik  76  x=[0, 108]    y-kat=7     <- 2x7 tam kesit
z=  174  14 kutu  derinlik  76  x=[0, 108]    y-kat=7     <- 2x7 tam kesit
z=  250   2 kutu  derinlik  76  x=[0]         y-kat=2
```

İlk duvar (z = 0..98) hacminin yalnız **%32'si** dolu: 5 kutu x = 0..144'ü tutuyor, geriye
**89 cm** genişlik ve üst katlar boş. `BR0-T001` oraya **Roll** yönelimiyle (30 × 108 × 76)
girerdi — 30 cm genişlik 89'a rahat sığar, 76 uzunluk 98'lik banda sığar.

Motor bunun yerine ikinci duvarı açıp orada **kusursuz 2 × 7 kesit** kurmuş. Yani yerleştirici
kötü değil — **nereye yerleştireceğine karar verirken sıkılığı hiç tartmıyor.**

### Doğrulanacaklar / düzeltme yönleri

- [ ] **Amaç fonksiyonuna sıkılık terimi.** Doluluk eşitken `z` erişimi küçük olan kazanmalı.
      En ucuz biçimi: beam'in dal seçiminde eşitlik bozucu olarak `z` erişimi. Taşan yükte
      davranışı **değiştirmemeli** (orada doluluk zaten ayırt edici) — bu, geriye dönük riski
      düşük tutar.
- [ ] **`DepthSlack` gevşemesine taban.** Bugün sınırsız gevşiyor. Yarım dolu araçta gevşemenin
      bedeli sıfır olduğu için kural işlevsiz. Gevşeme yalnız *kutu gerçekten yerleşemiyorsa*
      (yani doluluk düşecekse) tetiklenmeli.
- [ ] Kullanıcının hatırladığı pay **×1,17**; koddaki varsayılan **1,05** (`DR-57`). Hedeflenen
      değer netleştirilmeli — ölçülen yayılma zaten ikisini de aşıyor, ama kabul ölçütü yazılı olmalı.
- [ ] **Gecelik kapıya yarım dolu rejim eklenmeli.** `--load-ratio` bayrağı var ama kapı yalnız
      taşan yükle koşuyor. Yukarıdaki tablo bugün **hiçbir ölçümde görünmüyor**; bu tablo kapıya
      girmeden yapılacak hiçbir düzeltme korunamaz.
