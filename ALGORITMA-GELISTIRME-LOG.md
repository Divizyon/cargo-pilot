# Algoritma Geliştirme Günlüğü

Her değişiklik ve ölçüsü. Ölçüm düzeneği: `dotnet run --project CargoPilot.Engine.Bench -- soak`.

**Soak korpusu:** konteyner giyotin kesimlerle parçalara bölünür, parçalar kutu olur — yani
üretilen yük konteynere **tam sığar** ve ulaşılabilir doluluk **%100**'dür. Ölçülen doluluk bu
yüzden doğrudan kalite oranıdır. Ağırlık ve kısıtlar devre dışı: ölçülen tek şey hacim yerleşimi.
Her senaryoda araç ölçüleri ve kutu dağılımı yeniden rastgele üretilir.

```bash
dotnet run --project CargoPilot.Engine.Bench -- soak --strategy wallbuilder --count 25 --duration-min 2
```

---

## Ölçüm tablosu

| # | Değişiklik | Senaryo | Ortalama | Medyan | p5 | En kötü | En iyi | Medyan ms | Not |
|---|---|---|---|---|---|---|---|---|---|
| — | **Greedy (referans)** | 1.045 | **%76,43** | %76,00 | %70,48 | %63,70 | %90,06 | 77,9 | Mevcut üretim motoru |
| v5 | Wall-Builder · ilk uygun aday (first-fit) | 1.987 | %75,18 | %74,85 | %66,96 | %58,46 | %91,96 | 41,2 | Duvar taraması + erken çıkış + başarısızlık belleklemesi |
| v6 | Yönelim en-iyi-oturan seçimi | 1.733 | %75,10 | %74,95 | %66,35 | %55,53 | %92,27 | 48,9 | **Etkisiz** — doluluk değişmedi, süre %19 arttı |
| v7 | Best-fit boşluk seçimi | 1.597 | %75,16 | %74,95 | %66,52 | %56,50 | %92,27 | 53,2 | **Etkisiz** — doluluk değişmedi, süre %29 arttı |
| v8 | Duvar-farkında sıralama (derinlik kovası, G&R) | — | %74,12 | %73,98 | %65,37 | %58,20 | %90,93 | 55,1 | **Kötüleşti** −1,04 puan · geri alındı |
| v9 | LAFF sıralaması (en geniş taban önce) | — | %72,32 | %72,24 | %62,96 | %45,16 | %90,68 | 49,2 | **Kötüleşti** −2,84 puan · geri alındı |
| v10 | Hacim-azalan sıraya geri dönüş | — | **%75,20** | %75,05 | %66,46 | %56,50 | %92,27 | 54,4 | v7 ile aynı — geri dönüş doğrulandı |
| **v11** | **F3 · GWCA arama** (bütçe 2 sn, pop 20, iter 40) | 65 | **%77,15** | %76,03 | %67,23 | **%65,07** | %90,30 | 2.176 | **İlk kazanç** +1,95 puan · örneklem küçük |
| v11a | GWCA bütçe kalibrasyonu · 500 ms | 60 | %76,88 | %75,70 | %67,28 | %65,07 | — | 777 | Kazancın %66'sı, maliyetin 1/10'u |
| v11b | GWCA bütçe kalibrasyonu · 5.000 ms | 60 | %77,61 | %76,28 | %67,28 | %64,97 | — | 5.200 | 10 kat bütçe = +0,73 puan |
| **v12** | **GA referansı** (DR-03) | 60 | **%77,54** | %76,28 | %67,23 | %65,07 | — | ~2.200 | GWCA'yı ortalamada geçti |
| **v12** | **GRASP referansı** (DR-03) | 60 | %77,17 | **%76,60** | **%67,96** | **%67,14** | — | ~1.400 | Alt kuyrukta en iyi, en hızlı |
| **v13** | **DR-03 kararı · 300 senaryo** | 300 | GWCA %76,65 · GA %76,85 · **GRASP %76,77** | — | — | — | — | GRASP 1.022 | **GWCA emekli, GRASP devraldı** |
| v14 | Yönelim anahtarları (`double[2N]`) | 300 | %76,65 | %76,04 | %70,09 | %66,08 | — | 1.021 | **Kazandırmadı** −0,18 · geri alındı |
| **v15** | Geri dönüş doğrulaması (GRASP, N vektör) | 300 | **%76,83** | **%76,60** | %69,78 | %65,87 | — | 1.020 | Geri dönüş doğrulandı |
| **v16** | Kayıp hacim teşhisi (voksel) | 100 | — | — | — | — | — | — | **Ölü hava %15,8 · iç boşluk %1,1 · engebe 58,5 cm** |
| v17 | Şerit (strip) mantığı | 100 | %50,49 | %48,34 | %32,24 | %22,15 | — | 60 | **Çöktü** −24,9 puan · geri alındı |
| v18 | Hizalanma tercihi (flush) | 100 | %74,83 | %74,13 | — | %61,50 | — | 37 | **Kazandırmadı** −0,55 · geri alındı |
| **v19** | Ret sebebi ölçümü | 20 | — | — | — | — | — | — | **Araç dışı %99,4 · desteksiz %0,5** · en yüksek sütun %100 |
| **v20** | Boşluk ölçümü + bant dışı son çare | 300 | **%75,96** | **%75,74** | %68,04 | %62,60 | — | 58 | **+0,75 puan** · sığan yerleşemeyen %75,5 |
| **v21** | Destek ölçümü | 300 | — | — | — | — | — | — | **Sığan %73,1 · sığan+destekli %2,5** → darboğaz destek kuralı |
| v22 | Taban alanı artığı ölçütü | 300 | %75,99 | %76,06 | %68,01 | %60,16 | — | 54 | **Nötr** · medyan +0,32, en kötü −2,44 |

