# 00 · Sözlük

**Kalıcı dosya.** Raporlarda ve kod yorumlarında geçen her terim burada tanımlıdır. Yeni bir terim
kullanmadan önce buraya bir satır eklenir; tanımsız terim raporu okunamaz yapar.

Terimler dört bağımsız eksende durur. Bir ölçüm satırı dördünü birden söyler:

> **Duvar örücü + GRASP · BR1-BR7 · strict · %86,23**
> *(yerleştirici · sıralayıcı · korpus · yönelim yorumu · sonuç)*

**Karşılaştırma ancak dört eksenden üçü sabitken anlamlıdır.** Korpusu değiştirmek bir kararı tam
tersine çevirebilir: kule inşası giyotin korpusunda +0,07, BR1-BR7'de +2,03 puan (bkz. `DR-19`).

---

## 1. Korpus — hangi veriyle ölçtük

| Terim | Tanım |
|---|---|
| **Korpus** | Test senaryoları kümesi. İkisini kullanıyoruz: BR1-BR7 (birincil) ve giyotin (regresyon). |
| **Örnek** (instance) | Tek bir senaryo: bir araç + bir kutu listesi. |
| **BR1-BR7** | Bischoff & Ratcliff'in 1995 kıyas kümeleri (OR-Library, `thpack1..7.txt`). 7 küme × 100 örnek = **700 örnek**. Konteyner hepsinde 587×233×220 cm. Fark **kutu tipi sayısındadır**: BR1'de 3 tip, BR7'de 20 tip. Literatürde standart olduğu için sayımız başkalarınınkiyle kıyaslanabilir. |
| **Heterojenlik** | Kutu çeşidi / tekrar oranı. **Zayıf heterojen** (BR1) = az çeşit, çok tekrar — 200 özdeş koli. **Güçlü heterojen** (BR7) = çok çeşit, az tekrar — her parça farklı. Literatürde BR1 en kolay kümedir; **bizde en kötüsü**, ve kalan en büyük algoritmik açık budur. |
| **Giyotin korpusu** | Kendi ürettiğimiz korpus: konteyneri ardışık düz kesimlerle böleriz, çıkan parçalar kutu olur. **%100 doluluk yapıca mümkündür** — parçalar zaten oradan çıktı — dolayısıyla sonuç doğrudan bir kalite notudur. Ama ölçtük ki **ortalama adet 1,0**: kesim noktaları rastgele olduğu için her kutu benzersiz çıkıyor, kule/blok/tekrarlı desen teknikleri hiç ateşlenemiyor. `DR-19` ile birincil korpus olmaktan çıktı, **regresyon korpusu** olarak kaldı. |
| **strict / free** | BR "hangi ölçü dikey durabilir" kısıtı taşır. `AllowedRotations` enum'umuz bunu iki durumda birebir karşılıyor, `011` durumunda karşılamıyor (tiplerin %37'si). **strict** = dar yorum → gerçek değerin **alt sınırı**. **free** = geniş yorum → **üst sınırı**. Gerçek değer arada. Hangi ucun söylendiği yazılmazsa sayı literatürle kıyaslanamaz. |
| **Golden korpus / snapshot** | Girdi + çıktı çiftlerinin dondurulmuş kaydı (17 dosya). Motor değişince çıktının kaymadığını ispatlar. Aynı zamanda **girdi kataloğu** olarak da okunur (`InvariantScenarioSource`). |

## 2. Yerleştirici — kutuyu nereye koyuyoruz

| Terim | Tanım |
|---|---|
| **Yerleştirici** (placer) | "Bu kutu **nereye**" sorusunu cevaplayan katman. Bugün tek yerleştirici var: duvar örücü (`DR-39`). |
| **Duvar örücü** (wall building) | George & Robinson 1980. Aracı `z` ekseni boyunca **duvar duvar** doldurur; duvarın derinliğini o duvara giren ilk kutu belirler. Sahadaki işçi de kapıdan içeri duvar örer — çıktının yüklenebilir olmasının sebebi budur. |
| **Duvar** | `z` ekseninde tam kesit bir dilim. **Şerit** = duvar içindeki yatay bant. |
| **Katman inşası** (layer building) | Önce konteyner tabanını tamamen doldurup yukarı çıkma. **Kalıcı olarak yasak** (`DR-12`): ilk algoritmamız buydu ve müşteri reddetti — sahada fiziksel olarak yüklenemiyor. |
| **Kule inşası** (tower/column building) | Gehring & Bortfeldt 1997. Aynı üründen kutuları önce dikey sütun yapıp sütunu duvara koyma. Tabanı katılaştırır. |
| **Blok inşası** (block building) | Eley 2002. Aynı üründen `nx × ny × nz` prizma örüp tek parça gibi yerleştirme. |
| **Bileşik blok** (composite block) | Zhu, Oon, Lim & Weng 2012. Sütunun tepesinde kalan yüksekliği **başka bir ürünle** tamamlama. |
| **Greedy** | Her kutu için o an en iyi görünen yeri seçip geri dönmeyen eski yerleştirici. `DR-39` ile **tamamen kaldırıldı**; ölçümleri [ADR-0010](../adr/ADR-0010-duvar-orucu-ve-arama-katmani.md)'de saklıdır. |
| **Aday nokta / extreme point** | Bir kutunun konabileceği köşe adayları. |
| **Maximal space / boşluk defteri** | Kalan boş hacmi, başka boşlukla genişletilemeyen prizmalar listesi olarak tutan yapı (`SpaceLedger`). **Amalgamation** = bu prizmaları birleştirme; ölçüldü, bizim temsilimizde anlamsız çıktı (maksimal olmayan boşluk oranı %0,0). **Containment pruning** = bir boşluğu tamamen içeren başka boşluk varsa küçüğünü atma. |
| **Sanal duvar** | LIFO grubu geçişinde konan `z` sınırı. |
| **Sert kapı** (hard gate) | Bir yerleşimi koşulsuz eleyen fizik/iş kuralı. Bugün sekiz tane (`PlacementValidator`); sekizincisi `ViolatesLoadAbove`, `OPT-15` ile eklendi. |

