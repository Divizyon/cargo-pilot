# Koordinat Sistemi Standardı (Container / Truck)

> Bu belge Cargo Pilot'un **tek yetkili** koordinat sistemi tanımıdır. Kod, doküman,
> API sözleşmesi, 3D sahne ve raporlar bu tanımı esas alır. Çelişki hâlinde bu belge
> kazanır.
>
> Görsel/etkileşimli sürüm: [`coordinate-standard.html`](./coordinate-standard.html)
> Mevcut kodun bu standarda göre denetimi: [`KOORDINAT-UYUM-RAPORU.md`](./KOORDINAT-UYUM-RAPORU.md)
> (canlı kayıt). 2026-08-12 tarihli önceki denetim arşivdedir:
> [`archive/koordinat-denetimi-2026-08-12.md`](./archive/koordinat-denetimi-2026-08-12.md)
>
> **Terim dili:** eksen ve boyut terimleri **İngilizce** yazılır — `width`, `height`,
> `length`. Türkçe karşılıklar (genişlik, yükseklik, uzunluk) yalnızca son kullanıcıya
> gösterilen arayüz metninde kullanılabilir. `depth`, `derinlik`, `w`, `h`, `d`, `l`
> kullanılmaz.

---

## 1. Araç tipleri

| Tip | Tanım | Referans kapı |
| --- | ----- | ------------- |
| **TIR konteyneri** (truck container) | Çekiciye bağlı yük kasası. Kabin ucunda kapı **yoktur**. | **back door** — `z = length` |
| **Düz konteyner** (plain container) | Bağımsız konteyner. Kapılar konuma göre değil **boyuta** göre adlandırılır. | **small door** — `z = length` |

---

## 2. Origin kuralı

**Referans kapıdan içeri bakıldığında görülen _uzaktaki sol-alt köşe_ `(0, 0, 0)`'dır.**

Bu kural her iki araç tipinde aynıdır. Referans kapı, TIR konteynerinde back door, düz
konteynerde small door'dur.

Referans kapı, bakılan / yükleme yapılan kapıdır ve her zaman `z = length` yüzünde kabul
edilir. Fiziksel olarak konteynerin diğer kısa yüzünde de bir kapı bulunabilir; kayıtta
referans olan, yükleme yapılan kapıdır.