---

## Çıkarımlar

**Yerleştirme politikası tavana vurdu.** Üç farklı politika (first-fit, best-fit, yönelim
optimizasyonu) aynı %75'i veriyor. Ulaşılabilir %100 olduğuna göre 25 puanlık boşluk yerleştirme
kararında değil, **kutuların hangi sırayla denendiğinde**.

**Elle yazılan sıralama da tavana vurdu.** Literatürdeki iki klasik sıra denendi ve ikisi de
hacim-azalanın altında kaldı: G&R derinlik gruplaması −1,04 puan, LAFF −2,84 puan. Yani "doğru
sırayı elle bul" yolu da kapalı — sıra probleme özgü, sabit bir kurala indirgenemiyor.

Bunun nedeni yapısal: korpus konteynerin bölünmüş hâli, yani %100 doluluk *doğru sırayla*
yerleştirildiğinde mümkün. Bugünkü sıra hacim-azalan (`ItemOrdering`); bu sıra orijinal kesim
düzenini yeniden kuramıyor. Alt katmandaki kutular üsttekilerden sonra denendiğinde %80 destek
kuralı adayları eliyor ve hacim boşa gidiyor.

**Sonuç:** hacim kazancının kaynağı sıralama katmanıdır — yani F3 (GWCA / arama). Yerleştiriciyi
daha fazla cilalamak ölçülebilir kazanç vermiyor.

---

## Sıradaki denemeler

1. ~~Duvar-farkında sıralama~~ — denendi (v8), kötüleşti.
2. ~~LAFF sıralaması~~ — denendi (v9), kötüleşti.
3. **F3 · GWCA** — sıralamayı **arama** ile optimize et. Beş deneyden sonra kalan tek yol bu:
   yerleştirme politikası da elle yazılan sıra da tavanı kırmıyor. Wall-Builder'ın 54 ms'lik
   değerlendirme süresi aramayı mümkün kılıyor (greedy 78 ms + kalite avantajı yok).

### v11 · GWCA ilk sonuç

Arama, statik sıralamayı **+1,95 puan**, greedy'yi **+0,72 puan** geçti. Asıl kazanç alt kuyrukta:
en kötü senaryo %56,50 → **%65,07** (+8,6 puan). Yani arama en çok, statik sıranın kötü çalıştığı
senaryolarda işe yarıyor — beklenen davranış.

Bedeli ağır: senaryo başına 54 ms → **2.176 ms** (40 kat). 3 dakikada yalnızca 65 senaryo koşulabildi,
yani bu satır **ön sonuçtur**; kalibrasyon ve daha büyük örneklem gerekiyor.

