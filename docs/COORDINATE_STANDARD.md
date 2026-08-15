# Koordinat Sistemi Standardı (Container / Truck)

> Bu belge Cargo Pilot'un **tek yetkili** koordinat sistemi tanımıdır. Kod, doküman,
> API sözleşmesi, 3D sahne ve raporlar bu tanımı esas alır. Çelişki hâlinde bu belge
> kazanır.
>
> Görsel/etkileşimli sürüm: [`coordinate-standard.html`](./coordinate-standard.html)
> Mevcut kodun bu standarda göre denetimi: [`COORDINATE_AUDIT.md`](./COORDINATE_AUDIT.md)
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

Konteynerin iki kısa yüzünde de small door bulunması kuralı değiştirmez: hangisinden
bakılırsa bakılsın tanım aynı şekilde işler ve tutarlı bir sistem üretir. Referans kapı,
bakılan / yükleme yapılan kapıdır ve her zaman `z = length` yüzünde kabul edilir.

**Origin geometrik bir köşedir; kapının varlığına bağlı değildir.** Referans kapı yalnızca
"hangi yüzden bakıyoruz" sorusunu adlandırır, origin'in sayısal yerini belirlemez. Bir
konteynerde small door hiç bulunmasa da (yalnızca big door'u olan araç) eksen tanımı
değişmez: `z = 0` uzak yüz, `x = 0` sol yüz, `y = 0` zemindir.

Bunun emsali `x₀` kuralıdır (bölüm 7): big door origin'in bulunduğu `x = 0` yüzündeyse
**origin taşınmaz**, yalnızca yükleme başlangıcı kaydırılır. Kapı origin köşesine değdiğinde
değişen şey kullanılabilir aralıktır, koordinat sisteminin kendisi değil.

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
| **small door** | `width × height`  | `z = length` ve/veya `z = 0`  | Yalnızca `z = length` (**back door**). `z = 0` kabin ucudur, kapı olmaz. | İki uçta da olabilir; referans `z = length`'tedir. |
| **big door**   | `length × height` | `x = 0` ve/veya `x = width`   | Olabilir — tek tarafta ya da iki tarafta          | Olabilir — tek tarafta ya da iki tarafta |

Kurallar:

- **Kapılar liste olarak modellenir.** Bir araçta aynı anda birden fazla kapı
  bulunabildiği için kapı bilgisi tekil bir enum değeri değil, yüz bilgisiyle birlikte bir
  listedir:

  ```ts
  doors: [
    { type: 'small', face: 'z=length' },
    { type: 'big',   face: 'x=0' },
    { type: 'big',   face: 'x=width' },
  ]
  ```

- **"sağ kapı" / "sol kapı" diye bir kavram yoktur.** Kapılar `small` / `big` olarak
  sınıflanır, konumları eksen değeriyle yazılır. "sağ" ve "sol" yalnızca kamera
  bakışlarını adlandırmak için kullanılır (bkz. bölüm 6).
- **"ön kapı" / "front door" diye bir kavram yoktur.** TIR'da `z = 0` kabin ucudur;
  düz konteynerde `z = 0` yalnızca karşı küçük yüzdür.

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

    O ═══════╤═══════════════════════════════════════╗  ← z = 0 (uzak yüz)
    │        ┊                                       ║
    │  x₀ →  ┊                                       ║
    ║        ┊                                       ║
    ║ BIG    ┊                                       ║      │
    ║ DOOR   ┊             yük alanı                 ║      │  z
    ║ x = 0  ┊                                       ║      │  (length)
    ║        ┊                                       ║      ▼
    ║        ┊                                       ║
    ║        ┊                                       ║
    ╚════════╧═══════════════════════════════════════╝
    ▲        ▲        REFERANS KAPI · z = length
    │        │
    │        └── YÜKLEME BAŞLANGICI (x₀, 0, 0)
    └── ORIGIN (0,0,0) — uzak sol-alt köşe
```

`║` = big door'un bulunduğu uzun yüz · `╤┄┄` = big door açıklık payı `x₀`

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

Yükleme normalde **origin'den** başlar. **Big door origin'in bulunduğu `x = 0`
yüzündeyse** yükleme origin'den değil, `x` ekseninde `x₀` kadar kaymış noktadan başlar.

| Durum | Yükleme başlangıç noktası | Kullanılabilir `x` aralığı |
| ----- | ------------------------- | -------------------------- |
| Big door yok | `(0, 0, 0)` | `0 → width` |
| Big door `x = 0` yüzünde | `(x₀, 0, 0)` | `x₀ → width` |
| Big door `x = width` yüzünde | `(0, 0, 0)` | `0 → width − x₀` ⚠️ onay bekliyor |
| Big door iki yüzde de | `(x₀, 0, 0)` | `x₀ → width − x₀` ⚠️ onay bekliyor |

⚠️ **`x₀` değeri henüz tanımlı değildir** (bkz. bölüm 10). Son iki satır verilen kuraldan
türetilmiş önerilerdir, onay bekliyor.

---

## 8. Yerleştirme kuralları

| Konu | Kural |
| ---- | ----- |
| Birim | Santimetre (`cm`). Dönüşüm yalnızca API sınırında yapılır. |
| Kutu pozisyonu | `positionX/Y/Z`, kutunun **origin'e en yakın köşesidir**: `(min x, min y, min z)`. Mesh merkezi değildir. |
| Kutu sınırları | `x … x + width` · `y … y + height` · `z … z + length`. Hepsi araç iç ölçüsü içinde kalmalı; big door payı varsa `x` alt sınırı `x₀`'dır. |
| Yükleme yönü | Yükleme referans kapıdan yapılır: `z = 0` (uzak yüz) tarafındaki kutular önce yerleşir, kapıya en yakın olanlar (`z → length`) en son. |
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
| 13 | **Big door payının atlanması** | Yükleme her zaman `x = 0`'dan başlar | Big door `x = 0` yüzündeyse başlangıç `(x₀, 0, 0)`'dır. |
| 14 | **Birim karışması** | Metre ve santimetre aynı sahnede | Standart birim cm'dir; dönüşüm yalnızca API sınırında. |

---

## 10. Beklemedeki konular

| # | Konu | Durum |
|---|------|-------|
| 1 | **Small door'u olmayan konteyner** — yalnızca big door'u olan konteynerde origin kuralı tanımsız | Sektör araştırması bekliyor |
| 2 | **Üst kapı (top door)** — mevcut sistemde `top` kapı yönü var; yeni adlandırmada karşılığı belirsiz | Sektör araştırması bekliyor |
| 3 | **`x₀` — big door açıklık payı** — kaç cm, nereden geliyor (sabit / araç kaydı / kanat ölçüsü); `x = width` tarafına da uygulanacak mı | Değer ve onay bekliyor |

Bu üç konu netleşene kadar ilgili kod değişiklikleri başlatılmaz.