**Origin geometrik bir köşedir; kapının varlığına bağlı değildir.** Referans kapı yalnızca
"hangi yüzden bakıyoruz" sorusunu adlandırır, origin'in sayısal yerini belirlemez. Bir
konteynerde small door hiç bulunmasa da (yalnızca big door'u olan araç) eksen tanımı
değişmez: `z = 0` uzak yüz, `x = 0` sol yüz, `y = 0` zemindir.

Bunun emsali yükleme başlangıcı kuralıdır (bölüm 7): big door origin'in bulunduğu `x = 0`
yüzündeyse **origin taşınmaz ve konteyner döndürülmez**, yalnızca yüklemenin başladığı köşe
değişir. Kapı origin köşesine değdiğinde değişen şey doldurma yönüdür, koordinat sisteminin
kendisi değil.

Origin köşesini içeren yüzler: `z = 0` (ikinci small door burada olabilir) ve `x = 0`
(big door burada olabilir). `z = length`, `x = width` ve `y = height` yüzleri origin'e
değmez.

---

## 3. Eksenler

| Eksen | Dimension  | Yön                                                              | Geçerli aralık |
| ----- | ---------- | ---------------------------------------------------------------- | -------------- |
| `x`   | **width**  | Referans kapıdan bakıldığında **sağa** doğru artar                | `0 → width`    |
| `y`   | **height** | Zeminden **yukarı** doğru artar                                   | `0 → height`   |
| `z`   | **length** | Uzak yüzden (`z = 0`) **referans kapıya** doğru artar             | `0 → length`   |

### 3.1 El kuralı (handedness)

`y` yukarı, `z` kapıya (gözlemciye) ve `x` gözlemcinin sağına arttığı için bu sistem
**right-handed**'dır — **Three.js / WebGL varsayılanıyla birebir aynıdır**.

Sonuç: sahnede herhangi bir eksen aynalaması **gerekmez**. Backend'den gelen
`(x, y, z)` üçlüsü doğrudan `position=[x, y, z]` olarak kullanılabilir. Bu, standardın en
önemli pratik kazancıdır — gizli mirror/telafi dönüşümüne ihtiyaç yoktur ve böyle bir
dönüşüm görülürse hatadır.

---

## 4. Kapı tipleri

| Door           | Yüz (face)        | Olabileceği konumlar          | TIR konteyneri                                  | Düz konteyner                          |
| -------------- | ----------------- | ----------------------------- | ----------------------------------------------- | -------------------------------------- |
| **small door** | `width × height`  | `z = length` | Yalnızca `z = length` (**back door**). `z = 0` kabin ucudur, kapı olmaz. | `z = length` — yükleme yapılan yüz. |
| **big door**   | `length × height` | `x = 0` **veya** `x = width` (ikisi birden değil) | Olabilir — tek tarafta | Olabilir — tek tarafta |
| **top door**   | `width × length`  | `y = height`                  | Olabilir                                          | Olabilir                                |

Kurallar:

- **Kapılar liste olarak modellenir.** Bir araçta aynı anda birden fazla kapı
  bulunabildiği için kapı bilgisi tekil bir enum değeri değil, yüz bilgisiyle birlikte bir
  listedir:

  ```ts
  doors: [
    { type: 'small', face: 'z=length' },
    { type: 'big',   face: 'x=0' },
    { type: 'top',   face: 'y=height' },
  ]
  ```

- **"sağ kapı" / "sol kapı" diye bir kavram yoktur.** Kapılar `small` / `big` olarak
  sınıflanır, konumları eksen değeriyle yazılır. "sağ" ve "sol" yalnızca kamera
  bakışlarını adlandırmak için kullanılır (bkz. bölüm 6).
- **Arayüz adlandırması:** son kullanıcıya gösterilen metinde kapı tipi yine
  boyutla anılır — *küçük* / *büyük* / *üst*. Tipler `+` ile birleştirilir,
  "kapı" kelimesi tekrarlanmaz, büyük kapının bulunduğu taraf **tip adının
  parçası değil**, parantez içinde eklenen ayrı bir bilgidir:

  ```
  Küçük
  Büyük (sağ)
  Küçük + büyük (sol)
  Küçük + büyük (sağ) + üst
  ```

  Kayıtta ve API'de taraf her zaman yüz değeriyle (`ZeroX` / `WidthX`) tutulur;
  "sol/sağ" yalnızca ekran metnidir.
  Excel şablonunda da aynı yazım kullanılır (`küçük`, `küçük+sol`, `sağ` …);
  eski dosyaların yön adları (`arka`, `yan`, `rearAndSide`) içe aktarımda
  tanınmaya devam eder.
- **"ön kapı" / "front door" diye bir kavram yoktur.** TIR'da `z = 0` kabin ucudur;
  düz konteynerde `z = 0` yalnızca karşı küçük yüzdür.
- **Her tipten en fazla bir kapı bulunabilir.** İki small ya da iki big door,
  ilgili eksende serbest köşe bırakmaz ve yüklemenin başlayacağı nokta kalmaz
  (bölüm 7). Kural veritabanında `IX_VehicleDoors_TekKapiTipi` ile zorlanır.
- **top door** üçüncü bir kapı tipidir ve `y = height` yüzünde bulunur. Yükleme
  yukarıdan yapıldığı için katman ekseni `y`'dir; aynı kattaki sıralama yine
  yükleme yönünü (`z` küçük→büyük) izler.

---

## 5. Diyagramlar

### 5.1 Referans kapı görünümü — origin kuralının tanımlandığı bakış

```
                                    y (height)
                                        ↑
      x = 0                             │                    x = width
        │                               │                        │
        ▼                                                        ▼
        ┌────────────────────────────────────────────────────────┐
        │                                                        │
        │              REFERANS KAPI  (z = length)               │
        │        TIR: back door · düz konteyner: small door       │
        │                                                        │
        └────────────────────────────────────────────────────────┘
        ▲                    y = 0 · zemin
        │
        └── ORIGIN (0,0,0) bu köşenin hizasındadır, ancak gözlemciden
            `length` kadar uzakta, z = 0 yüzü üzerindedir.

              x (width) ─────────────────────────────────►
                        (bu bakışta SAĞA artar)
```

### 5.2 Üstten görünüm (plan view) — `x` ve `z` birlikte

Sayfada `z` aşağı doğru, referans kapıya doğru artar. Gözlemci sayfanın altındadır.

```
            x (width) ────────────────────────►

    O ══════════════════════════════════════════════╗ ◄── YÜKLEME BAŞLANGICI
    │                                               ║     (width, 0, 0)
    ║                                               ║
    ║ BIG                                           ║      │
    ║ DOOR         yük alanı        ◄── doldurma    ║      │  z
    ║ x = 0                             yönü        ║      │  (length)
    ║                                               ║      ▼
    ║                                               ║
    ╚═══════════════════════════════════════════════╝
    ▲                 REFERANS KAPI · z = length
    │
    └── ORIGIN (0,0,0) — uzak sol-alt köşe; big door bu yüzde
        olduğu için yükleme buradan BAŞLAMAZ
```

`║` = big door'un bulunduğu uzun yüz. Kapı origin köşesine değdiği için yükleme karşı köşeden başlar ve kapıya doğru ilerler.

### 5.3 Isometric — referans kamera: kapı tarafı + sağ + üst (`+z, +x, +y`)

Bu bakışta görünen ve gizli kalan yüzler:

| Yüz | Konum | Durum |
| --- | ----- | ----- |
| Referans kapı | `z = length` | **görünür** |
| Sağ yüz | `x = width` | **görünür** |
| Üst yüz | `y = height` | **görünür** |
| Uzak yüz | `z = 0` | gizli |
| Sol yüz | `x = 0` | gizli |
| Zemin | `y = 0` | gizli |

**Origin bu bakışta gizli köşededir** (uzak-sol-alt). Teknik çizimde kesikli halka ve
kesikli eksen oklarıyla gösterilir. Origin'in görünür olması gerektiği durumlarda kamera
kapı + **sol** + üst (`+z, −x, +y`) yönüne alınır.

Origin'den çıkan eksen üçlüsü, bu kamerada ekrana şöyle düşer:

```
                          y (height)
                              ↑
                              │
                              │
                              │
                              O   (0,0,0) — gizli köşe
                            ╱   ╲
                          ╱       ╲
                        ╱           ╲
                      ↙               ↘
            z (length)                 x (width)
        referans kapıya                 sağ yüze
        (aşağı-sola)                    (aşağı-sağa)
```

> Renkli/ölçekli isometrik çizim: [`coordinate-standard.html`](./coordinate-standard.html),
> bölüm 3.1 ve 4.1.

---

## 6. Standart kamera bakışları

| Bakış | Kamera yönü | Görünen yüz |
| ----- | ----------- | ----------- |
| **Kapı görünümü** (referans) | `+z` tarafından, `−z` yönüne bakar | referans kapı — `z = length` |
| **Karşı görünüm** | `−z` tarafından | uzak yüz — `z = 0` |
| **Sağ görünüm** | `+x` tarafından | sağ yüz — `x = width` |
| **Sol görünüm** | `−x` tarafından | sol yüz — `x = 0` |
| **Üst görünüm** | `+y` tarafından | tavan — `y = height` |
| **İzometrik** (referans) | `+z, +x, +y` — kapı + sağ + üst | kapı yüzü, sağ yüz, tavan (origin gizli) |

Sağ/sol, **kapı görünümündeki** gözlemciye göredir: gözlemcinin sağı `+x`, solu `x = 0`
tarafıdır. Üstten veya karşıdan bakışta ekranda görünen sol/sağ ile karıştırılmamalıdır.

---

## 7. Yükleme başlangıcı

**Yükleme, kapının bulunduğu yüzden başlamaz.** Başlangıç noktası hiçbir kapıya değmeyen
köşedir; doldurma oradan kapıya doğru ilerler. Gerekçe pratiktir: kutu kapının önüne
yığılırsa operatör kendi açtığı kapıdan içeri giremez.

Kapının yanında boş bırakılan bir pay **yoktur** — kutu duvara dayanır. Değişen tek şey
hangi duvardan başlandığıdır.

### Köşeler

Zemindeki dört köşe ve değdikleri yüzler:

| Köşe | Değdiği yüzler |
| ---- | -------------- |
| `(0, 0, 0)` | `x = 0`, `z = 0` |
| `(width, 0, 0)` | `x = width`, `z = 0` |
| `(0, 0, length)` | `x = 0`, `z = length` |
| `(width, 0, length)` | `x = width`, `z = length` |

Referans kapı her zaman `z = length` yüzünde olduğu için alttaki iki köşe baştan elenir.
Bu, `z` ekseninde yönün sabit olması demektir: yükleme `z = 0`'dan başlar, kapıya doğru
ilerler. Değişken olan `x` eksenidir.

### Başlangıç köşesi

| Big door | Başlangıç köşesi | `x` doldurma yönü |
| -------- | ---------------- | ----------------- |
| yok | `(0, 0, 0)` | `0 → width` |
| `x = width` yüzünde | `(0, 0, 0)` | `0 → width` |
| `x = 0` yüzünde | `(width, 0, 0)` | `width → 0` |

### Serbest köşe her zaman vardır

Kural, kapı kombinasyonlarının **her zaman en az bir serbest köşe bırakmasına** dayanır.
Bunu sağlayan iki kısıt araç tanımında zorlanır:

**1. Her tipten en fazla bir kapı.** Bir small, bir big, bir top. İki small door `z`
ekseninde, iki big door `x` ekseninde serbest köşe bırakmazdı.

**2. Her tip yalnızca kendi yüzünde.** Small door `z = length`, big door `x = 0` veya
`x = width`, top door `y = height`.

Seçilebilir kombinasyonlar bu yüzden sınırlıdır:

| Kapılar | Serbest köşe | Başlangıç |
| ------- | ------------ | --------- |
| small | `(0,0,0)` ve `(width,0,0)` | `(0, 0, 0)` |
| small + big (`x = width`) | `(0,0,0)` | `(0, 0, 0)` |
| small + big (`x = 0`) | `(width,0,0)` | `(width, 0, 0)` |

Top door başlangıç köşesini etkilemez: `y = height` yüzü zemindeki köşelere değmez.

---

## 8. Yerleştirme kuralları

| Konu | Kural |
| ---- | ----- |
| Birim | Santimetre (`cm`). Dönüşüm yalnızca API sınırında yapılır. |
| Kutu pozisyonu | `positionX/Y/Z`, kutunun **origin'e en yakın köşesidir**: `(min x, min y, min z)`. Mesh merkezi değildir. |
| Kutu sınırları | `x … x + width` · `y … y + height` · `z … z + length`. Hepsi araç iç ölçüsü içinde kalmalı. |
| Yükleme yönü | Yükleme referans kapıdan yapılır: `z = 0` (uzak yüz) tarafındaki kutular önce yerleşir, kapıya en yakın olanlar (`z → length`) en son. |
| LIFO bölgeleri | Bölge ayrımı **kapı listesinden bağımsızdır**: yalnızca LIFO kriteri ve en az iki boşaltma sırası gerekir. İlk inecek grup `z = length` ucundaki bölgeyi alır. Yalnızca büyük kapısı olan araçta da geçerlidir — boşaltma sırasının bir ucu vardır, kapının fiziken orada olması gerekmez. |
| Three.js pivot | Backend köşe verir, Three.js mesh merkezini bekler. Dönüşüm tek noktada: `center = position + boyut / 2`. |
| Terminoloji | Yalnızca `width`, `height`, `length`. |

---

## 9. Common violations (sık görülen ihlaller)

| # | İhlal | Nasıl görünür | Standarttan farkı |
|---|-------|---------------|-------------------|
| 1 | **`z` yönü ters** | `z = 0` kapı kabul edilir, `z` kapıdan içeri artar | Bizde `z = 0` **uzak yüz**tür, `z` kapıya doğru artar. Yükleme sırası, LIFO bölgeleri, animasyon giriş noktası ve dingil yükü ters döner. |
| 2 | **`depth` terimi** | `depth` alanı `z` boyutu için kullanılır | Standart terim **`length`**'tir. `depth` tamamen kaldırılır. |
| 3 | **`length` = X sanılması** | Formda "Uzunluk (X)" etiketi | `length` **`z`** boyutudur; `x` **`width`**'tir. |
| 4 | **front / rear / sağ / sol kapı** | `DoorDirection = front \| rear \| side \| top` gibi enum | Kapılar `small` / `big` olarak sınıflanır, konum yüz değeriyle verilir; "ön kapı" ve "sağ/sol kapı" kavramları yoktur. |
| 5 | **Tek kapı varsayımı** | Araçta tek bir kapı alanı tutulur | Bir araçta small + iki big door olabilir; kapı bilgisi listedir. |
| 6 | **Origin at center** | Konteyner `BoxGeometry` merkezine kurulur, koordinatlar `±boyut/2` | Origin köşededir, tüm aralıklar `0 → boyut`. Negatif koordinat oluşmaz. |
| 7 | **Origin kapı yüzünde** | `(0,0,0)` referans kapının köşesi kabul edilir | Origin **uzak yüzdedir** (`z = 0`), kapıdan `length` kadar uzakta. |
| 8 | **Origin sağ tarafta** | Kapıdan bakınca sağ-alt köşe origin sanılır | Origin **sol-alt** köşedir (kapıdan bakışta `x = 0` solda). |
| 9 | **z-up convention** | `z` yükseklik, `y` derinlik (CAD/Blender alışkanlığı) | Bizde `y` = height, `z` = length. |
| 10 | **`y` aşağı artar** | 2D canvas alışkanlığı | `y` zeminden yukarı artar. |
| 11 | **Gizli telafi dönüşümü** | `scale.x = -1`, `rotation.y = Math.PI`, `length - z` gibi düzeltmeler | Standart right-handed olduğu için Three.js'te **hiçbir aynalama gerekmez**. Böyle bir düzeltme, altta yatan konvansiyon uyuşmazlığının işaretidir. |
| 12 | **Mesh merkezi ↔ köşe karışması** | Backend köşe verirken `position=[x,y,z]` doğrudan verilir | `+boyut/2` offset'i uygulanmadan kutular yarım boy kayar. |
| 13 | **Kapının olduğu yüzden yükleme** | Yükleme her zaman `x = 0`'dan başlar | Big door `x = 0` yüzündeyse başlangıç `(width, 0, 0)`'dır ve doldurma kapıya doğru ilerler. |
| 14 | **Birim karışması** | Metre ve santimetre aynı sahnede | Standart birim cm'dir; dönüşüm yalnızca API sınırında. |

---

## 10. Karara bağlanan konular

> **Bu belge standardı tanımlar.** Aşağıdaki kararların tamamı koda uygulanmıştır;
> "Kodda" sütunu uygulamanın nerede olduğunu gösterir.

| # | Konu | Karar | Kodda |
|---|------|-------|-------|
| 1 | **Small door'u olmayan konteyner** | Origin geometrik köşedir, kapıya bağlı değildir: small door olmasa da `z=0` uzak yüz, `x=0` sol yüz, `y=0` zemindir. Yükleme başlangıcı kuralı ayrıdır — kapı origin'e değdiğinde origin taşınmaz, başlangıç köşesi değişir. Bölüm 2. | ✅ `OptimizationEngine.cs` |
| 2 | **Üst kapı (top door)** | Üçüncü kapı tipi olarak modellenir: `{ type: 'top', face: 'y=height' }`. Bölüm 4. | ✅ `DoorType.Top`, `VehicleDoors` tablosu |
| 3 | **Yükleme başlangıç köşesi** | Açıklık payı diye bir kavram yok. Yükleme kapının olduğu yüzden başlamaz; başlangıç köşesi kapı listesinden türetilir. Bölüm 7. | ✅ `LoadingCorner.cs`, `OptimizationEngine.cs:47` |
| 4 | **Her tipten tek kapı** | İki small ya da iki big door serbest köşe bırakmaz; araç tanımlanırken seçilemez. Bölüm 4. | ✅ `IX_VehicleDoors_TekKapiTipi`, `VehicleDoorRules` |

### Kodun bugünkü hâli

| Standartta yazan | Kodda karşılığı |
|---|---|
| `doors: [{ type, face }]` listesi | ✅ `VehicleDoors` tablosu; `VehicleDoor(Type, Face)` entity'si. API sözleşmesinde `Doors` (araç detay/liste, plan detay, paylaşım). Frontend `lib/types/vehicle.ts` |
| top door: katman ekseni `y`, aynı katta `z` küçük→büyük | ✅ Frontend `loadOrder.ts`. Motorda üstten yükleme için ayrı bir yerleştirme stratejisi yok |
| LIFO bölge ayrımı kapı listesinden bağımsız | ✅ `LifoPlacement.ComputeGroupZones` yalnızca LIFO modülüne ve grup sayısına bakar |
| Yükleme başlangıç köşesi | ✅ `OptimizationInput.FillsFromMaxX` → `LoadingCorner.FillFromMaxX` |

**Geçiş kalıntısı:** tekil `LoadingType` kolonu hâlâ duruyor ama artık türetilmiş
bir değerdir — `Vehicle.SyncLoadingTypeFromDoors()` her kayıtta kapı listesinden
yeniden hesaplar. Tamamen kaldırılması ayrı bir migration'a bırakıldı.