Kurulan yapı: random-key kodlama (`RandomKeySequence`), deterministik alt-üreteç (`SearchRandom`),
Gama yoğunluklu işçi adımı (`GammaDensity`, Lanczos log-gama), üç hareket modeli
(başmühendis / asker / usta işçi), eleme turu ve baseline garantisi (DR-09: uygunluk seçimi +
doluluk kilidi).

### v12 · Sequencer kıyası (DR-03) — **aynı 60 senaryo, aynı bütçe**

Bütçe 2.000 ms / popülasyon 20 / iterasyon 40. Üçü de aynı yerleştiriciyi, aynı uygunluk
fonksiyonunu ve aynı tohum bireyleri kullanıyor (`SearchEvaluation`) — ölçülen tek şey arama
stratejisi.

| Sequencer | Ortalama | Medyan | p5 | En kötü | 50 senaryo süresi |
|---|---|---|---|---|---|
| Statik sıra | %75,48 | %75,11 | %66,18 | %64,33 | — |
| GWCA | %77,25 | %75,85 | %67,23 | %65,07 | 2:29 |
| **GA** | **%77,54** | %76,28 | %67,23 | %65,07 | 2:29 |
| **GRASP** | %77,17 | **%76,60** | **%67,96** | **%67,14** | **1:36** |

**GWCA hiçbir eksende net kazanmıyor.** GA ortalamada 0,29 puan önde; GRASP medyan, p5 ve en kötü
senaryoda önde ve **%36 daha hızlı**. DR-03'ün koşulu "GWCA ≥ GA **veya** GRASP (doluluk **ve**
süre)" — sağlanmadı.

Bu, rulebook'un B1'de yazdığı literatür uyarısını doğruluyor: GWCA sürekli optimizasyon için
tasarlandı, ayrık problemlerde zayıf. Random-key köprüsü çalışıyor ama avantaj üretmiyor.

**Uyarı:** 60 senaryo küçük örneklem; 0,3 puanlık farklar gürültü olabilir. KK-05'in istediği
eşleştirilmiş protokol (10 tohum, işaret testi p<0,05) henüz koşulmadı. Karar bundan sonra
verilmeli.

### v13 · DR-03 kararı — **300 senaryo, aynı bütçe (1.000 ms)**

Önceki 60 senaryoluk kıyas gürültülüydü; 300'de ortalama ~100 senaryodan sonra oturuyor.

| Sequencer | Ortalama | Medyan | p5 | En kötü | En iyi | Yerleşen | Medyan ms | p95 ms |
|---|---|---|---|---|---|---|---|---|
| Statik sıra | %75,25 | %74,99 | %67,32 | %62,26 | %88,95 | %66,95 | 52 | — |
| GWCA | %76,65 | %76,09 | %68,91 | %64,73 | %89,50 | %69,48 | 1.548 | 5.419 |
| GA | **%76,85** | %76,22 | %68,91 | %64,73 | **%91,33** | %69,69 | 1.380 | 4.910 |
| **GRASP** | %76,77 | **%76,48** | **%69,78** | **%65,87** | %88,95 | **%70,75** | **1.022** | **1.128** |

**GWCA her eksende kaybetti:** ortalamada GA'nın ve GRASP'ın altında, medyanda ikisinin de altında,
süre olarak ikisinden de yavaş, p95'te GRASP'ın **4,8 katı**. DR-03'ün koşulu ("GWCA ≥ GA **veya**
GRASP, doluluk **ve** süre") sağlanmadı → **GWCA sequencer olarak emekli, GRASP devralıyor.**
GWCA ve GA kodda referans olarak kalıyor.

GRASP'ın p95'i (1.128 ms) popülasyon tabanlı iki yöntemin ~1/4'ü: turda yaptığı iş sabit (12 takas),
popülasyon yöntemlerinin turu ise birey sayısıyla değişiyor. Üretim için önemli olan da kuyruk.

### v14 · Yönelim anahtarları (R-C15) — **kazandırmadı, geri alındı**

Birey `double[N]` → `double[2N]`: ikinci yarı yönelim tercihi. Gerekçe sağlamdı — duvarın derinliğini
kutunun hangi kenarının z eksenine geldiği belirler, yönelim sabitken arama duvar derinliğini
kontrol edemiyor.

