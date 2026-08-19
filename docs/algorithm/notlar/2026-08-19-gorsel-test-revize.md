# Görsel test revizesi — 19 Ağustos 2026

**Geçici dosya.** BR tohum verisiyle arayüzü gözle test ederken çıkan kusurlar burada birikir.
Her bulgu için *belirti → teşhis → olası sebep → doğrulanacaklar* tutulur. **Düzeltme yapılmaz;**
liste dolduğunda toplu bir araştırma + geliştirme turu yapılır ve kalıcı olanlar
[02-kararlar.md](../02-kararlar.md) ile [01-kurallar.md](../01-kurallar.md)'e taşınıp bu dosya silinir.

## Bulgu listesi

| # | Belirti | Alan | Durum |
|---|---|---|---|
| `G-1` | ~~Ürün eklenince yerleşim bozuluyor~~ | Frontend | ❌ **TEŞHİS YANLIŞTI** — aşağıdaki düzeltmeye bakın |
| `G-2` | İlk duvarda boşluk varken motor yeni duvar açıyor | **Motor**, duvar örücü | **Ölçüldü ve doğrulandı** — boşluk gerçek, kutu sığıyor |
| `G-3` | Küçük kutu dik konunca kesitte kullanılamaz şerit kalıyor | **Motor**, yönelim + kesit döşemesi | **Ölçüldü** — `DR-57`'nin F6-3'ü kapatma gerekçesiyle çelişiyor |
| `G-4` | Yarım dolu araçta yük bütün uzunluğa yayılıyor; `DepthSlack` tutmuyor | **Motor**, derinlik bütçesi | **`F8-1` ile büyük ölçüde kapandı** |
| `G-5` | Kenarda sığacak yer görünüyor ama kutu konmuyor | **Motor**, aday konum üretimi | **Kök neden bulundu** — destek eşiği değil, boşluk **köşesi** |

---

## `G-1` — ❌ Teşhis yanlıştı, düzeltildi

### Ne iddia etmiştim

"Plana ürün eklenince frontend kendi paketleyicisiyle araç içine konum uyduruyor, motorun sekiz
sert kapısının altısı atlanıyor." Ekran görüntüsündeki kutuların araç **içinde** olduğunu
varsaymıştım.

### Gerçek

Kullanıcı itiraz etti ve haklı çıktı. Kod üç kez okundu:

| Eylem | Çağırdığı | Nereye koyuyor |
|---|---|---|
| Ürün ekleme (`addManualItem`) | `buildStagingPlacements` | **Bekleme alanı — aracın dışı** |
| Adet güncelleme (`updateItemQtyOnly`) | `buildStagingPlacements` | **Bekleme alanı** |
| Yükle/çıkar (`togglePlacement`) | `buildStagingPlacements` | **Bekleme alanı** |

Yani normal akış **doğru çalışıyor**: kutu kenara geliyor, konum uydurulmuyor, motor ancak
"optimize et" denince koşuyor. Ekran görüntüsünde araç içinde sandığım kutular bekleme
alanındaydı — 3B perspektifi yanlış okumuşum.

### Geriye kalan — dar ve özel yollar

`buildPlacements` (araç içine konum üreten yerel paketleyici) yalnızca üç yerden çağrılıyor:

| Çağıran | Ne zaman |
|---|---|
| `retryUnfitItem` | Sığmayanlar panelinde **"tekrar dene"** düğmesi |
| `updateItem` | `onPlace` yolundan, **zaten yerleşmiş** bir ürünün adedi değişince |
| `setPreview` | Sürükleme önizlemesi (geçici) |

Bu üçü gerçekten motorun kapılarını atlıyor (destek oranı, kırılganlık, istif adedi, üst ağırlık,
LIFO bölgesi, uyumsuz grup) ve `orientationIndex: 0` ile döndürme denemiyor. Ama hiçbiri normal
akışta tetiklenmiyor; üçü de ayrı düğmeler.

### Dersi

Ekran görüntüsünden mekanizma çıkarmaya çalıştım ve kodu **eksik** okudum: `buildPlacements`
fonksiyonunu bulup "ürün ekleme bunu çağırıyor" varsaydım, çağıranları doğrulamadan. Doğrulama
tek bir `grep` kadardı.

Bu, aynı gün yakalanan ölçüm geçersizliklerinin (`DR-66`, `G-5`, `F8-2`) insan tarafındaki eşi:
*ölçmeden emin olmak.*

### Yapılan işin akıbeti

`RunIncremental` / `KeepExistingPlacements` (commit `b2d6fa64`) yazıldı, test edildi, canlıda
doğrulandı — ama **yaşayan bir hatayı düzeltmiyor**. Bayrak varsayılan kapalı, hiçbir çağıran yok,
davranış birebir aynı. Yukarıdaki üç dar yol bağlanmak istenirse hazır duruyor.

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

---

## `G-5` — Aday konum boşluk başına **tek**: köşe. Kenardaki yer bu yüzden kullanılmıyor *(motor)*

### Belirti

`%100 hedef · tamamen farklı (100 tip) · BR15` planında kenarda gözle görülür boşluk var,
oraya sığacak ürünler "yüklenemeyen" listesinde duruyor. İlk hipotez: **%80 destek kuralı**
tıkıyor, 0,60'a indirilebilir.

### Hipotez kısmen doğru — ama asıl tıkaç o değil

27 yerleşemeyen kalemin her biri için, **son yerleşimde** her aday konum ve 6 yönelim tarandı;
her konumda motorun kendi destek tanımıyla (`PlacementValidator.SupportRatio`) oran hesaplandı.

