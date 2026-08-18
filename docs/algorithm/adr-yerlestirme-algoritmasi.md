# ADR — Yerleştirme Algoritması: Duvar Örücü ve Arama Katmanı

- **Durum:** Kabul edildi · üretimde **bayrak arkasında kapalı**
- **Tarih:** 2026-08-18
- **Kapsam:** `PlacementStrategy.WallBuilder`, `SequencerKind.Grasp`, `PlacementValidator`, `SpaceLedger`, `CargoPilot.Engine.Bench`
- **Yerini aldığı:** yok · **Tamamladığı:** `ALGORITMA-YOL-HARITASI.md` F2-F5
- **Ayrıntılı kayıtlar:** [ALGORITMA-GELISTIRME-LOG.md](../../ALGORITMA-GELISTIRME-LOG.md) (ölçüm günlüğü) · [ALGORITMA-RULEBOOK.md](../../ALGORITMA-RULEBOOK.md) (`DR-01`…`DR-38` karar kaydı)

---

## Bağlam

Üretimdeki motor **greedy**: extreme-point tohumları üzerinde ağırlıklı skorla yerleştirme yapıyor.
Doluluğu literatürün gerisindeydi ama ne kadar gerisinde olduğu **bilinmiyordu** — kendi ürettiğimiz
senaryolar dışında ölçüm yoktu.

Bu çalışma iki soruyu birlikte cevaplamak için yapıldı:

1. Doluluk nereye kadar çıkarılabilir?
2. Çıkarken hangi kararlar **ölçümle**, hangileri **varsayımla** alınıyor?

İkincisi belirleyici oldu: çalışmanın büyük kısmı kod yazmak değil, **yazılan kodun işe yarayıp
yaramadığını ölçmek** ve yaramayanı geri almak oldu. Otuz civarı denemenin **üçte ikisi geri
alındı** ve geri alınanların gerekçesi de kayda geçti — bu ADR'nin asıl konusu odur.

### Değişmez kısıt: çıktı yüklenebilir olmak zorunda

Müşteri, projenin ilk algoritmasını (**katman inşası**) reddetti: kesit boyu katmanlar sahada
yüklenemiyor. Bu, bir doluluk tercihinin değil bir **fizibilite** kararının sonucu ve
tartışmaya kapalı (`DR-12`, `R-C07a`).

Dolayısıyla aday paradigma en baştan belliydi: **duvar örücü** (George & Robinson 1980) — işçinin
kapıdan içeri duvar duvar ördüğü sırayla aynı çıktıyı üretir.

---

## Karar

### 1. Duvar örücü greedy'nin YERİNE değil YANINA gelir

Yeni yerleştirici ayrı bir `PlacementStrategy` olarak eklendi; greedy varsayılan kaldı ve 17 golden
snapshot bayt bayt korundu.

**Gerekçe:** greedy üretimde çalışıyor ve müşteri planları ona dayanıyor. Yerine geçirmek, ölçüm
bitmeden geri dönülemez bir değişiklik yapmak olurdu.

**Sonuçları:**
- Her iki yol da aynı yedi sert kapıyı **tek kaynaktan** (`PlacementValidator`) çağırır; duvar örücü
  kendi destek/istif tanımını yazmaz (`R-C01`, `R-C12`).
- Deneysel yol `EnableExperimentalStrategies` bayrağı arkasında ve **varsayılan kapalı**. Bayrak
  kapalıyken istek sessizce greedy'ye düşmez, doğrulama hatası verir — istemci hangi motorun
  koştuğunu bilmek zorunda.

### 2. Birincil ölçüm BR1-BR7'ye taşındı

Kendi ürettiğimiz giyotin korpusu birincil ölçüm olmaktan çıkarıldı, regresyona indirildi
(`DR-19`).

**Gerekçe — bu, çalışmanın en belirleyici kararıydı.** Giyotin korpusu konteyneri bölerek üretiliyor,
yani %100 doluluk yapıca mümkün. Ama ölçüldü ki orada **ortalama adet 1,0** — her kutu benzersiz.
Kule inşası, blok inşası ve tekrarlı desen gibi tekniklerin tamamı aynı ölçüdeki kutu çokluğuna
dayanır; o korpusta hiçbiri ateşlenemiyordu.

Somut kanıt: kule inşası giyotinde **+0,07** (ölçülemez), BR'de **+2,03** puan. Duvar örücünün
greedy'ye üstünlüğü giyotinde +0,8, BR'de **+3,8** görünüyordu.

**Korpus yalnızca temsil etmiyor değildi; doğru kararı gizliyordu.**