| GRASP · 300 senaryo | Ortalama | Medyan | p5 | En kötü |
|---|---|---|---|---|
| Yönelim anahtarı yok | **%76,83** | **%76,60** | %69,78 | %65,87 |
| Yönelim anahtarı var | %76,65 | %76,04 | **%70,09** | **%66,08** |

Ortalama −0,18, medyan −0,56; yalnız alt kuyruk hafif iyileşti. Sebep büyük olasılıkla çelişki:
yerleştirici zaten tüm yönelimleri tarayıp **en sıkı oturanı** seçiyor; aramanın tercihini
uygulamak için "ilk geçerli yönelimi al" demek gerekti ve bu, yerleştiricinin kendi seçimini
bozdu. İki karar aynı şeyi iki farklı ölçüte göre veriyor.

Geri alındı: vektör `N`'e döndü, yerleştirici tam taramaya geri geldi. Bağlantı kodu duruyor —
deneyi tekrarlamanın bedeli tek satır.

### v16 · Kayıp hacim teşhisi — **darboğazın mekanizması bulundu**

Voksel tabanlı ayrışım (10 cm hücre, 100 senaryo). Kayıp hacim iki sınıfa ayrıldı: yığının
**üstünde** kalan ölü hava, yığının **içinde** kalan boşluk.

| | Statik | GRASP |
|---|---|---|
| Dolu | %83,10 | %84,63 |
| **Ölü hava (üstte)** | **%15,82** | **%14,29** |
| İç boşluk (içeride) | %1,08 | %1,08 |
| Yığın yüksekliği | %84,18 | %85,71 |
| **Üst yüzey engebesi** | **58,5 cm** (std sapma) | — |
| **Düz sütun oranı** | **%11,1** | — |

**Yerleştirme neredeyse kusursuz.** Kutular arasında yalnızca %1,08 boşluk var — paketleme sıkı.
Kayıp hacmin tamamı yığının üstünde: algoritma yeterince yükseğe çıkamıyor.

Mekanizma: üst yüzey 58,5 cm standart sapmayla darmadağın, sütunların yalnızca %11'i ortalama
yüksekliğe yakın. Kutu yükseklikleri 20-160 cm arasındayken bu, hiçbir yere düzgün oturulamaması
demek — **%80 destek kuralı adayları eliyor ve yığın yükselemiyor.**

Bu, tüm önceki denemelerin neden aynı ~%75'te toplandığını açıklıyor: yerleştirme politikası,
sıralama sezgisi ve arama stratejisi hep aynı duvara çarpıyordu. Sorun hiçbirinde değil,
**yüzeyin düzleştirilememesinde**.

### v17 · Şerit (strip) mantığı — **çöktü, geri alındı**

R-C09'un şerit disiplini: duvar içinde y ekseninde bantlar, bandın yüksekliğini o banda giren ilk
kutu belirler.

| | Ortalama | Medyan | En kötü | Yerleşen |
|---|---|---|---|---|
| Şeritsiz | %75,38 | %74,22 | %63,79 | %67 |
| **Şeritli** | **%50,49** | %48,34 | %22,15 | %38,55 |

**−24,9 puan.** Sebep: şeridin yüksekliğini ilk kutu belirleyince o duvara giren tüm kutular o
yüksekliğe mahkûm kalıyor; çoğu hiçbir şeride sığmayıp dışarıda kalıyor. Ölü hava %15,8 → %43,4'e
fırladı. Bant disiplini **z ekseninde işe yarıyor, y ekseninde boğuyor.**

### v18 · Hizalanma tercihi — **kazandırmadı, geri alındı**

Adayın üst yüzeyi mevcut bir yüzey seviyesine hizalanıyorsa tercih edilsin (yumuşak, sert bant değil).

| | Ortalama | Medyan | En kötü | Engebe | Düz sütun |
|---|---|---|---|---|---|
| Hizalanmasız | **%75,38** | %74,22 | %63,79 | 58,5 cm | %11,1 |
| Hizalanmalı | %74,83 | %74,13 | %61,50 | 59,5 cm | %9,0 |

−0,55 puan ve **engebe düzelmedi, kötüleşti**. Sebep: yüzlerce kutu yerleştikçe seviye listesi
şişiyor, "en yakın seviyeye uzaklık" hemen her aday için sıfıra yakın çıkıyor ve terim gürültüye
dönüşüp `residual` ölçütünün yerini alıyor. Küresel hizalanma yanlış formülasyon; hizalanma
**yerel** (komşu kutulara göre) tanımlanmalıydı.

