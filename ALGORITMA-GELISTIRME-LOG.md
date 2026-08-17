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

---

## F2a · Destek-farkında boşluk defteri — **geri alındı**

**Hipotez.** Defter, tabanı havada duran boşluklar üretiyor; bu yüzden yerleşemeyen kutuların
%72,7'si bir boşluğa sığıyor ama yalnızca %3,2'si orada destek buluyor. Boşluk üretilirken
tabanın yalnız desteklenen kısmı alınırsa defter gerçeği gösterir ve arama boşa dönmez.

**Ölçüm düzeneği.** Aynı komut, aynı korpus, ulaşılabilir doluluk %100:
`soak --strategy wallbuilder --count 25 --max-scenarios 300 --verbose`.
Taban çizgi, değişiklik geri alındıktan sonra birebir yeniden üretildi (%75,99 / medyan %76,06),
yani üç varyantın karşılaştırması geçerli.

| | Taban çizgi | V1 tam destek | V2 %80 eşik | V3 boşluktan bağımsız zemin |
|---|---|---|---|---|
| Ortalama doluluk | **%75,99** | %73,85 | %74,00 | %73,65 |
| Medyan | **%76,06** | %73,22 | %73,24 | %73,45 |
| p5 | **%68,01** | %66,07 | %66,46 | %65,65 |
| Boşluk sayısı | 72 | 27 | 27 | 25 |
| Ortalama boşluk | 0,295 m³ | 0,172 m³ | 0,173 m³ | 0,176 m³ |
| Sığan yerleşemeyen | %72,7 | %0,0 | %0,3 | %1,0 |
| Ölü hava | %15,2 | %17,8 | %17,6 | %18,0 |
| Üst yüzey engebe | 56,6 cm | 61,5 cm | 61,3 cm | 62,6 cm |
| Medyan süre | 56,4 ms | 7,8 ms | 8,4 ms | 8,3 ms |

**Varyantlar.**
- **V1** — üst dilim, tabanı `SupportRatio == 1` olan en geniş dikdörtgene kırpıldı.
- **V2** — eşik motorun kendi `SupportThreshold` değerine (%80) bağlandı; tam destek şartı
  köprü kurmayı öldürüyordu.
- **V3** — üst dilim kesilen boşluğun x/z sınırlarından kurtarıldı: yan yana duran iki kutunun
  ortak zemini tek boşluk olabilsin diye yerleştirme başına bir kez, araç sınırlarına kadar
  genişleyerek üretildi. Tavan gerçek engele göre hesaplandı, `top` seviyesini delip geçen kutu
  varsa genişleme durduruldu.

**Sonuç: hipotez yanlış.** Üçü de taban çizginin altında; en iyisi bile −1,99 puan.

**Neden.** Havada duran taban bir kusur değil, **mekanizma**. %80 destek kuralı kutunun komşu
yığının üzerine **köprü kurmasına** izin veriyor; defterin havada duran tabanı bu köprünün tek
aday kaynağı. Defteri "dürüst" yapmak köprüyü de siliyor: boşluk sayısı 72 → 25'e, görünür hacim
üçte birine düşüyor ve engebe 56,6 → 62,6 cm'ye **çıkıyor** — her sütun ayrı bir kule oluyor.

Giyotin korpusunda kutuların üst yüzleri nadiren aynı hizada bittiği için "tam bu yükseklikte
biten kutular" kümesi genelde tek kutudan ibaret kalıyor. Yani destek-farkında defter, duvar
örücüyü sessizce **kule örücüye** çeviriyor.

**Bulgunun asıl değeri: teşhis zinciri düzeltildi.** "%72,7 sığıyor ama desteksiz" rakamı
defterin kusurunu değil, **yığın üst yüzeyinin engebesini** ölçüyor. Çözüm defteri küçültmek
değil yüzeyi düzleştirmek. Bu, F2a ile F2b'nin sırasını ters çeviriyor: **F2b (yerel düzlük
terimi) önce gelmeli.** Yüzey düzleşirse destekli bölgeler büyür ve destek-farkında defter o
zaman hem doğru hem ucuz olabilir — V3 zaten 7 kat hızlı (8,3 ms / 56,4 ms).