**Sonuçları:**
- OR-Library `thpack1..7` depoya alındı (700 örnek, kaynak ve atıf
  [data/README.md](../../apps/backend/CargoPilot.Engine.Bench/data/README.md)).
- BR'nin yönelim kısıtını `AllowedRotations` tam karşılamıyor (tiplerin %37'si). Bu yüzden her sayı
  **iki uçla** raporlanır: `strict` alt sınır, `free` üst sınır (`DR-20`). Hangi ucun ölçüldüğü
  belirtilmeden sayı literatürle kıyaslanamaz.
- BR8-BR15 denendi, **OR-Library'de yok**; `thpack10/11` adresleri `thpack1`'in kopyasını
  döndürüyor.

### 3. Sabit katsayı ve sabit sıra yerine kromozom

Üç ayrı yerde aynı desen çıktı: **sabit hiçbir değer kazanmıyor, çünkü doğru değer kutu setine
bağlı.** Karar, yerleştiriciden alınıp arama kromozomuna taşındı (`R-C15a`).

| Karar | Sabit değer denemesi | Sonuç |
|---|---|---|
| Duvar derinliği (`DR-23`) | Derin BR1'i +1,36 yükseltiyor, BR6'yı −1,45 düşürüyor | Gene taşındı |
| Yedek kademe sırası (`DR-29`) | Cep-önce BR'de +0,23, giyotinde −3,38 | Gene taşındı |
| Düzlük ağırlığı (`DR-18`) | Ağırlıklı toplam sözlükbilimsel sıranın altında | Sabit bırakıldı, α'lar açılmadı |

**Gerekçe:** iki korpus da gerçek yük biçimi. Tamamen tekrarlı bir sevkiyat BR'ye, karışık tek parça
bir yük giyotine benzer. Birini seçmek ötekini feda etmek olurdu.

**Sonuçları:** vektör düzeni tek yerde sabitlendi ve gen eklendiğinde kaymayacak şekilde bol
tutuldu: `[0, N)` sıra · `[N, N+4)` decoder · `[N+4, 2N+4)` yönelim. Tohum bireyler **bugünkü
davranışı** temsil eder; sapmayı arama keşfeder (`R-C21`).

### 4. Destek eşiği %80'de kalır

Politika kararı ölçüldü ve **kapatıldı** (`DR-16`).

**Gerekçe:** eşik %80'den %60'a indirildiğinde gerçekçi yükte kazanç duvar örücüde yalnızca
**+0,75** puan. Karşılığında en zayıf kutunun desteği %87 → %72, azami taşma 11 → 24 cm.

Eski "eşik en büyük tıkaç" teşhisi **giyotin korpusundan** geliyordu ve orada kazanç gerçekten
+3,27 — ama o korpusta her kutu benzersiz olduğu için her yerleşim eşiğe dayanıyor. Gerçek yükte
ortalama destek **%99,2**; plan eşiğe nadiren dayanıyor.

**Sonuçları:** `OptimizationInput.SupportThreshold` alanı eklendi ama **yalnız ölçüm için**; üretim
varsayılanı %80'de durur ve hiçbir üretim çağrı yolu alanı doldurmaz. Fikir değişirse `--support`
ile herhangi bir değer dakikalar içinde ölçülür.

### 5. Arama katmanı: GRASP, bütçe 2 saniye

GWCA emekli edildi, GRASP varsayılan oldu (`DR-13`, `DR-24`).

**Gerekçe:** 300 senaryo, aynı bütçe — GWCA **her eksende** kaybetti (ortalama, medyan, süre, p95).
GRASP popülasyon tutmaz, her tur taban çizgiden yeniden başlar; bu tasarım ölçümle doğrulandı
(en iyiden başlatmak −0,62, `DR-31`).

Bütçe süre/kalite eğrisiyle seçildi:

| Bütçe | 0,5 sn | 1 sn | **2 sn** | 4 sn | 8 sn | 16 sn |
|---|---|---|---|---|---|---|
| BR1-BR7 | %85,47 | %86,21 | **%86,66** | %86,85 | %86,91 | %86,91 |

Eğri 8 saniyede doyuyor; iki saniye kazancın neredeyse tamamını topluyor (0,5→2 sn +1,19 puan,
2→16 sn yalnızca +0,25). Önceki varsayılan **20 saniyeydi** ve hiçbir ölçümü temsil etmiyordu.

**Sonuçları:** `Sequencer` alanı nullable yapıldı; belirtilmezse duvar örücü GRASP koşar, greedy
Static kalır. Bayrak kapısı korundu — belirtilmemiş sequencer bir kaçamak değil.