## 3. Sıralayıcı — kutuları hangi sırayla veriyoruz

Yerleştirici "nereye", sıralayıcı "**hangi sırayla**" sorusunu cevaplar. Aynı yerleştirici, farklı
sırayla bambaşka doluluk verir — kalan açığın büyük kısmı bu katmandadır.

| Terim | Tanım |
|---|---|
| **Static** | Arama yok; tek sabit sezgisel sıra. **Saf hesap**: aynı girdi her makinede bit birebir aynı sonucu verir. Bu yüzden 17 snapshot, tüm testler ve gecelik CI kapısı hep static koşar. 2-5 ms. |
| **GRASP** | *Greedy Randomized Adaptive Search Procedure.* Sırayı **arar**: her turda sırayı biraz bozar, ikili takaslarla iyileştirir, en iyisini saklar. Bütçesi **duvar saatidir** (`SearchBudget.MaxDurationMs`), dolayısıyla sonucu makineye bağlıdır — kapıya konamaz. Üretim varsayılanı (`DR-24`). ~2 sn. |
| **GA** | Genetik algoritma. Karşılaştırma referansı olarak duruyor. |
| **GWCA** | *Great Wall Construction Algorithm* (Guan vd. 2023). Ölçüldü, kaybetti; `DR-13` ile emekliye ayrıldı. |
| **Random-key kodlama** | Sürekli sayı vektörünü sıralayarak permütasyon üretme. Arama katmanının kutu sırasını temsil etme biçimi. |
| **Decoder geni** | Kromozomda sırayı değil **yerleştiricinin davranışını** taşıyan gen (duvar derinliği, geri çekilme sırası, düzlük ağırlığı). Ölçümde tekrarlanan bulgu: *sabit değer hiçbir zaman kazanmıyor*, korpusa bağlı — bu yüzden bu üç parametre karara değil kromozoma taşındı (`DR-18`, `DR-23`, `DR-29`). |
| **OBL** | *Opposition-Based Learning* — karşıt çözümü eşzamanlı değerlendirme. Ölçülemez çıktı. |
| **Fitness / cost** | Aramanın minimize ettiği maliyet skoru; düşük olan kazanır. |

## 4. Ölçüm — neye bakıyoruz

| Terim | Tanım |
|---|---|
| **Doluluk** (fill rate) | Yerleşen kutuların toplam hacmi ÷ konteyner hacmi. Ana ölçümüz. |
| **Yığın yüksekliği** | Yüklü hacmin konteyner yüksekliğine oranı. |
| **Ölü hava** | Yığının **üstünde** kalan boşluk. Kaybımızın tamamına yakını burada (%8,6-13). |
| **İç boşluk** | Kutuların **arasında** kalan boşluk. Bizde %0,1-0,9 — yığın masif. |
| **Engebe** | Yığının üst yüzeyinin dalgalılığı (yükseklik standart sapması, cm). Düz yüzey = üstüne daha çok kutu. |
| **Destek eşiği** | Bir kutunun altındaki dolu alan yüzdesi; kuralımız **en az %80** (`R-A02`). `DR-16` ile %2'lik adımlarla tarandı: ölçülen en düşük destek zaten %81,5-97,7, yani **eşik pratikte hiç bağlamıyor**; düşürmek kazandırmadı, kural korundu. |
| **Denge sapması** | Ağırlık merkezinin araç ortasından kaçması (%). |
| **Gürültü bandı** | Aynı yapılandırmanın tekrarlı koşularındaki oynama; ölçüldü: **±0,01 puan**. Dolayısıyla 0,1 puandan büyük fark gerçektir. |
| **Regresyon kapısı** | Ölçümü referansla kıyaslayıp düşüşte duran CI işi (`engine-bench.yml`). |
| **Determinizm** (`R-C02`) | Aynı tohum + aynı girdi → **bayt birebir** aynı plan. Sözleşme maddesidir; arama katmanı bunu bozamaz. |

## 5. Koordinat ve yükleme

Bağlayıcı tanımlar [`docs/COORDINATE_STANDARD.md`](../COORDINATE_STANDARD.md)'dedir; burada yalnız
raporları okumaya yetecek özet vardır.

| Terim | Tanım |
|---|---|
| **x / y / z** | `x` = width, `y` = height (yukarı), `z` = length. Uzak yüz `z = 0`, referans kapı `z = length`. |
| **Kutu pozisyonu** | Kutunun origin'e en yakın **köşesi** (min x, min y, min z) — mesh merkezi değil. |
| **Yükleme yönü** | Yükleme referans kapıdan yapılır: `z = 0` tarafındakiler önce, kapıya en yakınlar en son. |
| **LIFO** | *Last In First Out.* Sonra yüklenen önce boşaltılır. Grup başına bir `z` **bölgesi** ayrılır; bir grubun kutusu başka grubun bölgesine taşamaz. |
| **Kırılganlık** | Kutunun üstüne yük alıp alamayacağı (`FragilityType`). |
| **Bulaşma** (contamination) | Yan yana durmaması gereken ürün çiftleri (`ContaminationFilter`). |