**Kalan.** Ledger varyantı `scratchpad/F2a-SpaceLedger-destek-farkindalik.cs` içinde saklı,
F2b sonrası yeniden ölçülecek. Üretimde tek kalan iz: `PlacementValidator.SupportRatio`
ayrıştırması (`HasSupport` artık ona delege ediyor) — F2b'nin düzlük terimi de ham orana
ihtiyaç duyacak.

---

## F2b · Yerel düzlük terimi — **kısmi kazanç, çıkış eşiği tutmadı**

**Metrik.** Aday kutunun üst yüzü, **yanındaki** kutuların üst yüzleriyle ne kadar aynı hizada
bitiyor: temas uzunluğuyla ağırlıklandırılmış ortalama sapma. Komşuluk yereldir ve yalnız aynı
dikey banttaki kutuları sayar — küresel hizalama v-önceki denemede kaybetmişti (−0,55).

**Dört yerleşim denendi.** Aynı komut, 300 senaryo, static sequencer:

| Varyant | Ortalama | Medyan | p5 | En kötü | Engebe | Ölü hava |
|---|---|---|---|---|---|---|
| Taban çizgi (düzlük yok) | %75,99 | %76,06 | %68,01 | %60,16 | 56,6 cm | %15,20 |
| Sığdırmanın **önünde** | %75,30 | %75,17 | %66,62 | %58,74 | 57,2 cm | %15,68 |
| İkili "tam hizalı" bayrağı önde | %76,06 | %75,95 | %67,14 | %63,22 | 56,3 cm | %14,95 |
| Ağırlıklı toplam α=0,75 | %75,99 | %75,97 | %67,26 | %57,96 | 56,1 cm | %14,99 |
| Ağırlıklı toplam α=0 (kontrol) | %76,04 | %75,91 | %66,51 | %60,86 | 56,4 cm | %15,16 |
| **Sığdırmanın ardında (seçildi)** | **%76,23** | %75,95 | **%68,03** | **%62,89** | **56,1 cm** | **%14,88** |

Ağırlıklı toplamda α=0 kontrolü gerekliydi: o varyant artık ölçüsünü mutlak cm²'den kesire
çevirdiği için α'nın etkisi tek başına okunamazdı. α=0 → %76,04, α=0,75 → %75,99; yani pazarlık
payı vermek **kazandırmıyor**, kazanç kesire geçişten geliyordu ve o da sözlükbilimsel varyantın
altında.

**GRASP ile (aynı bütçe, 300 senaryo, medyan ~2020 ms):**

| | Taban çizgi | Düzlük terimiyle |
|---|---|---|
| Ortalama | %77,76 | **%77,87** |
| Medyan | %77,54 | %77,77 |
| p5 | %70,56 | %69,76 |
| En kötü | %62,55 | **%64,16** |

**Sonuç: küçük ama gerçek bir kazanç, yanlış hedefte.** Ortalama +0,24 (static) / +0,11 (GRASP),
**en kötü senaryo +2,73 / +1,61** — asıl değeri alt kuyruğu toplaması. Kod korundu.

**Çıkış eşiği tutmadı.** Hedef engebe 56,6 → <30 cm ve ölü hava %15,2 → <%8 idi; gelinen yer
56,1 cm ve %14,9. Altı varyantın hiçbirinde engebe 56,1'in altına inmedi.

**Neden.** Düzlük skoru **miyop**: yalnızca defterin o an sunduğu adaylar arasından seçebiliyor ve
o adayların üst yüzü kutunun kendi yüksekliğiyle belirli. Yüzeyi gerçekten düzleştirmek "hangi
kutular yan yana gelsin" kararıdır — yerleştirme **skoru** değil, **gruplama/sıralama** kararı.
Bu da F4a (kule inşası: aynı ayak izli kutuları kontrollü yükseklikte sütuna yığmak) ve F3a
(kararı kromozoma taşımak) demek.

**Yön düzeltmesi:** engebe tek başına bir yerleştirici parametresiyle çözülmüyor. Sıradaki
kritik yol F3a değil **F4a**; kule inşası aynı yükseklikte biten yüzeyleri kutu seçimiyle üretir.

---

## F4a · Kule inşası — **ölçülemedi: korpus izin vermiyor**

Yeni yerleşen kutunun üstüne, aynı ürünün kalan birimleri aynı yönelimle doğrudan yığılıyor
(Gehring & Bortfeldt 1997). Yedi kapı yine `PlacementValidator`'dan soruluyor; kule kendi destek
ya da istif tanımını yazmıyor. Yığma ilk başarısızlıkta duruyor — aynı ürün kimliği aynı ölçüleri
taşıdığı için bir birim geçemiyorsa sonraki de geçemez.