### 6. Plan, kendisini üreten koşunun kimliğini saklar

`LoadingPlans` tablosuna `PlacementStrategy`, `Sequencer`, `Seed` ve dört arama istatistiği alanı
eklendi (`DR-26`).

**Gerekçe:** determinizm sözleşmesi (`R-C02`: aynı tohum + aynı girdi → bit birebir aynı plan) bunlar
olmadan **kullanılamaz**. Duvar örücü açıldığında aynı girdi iki farklı motordan geçebiliyor ve
veritabanında ikisi ayırt edilemiyordu.

**Sonuçları:** migration yalnızca sütun ekliyor; varsayılanlar geçiş öncesi kayıtları doğru
tanımlıyor (o planlar gerçekten greedy, statik, tohum 0'dı).

### 7. Gecelik doluluk kapısı — yalnız statik yol

`engine-bench.yml`: motor dosyaları değiştiğinde ve her gece, BR1-BR7 depodaki referansla
karşılaştırılır; gerilemede durur (`DR-28`).

**Gerekçe:** ölçüm düzeneği elle koşulduğu sürece çürür.

**Kapı neden yalnız statik yolu ölçüyor:** aramanın bütçesi duvar saatidir; yavaş bir koşucu daha az
iterasyon yapar ve sonuç makineye bağlı çıkar — kapı gürültüden kalırdı. Statik yol saf hesap:
aynı girdi her makinede bit birebir aynı sonucu verir, dolayısıyla **her düşüş gerçek bir
gerilemedir**.

---

## Başarı karnesi

### Doluluk (BR1-BR7, 700 örnek; GRASP satırları 175 örnek)

| Yapılandırma | `strict` (alt sınır) | `free` (üst sınır) | Süre (medyan) |
|---|---|---|---|
| Greedy — bugünkü üretim varsayılanı | %75,23 | — | ~65 ms |
| Duvar örücü, kule yok | %77,00 | — | 5-13 ms |
| Duvar örücü (static) | **%80,09** | %82,77 | 2-5 ms |
| **Duvar örücü + GRASP** | **%86,23** | **%88,34** | 1,1-2,0 sn |
| Literatürün en iyileri | ~%92-93 | — | — |

**Greedy'ye göre kazanç: +11,0 puan.** Literatürle fark: ~6 puan.

### Kümeye göre (GRASP, strict)

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 |
|---|---|---|---|---|---|---|---|
| Tip sayısı | 3 | 5 | 8 | 10 | 12 | 15 | 20 |
| Doluluk | %84,74 | %86,19 | %87,09 | %87,06 | %87,02 | %86,35 | %85,17 |

**BR1 hâlâ en kötü kümemiz** — literatürde ise en kolayı. Tekrarın en yüksek olduğu yerde en az
kazanıyoruz; kalan en büyük algoritmik açık budur.

### Plan kalitesi (GRASP, ölçülen)

| Ölçü | Değer | Yorum |
|---|---|---|
| Yığın yüksekliği | %87-91 | Kayıp buranın üstünde |
| İç boşluk | %0,1-0,9 | Yığın **masif** |
| Ölü hava | %8,6-13 | Kaybın tamamı |
| Ortalama destek | %98,7-100 | Eşik **hiç bağlamıyor** |
| En düşük destek | %81,5-97,7 | %80 kuralını ihlal eden kutu **yok** |
| Kalan boşluk sayısı | 4-16 | Hacim gerçekten parçalanmış |

### Güvence

| | Durum |
|---|---|
| Motor testleri | **115/115** |
| Altyapı testleri | 39/39 |
| Uygulama testleri | 228/228 |
| Golden snapshot | 17/17 bayt birebir |
| Duvar örücü değişmez kapsaması | Katalogdaki her senaryo, hem statik hem GRASP |
| Determinizm | Aynı tohum → bit birebir aynı plan (statik ve GRASP) |
| Gecelik kapı | BR1-BR7, iki strateji, referansla kıyas |

### Kapatılan hatalar

| | Ne | Durum |
|---|---|---|
| `OPT-15` | Ana döngü yalnız aşağı bakıyordu; köprü altındaki cebe kırılgan kutu yerleşiyordu | **Kapandı** — sekizinci kapı üç yere eklendi, 17 snapshot değişmedi |

---

## Roadmap uyumluluğu

### Uyulan

| Faz | Sonuç |
|---|---|
| **F2c** BR geçişi | Tamam |
| **F3b** GRASP devralır | Tamam |
| **F4a** Kule inşası | Tamam, +2,03 |
| **F4a′** Blok inşası | Tamam, +0,83 static / +1,72 GRASP |
| **F5** Ürünleştirme | Kısmi — testler, bütçe, kalıcılık, CI kapısı bitti |

### Roadmap'in dışına çıkılan yerler

Beş yerde plandan **ölçüm nedeniyle** sapıldı. Hepsi kayıtlı:

**1. `F2a` destek-farkında defter — reddedildi (`DR-17`).**
Plan "boşluk üretilirken tabanın yalnız desteklenen kısmı alınır" diyordu. Üç varyant ölçüldü,
üçü de kaybetti (%75,99 → en iyi %74,00). Havada duran taban bir kusur değil **mekanizmaymış**:
%80 kuralının komşu yığın üzerine köprü kurmasına izin verdiği tek aday kaynağı. Kırpınca boşluk
sayısı 72 → 25'e indi, engebe 56,6 → 62,6 cm'ye **çıktı**.

**2. Kritik yol iki kez değişti.**
Plan `F2a → F2b` idi. Ölçüm önce `F2b → F2a′`ya, sonra `F4a`ya çevirdi. Sebep: "%72,7 sığıyor ama
desteksiz" rakamı defterin kusurunu değil **yüzey engebesini** ölçüyormuş.

**3. `F2b` düzlük terimi — çıkış eşiği tutmadı (`DR-18`).**
Altı varyantın hiçbirinde engebe 56,1 cm'nin altına inmedi (hedef <30). Düzlük skoru **miyop**:
yalnız defterin sunduğu adaylar arasından seçiyor. Terim yine de tutuldu, çünkü en kötü senaryoyu
+2,73 topladı.

**4. `F4b` dinamik duvar derinliği — `F3a`ya devredildi (`DR-23`).**
Plan "çoklu aday derinlik + sığ ağaç araması" diyordu. Sabit hiçbir değer kazanmadığı için ağaç
aramaya gerek kalmadan karar kromozoma taşındı.

**5. `DR-16` destek eşiği — "müşteri onayı bekliyor" iken ölçülüp kapatıldı.**
Plan bunu politika kararı olarak müşteriye bırakıyordu. Ölçüm, kararın **değersiz** olduğunu
gösterdi (+0,75 puan karşılığında ciddi güvenlik tavizi), dolayısıyla müşteriye bir soru
götürmeye gerek kalmadı.

### Roadmap dışı, plansız yapılanlar

| Ne | Neden yapıldı |
|---|---|
| `OPT-15` düzeltmesi | Kanıtlanmış motor hatası; erteleme gerekçesi ("snapshot kaydırır") ölçümle geçersiz çıktı |
| Gecelik doluluk kapısı | Ölçüm düzeneği kapısız çürür |
| Koşu kimliği kalıcılığı | Determinizm sözleşmesi onsuz kullanılamıyordu |
| GRASP sabitlerinin taranması | Planda yoktu; **oturumun en büyük tek kazancı** (+0,86) oradan geldi |
| Sıcak döngüden çakışma kontrolünün çıkarılması | Aday zaten boş boşluk içinde doğuyor; %17 hız, çıktı birebir aynı |

---

## Reddedilen seçenekler

Denenip **geri alınan** her şey ve gerekçesi. Bu liste, aynı fikirlerin ikinci kez denenmemesi için
vardır.

### Yerleştirici

| Deneme | Sonuç | Neden reddedildi |
|---|---|---|
| Katman inşası | — | **Müşteri reddetti**: sahada yüklenemez (`DR-12`) |
| Destek-farkında defter (3 varyant) | %75,99 → %74,00 | Havada taban köprü kurmanın tek kaynağıymış (`DR-17`) |
| Düzlük terimini sığdırmanın önüne almak | %75,30 | "Biraz daha hizalı ama kötü oturan"ı seçiyor |
| Düzlük için ağırlıklı toplam | %75,99 | Sözlükbilimsel sıranın altında |
| Blok ölçütü = blok **hacmi** | Giyotinde −0,89 | Benzersiz kutuda "en büyük kutuyu seç"e dönüşüyor (`DR-22`) |
| Blok ölçütü = boşluk doluluk oranı | İkisinde de kayıp | — |
| Bloğu x/z'de büyütmek | ±0 | Ana döngü zaten aynı sonucu üretiyor; kaldıraç **aday seçimi** |
| Bileşik blok, ayak izi şartsız | BR −1,15 | Geniş sütunun tepesine küçük kutu → ölü hava (`DR-35`) |
| Duvar taramasında "en iyi duvar" | Giyotinde −0,62 | Erken çıkış aslında bir yerçekimi tercihiymiş |
| Cebi yeni duvardan önce taramak | Giyotinde −3,38 | Kromozoma taşındı (`DR-29`) |
| `minSide` yeniden hesabı | ±0 | Sıfır kazanç için kod ve `O(N)` tarama |
| K-Means ön kümeleme | Her `k`'de kayıp | Rulebook'un "%15 doluluk" iddiası **geçersiz** (`DR-33`) |
| Amalgamation | — | Boşlukların **%0,0'ı** maksimal değil; birleştirilecek şey yok (`DR-34`) |
| Şerit (strip) bandı | −24,9 | Şeridin yüksekliğini ilk kutu belirleyince kutular ona mahkûm |
| LAFF sıralama | −2,84 | — |

### Arama

| Deneme | Sonuç | Neden reddedildi |
|---|---|---|
| GWCA | Her eksende kayıp | GA ve GRASP'a karşı; kodda referans kaldı (`DR-13`) |
| Yönelim anahtarları | −0,06 (iki kez) | Tarama zaten en sıkı oturan yönelimi seçiyor (`DR-36`) |
| Tohum çeşitlendirme (3 → 6) | −0,11 | Tohumlar bütçe içinde; ek tohum arama turlarından çalıyor (`DR-32`) |
| "Yeniden konumlandırma" hamlesi | −0,43 | Anahtarı yeniden çekmek takasın koruduğu yapıyı bozuyor |
| Her turu **en iyiden** başlatmak | −0,62 | Erken yakınsama; GRASP'ın klasik tasarımı doğruymuş (`DR-31`) |
| Uygunluktan adet terimini çıkarmak | −0,07 | Gürültü sınırında |
| OBL | — | Popülasyon gerektiriyor; GRASP tutmuyor, GA/GWCA emekli (`DR-37`) |

---

## Bilinen boşluklar ve riskler

### 1. Kısıt tarafının hiçbir kıyas kapsaması yok (`DR-38` ⚠)

**En büyük risk budur.** İki korpus da `UnloadingOrder: null` ve ağırlık, kırılganlık,
istiflenemezlik, grup kısıtı taşımıyor. `R-C14` kalite metriklerinin (`WallCount`,
`AvgWallFlushness`, `ZoneViolations`) hiçbiri kodda yok.

Sonuç: **`DR-09`, `DR-10` ve `DR-11` ölçülemiyor.** Kısıtlı yükte motorun ne yaptığını yalnız birim
testlerinden biliyoruz. Ölçüm programı baştan "yalnız hacim" diye kurulduğu için bu bir kusur değil
kapsamın sonucu — ama üretime çıkmadan kapatılmalı.

### 2. Arama doyuyor

Statik yola eklenen her iyileştirmeyi GRASP zaten buluyor: bileşik blok statik yolda +2,87 verdi,
GRASP'ta **±0**. Aynı şekilde %17 hız kazancı da GRASP'a yansımadı. Kalan ~6 puan yerleştiricide
değil **arama uzayının kendisinde**; kırmak için farklı bir paradigma gerekiyor.

### 3. `011` yönelim eşlemesi yaklaşık

BR tiplerinin %37'si `AllowedRotations` ile tam ifade edilemiyor. `strict` ve `free` uçlar arasında
**1,5 puan** belirsizlik var (%86,82 / %88,34). Kapatmak enum'a iki değer eklemeyi ve frontend'e
dokunmayı gerektirir.

### 4. Frontend'de strateji seçimi yok

11 puanlık kazanç bugün **kimsenin ulaşamadığı yerde**. Bayrak açılsa bile istemci duvar örücüyü
seçemez.

### 5. Bayrak kararı beklemede

Açmak ~1,8 saniyelik gecikme karşılığında +11 puan doluluk demek. Karar müşteriye ait; teknik taraf
hazır (testler, kapı, kalıcılık, geri dönüş = bayrağı kapatmak).

---

## Sonraki adımlar

| Öncelik | İş | Gerekçe |
|---|---|---|
| 1 | **Kısıt korpusu + `R-C14` metrikleri** | `DR-38`; üretime giden yoldaki asıl risk |
| 2 | **Frontend'de strateji seçimi** | Kazanç kullanılamıyor |
| 3 | Bayrağın test ortamında açılması | Gerçek yükte doğrulama |
| 4 | `011` eşlemesinin kapatılması | Ölçüm belirsizliğini bitirir |
| 5 | Arama paradigması | Doygunluğu kırmak; günler sürer, kazanç belirsiz |