### v19 · Ret sebebi ölçümü — **yeni mekanizma**

Üç tahmin üst üste tutmadığı için (şerit, yönelim anahtarı, hizalanma) tahmin bırakıldı: yerleşemeyen
her kutu tipi, yığın yüzeyindeki her konumda denendi ve ilk düşüren kapı sayıldı. Kurallar
kopyalanmadı, motorun kendi `PlacementValidator` yüklemleri çağrıldı.

| Ret sebebi | Oran |
|---|---|
| **Araç dışı** | **%99,4** |
| Desteksiz | %0,5 |
| Çakışma | %0,0 |
| İstif kuralı | %0,0 |

**Destek kuralı suçlu değil.** Mekanizma başka: bir kutunun oturacağı yükseklik, ayak izinin
altındaki **en yüksek** noktadır. Ölçüm bunu doğruluyor — ortalama yığın yüksekliği %84,5 ama
**en yüksek sütun %100,0**, yani her senaryoda yığın bir yerde tavana değiyor. Engebe 57,7 cm.

Yani sorun "yukarı çıkamıyoruz" değil: bazı bölgeler tavana kadar dolarken diğerleri alçak kalıyor
ve alçak bölgeler kullanılamıyor.

**Ölçümün sınırı:** teşhis, oturma yüksekliğini ayak izinin altındaki maksimum kabul ediyor. Motor
ise maximal-space defteri kullanıyor ve yüksek sütunun *yanındaki* alçak cebe kutu koyabiliyor.
Yani %99,4 üst sınırdır, gerçek engel daha küçük. Bir sonraki ölçüm defterin son durumunu
kullanmalı.

### v20 · Boşluk ölçümü ve bant dışı son çare — **kazandı**

Önceki teşhisin sınırını kapatmak için defter yeniden kuruldu: motorun kendi `SpaceLedger`'ı
kullanılarak yerleşimler aynı sırayla tekrar oynatıldı, sonda kalan boşluklar gerçek boşluklardır.

**300 senaryo · kalan boşluk durumu**

| Ölçüm | Değer |
|---|---|
| Boşluk sayısı | 74 |
| Boş hacim | %24,7 |
| En büyük boşluk | %2,2 (aracın) |
| Ortalama boşluk | 0,315 m³ |
| **Sığan yerleşemeyen kutu** | **%75,5** |

Yerleşemeyen kutuların dörtte üçü kalan bir boşluğa **geometrik olarak sığıyor**. Hacim var, kutu
sığıyor — yerleştirici oraya koymuyor. Suçlu duvar bandı: kutu hiçbir duvarın z aralığına
girmiyorsa, boşluk uygun olsa bile düşüyordu.

**Düzeltme:** duvar ve yeni duvar denemeleri başarısız olursa bant kısıtı olmadan tüm defter
taranır. Duvar disiplini bir **çıktı biçimidir**, fiziksel kural değil; kutuyu bandı yüzünden
dışarıda bırakmak biçimi doluluğa tercih etmek olurdu.

| | Bant kısıtlı | Bant dışı son çare |
|---|---|---|
| Ortalama | %75,21 | **%75,96** |
| Medyan | %74,78 | **%75,74** |
| p5 | %67,18 | %68,04 |

v5'ten beri ilk yerleştirme tarafı kazancı. Motor testleri 67/67, snapshot kayması yok.

**Kalan engel:** sığan yerleşemeyen oranı %75,5 → %73,1'e indi, yani hâlâ yüksek. Boşluk var ve
kutu geometrik olarak sığıyor ama yerleşmiyorsa kalan tek aday **%80 destek kuralı**: boşluğun
tabanı yeterince desteklenmiyor. Sıradaki ölçüm bunu doğrulamalı.

### v21 · Destek ölçümü — **darboğaz kesinleşti**

"Geometrik sığan boşluklardan kaçının tabanı destekli?" sorusu ölçüldü. Kutu boşluğun köşesine
konur ve %80 destek motorun kendi yükleminden sorulur.

| Ölçüm (300 senaryo) | Değer |
|---|---|
| Boş hacim | %24,0 |
| Boşluk sayısı | 74 (ortalama 0,297 m³) |
| Sığan yerleşemeyen kutu | %73,1 |
| **Sığan + destekli** | **%2,5** |

