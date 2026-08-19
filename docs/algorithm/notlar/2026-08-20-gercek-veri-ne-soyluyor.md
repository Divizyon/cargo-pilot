# Gerçek yükleme verisi bize ne söylüyor — ROADEF/EURO 2022 (Renault)

**Geçici not.** [Araştırma belgesinin](../arastirma/2026-08-19-gercek-yukleme-verisi-kaynaklari.md)
ve [çıkarılmış CSV'lerin](../arastirma/2026-08-19-roadef2022-ozet/) üzerinde yapılan hesap.
Kalıcı olanlar `02-kararlar.md` ve `05-basari-karnesi.md`'ye taşınacak.

Veri: 30 instance · 72.368 kamyon satırı · 287.709 ürün satırı · **1,3 milyon parça** ·
1,78 milyon m³ · 407 bin ton.

---

## 1. Ölçtüğümüz dünya ile gerçek dünya aynı değil

| | BR korpusu *(bugün ölçtüğümüz)* | ROADEF *(gerçek)* | Fark |
|---|---|---|---|
| Araç hacmi | 30,1 m³ (587×233×220 cm) | **95,5 m³** (13500×2440×2900 mm) | **3,2 kat** |
| Ambalaj hacmi (medyan) | ~0,25 m³ | **1,17 m³** | **4,7 kat** |
| Araç başına ürün tipi | 3 (BR1) … 20 (BR7) … 100 (BR15) | **4,0** | BR0-BR1 aralığı |
| Araç başına parça | ~110 | ~70-80 (kapasiteye göre) | benzer |
| Ağırlık limiti | 1.000.000 kg — **hiç bağlamaz** | 24.000 kg — **neredeyse bağlar** | ölçülmemiş boyut |

Araç 13,6 m'lik Avrupa yarı römorku, konteyner değil. Ambalajların çoğu **palet**:
1200×1000, 1600×1200, 800×600 — VDA/EPAL modülleri.

## 2. En çarpıcı üç bulgu

### 2a. Kesit döşemesi gerçekte neredeyse bedava — `G-3` büyük ölçüde bir BR eseri

Araç genişliği 2440 mm. Gerçek ambalajların genişliğe oturuşu:

| Ambalaj | Genişliğe kaç | Artık |
|---|---|---|
| 1200 × 1000 (parçaların %40'ı) | 2 | 40 mm — **%1,6** |
| 1600 × 1200 | 2 | 40 mm — %1,6 |
| 1206 × 1010 | 2 | 28 mm — %1,1 |
| 780 × 570 | 3 | 100 mm — %4,1 |

BR kutuları rastgele ölçülü (108×30×76 gibi) ve tipik artık **%8-10**. Yani `G-3`'te üç deneme
harcadığım "kesitte ölü şeritler" sorunu, gerçek yükte **kendiliğinden çözülüyor** — çünkü gerçek
ambalajlar araç genişliğine göre standartlaştırılmış modüller.

> Bu, `G-3` çalışmasını boşa çıkarmıyor (aday sayısı 4→8 her rejimde kazandırdı) ama
> **önceliğini düşürüyor**: o sorunun büyüklüğü BR'ye özgü.

### 2b. Ağırlık gerçekte neredeyse hacimle birlikte bağlıyor — biz hiç ölçmüyoruz

Ortalama parça 1,364 m³ · 312 kg. Medyan araç 95,5 m³ · 24.000 kg:

```
hacimle dolar : 70 parca
agirlikla dolar: 77 parca      ->  oran 0,91
```

İkisi **neredeyse aynı noktada** bağlıyor. BR korpusunda ağırlık limiti bilerek 1.000.000 kg
konmuştu ("ölçülen şey hacim olsun diye") — bu doğru bir tercihti ama sonucu şu: **gerçek
yüklemenin yarısı kadar belirleyici olan bir kısıtı hiç sınamıyoruz.**

Üstelik veride bir de **yoğunluk sınırı** var (`max_yogunluk_kg_m3` = 1500) ve biz onu hiç
modellemiyoruz. Yükün kendi yoğunluğu 229 kg/m³, yani bu senaryolarda bağlamıyor — ama ağır yükte
bağlar.

### 2c. Gerçek yük **az tipli** — merdivenin yanlış ucunu optimize ediyor olabiliriz

Kamyon başına **4,0 ürün tipi**. Bizim manşet sayımız BR1-BR7 ortalaması, yani 3-20 tip aralığının
ortalaması; BR15 (100 tip) hiç gerçekleşmiyor.

Bu, `DR-63`'ün bulgusuyla doğrudan çelişiyor gibi duruyor:

> *"Az tipli yükte dallanma uzayı küçük, arama tüketiyor, sınır **yapısal**. Çok tipli yükte uzay
> büyük, 2 sn yetmiyor, sınır **verim**."*

Yani arama katmanının (beam) asıl kazandığı yer **çok tipli** yük. Gerçek yük az tipli.
**Beam'in üretimdeki gerçek katkısı, BR1-BR7 manşetinin gösterdiğinden küçük olabilir.**
Bu ölçülmeli — tahmin değil, ölçüm sorusu.

## 3. Doğrulanması gereken bir sayı

`instance_ozeti.csv`: 72.368 kamyon, 1,3 milyon parça → kamyon başına **18 parça**. Ama kapasite
hesabı 70-80 parça diyor. İki okuma mümkün:

- **A.** Gerçek kamyonlar ~%25 dolu gidiyor. *(Öyleyse `F8-0`/`F8-1`'de yaptığımız kısmi yük işi
  tam hedefte demektir.)*
- **B.** `input_trucks.csv` **aday** kamyon havuzudur (her tedarikçi→fabrika rotası ve zaman
  penceresi için satır), hepsi kullanılmıyor.

**B daha olası** — ROADEF'in amacı zaten "kullanılan kamyon sayısını en aza indir". Ham
`input_trucks.csv` okunmadan bu sayıya dayanılmamalı. Ayrım önemli, çünkü A doğruysa üretim
rejimimiz hakkında güçlü bir kanıt olur.

---

## 4. Ne yapabiliriz — öncelik sırasıyla

### Ö1. `RoadefCorpus` — gerçek yükte nerede olduğumuzu ölç *(ön koşul)*

`input_trucks.csv` + `input_items.csv` → `OptimizationInput`. Kamyon başına bir senaryo.
Kazanımı doğrudan: **bugün gerçek yükte doluluğumuzun kaç olduğunu bilmiyoruz.**

Eşleme hazır duruyor:

| ROADEF alanı | Bizdeki karşılık |
|---|---|
| `Length/Width/Height`, `Max weight` | Araç iç ölçüsü + kapasite |
| `Forced orientation` | `AllowedRotations` |
| `Max stackability` | `MaxStackCount` |
| `Max weight on the bottom item` | `MaxWeightOnTop` |
| `Stackability code` | `StackGroup` |
| dock/plant yükleme sırası | `UnloadingOrder` (LIFO) |
| `Nesting height` | — *karşılığı yok* |
| `Max density` | — *karşılığı yok* |

Son iki satır ayrıca not: modellemediğimiz iki gerçek kısıt var.

### Ö2. Ağırlığın bağladığı rejimi ölç

`--load-ratio` gibi bir **ağırlık oranı** bayrağı: kutu ağırlıklarını, toplam yükün araç
kapasitesinin %50/%80/%100'üne denk geleceği şekilde ölçekle. Bugün ağırlık kapısı 700 örnekte
**hiç ateşlenmiyor** — `DR-66`'daki LIFO yanılsamasının aynısı, başka bir kısıtta.

### Ö3. Gerçek araç kataloğu *(ucuz, ürün tarafı)*

Araştırmadaki Krone ve ISO ölçüleri araç tohumu olarak girsin: Profi Liner 13620×2480×2700,
Mega Liner ×3000, 20'/40'/40'HC/45' konteynerler. Bugünkü tohum verisi uydurma ölçüler taşıyor.
Yarım saatlik iş, doğrudan kullanıcıya değer.

### Ö4. Manşet sayının hangi dağılıma ait olduğunu yaz

`05-basari-karnesi.md`'ye tek cümle: *"%91,30 BR1-BR7 ortalamasıdır; gerçek yük dağılımı
(4 tip, paletli, ağırlık bağlayıcı) bu korpusla temsil edilmiyor."* Sayıyı düşürmüyoruz, neyi
ölçtüğünü söylüyoruz.

### Ö5. Yoğunluk kısıtı ve `Nesting height`

İkisi de gerçek veride var, bizde yok. Önce Ö1 ile ne kadar bağladıklarını görmeli, sonra
modellenmeli.

---

## 5. Bu notun kendi uyarısı

Buradaki sayılar **çıkarılmış özet CSV'lerden** hesaplandı, ham instance'lardan değil.
Ambalaj dağılımı 30 instance'ın tamamını kapsıyor ama kamyon-parça eşleşmesi (hangi parça hangi
kamyona) özet dosyalarda yok — §3'teki belirsizlik oradan geliyor. Ö1 yapılırsa bu belirsizlik
kendiliğinden kapanır.