**Sonuç: %76,23 → %76,30, engebe 56,1 cm'de sabit.** Yani hiçbir şey olmadı.

**Sebep, tahmin edilmedi ölçüldü.** Korpusun şekli için `CorpusDiagnostics` eklendi:

| | Hacim korpusu (giyotin) |
|---|---|
| Ürün tipi / senaryo | 126 |
| **Ortalama adet** | **1,0** |
| Tekrarlı tipteki birim payı | **%3,9** |
| İki katı araca sığan birim | %99,4 |
| En büyük tipin payı | %1,7 |

**Korpusta her kutu benzersiz.** Giyotin kesim noktaları rastgele olduğu için parçalar tam ölçüye
göre gruplandığında neredeyse hiç tekrar çıkmıyor. Kule inşası aynı ölçüdeki kutuları tek sütunda
topladığı için **ateşlenecek malzeme yok**.

**Bu, tek bir fazdan daha büyük bir bulgu.** Korpus yalnızca "gerçek dağılımı temsil etmiyor"
değil, roadmap'te sırada bekleyen **tekniklerin tamamına düşman**: kule inşası, blok inşası,
tekrarlı desen — üçü de aynı ölçüdeki kutu çokluğuna dayanır. Bischoff & Ratcliff terimleriyle
korpus **aşırı-güçlü heterojen**; BR7 bile (20 tip) buna göre çok daha tekrarlıdır. Gerçek yük ise
tersidir: müşteri 200 özdeş koli gönderir.

**Sonuç: `DR-14` (BR1-BR7'ye geçiş) artık paralel değil, BLOKLAYICI.** F4a'nın, F4b'nin ve blok
inşasının ölçülebilmesi için önce korpus değişmeli.

Kule kodu korundu: doğru mekanizma, bu korpusta ölçülemiyor. BR üzerinde yeniden ölçülecek.

---

## F2c · BR1-BR7'ye geçiş — **tamam**, ve F4a'nın gerçek değeri ortaya çıktı

OR-Library'den `thpack1..7.txt` alındı (Bischoff & Ratcliff 1995, 700 örnek, konteyner
587×233×220 cm). `BrCorpus` + `br` komutu eklendi.