**Yerleşemeyen kutuların %73'ü bir boşluğa sığıyor ama yalnızca %2,5'i orada destek buluyor.**
Yani kalan 70 puanlık farkı tek başına %80 destek kuralı yiyor.

Bu, v19'daki "desteksiz %0,5" bulgusunu düzeltiyor: o ölçüm oturma yüksekliğini ayak izinin
altındaki maksimum kabul ediyordu, bu yüzden adaylar destek kapısına gelmeden "araç dışı" olarak
eleniyordu. Defter tabanlı ölçüm gerçek tabloyu veriyor.

**Mekanizma tam olarak şu:** kalan boş hacim dikey bacalar ve çıkıntılar hâlinde; tabanları
kısmen boşlukta. Bir maximal-space'in tabanı yalnızca altındaki kutuların üst yüzeyleri kadar
katı; geri kalanı havada. Kutu oraya konamaz çünkü havada duramaz.

**Sonuç:** çözüm "daha iyi boşluk seç" değil, **katı platform üretmek**. Yerleştirme, tabanı tam
kaplayan yüzeyler bırakmalı — çıkıntı (ledge) üretmemeli. Bu, katman (layer) disiplininin asıl
gerekçesi; v17'deki şerit denemesi doğru fikri yanlış uygulamıştı (bandı ilk kutunun yüksekliğine
kilitlemek).

### v22 · Taban alanı artığı — **nötr**

Boşluk seçimi hacim artığı yerine **taban alanı** artığını en aza indiriyor: kutu boşluğun ayak
izini tam kaplarsa üstünde tam platform bırakır, yarım kaplarsa çıkıntı üretir.

| | Hacim artığı | Taban alanı artığı |
|---|---|---|
| Ortalama | %75,96 | %75,99 |
| Medyan | %75,74 | **%76,06** |
| En kötü | %62,60 | %60,16 |
| Sığan + destekli | %2,5 | %3,2 |

Medyan +0,32, ortalama +0,03, en kötü −2,44 — gürültü bandında. Gerekçe doğru (destekli oran
%2,5 → %3,2 yükseldi) ama etki yok. Kod korundu; ölçüt mekanizmayla daha tutarlı.

### Ulaşılan sınır ve neden

Yirmi iki denemenin ardından tablo net: **yerel sezgiler ve sıra araması bu yerleştiricide
~%76'da doyuyor.** Kazanan üç değişikliğin üçü de "kaçırılan adayı geri kazan" türündendi
(kapanan duvarları tara, bant dışını tara, başarısızlığı bellekle); **hiçbir skor ayarı
kazandırmadı** — beş deneme, beşi de nötr ya da negatif.

Sebebi ölçüm söylüyor: darboğaz aday **seçimi** değil, adayın **var olmaması**. Kalan boş hacmin
tabanları havada; hiçbir seçim ölçütü havada duran bir tabanı katı yapamaz.

**Bunu kıran tek şey yerleştirme paradigmasını değiştirmek:** katmanı kutu kutu değil, bir bütün
olarak planlamak. Yani her katman için "bu yükseklikteki kutularla kesitin tamamını kapla" 2B
paketleme problemi çözülür ve katman katı bir platform olarak inşa edilir. Klasik **layer
building** budur (rulebook B3'te aile olarak listeli, uygulanmadı).

### Sıradaki: düzlük ödülü aramaya

Teşhis yönü net: yüzey düzleşirse yığın yükselir. Sert bant kuralı işe yaramadığına göre bunu
**yumuşak tercih** olarak denemek gerekiyor — rulebook `R-C14`/`R-C18` bunu zaten öngörmüş
(`AvgWallFlushness` uygunluk terimi). Yerleştirici içi kural değil, aramanın hedefi olur: arama
düz yüzey üreten sıraları tercih eder.

### Neden arama

Korpus konteynerin bölünmüş hâli olduğu için **doğru bir sıra vardır ve %100 verir** — bu sıra
kutuların orijinal kesim düzenidir. Sabit hiçbir kural onu bulamaz çünkü her senaryoda farklıdır.
Arama katmanının işi tam olarak budur: sırayı problemin kendisine göre aramak.