| Sonuç | Adet |
|---|---|
| **≥ %80 destekli bir konumu VAR** (bugünkü eşiği zaten geçerdi) | **21** |
| %60–80 arası (eşik 0,60 olsa açılırdı) | 1 |
| %60 altı (altında destek yok, hiçbir eşik çözmez) | 0 |
| Hiç sığacak yer yok | 5 |

**21/27 kutu, bugünkü kuralı geçen bir konuma sahip ve yine de yerleşmemiş.** Yani engel destek
eşiği değil.

Doğrulama — `BR15-T026` için bulunan konum bağımsız olarak sınandı:

```
BR15-T026 rot=3 -> (0, 108, 318) olcu 29x80x65
  arac ici mi : x+w=29<=233  y+h=188<=220  z+l=383<=587
  destek      : %87,7   altinda BR15-T048, temas 1653 cm2
  cakisan kutu: 0
```

Araç içinde, sıfır çakışma, %88 destek. Motor bu noktayı **hiç denemedi**.

### Kök neden

`WallBuilderPlacement.cs:785-799` — her boşluk için aday konum **tektir**:

```csharp
foreach (var space in ledger.Spaces)
    ...
    var x = fillFromMaxX ? space.MaxX - width : space.X;
    var y = space.Y;
    var z = space.Z < zFloor ? zFloor : space.Z;
```

Yani kutu yalnızca **boşluğun köşesine** konulmayı dener. Köşe desteksizse (ya da başka bir engel
varsa) o boşluk tamamen elenir — hâlbuki 20 cm ileride tam destekli bir konum olabilir.

Defter suçlu değil: boşluklar maksimal (`MAKSIMAL OLMAYAN bosluk %0,0`) ve tabanlarının desteksiz
olabilmesi **bilinçli** bir tercih (`SpaceLedger` başlığı, F2a: tabanı destekli bölgeye kırpmak
doluluğu %75,99 → %73,65'e düşürmüştü). Sorun boşluğun *kendisinde* değil, boşluk içinde **tek bir
nokta denenmesinde**.

Bu, literatürde bilinen ayrımdır: *corner point* yerine *extreme point* aday üretimi
(Crainic, Perboli & Tadei, CIRRELT-2007-41). Araştırma raporu da aynı kaynağı `G-1` bağlamında
gösteriyor.

### Aynı kusur teşhis aracında da var

`SpaceDiagnostics.SupportedSomewhere` desteği yine **yalnız boşluk köşesinde** sınıyor. Bu yüzden
"sığan+destekli %0,1" diyor — gerçek sayı çok daha yüksek. Teşhis motorun kusurunu paylaştığı için
kusuru göstermiyordu.

### Destek eşiği ölçümü — kullanıcının önerisi ayrıca ölçüldü

Static, BR1-BR7, 175 örnek:

| Eşik | Doluluk | Kazanç | Ort. destek | En düşük | %80 altı kutu | Azami taşma |
|---|---|---|---|---|---|---|
| **0,80** *(bugün)* | %83,78 | — | %99,0 | %82,4 | %0,0 | 13 cm |
| 0,70 | %84,23 | +0,45 | %98,3 | %72,8 | %3,9 | 21 cm |
| **0,60** | **%84,42** | **+0,64** | %97,6 | %64,4 | %5,8 | 28 cm |
| 0,50 | %84,64 | +0,86 | %96,8 | %54,8 | %7,4 | 40 cm |

BR15'te kazanç daha büyük: **%79,32 → %80,85 (+1,53)**.

Okunuşu: eşiği düşürmek planın tamamını gevşetmiyor — ortalama destek 0,60'ta bile %97,6.
Yalnızca kutuların %5,8'i %80'in altına iniyor. Ama azami taşma 13 cm'den 28 cm'ye çıkıyor;
0,50'de 40 cm'ye çıkıyor ki bu fiziksel olarak riskli.

`DR-16` bu eşiğin "fizik kanunu değil **politika**" olduğunu ve "müşteri kararı sayı olmadan
verilemez" dediğini kaydetmişti. Sayılar artık var.

### Sıraya etkisi

`G-5`'in kazanç potansiyeli `F8-2` ve `F8-3`'ten **büyük** görünüyor ve ikisinin de önüne geçmeli:

- Kazanç iki rejimde birden: taşan yükte doluluk, kısmi yükte sıkılık.
- Değişiklik yerleştiricinin **tek bir noktasında** (aday üretimi) toplanıyor.
- `F8-3`'ün (kesit kombinasyonu) faydası zaten aday üretimine bağlı: daha iyi kombinasyon
  seçilse bile konum denenmiyorsa işe yaramaz.

### Doğrulanacaklar

- [ ] Aday üretimi köşeden **destekli uç noktalara** genişletildiğinde BR1-BR7 ve BR15 ne kazanır?
      Aday sayısı boşluk başına birden çoğa çıkacağı için **süre maliyeti ölçülmeli** (2 sn bütçe).
- [ ] Aday sayısını sınırlamak gerekirse ölçüt ne olmalı: destek oranı mı, temas alanı mı?
- [ ] `SpaceDiagnostics.SupportedSomewhere` aynı genişletmeyi almalı, yoksa ölçüm kusuru
      paylaşmaya devam eder.
- [ ] Destek eşiği 0,60 kararı `G-5` düzeltildikten **sonra** yeniden ölçülmeli: aday üretimi
      düzelince eşik düşürmenin marjinal kazancı azalabilir.