**Yönelim kısıtı tam eşleşmiyor, bu yüzden iki uç raporlanıyor.** BR "hangi ölçü dikey durabilir"
der; bizim `AllowedRotations` enum'u bunu `001` → `NoVertical` ve `111` → `All` ile **birebir**
karşılıyor ama `011` düzenini (tiplerin %37'si) karşılamıyor. `strict` ucunda `PitchOnly`
kullanılıyor — dikey ölçü seçimi korunur, yatay çiftin 90° dönüşü kaybolur, yani BR'den **dar**.
`free` ucunda tüm yönelimler açılıyor, yani BR'den **geniş**. Gerçek değer arada.

### Sonuçlar (700 örnek, static; GRASP satırları 175 örnek)

| Yapılandırma | strict (alt sınır) | free (üst sınır) |
|---|---|---|
| Greedy (bugünkü üretim motoru) | %75,23 | — |
| Wall-Builder, **kule kapalı** | %77,00 | — |
| Wall-Builder | **%79,03** | %81,29 |
| Wall-Builder + GRASP | **%83,50** | %85,00 |

Literatürün en iyileri BR1-BR7'de ~%92-93.

### F4a yeniden ölçüldü: **+2,03 puan**

Kule inşası giyotin korpusunda +0,07 vermişti (ölçülemez). BR'de **%77,00 → %79,03** ve üstelik
**2,5 kat hızlı** (medyan 5-13 ms → 2-5 ms; kule, defter taramasının büyük kısmını atlıyor).
Bu, tüm günlükteki en büyük tek kazanç — ve yanlış korpusta tamamen görünmezdi.

### Korpus değişikliğinin kendisi bir bulgu

Wall-Builder'ın greedy'ye üstünlüğü giyotin korpusunda +0,8 puan görünüyordu; BR'de **+3,8**.
Yani eski korpus yalnızca "temsil etmiyor" değil, doğru kararı da **gizliyordu**.

### Kalan teşhis: tekrarı hâlâ kullanamıyoruz

BR kümeleri heterojenlik merdivenidir; literatürde BR1 (3 tip, bol tekrar) **en kolay** kümedir.
Bizde tersi:

| | BR1 | BR7 |
|---|---|---|
| Static | %78,03 | %78,74 |
| GRASP | %81,26 | %83,33 |

**BR1 bizim en kötü kümemiz.** Tekrarın en yüksek olduğu yerde en az kazanıyoruz — yani
yerleştirici aynı ölçüdeki kutu çokluğunu hâlâ bir fırsat olarak görmüyor. Kule tek bir sütun
kuruyor; eksik olan **blok** inşası: aynı kutudan `nx × ny × nz` bir prizma oluşturup duvara tek
parça olarak koymak (Eley 2002). Sıradaki iş bu.

---

## F4a′ · Blok inşası — **+0,83 static / +1,72 GRASP**

Kule tek sütun örüyordu; blok, aynı üründen `nx × ny × nz` bir prizma örer. Büyüme x ve y'de
serbest, z'de **duvar bandıyla** sınırlı — bandı aşmak bir sonraki duvarın içine taşmak olurdu
(`R-C08`). Yedi kapı yine `PlacementValidator`'dan soruluyor.

### Önce yanlış yerde arandı: büyütme tek başına hiçbir şey yapmıyor

| Deneme | BR1-BR7 (static, strict) |
|---|---|
| Taban çizgi (yalnız kule) | %79,03 |
| + yan sütunlar (x) | %79,04 |
| + z ekseni, duvar bandı sınırlı | %79,04 |

Sıfır. Sebep: ana döngü zaten aynı sonucu üretiyordu — aynı ürünün sonraki birimi bir sonraki
turda o komşu boşluğa nasıl olsa gidiyordu. Blok, **sırayı** öne alıyor ama **yerleşimi**
değiştirmiyor.

### Kaldıraç aday seçimiymiş

Skor "bu boşluğa **bir** kutu ne kadar sıkı oturur" diye soruyordu ve dar boşlukları
ödüllendiriyordu — blok için tam ters ölçüt. Doğru soru: "bu boşluk **kaç** kutu alır".

| Ölçüt biçimi | BR1-BR7 | Giyotin (regresyon) |
|---|---|---|
| Taban çizgi (tek kutu, taban alanı artığı) | %79,03 | %76,30 |
| Blok artığını küçült | %79,60 | — |
| Blok **hacmini** büyüt | %79,84 | **%75,41** |
| Blok hacmi + artık eşlik bozucu | %79,91 | — |
| **Blok ADEDİNİ büyüt, eşitlikte eski ölçüt** | **%79,86** | **%76,29** |

Hacim biçimi BR'de en iyisiydi ama giyotinde **−0,89** getiriyordu. Sebep: orada her kutu
benzersiz olduğu için blok daima tek kutudur ve ölçüt sessizce "en büyük kutuyu seç"e dönüşüyordu.
**Adet** biçiminde tek kutu durumunda tüm adaylar eşitlenir ve karar eski ölçüte, yani sığdırmaya
kalır — iki korpusta da doğru davranış. Seçilen budur.

### GRASP ile bileşik etki

| | Kule (önceki) | Kule + blok ölçütü |
|---|---|---|
| BR1-BR7 (25 örnek/küme) | %83,50 | **%85,22** |
| BR1 | %81,26 | **%83,09** |
| BR7 | %83,33 | %84,69 |

Static'te +0,83 olan kazanç aramayla **+1,72**'ye çıkıyor: blok ölçütü aramaya daha iyi bir
başlangıç noktası veriyor.

### Güncel tablo (BR1-BR7, strict alt sınır)

| Yapılandırma | Doluluk |
|---|---|
| Greedy (bugünkü üretim motoru) | %75,23 |
| Wall-Builder, kule yok | %77,00 |
| Wall-Builder + kule | %79,03 |
| Wall-Builder + kule + blok ölçütü | %79,86 |
| **Wall-Builder + GRASP + blok** | **%85,22** |
| Literatürün en iyileri | ~%92-93 |

Heterojenlik merdiveninin eğimi hâlâ ters: BR1 (%83,09) bizim en kötü kümemiz, literatürde ise en
kolayı. Tekrarı artık kullanıyoruz ama yeterince değil.
