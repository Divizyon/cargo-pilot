# LIFO — bugün neredeyiz, sırada ne var

**Geçici not.** Kısıt tarafına LIFO'dan başlıyoruz. Bu dosya üç soruyu cevaplar: *ne var*,
*ne çalışıyor*, *ne yapılacak*. Kalıcı olanlar `02-kararlar.md`'ye taşınacak.

---

## 1. Ne var — üç ayrı mekanizma

LIFO tek bir şey değil. Motorda **üç ayrı yerde** iş görüyor ve üçü bağımsız:

| # | Mekanizma | Nerede | Ne yapar |
|---|---|---|---|
| **M1** | Sıralama | `ItemOrdering.ApplyCriteriaSort` | Grupları `UnloadingOrder` DESC yükler: en son inecek grup **önce** yüklenir |
| **M2** | Dikey istif kuralı | `PlacementValidator.ViolatesStackability` | Geç inecek kutu, erken inecek kutunun **üstüne** konamaz |
| **M3** | Bölge (sanal duvar) | `LifoPlacement.ComputeGroupZones` | Araç uzunluğu gruplara bölünür; her grup kendi `z` bandında kalır |

`M3` bir **tercihtir, sert kısıt değil**: bölge içi aday varsa kazanır, yoksa kutu bölgesi dar
diye düşmez, bölge dışına konur (`WallBuilderPlacement`, `bestInZone` kademesi). Bu bilinçli —
`DR-40`'ta kurulmuş.

Bağlayıcı kurallar: `R-C13` (sanal duvar), `R-C13a` (tam ayak izi kapsama ölçüsü),
`R-C19` (grup içi random-key kilidi). Kararlar: `DR-40` (üç delik onarıldı), `DR-57` (LIFO varken
`DepthSlack` uygulanmaz — boşaltma sırası iş kuralı, yoğunlaştırma tercih).

---

## 2. Bugün ölçülen — ve **`DR-66` düzeltiliyor**

### ⚠ LIFO bölgeleri hiçbir kıyas koşusunda hiç kurulmamış

`ComputeGroupZones` **hem** `GroupId` **hem** `UnloadingOrder` ister; biri eksikse sözlük boş döner.
`ConstraintCorpus` yalnızca `UnloadingOrder` dolduruyordu, `BrCorpus`/`GercekCorpus` ise
`GroupId: null` yazıyor.

Sonuç: `DR-66`'nın ölçtüğü **"LIFO −1,62"** bölge kısıtının maliyeti değildi — yalnızca `M1` ve
`M2`'nin maliyetiydi. **`M3` hiç ateşlenmemişti.** "Bölge ihlali 0" güvencesi de bir güvence
değil, bölgelerin hiç var olmamasıydı.

Bu, aynı ailenin **dördüncü** ölçüm geçersizliği (`DR-66` LIFO kriteri, `G-5` köşe-yalnız teşhis,
`F8-2` derinlik bütçesi, ve şimdi bu). `DR-66`'da bu tuzağın yarısını (kriter) düzeltip diğer
yarısını (`GroupId`) kaçırmışım.

### Düzeltildikten sonraki gerçek sayılar

| Korpus | Kısıtsız | **LIFO** | Maliyet | Bölge ihlali |
|---|---|---|---|---|
| Gerçek (100 örnek) | %86,60 | **%83,63** | **−2,97** | **6.129** |
| BR1-BR7 (175 örnek) | %84,48 | **%80,99** | **−3,49** | — |

Yayılma da bozuluyor: gerçek ×1,151 → ×1,195.

**Bölge ihlali sıfır değil ve bu tasarım gereği** — bölge dolduğunda kutu dışarı konuyor. Ama
6.129 sayısı, kısıtın pratikte ne kadar sık deldiğini ilk kez gösteriyor.

---

## 3. Denenen ve **reddedilen**: hacme orantılı bölme

`R-C13` bölgelerin "eşit bölme değil, yüklenen hacme göre dinamik" olmasını söylüyor. Kod eşit
bölüyor ve bu `02-kararlar.md`'de açık borç olarak duruyordu.

Denendi — bölgeler grup hacimlerine orantılı bölündü:

| | Eşit bölme *(bugün)* | Hacme orantılı |
|---|---|---|
| Gerçek korpus | **%83,63** | %82,82 |
| BR1-BR7 | **%80,99** | %80,89 |
| Bölge ihlali | **6.129** | **12.487** |

**Daha kötü, hem de belirgin biçimde.** Sebep tahmin edilebilir: bölge tam olarak grubun hacmi
kadarsa, paketleme verimi hiçbir zaman %100 olmadığı için (~%85) grup **kendi bölgesine sığamaz**
ve zorunlu olarak taşar. Eşit bölme, küçük gruplara cömert bölge vererek kazara pay bırakıyor.

**Ama bu, `R-C13`'ün yanlış olduğu anlamına gelmiyor** — yanlış olan benim testim. `R-C13`
*önceden hesaplanmış orantılı bölge* demiyor, **dinamik** diyor: *"grup bitince
`zWall = maxZ(o gruba ait kutular)`"*. Yani sınır yüklemeden **sonra** çekilir, gerçekte ne kadar
yer kapladığına göre. Ben önceden hesaplanan sürümü ölçtüm; asıl öneri denenmedi.

---

## 4. Yol haritası

| # | İş | Neden | Risk |
|---|---|---|---|
| **L-1** | **Ölçümü gerçek kıl** — `GroupId` düzeltmesi, `DR-66`'nın LIFO satırının düzeltilmesi | Yapıldı. Bundan sonraki her LIFO ölçümü anlamlı | — |
| **L-2** | **Dinamik sanal duvar** (`R-C13`'ün asıl hâli) — bölgeler önceden hesaplanmasın, grup bitince `zWall = maxZ` çekilsin | Eşit bölmenin de orantılının da sorunu **önceden** hesaplanmaları. Dinamik sınır payı gerçek doluluktan alır | Orta — yerleştiricinin grup sırasını takip etmesi gerekiyor |
| **L-3** | **Bölge ihlali kapıya girsin** | Bugün 6.129 ihlal var ve hiçbir kapı bunu görmüyor. `L-2` bunu düşürmezse anlamayız | Düşük |
| **L-4** | **`DepthSlack` + LIFO barışsın** (`DR-57`) | Bugün LIFO varken yoğunlaştırma tamamen kapalı; `F8-1`'in leksikografik amacı geldikten sonra bu yasak yeniden ölçülmeli | Düşük — ölçüm işi |
| **L-5** | Bölge **yumuşak mı sert mi** — ürün kararı | Bugün tercih; sahada "asla karışmasın" mı, "mümkünse ayrı" mı? Sayı hazır: sert yapmak −%? doluluk | Ürün kararı, ölçümle |
| **L-6** | Çok katmanlı LIFO (`SC-17`) ve grupsuz karışık girdi (`SC-21`) korpusa girsin | Bugün korpus tek katman ve hepsi gruplu | Düşük |

**Önerim: `L-2` → `L-3` → `L-4`.** `L-1` bitti; `L-5` ölçüm gelmeden sorulamaz, `L-6` diğerlerinin
yanında ucuz.

---

## 5. Bir sonraki adımın ölçütü

`L-2` başarılı sayılır eğer: bölge ihlali **6.129'un belirgin altına** iner **ve** doluluk
%83,63'ün altına düşmez. İkisi birden olmazsa dinamik duvar da reddedilir ve bölge modelinin
kendisi sorgulanır.
