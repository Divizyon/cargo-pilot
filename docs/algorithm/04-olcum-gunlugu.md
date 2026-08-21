# Algoritma Geliştirme Günlüğü

> **Kalıcı dosya — yalnızca sona eklenir.** Geçmiş kayıt silinmez ve düzeltilmez; bir sonuç
> yanlışlandıysa **yeni bir kayıt** açılır ve eskisine atıf verilir. Reddedilen denemeler de
> yazılır — "bu denendi mi" sorusunun tek cevabı burasıdır.
>
> Güncel özet [05-basari-karnesi.md](05-basari-karnesi.md)'de. Kararsızsan buraya yaz.


Her değişiklik ve ölçüsü. Ölçüm düzeneği: `dotnet run --project CargoPilot.Engine.Bench -- soak`.

**Not (18 Ağu 2026):** aşağıdaki erken kayıtlar giyotin korpusunda ölçüldü. `DR-19` ile
birincil korpus **BR1-BR7** oldu; giyotin regresyon korpusu olarak kaldı. Korpusu değiştirmek
bir kararı tersine çevirebilir — kayıtları okurken hangi korpus olduğuna bak.

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

---

## F4b + F3a · Duvar derinliği kararı kromozoma taşındı

BR teşhis satırları `br --verbose` ile açıldı. BR1'in neden en kötü küme olduğu görüldü:

| | BR1 | BR4 | BR7 |
|---|---|---|---|
| Ölü hava | %18,6 | %14,3 | %14,2 |
| Yığın yüksekliği | %81,4 | %85,7 | %85,8 |
| **Üst yüzey engebe** | **69 cm** | 63 cm | 62 cm |
| Kalan boşluk sayısı | 5 | 16 | 26 |
| Ortalama adet | 50,1 | 13,3 | 6,5 |

Tip sayısı azaldıkça engebe artıyor ve yığın alçalıyor. Az tip = **az duvar derinliği seçeneği**;
yanlış derinliğe kilitlenmenin bedeli orada en yüksek.

### Sabit derinlik kuralı kazanamıyor

| Yeni duvar açılırken | BR1 | BR6 | BR7 | BR1-BR7 |
|---|---|---|---|---|
| Yansız (bugünkü) | %79,32 | %78,99 | %79,00 | **%79,86** |
| **Derin** duvarı tercih et | %79,04 | %79,01 | %79,13 | %79,85 |
| **Sığ** duvarı tercih et | %77,96 | %80,46 | %79,77 | %79,88 |

Derin BR1'i **+1,36** yükseltirken BR6'yı **−1,45** düşürüyor; sığ tam tersini yapıyor. Ortalamada
üçü de aynı. **Doğru değer kutu setine bağlı ve tek bir kural olarak yazılamaz.**

### F3a: karar kromozoma

Anahtar vektörünün düzeni netleştirildi ve tek yerde yazıldı:
`[0, N)` sıra anahtarları · `[N]` **decoder geni** · `[N+1, 2N+1)` yönelim anahtarları (opsiyonel).

Decoder geni ortada duruyor çünkü her zaman var; yönelim anahtarları bugün üretilmiyor (ölçüldü,
kaybetti) ve sonda opsiyonel kalıyor. Eski kod sondaki bloğu `offset + i < keys.Length` ile
sınıyordu — decoder geni eklenince bu, geni sessizce ilk kutunun yönelim anahtarı sayardı; kontrol
tam uzunluk sınamasına çevrildi.

Tohum bireyler tercihsiz (0,5) başlar: sezgisel sıralamalar bugünkü davranışı temsil etmeli, arama
sapmayı kendisi keşfetsin (`R-C21`).

| | Kule + blok | + decoder geni |
|---|---|---|
| Static (yansız, 700 örnek) | %79,86 | %79,86 |
| **GRASP (175 örnek)** | %85,22 | **%85,32** |
| **BR1, GRASP** | %83,09 | **%83,92** |

Genel kazanç küçük (+0,10) ama **tam beklenen yerde**: BR1'de +0,83, yani derinlik kararının en
çok bağladığı kümede. Static yol birebir korundu ve giyotin korpusunda regresyon yok (%76,29).

Asıl değeri mekanizma: plan düzeyindeki kararlar artık aramaya açık. Sıradaki genler için yer
hazır (maximal-space seçim kuralı, düzlük ağırlığı).

---

## F3b + F5 · Üretime dönük paket

Üç iş: yeni yerleştiricinin değişmez kapsaması, arama katmanının varsayılan olması, arama
bütçesinin ölçülen işletme noktasına çekilmesi.

### 1. Duvar örücünün değişmez kapsaması yoktu

`InvariantTests` yalnızca greedy yolunu kapsıyordu. Duvar örücü ise kutuları **iki ayrı yerden**
yerleştiriyor: ana aday döngüsünden ve blok inşasından. Blok, aday taramasını atlayıp yedi kapıyı
doğrudan çağırıyor — orada eksik bir çağrı fiziksel olarak imkânsız bir plan üretir ve golden
snapshot'lar bunu **yakalamaz**, çünkü onlar greedy çıktısını kilitliyor.

`DuvarOrucuDegismezleriTests` eklendi (44 yeni test, toplam 67 → 111):

- Katalogdaki her senaryo duvar örücüyle koşulur → altı fiziksel değişmez.
- Aynı senaryolar **GRASP ile** koşulur; arama yerleştiriciyi defalarca çağırıp en iyi bireyi
  döndürdüğü için kural ihlali tek bir bireyde kalsa bile o birey kazanabilir.
- Blok inşasının kendi sınavı: 200×200×400 araca 50×40×50 kutudan 120 adet — hepsi yerleşmeli.
- Determinizm, decoder geni eklendikten sonra ayrıca: aynı tohum → bit birebir aynı plan.
- Greedy yolunun duvar örücü değişikliklerinden etkilenmediği kilitlendi.

### 2. Sequencer artık opsiyonel; duvar örücünün varsayılanı GRASP

Sorun şuydu: `Sequencer` varsayılanı `Static` olduğu için istemci duvar örücüyü seçtiğinde
aramayı **ayrıca** istemek zorundaydı — ve arama +5,5 puan getiriyor. Ama komut varsayılanını
doğrudan GRASP yapmak, bayrak kapalıyken bugünkü varsayılan çağrıyı (`Greedy` + `Static`)
reddettirirdi.

Çözüm: alan `SequencerKind?` yapıldı, çözüm tek yere alındı (`SequencerSelection.Resolve`):
belirtilmemiş + duvar örücü → GRASP, belirtilmemiş + greedy → Static, belirtilmiş → aynen.
Telde geriye uyumlu (alan gönderilmezse `null`). Doğrulayıcı kapısı korundu: belirtilmemiş
sequencer bir kaçamak değil, duvar örücü bayrak kapalıyken yine reddediliyor.

### 3. Arama bütçesi ölçülen değere çekildi

`SearchBudget.Default` `MaxDurationMs = 20_000` idi — bir HTTP isteği içinde savunulamaz ve
**hiçbir ölçümü temsil etmiyordu**. Yeni varsayılanlar, raporlanan %85,32'nin alındığı bütçenin
kendisi: `MaxIterations 40 · PopulationSize 20 · MaxDurationMs 2_000 · Stall 15`.
Doğrulandı: aynı bütçeyle BR1-BR7 = **%85,32**, medyan 0,39-1,83 sn.

### Üretimin bugünkü tablosu

| | Doluluk (BR1-BR7, strict) | Süre (medyan) |
|---|---|---|
| Greedy — bayrak kapalı, bugünkü varsayılan | %75,23 | ~65 ms |
| Duvar örücü + GRASP — bayrak açıkken varsayılan | **%85,32** | ~0,4-1,8 sn |

Testler: motor 111/111, altyapı 39/39.

---

## F5 · Koşu kimliği kalıcı hale getirildi

`SearchStatsDto` bir **askıda sözleşmeydi**: alan API'de duruyordu ama kalıcılık ertelendiği için
her planda `null` dönüyordu. Asıl eksik ondan büyüktü — plan hangi yerleştirici, hangi sequencer
ve hangi tohumla üretildiğini **hiç kaydetmiyordu**.

Bu, determinizm sözleşmesini (`R-C02`: aynı tohum + aynı girdi → bit birebir aynı plan)
kullanılamaz kılıyordu: bir planı yeniden üretmek isteyen kişinin elinde yalnızca sonuç kalırdı.
Duvar örücü + GRASP açıldığında sorun büyürdü, çünkü artık aynı girdi iki farklı motordan
geçebiliyor ve veritabanında ikisi ayırt edilemiyordu.

**Eklenenler** (`LoadingPlans` tablosu, additive migration):

| Alan | Tip | Varsayılan |
|---|---|---|
| `PlacementStrategy` | int | `Greedy` |
| `Sequencer` | int | `Static` |
| `Seed` | int | 0 |
| `SearchIterations` / `SearchEvaluations` / `SearchImproved` / `SearchDurationMs` | nullable | — |

Varsayılanlar geçiş öncesi kayıtları **doğru** tanımlıyor: o planlar gerçekten greedy, statik ve
tohum 0'dı. Migration yalnızca sütun ekliyor, veri kaybı yok.

Domain'e `RecordOptimizationRun` eklendi — sonuç metriklerinden ayrı durur çünkü bunlar "ne çıktı"
değil **"nasıl üretildi"** sorusunun cevabı. İki komut da (plan oluştur, yeniden optimize et)
kaydediyor; `PlanDetailDto` alanları artık gerçek değer taşıyor.

Testler: motor 111/111, altyapı 39/39, uygulama 228/228.

---

## OPT-15 · Kanıtlanmış motor hatası kapatıldı

**Hata.** Dört istif kuralı (istiflenebilirlik, istif adedi, üst ağırlık, kırılganlık) yalnızca
**aşağı** bakıyordu — aday pozisyonun *altında* ne olduğunu soruyordu. Bu, kodda açıkça yazılı bir
varsayıma dayanıyordu: *"yeni kutu daima mevcut yığının en üstüne konur; üstünde hiçbir şey yoktur."*

Varsayım yanlış. Boşluk defteri iki kutu arasında kalan **cebi** aday olarak tutar — bu onun asıl
amacıdır. Dolayısıyla bir kutu, üstünde zaten yük olan bir yere yerleşebilir ve o kutunun **kendi**
kısıtları hiçbir yerde sorulmaz.

**Üretim kodunda çözüm zaten vardı ama çağrılmıyordu:** `ViolatesLoadAbove` denge takası için
yazılmıştı ve yalnızca oradan çağrılıyordu.

### Önce kanıt

`CepYerlesimiTests` köprü kurulmasını zorlar: iki sütun yan yana, üstlerine tam genişlikte ince
bir köprü (destek 160/200 = **tam eşikte**), geriye köprünün altında bir cep. Cebe sığan son kutu
kırılgan. Yönelimler `Fixed` — serbest bırakılınca motor kutuları döndürüyor ve kurgu dağılıyor.

Wall-Builder'ın ürettiği plan:

```
(0,0,0)   80×120×200   sütun
(80,0,0)  80×120×200   sütun
(160,0,0) 40×120×100   ← KIRILGAN, cebe yerleşti
(0,120,0) 200×20×200   köprü — kırılgan kutunun üstüne bindi
```

Greedy bu senaryoda kaçındı (köprüyü zemine, `z=200`'e koydu), ama kör nokta onda da var.

### Düzeltme

`ViolatesLoadAbove` aday alanlarıyla çağrılabilen bir aşırı yüklemeye ayrıldı (tek uygulama, iki
imza) ve **üç** yere sekizinci kapı olarak eklendi: greedy aday taraması, Wall-Builder aday
taraması, blok inşası. Blok ana döngünün taramasını atladığı için orada ayrıca gerekiyordu.

Maliyet sıfıra yakın: kısıtsız kutuda fonksiyon ilk satırda dönüyor.

### Sonuç

| | Önce | Sonra |
|---|---|---|
| BR1-BR7 (static) | %79,86 | %79,86 |
| Giyotin | %76,29 | %76,29 |
| Golden snapshot (17) | — | **hepsi bayt birebir aynı** |
| Motor testleri | 111 | **115** |

Doluluk hiç değişmedi ve snapshot'lar kaydı **çünkü** her iki korpusta da kısıtlı kutu yok
(`MaxStackCount 0`, `IsStackable true`, `NonFragile`) — kapı orada hiç ateşlenmiyor. Yani düzeltme
yalnızca gerçekten geçersiz olan yerleşimleri reddediyor, başka hiçbir şeye dokunmuyor. Erteleme
gerekçesi ("snapshot kaydırır") ölçümle geçersiz çıktı.

---

## F5 · Gecelik doluluk kapısı

Bu oturumda kurulan ölçüm düzeneği elle koşulduğu sürece çürür: kapı olmadan doluluk düşüşü ancak
birisi aynı komutu tekrar koştuğunda fark edilir.

`br` komutuna `--report` (JSON çıktı) ve `--baseline` (referansla karşılaştır, gerilemede hata
koduyla çık) eklendi. Karşılaştırma mantığı YAML'da değil C#'ta (`BrBaseline`) — tipli ve
denenebilir.

**Kapı yalnızca statik sequencer'ı ölçer.** Arama katmanının bütçesi duvar saatidir
(`SearchBudget.MaxDurationMs`), yani yavaş bir koşucu daha az iterasyon yapar ve sonuç makineye
bağlı çıkar; kapı gürültüden kalırdı. Statik yol saf hesaptır — aynı girdi her makinede bit
birebir aynı sonucu verir, dolayısıyla **her düşüş gerçek bir gerilemedir** ve tolerans
(0,05 puan) yalnızca JSON yuvarlamasına karşı.

**Referanslar** `docs/algorithm/` altında, iki strateji için ayrı: greedy %75,23 (bugünkü üretim
yolu) ve duvar örücü %79,86 (bayrak açıldığında koşacak olan). Birinin gerilemesi ötekini
gizlememeli.

Kapı üç şeyi reddediyor: küme ortalamasının düşmesi, örnek sayısının değişmesi ve referansın
**başka bir yapılandırmaya** ait olması — sonuncusu denendi, `WallBuilder/Static/Strict` referansı
greedy koşusunu doğru şekilde reddetti.

Kapı bir **iyileşmeyi** de bildiriyor ("referans tazelenmeli"): kazanç kaydedilmezse yeni taban
oluşmaz ve bir sonraki gerileme geç fark edilir.

`engine-bench.yml`: motor dosyaları değiştiğinde push/PR'da, ayrıca her gece 03:00 UTC
(`algorithm-suite` 02:00'de koştuğu için çakışmıyor). Release yapılandırmasında doğrulandı,
sayılar Debug ile birebir aynı.

---

## DR-16 · Destek eşiği taraması — **eşik sanıldığı kadar değerli değil**

Eşik `OptimizationInput.SupportThreshold` ile ölçülebilir hale getirildi. **Üretim varsayılanı
%80'de durur**; alanı bugün yalnızca ölçüm düzeneği dolduruyor, hiçbir üretim çağrı yolu
doldurmuyor. Doğrulandı: eşik verilmediğinde iki strateji de referans değerlerini birebir veriyor
ve doluluk kapısı geçiyor.

### Kazanç (BR1-BR7, 700 örnek, static)

| Eşik | Duvar örücü | Greedy |
|---|---|---|
| **%80 (bugün)** | **%79,86** | **%75,23** |
| %78 | %79,99 | %75,52 |
| %76 | %80,12 | %75,71 |
| %74 | %80,18 | %75,96 |
| %72 | %80,26 | %76,19 |
| %70 | %80,34 | %76,40 |
| %68 | %80,44 | %76,56 |
| %66 | %80,45 | %76,75 |
| %64 | %80,49 | %76,86 |
| %62 | %80,55 | %77,05 |
| %60 | %80,61 | %77,20 |

Yirmi puanlık eşik indirimi duvar örücüde **+0,75**, greedy'de **+1,97** puan getiriyor. İki puanlık
adım başına duvar örücüde ~0,08 puan.

### Bedel (aynı korpus, üretilen planın gerçek destek dağılımı)

| Eşik | Ortalama destek | En düşük destek | %80 altı kutu | %70 altı kutu | Azami taşma |
|---|---|---|---|---|---|
| %80 | %99,2 | %86,9 | %0,0 | %0,0 | 11 cm |
| %70 | %98,6 | %79,3 | %3,1 | %0,0 | 18 cm |
| %60 | %98,0 | %72,1 | %4,8 | %2,4 | **24 cm** |

### Bulgu: eski teşhis korpus yüzünden abartılıydı

"Yerleşemeyen kutuların %72,7'si sığıyor ama yalnızca %3,2'si destek buluyor" ölçümü **giyotin
korpusundan** geliyordu. Aynı taramayı orada koşunca fark açık:

| Eşik | Giyotin korpusu | BR1-BR7 |
|---|---|---|
| %80 | %76,29 | %79,86 |
| %70 | %78,38 | %80,34 |
| %60 | %79,56 | %80,61 |
| **%80 → %60 kazancı** | **+3,27** | **+0,75** |

Giyotin korpusunda eşik gerçekten bir tıkaç; **gerçekçi yükte değil**. Sebep, o korpusta her
kutunun benzersiz olması (`DR-19`): tekrarsız kutular birbirinin üzerine tam oturamıyor ve her
yerleşim eşiğe dayanıyor. Gerçek yükte aynı ölçüden çok sayıda kutu var, bunlar birbirinin üstüne
zaten tam oturuyor — ortalama destek %99,2, yani plan eşiğe **nadiren** dayanıyor.

### Sonuç

**Eşik %80'de kalmalı.** Yirmi puanlık güvenlik tavizi gerçekçi yükte 0,75 puan doluluk getiriyor;
karşılığında en zayıf kutunun desteği %87'den %72'ye, azami taşma 11 cm'den 24 cm'ye çıkıyor.
Bu, iyi bir takas değil.

`DR-16` artık "müşteri onayı bekliyor" değil: **ölçüldü ve kapatıldı.** Karar isterse yeniden
açılabilir — düzenek yerinde, `--support` ile herhangi bir değer dakikalar içinde ölçülür.

---

## Deney serisi · "en ufak kazancı da dene"

Ölçüt BR1-BR7 (birincil), giyotin regresyon olarak izlendi. İkisi de Wall-Builder.

| # | Deneme | BR1-BR7 | Giyotin | Karar |
|---|---|---|---|---|
| — | Taban çizgi | %79,86 | %76,29 | — |
| D1 | Blok ölçütü = boşluk **doluluk oranı** (adet yerine) | %79,78 | %75,42 | ✗ ikisinde de kayıp |
| D2 | `minSide`'ı kutular tükendikçe yeniden hesapla | %79,86 | %76,29 | ✗ nötr — kod ve maliyet karşılığı sıfır |
| D7 | Duvar taramasında ilk kabul eden değil **en iyi** duvar | %79,89 | %75,67 | ✗ BR'de gürültü, giyotinde −0,62 |
| D12 | Cebi yeni duvardan **önce** tara | **%80,09** | %72,91 | ✗ BR'de +0,23 ama giyotinde −3,38 |
| **D14** | **D12 kararını kromozoma taşı** | %79,86 static · **%85,38** GRASP | %76,29 static | ✓ tutuldu |

### D2 neden reddedildi

Doluluk birebir aynı çıktı — beklendiği gibi, çünkü `minSide` büyüdükçe yapılan budama
**güvenlidir**: o boşluğa kalan hiçbir kutu zaten sığmıyor. Hız farkı (52 → 50 ms) gürültü
bandında. Sıfır kazanç için kod ve yerleştirme başına `O(N)` tarama eklemek doğru olmaz.

### D7 neden reddedildi

Fit anahtarının ilk terimi `Y` (yerçekimi). Duvarlar arasından "en iyi"yi seçmek, açılış sırasına
göre daha alçak olan duvarı bırakıp sonrakine atlayabiliyor. Erken çıkış aslında bir yerçekimi
tercihiymiş.

### D12 → D14: sabit sıra yine kaybetti

Cebi yeni duvardan önce taramak BR'de kazandırıyor, giyotinde yıkıyor. **İkisi de gerçek yük
biçimi:** tamamen tekrarlı bir sevkiyat BR'ye, karışık tek parça bir yük giyotine benzer. Birini
seçmek ötekini feda etmek olurdu.

Bu, oturumun üçüncü kez tekrarlayan deseni (`DR-18`, `DR-23`, şimdi bu): **sabit katsayı/sıra
kazanmıyor, karar kromozoma ait.** Decoder gen bloğu 4 gene çıkarıldı ve vektör düzeni gen
eklendiğinde kaymayacak şekilde sabitlendi:
`[0, N)` sıra · `[N, N+4)` decoder · `[N+4, 2N+4)` yönelim.

Statik yol **birebir korundu** (%79,86 / %76,29) — tohum bireyler bugünkü davranışı temsil ediyor,
sapmayı arama keşfediyor (`R-C21`). GRASP kazancı %85,32 → **%85,38**; küçük, ama asıl değeri
korpusa bağlı bir sabit kararı ortadan kaldırması.

---

## D17 · GRASP parametreleri — **+0,86 puan**, hiç taranmamışlardı

Arama katmanı doluluğun +5,5 puanını getiriyor ama iki sabiti (`Alpha`, `SwapsPerRound`) ilk
yazıldıkları değerde duruyordu ve **hiç ölçülmemişti**.

### `SwapsPerRound` — asıl kazanç burada

Bütçe duvar saati olduğu için bu sayı, çabayı **çeşitlendirme** (yeni tur kur) ile
**yoğunlaştırma** (aynı turda daha çok takas) arasında paylaştırıyor.

| Takas/tur | 4 | 12 (eski) | 32 | 48 | **72** | 120 | 200 |
|---|---|---|---|---|---|---|---|
| BR1-BR7 | %85,39 | %85,78 | %86,11 | %86,21 | **%86,31** | %86,26 | %86,23 |

Eski değer arama bütçesinin büyük kısmını **kullanmadan bitiriyordu**: medyan süre 411-2001 ms
arasında dağılıyordu. 72'de koşu bütçeyi tam kullanıyor (medyan 1098-2002 ms). Yani kazancın bir
kısmı zaten ayrılmış ama harcanmayan bütçeden geliyor.

### `Alpha` — insa asamasinda yeniden çekilen anahtar oranı

| Alpha (swaps=72) | 0,30 (eski) | **0,45** | 0,60 | 0,80 |
|---|---|---|---|---|
| BR1-BR7 | %86,46 | **%86,58** | %86,30 | %86,07 |

Alpha tek başına (swaps=12'de) 0,60'a kadar tırmanıyordu; takas sayısı artınca optimum 0,45'e
kaydı. İki parametre etkileşiyor, bu yüzden ikinci tur gerekti.

### Doğrulama (175 örnek)

| | Önce | Sonra |
|---|---|---|
| **BR1-BR7 (GRASP)** | %85,38 | **%86,24** |
| BR1 | %84,04 | %84,76 |
| BR5 | — | %87,25 |
| Giyotin (GRASP, 100 senaryo) | %78,21 | %78,09 |
| BR static | %79,86 | %79,86 |

**+0,86 puan**, tek satırlık iki değişiklikle. Giyotindeki −0,12 gürültü bandında, statik yol
birebir aynı.

Ders: arama katmanı yazıldığından beri hiç ayarlanmamıştı. Yerleştirici tarafında onlarca deneme
yapılırken aramanın kendi sabitleri el değmemiş duruyordu.

---

## Arama katmanı deney serisi — beş deneme daha, dördü reddedildi

Ölçüm BR1-BR7, GRASP, 70 örnek. Taban çizgi **%86,67**.

### Önce gürültü bandı

Arama **süre-bağımlı** olduğu için ilk iş tekrarlanabilirliği ölçmek oldu: aynı yapılandırma dört
kez koşuldu → %86,66 / %86,68 / %86,66 / %86,68. **Bant ±0,01.** Yani 0,1'in üzerindeki farklar
gerçek. Tek istisna: derlemenin hemen ardındaki ilk koşu ~0,1 düşük gelebiliyor (soğuk JIT), bu
yüzden kıyas koşuları arka arkaya yapılmalı.

| # | Deneme | Sonuç | Karar |
|---|---|---|---|
| D18 | `--stall` bayrağı + iterasyon/durağanlık taraması | iterasyon 40 → 100: **+0,09**; durağanlık etkisiz | ✓ tavan yükseltildi |
| D19 | Tohum bireyleri çeşitlendir (3 → 6 sıralama) | %86,56 | ✗ −0,11 |
| D19b | Tek ek tohum: adet-azalan (blok için en bol malzeme) | %86,57 | ✗ −0,10 |
| D23 | Yerel aramaya "yeniden konumlandırma" hamlesi ekle | %86,24 | ✗ **−0,43** |
| D24 | Uygunluktan adet terimini kaldır (hacim önceliğinde) | %86,60 | ✗ −0,07, gürültü sınırında |
| D25 | Her turu taban çizgi yerine **en iyiden** başlat | %86,05 | ✗ **−0,62** |

### D19: tohum eklemek neden kaybettiriyor

Tohumlar bütçe **içinde** değerlendiriliyor. Her ek tohum bir tam yerleştirme koşusu demek ve o
süre arama turlarından çalınıyor. Üç tohum zaten yeterli çeşitlilik veriyor; dördüncüsünün
getirisi, çaldığı süreyi karşılamıyor.

### D25: GRASP'ın klasik tasarımı doğruymuş

Her turu bulunan en iyiden başlatmak aramayı **erken yakınsatıyor** — çeşitlendirme kayboluyor ve
arama tek bir tepede sıkışıyor. Taban çizgiden yeniden başlamak GRASP'ın tanımı gereği vardır ve
ölçüm bunu doğruladı: −0,62. `Alpha` da bu tasarıma göre kalibre edilmişti, tutarlı.

### Serinin toplamı

| | Başlangıç | Şimdi |
|---|---|---|
| BR1-BR7 (GRASP, 175 örnek) | %85,32 | **%86,27** |
| BR1-BR7 (static, 700 örnek) | %79,86 | %79,86 |

On üç denemeden **üçü** tutuldu (D14 gen, D17 GRASP sabitleri, D18 iterasyon tavanı); onu
reddedildi. Kazancın neredeyse tamamı D17'den geldi — yerleştirici tarafında onlarca deneme
yapılırken hiç ayarlanmamış iki sabitten.

---

## ① K-Means ön kümeleme (`R-B4`) — **iddia ölçüldü, doluluk tarafı yanlış**

Rulebook §B4'te duran en iddialı ölçülmemiş madde buydu:

> K-Means ile kutuları boyuta göre ön kümeleyip Wall-Builder'a vermek **30–35× hızlanma ve %15'e
> varan doluluk artışı** sağlamıştır *(tek kaynaklı iddia, ölçülecek)*.

Uygulandı: kümeleme **tip** üzerinde yapılıyor (birim üzerinde değil — aynı ürünün 40 kopyası
merkezleri kendi tarafına çekerdi), ölçüler `[0,1]`'e normalize ediliyor, başlangıç merkezleri
hacim sırasından eşit aralıklarla seçiliyor ve iterasyon sayısı sabit — determinizm sözleşmesi
(`R-C02`) gereği hiçbir adımı rastgele değil. Kümeler ortalama hacme göre azalan, küme içinde
hacim-azalan. Yalnızca hacim önceliğinde ve grup yokken devrede; LIFO/grup sırası boşaltma sözü
taşıyor, kümeleme onu bozardı.

| Küme sayısı | BR1-BR7 | Giyotin | Giyotin medyan süre |
|---|---|---|---|
| **Taban çizgi (kümeleme yok)** | **%79,86** | **%76,29** | 52 ms |
| k = 3 | %79,39 | %72,46 | 28 ms |
| k = 8 | %79,83 | %73,02 | 22 ms |
| k = √tip (≈11) | %79,34 | %73,39 | 25 ms |
| k = 30 | %79,86 | %74,85 | 23 ms |

**Doluluk her `k` değerinde taban çizginin altında.** `k` büyüdükçe sonuç taban çizgiye
yaklaşıyor — beklendiği gibi, çünkü her tip kendi kümesi olduğunda sıralama hacim-azalana döner.
Yani kümelemenin kendisi zarar veriyor, ayarı değil.

**Hız iddiası kısmen doğru:** giyotin korpusunda medyan süre 52 → 22-28 ms, yaklaşık **2×**.
Ama 30-35× değil, ve sebebi kazanç değil kayıp: benzer ölçüler bir arada geldiğinde daha az
boşluk hayatta kalıyor, defter taraması kısalıyor — **doluluğun düşme sebebi de tam olarak bu**.

**Karar: reddedildi, kod silindi.** `R-B4`'teki "%15 doluluk artışı" iddiası bizim yerleştiricimiz
için geçersiz. Hızlanma gerçek ama doluluk pahasına, ve bizim darboğazımız hız değil.

---

## ② Amalgamation (`R-C11`) — **ölçüldü, temsilimizde anlamsız**

`R-C11` dar boşlukların komşuyla birleştirilmesini bir bayrak arkasında tarif ediyordu
(`EnableAmalgamation`, "varsayılan kapalı, ölçülünce açılır"). Kodda hiç yoktu.

Madde Parreño'nun maximal-space temsilinden geliyor ve orada anlamlı: iki maksimal boşluğu
birleştirmek prizma vermez, **ama** bu ancak boşluklar gerçekten maksimalse doğrudur. Bizim
`AddSplits` kesilen boşluğun dilimlerini üretiyor ve o dilimler komşu boş bölgeye
uzayabilecekken uzatılmıyor — yani maksimal olmayabilirlerdi.

Tahmin etmek yerine ölçüldü (`MaximalityDiagnostics`): her boşluğun altı yüzü, bir kutuya ya da
araç duvarına çarpana kadar itildi.

| | BR1 | BR4 | BR7 |
|---|---|---|---|
| **Maksimal olmayan boşluk** | **%0,0** | **%0,0** | **%0,0** |
| Ortalama büyüme | %0,0 | %0,0 | %0,0 |
| Azami büyüme | %0 | %0 | %0 |

**Defterdeki her boşluk zaten maksimal.** Altı yönün hepsinde ya bir kutuya ya araç duvarına
dayanıyor. Dolayısıyla birleştirilecek bir şey yok: iki maksimal kutuyu birleştirmek prizma
vermez.

`R-C11`'in amalgamation kısmı **kapatıldı** — uygulanmayacak. Ölçüm aracı harness'ta kaldı;
defter değişirse maksimallik bir regresyon olarak yakalanabilir.

---

## ③ Bileşik blok (Zhu vd. 2012) — **statik yolda +2,87 puan**

Kule ve blok yalnızca **aynı** üründen kuruluyordu. Sütun o ürünle dolduktan sonra tepede kalan
yükseklik ölü havaya dönüyordu — ve ölçüm kaybın tamamının orada olduğunu söylüyordu (ölü hava
%8,6-13, iç boşluk sıfıra yakın).

`TopUp`: sütunun tepesinde kalan yüksekliği **başka bir üründen** kutuyla tamamla. Yedi kapı yine
`PlacementValidator`'dan soruluyor, sekizinci kapı dahil.

### İlk deneme kaybetti, sebebi öğreticiydi

Kısıtsız hâli **kaybetti** (BR %78,71, giyotin %75,49): sıradan ileriden kutu çalıp geniş bir
sütunun tepesine küçük bir kutu koyuyor, o yüzeyin geri kalanını ölü havaya çeviriyordu.

**Ayak izi uyumu şartı** eklendi: üst kat, taban katın ayak izini en az `FootprintMatch` oranında
kapatmalı. Aksi hâlde blok bir prizma olmaktan çıkar.

| Ayak izi uyumu | BR1-BR7 | Giyotin |
|---|---|---|
| Taban çizgi (bileşik blok yok) | %79,86 | %76,29 |
| %50 | %79,07 | %75,88 |
| %65 | %79,67 | %76,68 |
| %80 | %80,09 | %78,66 |
| **%85 (seçildi)** | **%80,09** | **%79,16** |
| %90 | %80,06 | %79,14 |
| %95 | %79,94 | %78,38 |

### Sonuç

| | Önce | Sonra |
|---|---|---|
| **BR1-BR7 (static, 700 örnek)** | %79,86 | **%80,09** |
| **Giyotin (static, 300 senaryo)** | %76,29 | **%79,16** |
| BR1-BR7 (GRASP, 175 örnek) | %86,27 | %86,23 |
| Greedy | %75,23 | %75,23 |

Statik yolda büyük kazanç, aramada nötr — **arama bu kazancı sıralamayla zaten buluyormuş**.
Yine de tutuldu: statik yol üretimin hızlı yolu (2-5 ms / 2 sn) ve kapının referansı.

Kapı referansı tazelendi (`docs/algorithm/referans/br-wallbuilder-static.json`, %79,86 → %80,09); greedy
referansı dokunulmadan geçti.

---

## Sıcak döngüden gereksiz çakışma kontrolü çıkarıldı — **%17 hız, çıktı birebir aynı**

Aday taraması her adayda `HasOverlap` çağırıyordu: yerleşik kutu başına bir tarama, yani `O(N)`.

Ama aday **defterdeki boş bir boşluğun içinde doğuyor**: `x`, `y` ve `z` boşluk sınırlarına
kırpılı, ölçüler `space.Fits` ile sınanmış. Kutu tamamen o boşluğun içinde ve boşluk tanımı gereği
hiçbir yerleşik kutuyla kesişmiyor — **çakışma imkânsız.**

Çıkarıldı ve çıktının değişmediği ölçüldü: BR %80,09 → %80,09, giyotin %79,16 → %79,16, birebir.

| | Önce | Sonra |
|---|---|---|
| Giyotin medyan süre | 11,08 ms | **9,16 ms** |
| Giyotin p95 | 34,87 ms | **30,78 ms** |
| BR1-BR7 (GRASP) | %86,23 | %86,23 |

**Hız %17 arttı ama doluluk değişmedi.** Beklenen: süre/kalite eğrisi 2 saniyede zaten doygunluğa
yakın (2 sn → 4 sn yalnızca +0,19), dolayısıyla %17 daha fazla iterasyon ölçülebilir bir kazanç
vermiyor. Yine de tutuldu — gereksiz iş yapmamak ve ileride yerleştiriciyi ağırlaştıracak
çalışmalara alan açmak için.

Blok ve bileşik blok defterin **dışına** yerleştirdiği için orada çakışma kontrolü **duruyor**.
Güvenlik ağı bağımsız: 115 testin tamamı, duvar örücü ve GRASP dahil, çıktıda çakışma olmadığını
üretim kodundan bağımsız hesapla doğruluyor.

---

## ⑦ Yönelim anahtarları — ayarlı GRASP ile yeniden sınandı, yine kaybetti

Yönelim tercihini aramaya açmak daha önce ölçülmüş ve kaybetmişti; ama o ölçüm **eski GRASP
ayarlarıyla** yapılmıştı (alpha 0,30 / swaps 12). Ayarlar değiştiği için yeniden sınandı.

Vektör `2N + G`'ye çıkarıldı, tohumlar ilk yönelimle başlatıldı (negatif "tercih yok" değeri
vektörde taşınamaz).

| | BR1-BR7 (GRASP, 70 örnek) |
|---|---|
| Taban çizgi | %86,70 · %86,78 |
| Yönelim anahtarlarıyla | %86,68 |

Kazanç yok. İlk bulgu ayarlardan bağımsızmış: tarama zaten tüm yönelimleri görüp en sıkı oturanı
seçiyor, arama bu seçimi bozmaktan başka bir şey yapmıyor. Bağlantı kodu duruyor.

---

## ⑤ ve ⑥ — ölçülemez oldukları tespit edildi

**⑤ OBL (`R-C15`)** karşıt birey (`1−x`) üretimidir ve **popülasyon** gerektirir. GRASP popülasyon
tutmaz (her tur sıfırdan başlar, `DR-31`), GWCA ve GA ise emekli (`DR-13`). Yani madde bugünkü
varsayılan yol için **uygulanamaz**; GA'ya dönülürse anlamlı olur.

**⑥ `DR-10` / `DR-11` doğrulanamıyor — korpuslarda karşılığı yok.**

| Ne | Durum |
|---|---|
| `DR-10` sanal duvar kapsaması | LIFO gerektirir; **iki korpusta da `UnloadingOrder: null`** |
| `DR-11` `AvgWallFlushness` semantiği | Metrik **hiç üretilmiyor** — `R-C14`'ün `WallCount`, `AvgWallFlushness`, `ZoneViolations` alanlarının hiçbiri kodda yok |
| `DR-09` doluluk kilidi | Kilidin kaç kez devreye girdiği ölçülemiyor; `SearchStats` bunu taşımıyor |

Bu bir kusur değil, kapsamın sonucu: ölçüm programı baştan **yalnız hacim** üzerine kuruldu.
İki korpus da ağırlık, kırılganlık, istiflenemezlik, grup ve LIFO taşımıyor. Kısıt tarafının
**hiçbir kıyas kapsaması yok** — bugün yalnız birim testleriyle korunuyor.

---

## Adım 0 · Greedy kaldırılmadan önce: ağırlık dengesi gerilemesi ölçüldü

Greedy siliniyor. WallBuilder `BalanceScoring`'i hiç çağırmıyor — ne aday başına ağırlık merkezi
cezası (katsayı 900.000) ne de `ImproveBalance` takas geçişi var. Kayıp kabul edildi ama
**büyüklüğü silindikten sonra bir daha ölçülemez**, o yüzden önce ölçüldü.

**Ölçülen şey:** `|CoGx − yarıGenişlik| / yarıGenişlik` + `|CoGz − yarıUzunluk| / yarıUzunluk`,
yüzde olarak. Yani ağırlık merkezinin araç ortasından kaçması. Yalnız `WeightBalance` kriterli
senaryolar sayılır; öteki iki kriterde denge bir hedef değil, yan üründür.

Sabit sentetik korpus, tohum 1..20, 100 senaryo (40'ı `WeightBalance`):

| | Doluluk | **Denge ort. sapma** | Denge en kötü | Süre (medyan) |
|---|---|---|---|---|
| **Greedy** (bugünkü üretim) | %50,57 | **%9,21** | %40,0 | 52,6 ms |
| WallBuilder + Static | %50,88 | %38,35 | %99,9 | 1,9 ms |
| **WallBuilder + GRASP** (yeni üretim) | **%54,23** | **%28,14** | %84,3 | 1.370 ms |

600 senaryoluk geniş koşuda da aynı tablo: greedy %11,02 · WallBuilder+Static %39,11.

### Okunuşu

**Denge gerilemesi gerçek ve büyük: greedy'nin ~3 katı sapma.** GRASP kaybın bir kısmını topluyor
(%38,35 → %28,14) çünkü `SearchEvaluation.Cost` uygunluk fonksiyonunda denge terimi var ve
`WeightBalance` kriterinde ağırlığı 5e4 — diğer kriterlerde 5e2, yani **100 kat**. Ama sıra
düzeyinde optimize etmek, yerleştirme düzeyinde optimize etmenin yerini tutmuyor.

Buna karşılık **doluluk +3,66 puan** (%50,57 → %54,23) ve statik yol greedy'den **27 kat hızlı**.

### Bunun gelecekteki denge çalışmasına söylediği

Gerileme yerleştirme düzeyinde, arama düzeyinde değil. GRASP'ın 5e4 katsayısı zaten çalışıyor ve
tek başına yetmiyor. Dolayısıyla WallBuilder'a denge eklenirken hedef **uygunluk ağırlığını
büyütmek değil**, `OrientationFit`'e ağırlık merkezi terimi koymak ve/veya `ImproveBalance`
benzeri bir ikinci geçiş yazmak olmalı. Bu ölçüm o çalışmanın taban çizgisidir.

---

## Greedy kaldırıldı — duvar örücü tek yerleştirici oldu (`DR-39`)

Altı adımda yapıldı, her adım tek başına yeşil ve ayrı commit. Ölçüm önce, silme sonra.

### Doluluk etkisi: sıfır

| | Önce | Sonra |
|---|---|---|
| BR1-BR7 (static, 700 örnek) | %80,09 | **%80,09** |
| Giyotin (static, 300 senaryo) | %79,16 | **%79,16** |
| 17 golden snapshot | greedy çıktısı | duvar örücü çıktısı, yeniden üretildi |

Greedy'nin tarihsel değeri kayda geçti: BR1-BR7 **%75,23** (BR1 %76,67 · BR7 %73,78). Duvar örücü
statik yolda hem **+4,86 puan** daha dolu hem **27 kat** daha hızlı.

### Beklenmeyen bulgu: üç gerçek LIFO ihlali

Varsayılanı çevirmek üç LIFO testini kırdı ve bunlar **test beklentisi sorunu değildi**.
`[100,200)` bölgesine ait kutular `Z=0..60`'a düşüyordu — ikinci grubun yükü birinci grubun
bölgesine giriyor, yani sahada yanlış sırada boşaltma. Üç ayrı kök neden vardı (`DR-40`):

1. **Duvar döngüsü ilk aday veren duvarda duruyordu**, o aday bölge dışı olsa bile. Bir sonraki
   duvarda bölge içi aday olsa dahi görülmüyordu.
2. **`TryPlace` z'yi bölge başına çekmiyordu.** Greedy'de bölge başlangıçları extreme-point olarak
   tohumlanıyordu; duvar örücüde öyle bir tohum yok, dolayısıyla defterdeki boşluk `z=80`'den
   başlıyorsa aday hep 80'de doğuyordu — kutunun bölgesi `[100,200)` olsa bile.
3. **Blok inşası bölgeyi hiç sormuyordu.** `RaiseBlock` z'de bölgeyi aşabiliyor, `TopUp` ise
   yerleştirdiği **başka ürünü** kendi bölgesi dışına koyabiliyordu. Dikey LIFO kuralı zaten
   `ViolatesStackability`'deydi; eksik olan **bölge** kuralıydı.

Üçü de onarıldı. Bu, planın "kapsam dışı, ayrıca ele alınacak" diye işaretlediği `TopUp` kusurunu
da kapattı.

### Kurtarılan terim

12 Ağustos raporunun listelediği beş puanlama teriminden biri geri geldi:
`VolumeScoring.WidthTerm` (katsayı 1, "beraberlik bozucu") `OrientationFit.CornerDistance` oldu
(`DR-41`). Onsuz eşit adaylar arasında kazananı defter sırası belirliyordu ve yükleme köşesi
sözleşmesi beraberlikte kayboluyordu. Yani terim sayısı 5 → 1 değil **5 → 2**.

### Kapanan borç

Snapshot şemasına `FragilityType` eklendi — 12 Ağustos raporunun "sonraki yenilemede eklensin"
diye ertelediği madde. Kozmetik değildi: `InvariantScenarioSource` girdiyi snapshot'tan yeniden
kurduğu için, alan yokken değişmez testleri kırılgan kutuları sessizce `NonFragile` sayıyordu.

### Silinen kod ve sözleşme

`OptimizationEngine` 299 → 33 satır · `BalanceScoring` (220) · `VolumeScoring` (55) ·
`LifoPlacement.ZonePenalty` · `PlacementStrategy` enum ve tüm API/DB/test/TS yüzeyi ·
`EnableExperimentalStrategies` bayrağı ve ayar sınıfı · `OptimizationModules` 4 → 2 bayrak ·
CI'daki greedy işi ve `br-greedy-static.json`.

**Kriter ölmedi:** `ItemOrdering`, `PlacementValidator` ve `SearchEvaluation.Cost` hâlâ
`LoadingPlanOptimizationCriteria`'yı okuyor. Denge optimizasyonu yok olmadı, yerleştirme
düzeyinden **arama düzeyine** taşındı — ve ölçüm bunun yetmediğini söylüyor (yukarıdaki
`Adım 0` kaydı).

Testler: motor 109 · altyapı 32 · uygulama 228 · test arayüzü 201. Doluluk kapısı geçti.

---

## Teşhis · Arama gerçekten doymuş mu — **evet, ama sandığımız sebepten değil**

18 Ağustos 2026 tarihli araştırma yanıtı ([blok arama](arastirma/2026-08-18-yanit-blok-arama.md))
paradigma değişimini tek bir ölçüme bağladı: *"Aynı BR1 örneğinde GRASP'a 2 sn yerine 60 sn ver;
skor ~aynı kalıyorsa sorun kesin arama uzayında."* Eşik: 60 saniyede **+0,3 puandan az** artış
varsa doygunluk kesin.

BR1, 20 örnek, GRASP:

| Bütçe | Yineleme | Stall | Doluluk | Medyan süre |
|---|---|---|---|---|
| 2 sn | 100 (varsayılan) | 15 (varsayılan) | %85,12 | **1227 ms** |
| 2 sn | 100.000 | 15 | %85,14 | **1360 ms** |
| 2 sn | 100.000 | 100.000 | %85,11 | 2000 ms |
| 60 sn | 100 | 15 | %85,10 | **1209 ms** |

**Doygunluk doğrulandı.** Dört yapılandırma arasındaki en büyük fark 0,04 puan — ölçülmüş gürültü
bandının (±0,01) hemen üstünde, eşiğin (0,3) çok altında. Aramaya otuz kat zaman vermek hiçbir şey
kazandırmıyor. Sıra araması bitmiştir; kalan ~6 puan sıralayıcıda değil.

### Yan bulgu: bütçenin yarısını hiç kullanmıyoruz

Medyan süre sütunu beklenmedik. 60 saniye verildiğinde koşu **1209 ms**'de bitiyor — yani duran şey
saat değil. Frenleri tek tek açınca sıra çıktı:

1. `MaxIterations = 100` **bağlayıcı değil** — sınırsıza çekmek süreyi 1227 → 1360 ms yaptı, skoru
   değiştirmedi.
2. `StallIterations = 15` **bağlayıcı** — açınca süre 2000 ms'e çıktı, yani bütçe ilk kez doldu.
   Skor yine değişmedi (%85,11).

`SearchBudget` belgesindeki *"StallIterations ölçüldü ve etkisiz çıktı"* notu **doluluk açısından
doğru, süre açısından yanlış**: stall skoru etkilemiyor ama koşuyu erken bitiriyor. BR1'de arama
~1,2 saniyede yakınsıyor ve kalan 0,8 saniye boşa geçiyor.

**Üretim sonucu — ve sınırı.** BR1 ölçeğinde (3 tip, 112 kutu) arama ~1,3 saniyede yakınsıyor;
oradaki 0,7 saniye boşa geçiyor. Ama sonradan yedi kümenin tamamı ölçüldü ve **medyan süre BR3'ten
itibaren 2001 ms**, yani bütçe heterojen kümelerde gerçekten bağlayıcı:

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 |
|---|---|---|---|---|---|---|---|
| Medyan süre (ms) | 1305 | 1878 | **2001** | **2001** | **2001** | **2001** | **2001** |

Yani bütçeyi kısmak **yalnızca az tipli yüklerde bedava**. Gerçek sevkiyat BR1'e mi BR6'ya mı
benziyor sorusu cevaplanmadan bütçe düşürülmemeli; bu haliyle bir üretim kararı değil, bir
gözlemdir.

**Doğrudan sonucu:** araştırmanın Öneri 4'ü (reactive GRASP, path relinking, elite havuz) —
"sıra araması doymuşsa tavanı 1-2 puandan fazla kaldırmaz" uyarısıyla birlikte — **sıranın en
altına düşer.** Arama şemasını değiştirmeden yapılacak her şey aynı duvara çarpıyor.

---

## F6-2 · Yönelim eşlemesi düzeltildi — **+2,52 puan**, ve bu bir iyileştirme değil

Araştırma yanıtının (d) maddesi thpack biçimini kesinleştirdi: her kutu satırı
`tip, L, fL, W, fW, H, fH, adet` ve `f*` bayrağı **o ölçünün dikey durmasına izin**
anlamına geliyor. Yani `011` düzeni = "birinci ölçü dikey duramaz, diğer ikisi durabilir"
= **dört geçerli yönelim** (iki dikey seçim × yatay çiftin iki dizilişi).

Biz `011`'i `AllowedRotations.PitchOnly`'ye düşürüyorduk ve o **iki** yönelim veriyor: dikey
seçim korunuyor ama yatay çiftin 90 derecelik dönüşü kayboluyordu. BR verisinde `011` düzeni
tiplerin **%37'sini** kapsıyor. Yani motoru, örneklerin üçte birinden fazlasında yasal
yönelimlerin yarısından mahrum bırakıyorduk.

### Düzeltme

`AllowedRotations.NoVerticalWidth = 6` eklendi: `W` asla dikey olamaz, `H` ve `L` olabilir ve
her dikey seçim için yatay çift serbestçe döner. Küme, `All`'dan `W`'yi dikeye getiren ikisinin
(`Roll`, `RollYaw`) çıkarılmış hâlidir — dört yönelim. `PlacementValidator.GetOrientations` tek
noktadır, oraya bir `case` eklendi.

**Eklemeli olduğu için hiçbir mevcut davranış değişmedi:** 17 golden snapshot bayt bayt aynı
kaldı, 109/35/228 test yeşil. Arayüz de kırılmadı — kendi 0-5 sabit tablosunu ve `default`'lu
bir `switch` kullanıyor.

### Ölçüm

| | Önce | Sonra | Fark |
|---|---|---|---|
| **Static, BR1-BR7, 700 örnek** | %80,09 | **%82,61** | **+2,52** |
| BR1 | %79,32 | %82,78 | +3,46 |
| BR2 | %80,32 | %83,28 | +2,96 |
| BR3 | %80,72 | %83,15 | +2,43 |
| BR4 | %80,78 | %82,89 | +2,11 |
| BR5 | %80,41 | %82,55 | +2,14 |
| BR6 | %79,52 | %82,02 | +2,50 |
| BR7 | %79,59 | %81,57 | +1,98 |
| **GRASP, BR1, 20 örnek** | %85,12 | **%87,47** | **+2,35** |

Kazanç **BR1'de en büyük**, BR7'de en küçük — beklenen yön: az tipli sette bir tipin yönelim
kümesini ikiye katlamak duvar kesitini döşemeyi doğrudan kolaylaştırıyor.

**Bu bir algoritma iyileştirmesi değildir.** Kendi koyduğumuz bir handikabın kalkmasıdır; motorun
kalitesi hakkında yeni bir şey söylemez, yalnızca önceki sayıların yapay olarak düşük olduğunu
söyler. Literatürle fark 6 puandan ~4 puana indi ve bu farkın tamamı hâlâ gerçek.

### `free` ucu kaldırıldı

`strict` artık **tam** olduğu için `free` ucu BR'den geniş kalıyor — yani fiziksel olarak devrilecek
yerleşimleri sayıyor. `OrientationMode`, `--orientation` bayrağı ve iki uçlu raporlama kaldırıldı;
`DR-20` konusuz kaldı. `BrBaseline.Report.Orientation` alanı sabit `"Strict"` yazılarak korundu,
böylece referans dosyasının biçimi geçerli kaldı.

**CI referansı tazelendi:** `referans/br-wallbuilder-static.json` → %82,61.

---

## F6-1 · Duvar yüzü ölçüldü — **Öneri 3 doğrulandı**

Araştırmanın (c)2 teşhisi: *"Her duvar yüzünde (W×H) kaplanan alan oranını ölç; BR1'de %95'in
altındaysa 2B kaplama sorunu doğrulanır."* Böyle bir ölçü yoktu — `R-C14`'ün `WallCount` ve
`AvgWallFlushness` metrikleri hiç üretilmiyordu (`DR-38`'in bir parçası). `WallDiagnostics`
yazıldı: duvarları `z` ekseninde bağlantılı bileşen olarak ayırıyor, her duvarın kutularını
kesite izdüşürüp kaplanan alanı sayıyor, ölü havayı boş sütun / tavan diye ayırıyor.

BR1, GRASP, 20 örnek:

| Ölçü | Değer | Okuma |
|---|---|---|
| Duvar sayısı | 4,2 | — |
| Ortalama duvar derinliği | 209 cm | **Şüpheli** — aşağıya bakın |
| Kutu / duvar | 43,7 | — |
| **Yüz kaplama, ortalama** | **%90,9** | Eşik %95 → **altında** |
| Yüz kaplama, en düşük | %85,5 | |
| **%95 eşiğinin altındaki duvar oranı** | **%77** | Kesit sorunu **doğrulandı** |
| Ölü hava · boş sütun (kenar şeridi) | %5,8 | Kesit kaynaklı |
| Ölü hava · tavan artığı | %6,2 | Yükseklik kaynaklı |

**Teşhis:** duvar kesiti tam döşenmiyor ve kayıp neredeyse **eşit** bölünüyor — yarısı kenarda
kalan dikey şeritler, yarısı yığının tepesinde. İki ayrı müdahale gerekiyor; yalnız birini yapmak
kaybın yarısını bırakır.

**Ölçünün sınırı:** ortalama duvar derinliği 209 cm, kutu ölçülerine (30-100 cm) göre çok derin.
Duvar ayrıştırması `z`'de bağlantılı bileşen kullanıyor; bir kutu iki duvara birden yayılırsa
ikisi tek duvar sayılıyor. Bu, duvar sayısını **düşük**, kaplama oranını ise **yüksek** gösterir
— yani gerçek kaplama %90,9'dan muhtemelen daha kötüdür ve teşhis bu yönde güçlenir. Duvar
sınırını yerleştiriciden doğrudan raporlamak ayrı bir iş olarak açık.


### GRASP tarafı — tam ölçüm

| | Önce (%86,23) | Sonra | Fark |
|---|---|---|---|
| **BR1-BR7, GRASP, 175 örnek** | %86,23 | **%87,73** | **+1,50** |

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 |
|---|---|---|---|---|---|---|---|
| Önce | %84,74 | %86,19 | %87,09 | %87,06 | %87,02 | %86,35 | %85,17 |
| Sonra | %87,07 | %87,95 | %88,92 | %88,20 | %88,11 | %87,38 | %86,51 |
| Fark | **+2,33** | +1,76 | +1,83 | +1,14 | +1,09 | +1,03 | +1,34 |

Kazanç GRASP'ta static'ten küçük (+1,50 / +2,52) — beklenen: arama, kaybettiğimiz yönelimlerin bir
kısmını zaten sıra değiştirerek telafi ediyordu. **BR1 yine en çok kazanan** ve artık en kötü küme
değil; en kötü BR7 (%86,51).

---

## F6-1′ · Duvar sınırı tahminden ölçüme çevrildi — **beklenmedik bulgu: GRASP kutuların %45'ini duvara koymuyor**

İlk `WallDiagnostics` duvarları **tahmin ediyordu**: yerleşimleri `z` ekseninde bağlantılı bileşene
ayırıyordu, çünkü duvar sınırları yalnızca yerleştiricinin içinde biliniyordu. Tahminin yönünü
kaydetmiştim — duvar sayısını düşük, kaplamayı yüksek gösterir. Ölçüme çevirince doğrulandı.

`WallBuilderPlacement` zaten `walls` listesini tutuyordu; `OptimizationResult`'a `Walls` alanı
(`WallSegment(Start, End)`) eklendi ve liste doğrudan oraya geçti. **Ek tahsis yok** — var olan
liste dönüyor. Kalıcılık, API ve anlık görüntü eşlemelerinin hepsi alan alan olduğu için hiçbiri
etkilenmedi: 17 snapshot bayt bayt aynı, kapı geçti. Sözleşme teste bağlandı
(`DuvarDilimleri_ArtanSirada_VeCakismaz`, katalogdaki her senaryo).

### Tahmin ne kadar kayırmış (BR1, 20 örnek)

| | Tahmin | **Ölçüm** |
|---|---|---|
| Duvar sayısı (static) | 6,7 | **6,7** |
| Duvar sayısı (GRASP) | 5,3 | **3,8** |
| Ortalama duvar derinliği (static) | 86 cm | **86 cm** |
| Ortalama duvar derinliği (GRASP) | 159 cm | **47 cm** |
| Yüz kaplama (static) | %86,2 | **%86,2** |
| Yüz kaplama (GRASP) | %89,6 | **%48,9** |

Static'te tahmin ile ölçüm **birebir aynı** çıktı — orada her kutu bir duvara giriyor, dolayısıyla
bağlantılı bileşen ayrıştırması doğru cevabı veriyordu. Fark tamamen GRASP tarafında.

### Sebep: cep yerleşimi duvar kaydetmiyor

`WallBuilderPlacement.ScanPockets` kutuyu **duvar bandı olmadan** tüm defteri tarayarak
yerleştirir ve bir duvar kaydetmez. Kod bunu bilinçli bir ödünleşim olarak açıklıyor: *"Duvar
disiplini bir ÇIKTI BİÇİMİDİR, fiziksel kural değil… Kutuyu bandı yüzünden dışarıda bırakmak,
biçimi doluluğa tercih etmek olurdu."* Ölçüm de bunu destekliyordu: yerleşemeyen kutuların %75,5'i
kalan bir boşluğa geometrik olarak sığıyordu.

Ama `decoder.PocketBeforeNewWall` bir **kromozom genidir** (`DR-29`) ve açıkken cep taraması
duvar açmadan **önce** denenir. Boş konteynerde cep taraması her zaman başarılı olur — yani ilk
kutu bile duvarsız yerleşebilir ve o koşuda hiç duvar açılmayabilir.

### Ölçülen sonuç

| | Static | GRASP |
|---|---|---|
| **Duvar dışı kutu** | **%0,0** | **%45,0** |
| Duvar sayısı | 6,7 | 3,8 |
| Ortalama duvar derinliği | 86 cm | 47 cm |
| Yüz kaplama, ortalama | %86,2 | %48,9 |
| Yüz kaplama, en düşük | %74,0 | %43,3 |
| %95 eşiğinin altındaki duvar | %91 | %46 |
| Ölü hava · kenar şeridi | %8,5 | %3,0 |
| Ölü hava · tavan artığı | %6,7 | %3,4 |

**Arama, doluluğu duvar disiplininden vazgeçerek kazanıyor.** GRASP static'in 5 puan üstünde
(%87,47 / %82,61) ama ürettiği planın neredeyse yarısı duvar yapısının dışında. Bu, kimsenin
ölçmediği bir bedeldi; `PocketBeforeNewWall` geni ölçülürken yalnız doluluğa bakılmıştı.

### Bunun neden önemli olduğu

Katman inşasını müşteri **sahada yüklenemediği için** reddetti (`DR-12`) ve duvar örücüyü tam da
bu yüzden seçtik. Cep yerleşimi katman inşası kadar kötü değil — kutu yine desteklenmiş ve sekiz
sert kapıdan geçmiş durumda — ama "kapıdan içeri duvar duvar" çıktısı, kutuların %45'i için
geçerli değil. **Bu bir üretim/ürün kararıdır, algoritma kararı değil:** sahadaki ekip bu planı
yükleyebiliyor mu?

Üç yol var ve ölçmeden seçilmemeli:

1. **Olduğu gibi bırak.** Doluluk kazancı gerçek, kutular fiziksel olarak geçerli.
2. **`PocketBeforeNewWall`'ı kapat** ya da cebi duvar bandına sınırla — doluluk kaybı ölçülmeli.
3. **Cep yerleşimini de duvar olarak kaydet** — cep bir duvar açsın. Çıktı biçimi düzelir,
   yerleşim aynı kalır. En ucuz seçenek gibi görünüyor ama duvar tanımını değiştirir.

### Öneri 3'ün gerçek hedefi

Static'in **ölçülmüş** yüz kaplaması %86,2 ve duvarların **%91'i** %95 eşiğinin altında — yani
2B tam kaplama işi (Öneri 3) tahmin edilenden daha büyük bir açığı hedefliyor. Ölü hava static'te
kenara ağır basıyor (%8,5 kenar / %6,7 tavan), bu da kesit sorununu doğruluyor.

---

## F6-P · "Yedek yolu azami aç" denendi — **+0,33 puan, ama kısmi dolulukta biçim bozuluyor**

İki düzeltme önce geldi. Birincisi `DR-12`'nin gerekçesi: katman inşası **yükleme sırası/erişim**
sorunu yüzünden değil, **kısmi dolulukta yükün biçimi** yüzünden reddedilmiş. Yarım dolu bir araçta
katman inşası zeminin tamamını yarım yükseklikte kaplıyordu; gerçek bir sevkiyat böyle görünmüyor.
İşçi planın tamamlanmış hâlini görüyor, kutuları tek tek takip etmiyor — dolayısıyla `DR-45`'te
sorun sandığım "kutu iki duvarın dikişini kesiyor" durumu **sorun değil** ve o kayıt kapatıldı.

İkincisi ölçünün kendisi: kısmi doluluğu sınayacak bir düzenek yoktu. `br` komutuna `--load-ratio`
eklendi (her ürünün adedini ölçekler) ve `WallDiagnostics`'e **yük derinliği** metriği kondu —
yükün ulaştığı en büyük `z`, araç uzunluğunun yüzdesi. Okuma basit: bu değer doluluğa yakınsa yük
yoğun, doluluğun çok üstündeyse yayılmış.

### Deney: `PocketBeforeNewWall` static yolda sabit `true`

| | Duvar açık (bugün) | Cep azami |
|---|---|---|
| **Doluluk, BR1-BR7, 700 örnek** | %82,61 | **%82,94** (+0,33) |
| Açılan duvar sayısı (BR1) | 6,7 | **0** |
| Duvar dışı kutu | %0,0 | **%100,0** |

Cep taraması bant tanımadan tüm defteri tarıyor, yani duvar adaylarının **üst kümesi**. Önce
denendiğinde her kutuyu o alıyor ve yerleştirici **tek bir duvar bile açmıyor** — duvar örücü saf
"nereye sığarsa oraya" hâline geliyor.

Cebi her zaman yarıştırmayı da (`bestInZone` erken çıkışını kaldırmak) denedim: sonuç **birebir
aynı** (%82,94). Beklenen — üst küme zaten aynı adayı buluyor. Yani cep yolu bugünkü hâliyle de
azami; sıkıştırılacak başka puan yok.

### Kısmi doluluk sınavı — kararı bu belirledi

BR1, 20 örnek, yük yarıya indirildi. **İki kurulum da aynı doluluğu veriyor (%49,16)** ama biçim
farklı:

| | Duvar açık | Cep azami |
|---|---|---|
| Doluluk | %49,16 | %49,16 |
| **Yük derinliği** | **%70,5** | **%85,6** |
| Boş sütun (kenar şeridi) | %44,1 | %40,8 |
| Açılan duvar | 4,6 | 0 |

Cep azami açıkken yarım yük kamyonun **%86'sına** yayılıyor. Doluluk kazancı yok (aynı), biçim
kaybı gerçek. **Deney reddedildi**, `Neutral` geri `false` yapıldı.

Tam yükte kazandırdığı +0,33 puan, kısmi yükte tam olarak müşterinin reddettiği biçimi üretiyor.
Kötü takas.

### Yan bulgu: duvar açıkken de biçim ideal değil

Aynı ölçüyü bugünkü üretim kurulumunda dört doluluk seviyesinde koştum (BR1, 10 örnek):

| Yük | Doluluk | Yük derinliği | Yayılma (derinlik ÷ doluluk) |
|---|---|---|---|
| %25 | %24,2 | %41,9 | **1,73×** |
| %50 | %49,2 | %72,5 | **1,47×** |
| %75 | %73,0 | %95,2 | 1,30× |
| %100 | %83,8 | %98,0 | 1,17× |

**Araç ne kadar boşsa yük o kadar yayılıyor.** Çeyrek yükte mal, ihtiyaç duyduğu derinliğin 1,73
katına dağılıyor; yığın yüksekliği de yarıda kalıyor (%51,4), yani çıktı "birkaç yarım duvar"
oluyor — "kapının karşısından başlayan tam yükseklikte duvarlar, arkası boş" değil.

Katman inşası kadar kötü değil (o %100 derinlikte yarım yükseklik olurdu) ama **aynı ailedeki bir
kusur** ve bugüne kadar hiç ölçülmemişti. Doluluk tek başına ölçüldüğü sürece de görünmezdi:
yukarıdaki tabloda doluluk her iki kurulumda aynı, ayıran tek şey biçim.

**Açılan iş:** kısmi dolulukta yoğunlaşma, doluluğun yanında ikinci bir amaç olmalı. Yerleştirici
bugün bir duvarı tavana kadar doldurmadan sıradakine geçebiliyor; bunun ölçülü bedeli henüz
bilinmiyor.

---

## F6-5′ · Hedef derinlik — **doluluk hiç düşmüyor, yük öne toplanıyor**

Fikir kullanıcıdan geldi: yükün aracın ne kadarına yayılacağını **önceden hesapla**, bir esneklik
payı ver, ve yerleştirmeyi o derinliğe sıkıştır.

```
ideal  = toplam kutu hacmi / (genişlik × yükseklik)
hedef  = min(araç uzunluğu, ideal × pay)
```

### Payın tek başına yetmeyeceği baştan belliydi

İdeal derinlik **%100 doluluk** varsayar; biz tam yükte %83,8 yapıyoruz, yani gerçek ihtiyaç
ideal × ~1,17. Sabit 1,05 verilseydi kutular hedefe sığmaz ve doluluk düşerdi.

Bu yüzden hedef **sert sınır değil, tercih** olarak kuruldu: bir kutu hedefe sığmazsa hedef
`×1,10` büyütülür ve iki yedek yol yeniden denenir. Doluluk asla düşmez — pay yalnızca yerin
**nasıl** kullanıldığını değiştirir, **ne kadarının** kullanıldığını değil.

Alan ölçüm parametresi olarak eklendi (`OptimizationInput.DepthSlack`, `br --depth-slack`),
`SupportThreshold`'un `DR-16`'da kurduğu deseni izleyerek: üretim yolları doldurmuyor,
varsayılan `null` = bugünkü davranış.

### Ölçüm (BR1, 15 örnek)

| Yük | Doluluk | Derinlik · paysız | Derinlik · pay 1,05 | Yayılma |
|---|---|---|---|---|
| %25 | %24,23 | %40,9 | **%34,8** | 1,69× → **1,44×** |
| %50 | %49,09 | %70,9 | **%68,5** | 1,44× → 1,40× |
| %75 | %73,09 | %93,6 | **%91,0** | 1,28× → 1,25× |
| %100 | %82,61 | %98,0 | %98,0 | 1,17× |

**Doluluk her satırda birebir aynı.** Tam yükte 700 örnekte dört payın dördü de %82,61 — mekanizma
bedava. Kazanç çeyrek yükte en büyük (6 puan derinlik), yarım ve dörtte üçte 2-3 puan.

Pay değerini büyütmek işe yaramıyor (1,05 ≈ 1,15 ≈ 1,30): dar başlayıp esneme adımlarıyla
büyümek ile geniş başlamak aynı yere varıyor.

### Neden kazanç küçük kaldı — ve bunun ne anlama geldiği

Yarım yükte hedef derinlik %51,9 hesaplanıyor ama sonuç %68,5. Yani esneme **defalarca** tetikleniyor:
kutular hedef banda gerçekten sığmıyor.

Sığmama sebebi derinlik değil, **yükseklik**. Yığın %51'de takılıyor ve pay uygulandığında da
takılmaya devam ediyor (%51,5 → %51,1). Yerleştirici kutuları daha yükseğe yığabilseydi zaten
daha dar bir banda sığdırırdı; yığamıyor.

**Bu, kullanıcının ikinci fikrini (üst boşluğu duvar tanımadan doldur) ölçüyle bağlıyor ama aynı
zamanda sınırını gösteriyor:** üst boşluk erişilebilir olsaydı hedef derinlik onu zaten
kullandırırdı. Kullandıramadığına göre boşluk erişilemez — kutunun altında %80 destek verecek katı
bir yüzey yok.

Ve bu, `DR-44`'ün ölçtüğü şeyin aynısı: duvar yüzü %86,2 kaplanıyor, duvarların %91'i eşiğin
altında. **Kesit tam döşenmediği için duvar katı bir platform olmuyor, platform olmayınca üstüne
yığılamıyor, yığılamayınca yük derine yayılıyor.** Üç ayrı belirti, tek sebep.

**Sonucu:** Öneri 3 (duvar yüzünü 2B tam kapla) hem doluluğun hem biçimin önündeki tek darboğaz.
Hedef derinlik mekanizması korunuyor — bedava ve gerçek bir kazanç — ama tek başına tavanı
kaldırmıyor.

### Açık karar

`DepthSlack` bugün yalnız ölçüm düzeneğinde dolu. Üretime açmak doluluğu **hiç** düşürmüyor ve
biçimi iyileştiriyor; ama motorun çıktısını değiştirdiği için 17 snapshot'ın yeniden üretilmesi
gerekir. Karar kullanıcıya bırakıldı.

---

## Gözle test düzeneği bir kusur ortaya çıkardı — **fazla kutu doluluğu DÜŞÜRÜYOR**

Yerel ortama görsel doğrulama için altı araç (A-F), on beş ürün ve bir doluluk merdiveni kuruldu.
Ürün adı hangi araca kaç adet gideceğini söylüyor (`A19-C10-D9`). Merdiven, aynı ürün setini
ölçekleyerek aracın %80 / %90 / %100 / %115 hacmini hedefliyor; üst basamaklarda kutular taşıyor.

Merdiven beklenmedik bir şey gösterdi: **daha çok kutu verildiğinde doluluk düşüyor.**

| A aracı (245×265×1360) | İstenen kutu | Static doluluk | GRASP doluluk |
|---|---|---|---|
| %90 hedef | 139 | %71,1 | **%81,0** |
| %100 hedef | 154 | %71,2 | **%76,6** |
| %115 hedef | 176 | %67,7 | %80,1 |

C aracında aynı desen daha sert: %80 hedefte %66,1, %90 hedefte **%61,1**.

**Bu bir kusurdur.** Fazladan kutu en kötü ihtimalle yerleşmeden kalmalı; elde daha çok seçenek
varken sonucun kötüleşmesi için bir sebep yok. Yerleştirici tek geçişli ve geri dönüşsüz olduğu
için sıradaki kutu yanlış yeri kapatıyor ve sonraki kutular o kararı düzeltemiyor.

**Neden BR ölçümlerinde görünmedi:** BR örneklerinin kutu sayısı sabittir ve her örnek yaklaşık
tam yüktür. Aynı araca artan yük verme senaryosu hiç ölçülmedi. Ölçüm programı baştan "verilen
yükü ne kadar iyi yerleştiriyoruz" sorusuna kurulu; "yük artarsa ne oluyor" sorusu sorulmamıştı.

**Ayrıca:** GRASP'ın static'e üstünlüğü bu senaryolarda BR'dekinden çok daha büyük (85 → 129
yerleşen kutu). Yük taştığında sıra araması çok daha değerli hale geliyor.

Yeni iş olarak açıldı; bu oturumda çözülmedi.

---

## F7-0 · Duvar-öncelikli seçim — **reddedildi: kazanç sıfır, üstelik gizli bir değişmezi kırıyor**

Kullanıcının teşhisi: *"duvar tam dolabilecekken onu es geçip başka duvar açıyoruz."* Kodda
karşılığı şu: yeni duvar, **sıradaki** kutu açık duvarların hiçbirine sığmadığı anda açılıyor —
oysa listede aşağıda o duvarı tamamlayacak kutular olabilir.

Denenen kural değişikliği: yeni duvar ancak **kalan hiçbir kutu** açık duvarlara sığmadığında
açılsın. Sıradaki kutu sığmıyorsa ve ileride sığan biri varsa, sıradaki kutu **ertelensin**
(kuyruğun sonuna atılsın, en fazla bir kez).

### Ölçüm

| | Taban | Duvar-öncelikli |
|---|---|---|
| Static BR1-BR7, 700 örnek | %82,61 | **%82,61** |
| BR1 duvar yüzü kaplaması | %86,2 | %86,0 |
| %95 eşiğinin altındaki duvar | %91 | %91 |

**Hiçbir şey değişmedi.** Kapı (+0,5 puan *veya* +3 puan kaplama) tutmadı.

### Neden değişmedi — teşhisi keskinleştiren asıl bulgu

Premisim yanlıştı. Duvarlar **zaten kapanmıyor** (`R-C09`): her kutu için bütün açık duvarlar
taranıyor. Yani box `i` duvar 2'yi açsa bile, box `i+1` hâlâ duvar 1'e girebiliyor ve giriyor.
Erteleme yalnızca duvar 2'nin **ne zaman** açıldığını değiştiriyor, duvar 1'in doldurulup
doldurulmadığını değil.

Öyleyse duvar yüzü neden %86'da kalıyor? **Sıralama yüzünden değil, geometri yüzünden:** kesitte
kalan boşluklara elimizdeki kutular, yerleştiricinin denediği yönelim ve konumlarda **girmiyor**.

Bu, `DR-44`'ü sıralama açıklamasından temizliyor ve tek adaya indiriyor: **blok kataloğu +
boşluk-blok kararı** (F7-2/F7-4). "Duvarı daha uzun süre açık tut" ailesindeki bütün fikirler
konusuz kaldı.

### Yan bulgu: ana döngünün tek yönlü ilerlemesi gizli bir değişmezmiş

Deneme bir fizik değişmezini kırdı: `Buyuk500_WeightBalance` senaryosunda **501 kutu yerleşti,
500 istenmişti** — bir kutu iki kez konmuş.

Sebep: `consumed[]` yalnızca **blok inşasının yuttuğu** birimleri işaretliyor; ana döngüde yerleşen
birimler işaretlenmiyor. Bu bugüne kadar güvenliydi çünkü döngü `instances` üzerinde **tek yönde**
ilerliyor ve geriye hiç bakmıyor. Kuyruk bunu bozuyor: geç işlenen erken bir indeks için
`RaiseBlock(index + 1, ...)` çağrısı, aradaki zaten yerleşmiş birimleri yeniden yutabiliyor.

Yazılı bir kural değildi; kodun şeklinden doğan bir varsayımdı. **F7-4'te beam search sırayı
serbestçe değiştireceği için bu tuzak orada da kurulur** — beam'e geçmeden önce ana döngüde
yerleşen birimler de `consumed` işaretlenmeli. Yol haritasına not düşüldü.

Değişiklik geri alındı; 129 test yeşil.

---

## F7-1 · BR0-BR15 alındı — `DR-38`'in veri boşluğu kapandı, ve heterojenlik merdiveni tamamlandı

Kullanıcının paylaştığı Metasolver incelemesindeki bonus: `problems/clp/benchs/BR/` dizininde
**BR0-BR15'in tamamı** duruyor. Uzun süredir açık olan borç (`DR-38`) tek bir indirme ile kapandı.

### Önce doğrulama

Benimsemenin ön koşulu, elimizdeki yedi kümenin aynı veri olduğuydu. BR1-BR7 dosyaları
`thpack1-7` ile **satır sonu dışında birebir aynı** çıktı (CRLF/LF; boyut farkı satır sayısı
kadar). Bu yüzden o yedi dosya **değiştirilmedi**, yalnız adları değişti — ve ölçüm bunu
doğruladı: varsayılan koşu %82,61, bit birebir aynı, kapı geçti.

### Adlandırma tuzağı kapatıldı

Dosyalar `thpack{n}.txt` → `br{n}.txt` oldu. Sebep sadece tutarlılık değil: OR-Library'deki
`thpack8`/`thpack9` **BR8/BR9 değildir** (Loh & Nee ve Ivancic problemleri, farklı ölçek ve
başlık biçimi); `thpack10`/`thpack11` adresleri ise `thpack1`'in kopyasını döndürüyor. İki
adlandırma şeması bir arada dursaydı bu karışıklık er geç bir ölçüme girerdi.

### Heterojenlik merdiveni — hiç görmediğimiz uçlar

| Küme | Kutu tipi | Static | GRASP | GRASP kazancı |
|---|---|---|---|---|
| **BR0** | 1 | **%84,28** | %84,41 | **+0,13** |
| BR1 | 3 | %82,78 | %87,07 | +4,29 |
| BR7 | 20 | %81,57 | %86,51 | +4,94 |
| **BR8** | 30 | %80,36 | %85,26 | +4,90 |
| BR9 | 40 | %79,26 | — | |
| BR10 | 50 | %78,65 | — | |
| BR11 | 60 | %77,63 | — | |
| **BR12** | 70 | %77,35 | %81,23 | +3,88 |
| BR13 | 80 | %77,52 | — | |
| BR14 | 90 | %76,80 | — | |
| **BR15** | 100 | **%76,78** | %80,09 | +3,31 |

*(GRASP satırları 25 örnek, static satırları 100 örnek)*

**Eğri sağlıklı ve tekdüze:** tek tiplide %84,28'den yüz tiplide %76,78'e düzgün iniyor. Anomali
yok — `DR-48`'deki tekdüzelik kusuru *aynı araca artan yük* verildiğinde çıkıyor, kutu çeşidi
arttığında değil.

**BR0 arama katmanını çıplak gösteriyor:** tek kutu tipinde GRASP'ın kazancı **+0,13 puan**, yani
yok. Sıralanacak bir şey olmayınca sıra araması işsiz kalıyor — beklenen ama ilk kez ölçüldü.
Kazanç tip sayısıyla birlikte doğuyor ve BR7-BR8 civarında tepe yapıyor (+4,9).

### Varsayılan koşu bilinçli olarak BR1-BR7'de bırakıldı

`br` bayraksız çalıştırıldığında yine yalnız BR1-BR7 koşuyor. Literatürle kıyaslanan sayı budur ve
gecelik kapı onu sabitliyor; yeni kümeleri sessizce katmak baş sayıyı hem kıyaslanamaz hem sekiz
kat yavaş yapardı. BR0 ve BR8-BR15 `--set N` ile ölçülür.

`--set` sentinel'i değişti: "hepsi" artık `0` değil, **bayrağın verilmemesi**. BR0 gerçek bir küme
olduğu için `0` artık onu seçiyor.

---

## F7-2 · Blok kataloğu — **kapı rahat geçti, ama beklenmedik bir şey söylüyor**

Bugünkü yerleştirici bloğu **tepkisel** üretiyor: önce bir kutu yerleşiyor, sonra `RaiseBlock`
çevresine aynı ürünün kalanlarını örüyor. Yani blok bir **sonuç**. Blok tabanlı arama için blok bir
**girdi** olmalı — "bu boşluğa hangi blok" sorusunu sorabilmek için adayların önceden elde olması
gerekir.

`BlockCatalog` yazıldı: her ürün için, her yönelimde, araca ve eldeki adede sığan bütün
`nx × ny × nz` dizilimleri. Katalog **sert kurallara uyar** — dikey tekrar sayısı
istiflenebilirlik, kırılganlık, `MaxStackCount` ve `MaxWeightOnTop` ile sınırlanır. Yasadışı blok
üretmek arama bütçesini boşa harcamak olurdu ve daha kötüsü, aday yerleştirme anında sessizce
düşerdi.

Bileşik bloklar (farklı ürünlerin birleşimi) bu adımda **yok**: ölçüldü ve GRASP altında kazancı
sıfırdı; literatürde de basit→jenerik blok farkı yalnız 0,3 puan. Önce arama şeması kurulur.

11 sözleşme testi yazıldı: araç dışına taşma yok, eldeki adet aşılmıyor, istiflenemez ve kırılgan
ürün tek katman, `MaxStackCount`/`MaxWeightOnTop` sütunu sınırlıyor, sıra deterministik.

### Kapı: üretim süresi < 50 ms

| Küme | Tip | Blok sayısı | Üretim | Kutu/blok ort | Azami kutu |
|---|---|---|---|---|---|
| **BR0** | 1 | 634 | 0,9 ms | **35,2** | **990** |
| BR1 | 3 | 1385 | 2,0 ms | 18,8 | 70 |
| BR4 | 10 | 1946 | 2,7 ms | 7,7 | 22 |
| BR7 | 20 | 1852 | 2,6 ms | 4,7 | 16 |
| BR8 | 30 | 1809 | 2,6 ms | 3,8 | 10 |
| BR12 | 70 | 1073 | 1,9 ms | 2,0 | 6 |
| **BR15** | 100 | 838 | 1,6 ms | **1,5** | 4 |

**Kapı geçti, hem de rahat.** Azami 2,7 ms (eşik 50), azami 1946 blok (üst sınır 10.000, hiç
dayanılmadı). Üst sınır ve süre endişesi ölçümle kapandı — 2 saniyelik bütçeye göre üretim maliyeti
binde bir mertebesinde.

### Beklenmedik bulgu: blok ile arama birbirini tamamlıyor

Kutu/blok sütunu heterojenlikle birlikte **çöküyor**: BR0'da bir blok ortalama 35 kutu taşırken
BR15'te 1,5 kutu taşıyor. Sebep basit — tip başına adet düşüyor (BR0'da 122 birim tek tipte,
BR15'te tip başına 1-2 birim), blok kuracak malzeme kalmıyor.

Bunu `F7-1`'deki GRASP kazançlarının yanına koyunca tablo netleşiyor:

| Küme | Kutu/blok | GRASP kazancı |
|---|---|---|
| BR0 | **35,2** | **+0,13** |
| BR1 | 18,8 | +4,29 |
| BR8 | 3,8 | +4,90 |
| BR15 | **1,5** | +3,31 |

**İki mekanizma ters yönde çalışıyor.** Blok zenginliği aramanın işe yaramadığı yerde (BR0: tek
tip, sıralanacak şey yok) azami; aramanın en değerli olduğu yerde (BR15) neredeyse yok.

Bunun F7 için iki sonucu var:

1. **BSG'nin "blok" tarafı BR15'te fiilen devre dışı kalacak** — blok tek kutuya dejenere olur ve
   BSG düz bir "kutu-boşluk" beam search'e döner. Kazanç oradan gelmeyecek.
2. **Ama asıl kaldıraç zaten blok zenginliği değil, arama şeması.** Fanslau & Bortfeldt'in kendi
   verisi bunu söylüyordu (basit→jenerik blok farkı 0,3 puan) ve bizim bileşik blok ölçümümüz de
   aynı yöne çıkmıştı. Bu ölçüm o iddiayı üçüncü bir yoldan doğruluyor.

Yani F7-4 (beam çekirdeği) kapısı, F7-2'nin kendisinden daha belirleyici. Katalog gerekli ama
yeterli değil — zaten öyle planlanmıştı.

Testler 140/35/228 yeşil, kapı geçti (%82,61 — motor davranışı değişmedi, katalog henüz kimse
tarafından çağrılmıyor).

---

## F7-3 · VCS aday değerlendirme — **kapı aşıldı: static +0,65, GRASP +0,37**

Bugüne kadar aday seçimi **sözlükbilimseldi**: önce yerçekimi, eşitse duvar derinliği, eşitse blok,
eşitse artık… Her anahtar bir öncekini asla deviremezdi. Koddaki gerekçe şuydu: *"ağırlıklı toplam
olsaydı katsayıların kalibrasyonu yeni bir borç olurdu."*

VCS (Araya, Guerrero & Nuñez 2017) ağırlıklı **çarpımdır** — dört terim birbirini dengeler:

```
değer = hacim^δ × (1 − kayıp)^β × temas^α × (1 / kutu)^γ
```

### Üsteller ölçülmedi — bu bir tahmindir

Kaynakta fonksiyonun **biçimi** var, katsayıları yok; elimizdeki inceleme de vermiyor. Dördü de
`1` alındı — nötr bir başlangıç, kalibre edilmiş değer değil. İki terim de yaklaşımdır:

- **Kayıp:** kaynakta kalan kutu ölçüleriyle knapsack tahmini. Burada daha ucuzu — bloğu koyunca
  kalan dilim en küçük kutunun kısa kenarından darsa o dilim kesin kayıptır. "Girer ama kötü
  dolar" durumunu yakalamaz; buna karşılık maliyeti sabittir ve aday başına koşabilir.
- **Temas:** taban ayak izi + araç yüzeylerine değme. Komşu kutulara değme hesaplanmıyor
  (yerleşim listesini taramak gerekirdi, sıcak döngüde pahalı).

### Ölçüm

| | Taban | VCS | Fark |
|---|---|---|---|
| **Static, BR1-BR7, 700 örnek** | %82,61 | **%83,26** | **+0,65** |
| **GRASP, 175 örnek** | %87,73 | **%88,10** | **+0,37** |

Kümeye göre (static):

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 |
|---|---|---|---|---|---|---|---|
| Taban | %82,78 | %83,28 | %83,15 | %82,89 | %82,55 | %82,02 | %81,57 |
| VCS | %82,47 | %83,35 | %83,68 | %83,40 | %83,59 | %83,17 | **%83,17** |
| Fark | **−0,31** | +0,07 | +0,53 | +0,51 | +1,04 | +1,15 | **+1,60** |

### İki şey söylüyor

**1. Kazanç heterojenlikle büyüyor** — BR1 kaybediyor, BR7 en çok kazanıyor. Muhtemel sebep:
sözlükbilimsel sıra az çeşitli yükte iyi çalışan bir önceliklendirmeydi (önce yerçekimi, sonra
duvar derinliği…). Çok çeşitli yükte terimler arasında **ödünleşme** gerekiyor ve sert öncelik
bunu yapamıyor. Bu, `DR-51`'in blok tablosunun **tam tersi** deseni: blok zenginliği BR1'de azami,
VCS kazancı BR7'de azami. Üçüncü kez aynı sonuç — kaldıraç arama ve değerlendirme tarafında.

**2. Arama bu kazancı silmiyor.** Bileşik blok statikte +2,87 verip GRASP'ta ±0 olmuştu; VCS
GRASP'ta da +0,37 tutuyor. Yani aramanın kendi başına bulamadığı bir şey ekliyor.

### `OrientationFit` kaldırılmadı

VCS eşitliğinde eşlik bozucu olarak duruyor. Determinizm (`R-C02`) bunu gerektiriyor: iki aday aynı
değeri aldığında kazananı defter sırasına bırakmak makineye bağlı çıktı üretirdi.

### Kabul

- 17 golden snapshot **kaymadı** — o senaryolar VCS altında da aynı çıktıyı veriyor.
- 153/35/228 test yeşil; fizik değişmezleri hem static hem GRASP yolunda korunuyor.
- Duvar yüzü kaplaması %86,2 → %86,3, yani değişmedi. Beklenen: `DR-49` bunun **geometri** sorunu
  olduğunu göstermişti, aday seçimi sorunu değil.
- CI referansı tazelendi: **%83,26**.

**Açık borç:** üsteller kalibre edilmedi. Dördü de `1` ve bu değerin en iyi olduğuna dair hiçbir
ölçüm yok — tarama F7-4'ün işidir. Bugünkü +0,65, kalibrasyonsuz bir tabandır.

---

## F7-4 öncesi · VCS üstelleri tarandı — **fonksiyon üstellerine duyarsız çıktı**

`DR-52` üstelleri açık borç bırakmıştı: kaynakta fonksiyonun biçimi var, katsayıları yok, dördü de
`1` alınmıştı. Tarama yapılabilsin diye `OptimizationInput.VcsWeights` ve `br --vcs A,B,C,D`
eklendi (`SupportThreshold`/`DepthSlack` deseni).

BR1-BR7, 700 örnek, static — her fark **gerçek**, static saf hesaptır ve gürültüsüzdür.

### Tek terim taraması (taban `1,1,1,1` = %83,26)

| Değişen | Değer | Doluluk |
|---|---|---|
| hacim | 2 | %83,32 |
| hacim | **0,5** | **%82,64** |
| kayıp | 2 | %83,30 |
| kayıp | 0,5 | %83,21 |
| temas | 2 | %83,19 |
| temas | **0** | **%82,98** |
| kutu | **2** | **%81,77** |
| kutu | 0,5 | %83,35 |
| kutu | 0 | %83,32 |

İki net yön: **hacim üstelini küçültmek zararlı** (0,5 → −0,62) ve **kutu cezasını büyütmek çok
zararlı** (2 → −1,49). Az kutuyla doldurma tercihi aşırıya kaçınca büyük blokların önünü kesiyor.
Temas terimini sıfırlamak da zarar veriyor, yani terim gerçekten çalışıyor.

### Kombinasyonlar — ve plato

| Yapılandırma | Doluluk |
|---|---|
| `2,1,1,0.5` | %83,35 |
| `3,1,1,0.5` | %83,38 |
| `2,1,0.5,0.5` | %83,38 |
| `6,1,1,0.5` | %83,39 |
| **`3,2,0.5,0.5`** | **%83,40** |

25 yapılandırma tarandı. "Hacim yüksek, kutu cezası düşük" bölgesindeki **her** yapılandırma
%83,35-83,40 arasında kalıyor. En iyi ile nötr arasındaki fark **+0,14**.

### Asıl sonuç: kazanç üstellerde değil, biçimde

| | Static | GRASP |
|---|---|---|
| Sözlükbilimsel anahtar | %82,61 | %87,73 |
| VCS, nötr üsteller | %83,26 (+0,65) | %88,10 (+0,37) |
| VCS, kalibre `3,2,0.5,0.5` | **%83,40** (+0,14) | **%88,34** (+0,24) |

**Biçim değişikliği kalibrasyonun 4-5 katı kazandırdı.** Bu iyi haber: fonksiyon kırılgan değil,
üsteller yanlış tahmin edilse bile kazancın çoğu duruyor. Kötü haber ise ince ayarda başka puan
kalmamış olması.

İlginç ayrıntı: kalibrasyon GRASP'ta (+0,24) static'ten (+0,14) daha çok kazandırdı. Beklenenin
tersi — genelde arama, yerleştirici kazançlarını yutar. Buradaki üsteller aramanın kendi başına
telafi edemediği bir tercih taşıyor.

`3,2,0.5,0.5` varsayılan yapıldı. `Neutral` (1,1,1,1) referans noktası olarak duruyor; testler onu
kullanıyor çünkü sınanan şey fonksiyonun **yönü**, kalibrasyonu değil.

17 snapshot kaymadı, 153/35/228 yeşil, CI referansı **%83,40**.

### F7-4 (beam çekirdeği) hakkında bir düzeltme

Yol haritası F7-4'ü "blok yerleştirme beam search" diye yazmıştı. Ölçümler bu tarifi daralttı:

- `DR-51`: blok zenginliği heterojenlikle çöküyor (BR15'te kutu/blok 1,5) — blok tarafı orada
  dejenere.
- Ölçüm günlüğü, daha önce: *"Bloğu x/z'de büyütmek — ±0"*. Blok **şekli** zaten nötr ölçülmüş ve
  `RaiseBlock` bloğu maksimal büyütüyor.
- `DR-49`: duvar sırasını değiştirmek sıfır kazanç.

Yani F7-4'ün değeri blokta veya sırada değil, **ileri bakışta**: "bu kararı verirsem sonu ne olur".
Bu da durum kopyalamalı gerçek bir beam gerektiriyor — `SpaceLedger` + yerleşim listesi + tüketim
durumunun ucuz klonlanabilmesi. Kestirme yok; iki kestirme (duvar sırası, blok şekli) ölçümle
elendi.

---

## F7-4 · İleri bakışlı ışın araması kuruldu — **çalışıyor, ama GRASP'ı geçmiyor**

Üç kestirme ölçümle elenmişti (`DR-49` duvar sırası, `DR-51` blok zenginliği, günlükteki "bloğu
x/z'de büyütmek ±0"). Geriye tek şey kalmıştı: **ileri bakış** — "bu kararı verirsem sonu ne olur".
O da durum kopyalamalı gerçek bir arama gerektiriyordu.

### Kurulan

- `SpaceLedger.Clone()` — sığ kopya yeter, `FreeSpace` bir `readonly record struct`.
- `PlacementState` — yerleştirmenin yarım kalmış hâli tek yerde: yerleşimler, defter, duvarlar,
  tüketilmiş birimler, ağırlık, hedef derinlik.
- `WallBuilderPlacement.Run(..., start, ..., stopAfterPlacements)` — verilen durumdan **devam eder**
  ve belirli sayıda yerleştirmeden sonra **durur**.
- `BeamSequencer` — planı parça parça kurar; her parçada altı yerleştirici ayarı denenir, her
  deneme sonuna kadar açgözlülükle tamamlanır (**yalnızca ölçüm için**, sonuç atılır), en iyi
  ışın genişliği kadar yarım plan tutulur.

Ayrım **davranışı değiştirmedi**: durum ayıklaması sonrası BR1-BR7 %83,40, 17 snapshot kaymadı.

### `DR-49`'un uyarısı aynen gerçekleşti

Beam ilk koşuda değişmez testlerini kırdı: *"adet korunumu bozuldu: yerleşen 518, istenen 500."*

Sebep tam olarak `DR-49`'da yazılan şey: `consumed[]` yalnızca blok inşasının yuttuğu birimleri
işaretliyordu; ana döngüde yerleşenler işaretlenmiyordu çünkü döngü tek yönde ilerliyor ve indeksi
bir daha ziyaret etmiyordu. **Yarım durumdan devam eden arama bu yazılmamış varsayımı çökertti.**

Düzeltildi (`consumed[index] = true`) ve statik yol bit birebir aynı kaldı — tek yönlü döngüde
işaretleme zaten bir fark yaratmıyor. 173 motor testi yeşil; beam artık sekiz sert kapıyı ve adet
korunumunu koruyor.

### Ölçüm — ışın/parça taraması (BR1-BR7, 12 örnek)

| Işın × parça | Doluluk |
|---|---|
| 3 × 16 kutu | %86,60 |
| 8 × 16 | %86,83 |
| 3 × 5 | %87,06 |
| 8 × 5 | %87,26 |
| 16 × 5 | %87,36 |
| **8 × 2** | **%87,48** |
| 8 × 1 | %87,66 *(bütçe bağlayıcı)* |

Tekdüze iyileşiyor: ince parça ve geniş ışın daha iyi. En iyi **%87,66**.

### Eşit bütçede GRASP ile karşılaştırma (8 örnek/küme)

| Bütçe | Beam | GRASP |
|---|---|---|
| 100 ms | %86,64 | **%86,70** |
| 250 ms | %86,81 | **%87,38** |
| 500 ms | %87,13 | **%87,93** |
| 2000 ms | %87,66 | **%88,48** |

**GRASP her bütçede önde.** Beam rekabetçi ama kazanmıyor; fark bütçe büyüdükçe açılıyor
(0,06 → 0,82 puan). F7-4 kapısı (static ≥ %89) çok uzakta.

### Neden — ve eksik olan ne

Bu **kısmi** bir BSG. İskelet doğru: ileri bakış, durum kopyalama, ışın seçimi, determinizm. Ama
dallanma uzayı yanlış:

- Kurduğum beam **yerleştirici ayarları** üzerinde dallanıyor (altı varyant: duvar derinliği ×
  cep sırası). Bu, GRASP'ın tek küresel decoder geninden daha ince — parça başına ayrı ayar
  seçebiliyor — ama hâlâ **çok kaba** bir uzay.
- BSG'nin dallandığı şey **(blok, boşluk) çifti**. Kaynağın da söylediği bu:
  *"hangi boşluğa hangi blok"*. `BlockCatalog` yazıldı (`DR-51`) ama beam'e **hiç bağlanmadı**.
- Değerlendirme tam açgözlü tamamlama; pahalı, dolayısıyla dal sayısını sınırlıyor.

Yani sonuç F7-4'ün reddi değil, **yarısının** yapıldığının kaydı: altyapı (kopyalanabilir durum,
devam edebilen yerleştirici, ışın döngüsü) çalışıyor ve doğrulandı; asıl kaldıraç olan blok-boşluk
aksiyon uzayı bağlanmadı.

**GRASP üretim varsayılanı olarak kalıyor.** `SequencerKind.Beam` ölçüm için açık; kimse
otomatik olarak almıyor.

---

## F7-4b · Aksiyon uzayı değişti — **%89,42: GRASP ilk kez geçildi**

`DR-54` beam'in neden yetmediğini teşhis etmişti: iskelet doğruydu ama dallanma **yerleştirici
ayarları** üzerindeydi (altı varyant), oysa BSG *(blok, boşluk)* çifti üzerinde dallanır.

Tek değişiklik yapıldı: **dallanma noktası "sıradaki ürün hangisi olsun" oldu.**

Yerleştirici sıradaki kutuyu alıp çevresine aynı üründen blok ördüğüne göre (`RaiseBlock`), bu
soru fiilen *"bu boşluğa hangi blok"* sorusudur — kataloğu ayrıca bağlamaya gerek kalmadı.

Uygulama detayı: `consumed[]` konuma bağlı olduğu için sıra listesi değişince yeniden eşlenmeli.
`PlacementState.WithConsumed` bunu yapıyor — yerleşimler, defter ve duvarlar konumdan bağımsız,
oldukları gibi taşınıyor.

### Ölçüm (BR1-BR7, 12 örnek)

| Işın × parça | F7-4a *(ayar dallanması)* | **F7-4b** *(ürün dallanması)* |
|---|---|---|
| 8 × 5 kutu | %87,26 | **%89,46** |
| 8 × 1 | %87,66 | %88,57 |
| 16 × 5 | %87,36 | %89,23 |

Aynı iskelet, aynı bütçe, **+2,2 puan.** Teşhis doğruydu: sorun ileri bakışta değil, neye ileri
baktığındaydı.

### 175 örnekte doğrulama

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 | **Ortalama** |
|---|---|---|---|---|---|---|---|---|
| GRASP | %86,35 | %88,11 | %89,14 | %88,61 | %88,58 | %88,45 | %87,48 | %88,34 |
| **Beam** | %88,31 | %89,21 | %90,04 | %89,51 | %90,13 | %89,47 | %89,27 | **%89,42** |
| Fark | **+1,96** | +1,10 | +0,90 | +0,90 | +1,55 | +1,02 | **+1,79** | **+1,08** |

**Her kümede kazanıyor.** En çok BR1'de (+1,96) — ki orası GRASP'ın en zayıf, blok zenginliğinin
en yüksek olduğu küme (`DR-51`). İki mekanizmanın birbirini tamamladığı tahmini tutuyor.

Medyan süre 416-2000 ms; yalnız BR7 bütçeyi dolduruyor.

**F7-4 kapısı (static ≥ %89) geçildi:** %89,42.

### Neden çalıştı

Üç ölçüm bu sonucu önceden işaret ediyordu ve üçü de doğrulandı:

- `DR-43` — sıra araması doymuştu; GRASP sırayı *permütasyon* olarak arıyordu ve o uzay bitmişti.
- `DR-51` — blok zenginliği heterojenlikle çöküyordu; ama "hangi ürün sırada" kararı blok
  zenginliğinden bağımsız çalışıyor.
- `DR-54` — beam iskeleti çalışıyordu, eksik olan aksiyon uzayıydı.

GRASP ile fark şurada: GRASP **tüm planı** bir permütasyonla belirliyor ve o permütasyonu rastgele
bozup düzeltiyor. Beam ise **her parçada** o ana kadarki duruma bakarak karar veriyor ve kararı
sonuna kadar götürüp ölçüyor. Aynı bütçede ikincisi daha bilgili.

### Güvence

- 173 motor testi yeşil; beam sekiz sert kapıyı ve adet korunumunu koruyor (`DuvarOrucu_IsinAramasiyla_*`).
- Beam **taban çizgisinin altına inemez**: `best` bugünkü statik koşuyla başlıyor ve yalnız
  iyileşmede güncelleniyor (`R-C16`/`R-C21` ile aynı ilke).
- Statik yol bit birebir aynı (%83,40), 17 snapshot kaymadı, kapı geçti.
- Determinizm: hiçbir rastgelelik yok. Bütçe duvar saati olduğu için makineye bağlı — GRASP'takiyle
  **aynı** kısıt, dolayısıyla CI kapısı statik yolu ölçmeye devam ediyor (`DR-28`).

**Üretim varsayılanı henüz değiştirilmedi.** GRASP'tan beam'e geçmek ayrı bir karar; `DR-24`'ün
gerekçesi ölçümle yenilendi ama geçiş kendi doğrulamasını ister.

---

## F7-5 · Beam üretim varsayılanı oldu — **%86,23 → %89,40**

`DR-55` beam'in GRASP'ı yedi kümenin yedisinde de geçtiğini ölçmüştü. Geçiş yapıldı; iki iş önce
kapatıldı.

### 1. Ayarlar ölçüldü ve sabitlendi

Beam, `SearchBudget`'in `PopulationSize`/`MaxIterations` alanlarını kullanıyordu. O alanlar GRASP
için ayarlı (20/100) ve beam'de **ölçülen en kötü bölgeye** denk geliyordu. Kendi sabitlerine
çevrildi:

| Işın genişliği | Doluluk | | Dallanma noktası | Doluluk |
|---|---|---|---|---|
| 4 | %89,12 | | 10 | %89,43 |
| 6 | %89,16 | | **20** | **%89,46** |
| **8** | **%89,46** | | 25 | %89,24 |
| 12 | %89,29 | | 80 | %88,57 |
| 16 | %89,23 | | | |

Beam artık bütçeden yalnız **süreyi** paylaşıyor.

### 2. Koşu kimliği eklendi

Beam `SearchStats` üretmiyordu; `DR-26` determinizm sözleşmesi için bunu gerektiriyor. Seviye
sayısı, değerlendirme sayısı, doluluk geçmişi ve süre eklendi.

### 3. Süre taşması düzeltildi

Üretimde ilk ölçüm **4,52 sn** çıktı — bütçe 2 sn olmasına rağmen. Sebep: süre kontrolü yalnız en
içteki döngüdeydi, dolayısıyla bir **seviye** tamamen koşuyordu (8 ışın × 4 ürün × 3 ayar = 96 dal,
her biri bir tamamlama). Kontrol üç döngüye yayıldı; doluluk korundu (%89,42 → %89,40), süre
2000 ms'de kapanıyor.

### Uçtan uca doğrulama

Aynı istek, aynı yük (A aracı, 95 kutu), üç sequencer:

| Sequencer | İstek süresi |
|---|---|
| Static | **2,09 sn** |
| GRASP | 4,09 sn |
| **Beam** | **4,06 sn** |

**Beam ile GRASP arasında gecikme farkı yok.** Ve beklenmedik bir şey daha: static de 2 saniye
sürüyor — yani isteğin **yarısı motor değil, API ve veritabanı yükü** (95 yerleşimin kalıcılığı,
sorgu gidiş-gelişleri). Karnede "üretim gecikmesi ~2 sn" diye duran açık maddenin yarısı
motorda değilmiş; bu ayrı bir iş.

### Sonuç

| | Static (CI kapısı) | Üretim |
|---|---|---|
| Oturum başı | %80,09 | %86,23 (GRASP) |
| **Bugün** | **%83,40** | **%89,40** (Beam) |

GRASP silinmedi: `SequencerKind.Grasp` açıkça istenebilir ve kıyas referansı olarak duruyor.
CI kapısı statik yolu ölçmeye devam ediyor — beam'in bütçesi de duvar saatidir (`DR-28`).

173/36/228 test yeşil, 17 snapshot sabit, kapı geçti.

---

## `DR-48` kapandı — **beam tekdüzelik kusurunu çözdü, üstelik +13 puana varan farkla**

Görsel test düzeneği bir kusur bulmuştu (`DR-48`): aynı araca daha çok kutu verildiğinde doluluk
**düşüyordu**. Fazladan kutu en kötü ihtimalle yerleşmeden kalmalıydı; sebep yerleştiricinin tek
geçişli ve geri dönüşsüz olmasıydı — sıradaki kutu yanlış yeri kapatıyor, sonrakiler düzeltemiyordu.

Beam tam bu boşluğu dolduruyor: her parçada kararı **sonuna kadar götürüp ölçüyor**, yani yanlış
kapatmanın bedelini kararı vermeden önce görüyor.

Aynı ürün seti, aynı araç, artan yük (yerel ortam, gerçekçi karışık yük):

| Araç | Hedef | İstenen kutu | GRASP | **Beam** |
|---|---|---|---|---|
| A | %80 | 123 | %75,1 | %75,1 |
| A | %90 | 139 | %76,7 | **%77,7** |
| A | %100 | 154 | **%76,5** ↓ | **%78,1** ↑ |
| A | %115 | 176 | %78,4 | **%79,3** |
| C | %80 | 165 | %63,9 | **%69,7** |
| C | %90 | 186 | **%60,8** ↓↓ | **%74,5** ↑ |
| C | %100 | 207 | %66,0 | **%77,6** ↑ |
| C | %115 | 238 | **%65,1** ↓ | **%78,1** ↑ |

**Beam her iki araçta da tekdüze:** yük arttıkça doluluk hep artıyor. GRASP ikisinde de kırılıyor
(A: %76,7 → %76,5; C: %63,9 → %60,8 → %66,0 → %65,1).

Fark BR'dekinden **çok daha büyük**: BR1-BR7'de +1,08 puandı, burada C aracında **+13,0 puan**
(%65,1 → %78,1). Sebep muhtemelen yük biçimi — bu senaryolarda buzdolabı, palet, koltuk gibi büyük
ve zor istiflenen ürünler var ve yanlış bir erken karar çok pahalıya mal oluyor. BR kutuları daha
küçük ve daha bağışlayıcı.

**Bu, oturumun en büyük pratik kazancı.** BR ölçümü beam'i +1 puanla ödüllendiriyordu; gerçek
sevkiyat biçimine benzeyen taşan yüklerde kazanç on kat büyük. Kıyas korpusunun neyi ölçemediğinin
bir örneği daha: `DR-19`'da korpus bir kararı tersine çevirmişti, burada da kazancın büyüklüğünü
on kat küçük gösteriyor.

---

## F6-3 gerekçesi çürüdü · `DepthSlack` üretime alındı — ve LIFO ile çatıştı

### F6-3 (duvar yüzü 2B tam kaplama) yeniden değerlendirildi

`DR-44` duvar yüzünün %86,2 kaplandığını, duvarların %91'inin %95 eşiğinin altında olduğunu
ölçmüştü ve F6-3 bunu düzeltmeyi hedefliyordu. Beam üretime girince aynı ölçü üç sıralayıcıda
tekrarlandı (BR1, 20 örnek):

| Sıralayıcı | Doluluk | Duvar dışı kutu | Yüz kaplama |
|---|---|---|---|
| Static | %83,40 | %0,0 | **%85,8** |
| GRASP | %88,34 | %30,0 | %61,2 |
| **Beam** | **%89,40** | %41,4 | **%74,6** |

**Doluluk arttıkça duvar kaplaması düşüyor.** Yani yüz kaplaması doluluk kalitesinin göstergesi
değil, **duvar disiplininin** göstergesi — ve arama onu bilerek feda ediyor.

Bu, F6-3'ün gerekçesini çürütüyor. Duvar yüzünü tam döşemeye zorlamak yerleştiriciyi daha da
kısıtlar ve muhtemelen doluluğu düşürür. Üstelik duvar disiplini bir **ürün gereksinimi değil**:
`DR-45` kapatıldı (işçi tamamlanmış planı görüyor), `DR-12`'nin gerçek gerekçesi ise kısmi
dolulukta yükün biçimi.

*Uyarı:* bu üç algoritmanın karşılaştırması, kontrollü bir deney değil. Ama `DR-49` (duvar sırası
değişikliği = sıfır kazanç) ve `DR-45` ile birlikte F6-3'ün dayanağı kalmıyor. **F6-3 kapsam dışı
bırakıldı.**

### `DepthSlack` üretime alındı

Beam altında da bedava olduğu doğrulandı:

| | Pay yok | Pay 1,05 |
|---|---|---|
| Static, BR1-BR7, 700 örnek | %83,40 | %83,40 |
| Beam, BR1-BR7 | %89,45 | %89,45 |
| Beam, yarım yük, **yük derinliği** | %72,1 | **%67,7** |

Dört pay değerinde de (yok / 1,05 / 1,15 / 1,30) doluluk birebir aynı. Varsayılan `1,05` yapıldı.

### Ve hemen bir çatışma çıktı: LIFO

Varsayılanı açar açmaz **dört LIFO testi kırıldı**: *"Bölge dışına taşan yerleşim: 2/6"*.

Sebep: ikisi aynı ekseni farklı amaçlarla kullanıyor. Hedef derinlik yükü **öne toplamak** ister;
LIFO ise her grubu kendi `z` bandına **yayar** — ilk inecek grup kapıya en yakın. İkisi birlikte
çalışınca hedef, arkadaki grubun bandını kesiyor ve o grubun kutuları bölgesine hiç ulaşamıyor.
`DR-40`'ın kapattığı hatanın aynısı, başka bir yoldan.

Çözüm bir kaçamak değil, bir öncelik kararı: **LIFO varken hedef derinlik uygulanmaz.** Boşaltma
sırası bir **iş kuralı**, yoğunlaştırma ise bir **tercih**; çatışmada iş kuralı kazanır.

Sonuç: 173/36/228 yeşil, 17 snapshot kaymadı, kapı geçti (%83,40).

**Bu, testlerin bir kez daha karşılığını verdiği yer.** Ölçüm "bedava" diyordu ve doluluk açısından
öyleydi; bedelin doluluk değil **kısıt ihlali** olduğunu yalnızca değişmez testleri gördü.

---

## `L(b)` knapsack kayıp terimi — **reddedildi: kaba sürüm daha iyiymiş**

19 Ağustos araştırma yanıtının **birinci** önerisi buydu ve en somut eşiği taşıyordu: BSG'nin
tek geçişli greedy'si ~%87 alırken bizimki %83,4; sebep olarak VPD'nin `L(b)` terimi gösteriliyordu.
*Eşik: tek geçişli taban %83,4 → **≥%86** olmazsa uygulamayı gözden geçir.*

### Ne yapıldı

Kayıp terimi kaynaktaki doğru biçime çevrildi. Eski sürüm bir dilime *"en küçük kutudan dar mı"*
diye bakıyordu — yani 47 cm'lik bir dilimi, elde 30 ve 20 cm'lik kutular varken **tamamen
kullanılabilir** sayıyordu. Doğrusu sınırsız alt-küme toplamı: 40 cm doldurulabilir, **7 cm kesin
kayıp**.

Uygulama engeli aşıldı: knapsack aday başına çözülemez, ama ulaşılabilir toplamlar kümesi
**yalnızca ölçü kümesine** bağlıdır, dilimin boyuna değil. Plan başına bir tablo kuruldu, sorgu
`O(1)` oldu (`ResidualUsability`). 5 sözleşme testi yazıldı.

### Ölçüm

| | Kaba sürüm | **`L(b)`** |
|---|---|---|
| Static, BR1-BR7, 700 örnek | %83,40 | %83,41 |
| **Beam, 175 örnek** | **%89,40** | **%89,28** |
| Beam, tekrar | — | %89,30 |

Kayıp üsteli de yeniden tarandı (1 / 2 / 3 / 5 / 8): %83,36-83,44 arasında düz.

**Eşik tutmadı** (%83,41 ≠ ≥%86) ve üretim yolunda **0,12 puan kaybettirdi**. İki beam koşusu
tutarlı (%89,28 / %89,30, gürültü bandı ±0,02), yani kayıp gerçek. Geri alındı.

### Neden daha doğru olan daha kötü çalıştı

Kaba sürüm ikili bir sinyaldi: *"dar artık = tam kayıp, değilse bedava."* Bu, ince dilim
üretmeye karşı **sert** bir baskıydı. `L(b)` aynı durumu sürekli ve küçük bir cezaya çeviriyor;
matematiksel olarak daha doğru ama baskıyı **sulandırıyor**.

Yani kaba terim, `L(b)`'nin kötü bir yaklaşımı değilmiş — bizim motorumuza **daha iyi ayarlanmış
farklı bir sezgisel**miş. Kalibrasyon (`DR-53`) da onun üzerine oturmuştu.

### Araştırmanın tezine ne oluyor

Rapor greedy taban açığını iki terime bağlıyordu: `L(b)` **ve** `CS(b)` (temas yüzeyi). `L(b)`
elendi. `CS(b)` hâlâ açık ve bizdeki hâli gerçekten eksik: temas yalnız **taban ayak izi + araç
yüzeyleri** sayılıyor, **komşu kutulara değme sayılmıyor**. Sıradaki sınama o olmalı — ve bu
sefer eşik daha temkinli konmalı: `L(b)` deneyimi, "literatürde şu terim var, demek ki bizde de
kazandırır" çıkarımının güvenilir olmadığını gösterdi.

---

## `CS(b)` temas yüzeyi — **kabul edildi: beam %89,40 → %89,95**

`L(b)` elenince araştırmanın greedy-taban tezinden geriye tek terim kalmıştı: `CS(b)` — bloğun
komşu bloklara ve araç yüzeylerine değen yüzey oranı (Araya, Guerrero & Nuñez 2017).

Bizdeki hâli gerçekten eksikti: temas olarak **yalnızca taban ayak izi + araç yüzeyleri**
sayılıyordu. **Komşu kutulara değme hiç sayılmıyordu.**

### Bedava geldi

`TopDeviation` zaten yerleşimleri tarayıp komşuları buluyordu (yığın tepesinin dalgalılığını
ölçmek için). Aynı taramadan temas **alanı** da çıkıyor: yatay örtüşme × dikey örtüşme. Fonksiyon
`Neighbourhood`'a çevrildi ve ikisini birden döndürüyor — **ek tarama maliyeti yok.**

### Ölçüm

| | Önce | **`CS(b)` ile** |
|---|---|---|
| Static, BR1-BR7, 700 örnek | %83,40 | **%83,63** (+0,23) |
| **Beam, 175 örnek** | **%89,40** | **%89,95** (+0,55) |
| Beam, tekrar | — | %89,96 |

Kümeye göre (beam): BR1 %89,33 · BR2 %90,10 · BR3 %90,73 · BR4 %89,89 · BR5 %90,22 ·
BR6 %89,98 · BR7 %89,41.

Temas üsteli de tarandı (0,25 / 0,5 / 0,75 / 1 / 1,5): %83,61-83,64 arası düz, `0,5` korundu.

### Neden `L(b)`'nin tersine çalıştı

`L(b)` var olan bir sinyali (ince dilim cezası) **sulandırıyordu**. `CS(b)` ise **hiç olmayan bir
sinyali** ekliyor: "bu kutu komşularına ne kadar yaslanıyor". Yaslanan yerleşim katı platform
üretir, platform üstüne yığılmayı mümkün kılar — `DR-47`'nin "yığın yukarı çıkamıyor" teşhisinin
doğrudan karşılığı.

Kazancın beam'de (+0,55) static'ten (+0,23) büyük olması da tutarlı: beam dalları tamamlanmış
doluluğa göre seçiyor, yani daha iyi bir taban daha iyi dal ayrımı demek. Araştırmanın
*"beam kalitesi doğrudan greedy tabanın kalitesine bağlıdır"* tezi burada **doğrulandı** — sadece
sebep olarak gösterdiği iki terimden biri tuttu, öteki tutmadı.

### Konum

**%89,95** — araştırmanın 2 saniye için verdiği gerçekçi hedef bandının (%90-92) alt ucundayız.
Tam destekli literatür çıpası %94,2 ama 240-320 saniyeyle.

17 snapshot kaymadı, 173/36/228 yeşil, CI referansı **%83,63**.

---

## İteratif ışın genişletme — **%90 aşıldı: %90,04**

Sabit genişlik-8 kolay kümelerde bütçenin dörtte birini kullanıyordu: BR1'de **559 ms / 2000 ms**.
Araştırmanın F-2'si (Libralesso & Fontan 2020) tam bunu hedefliyordu.

Arama artık `D=1`'den başlıyor ve her turda genişliği **ikiye katlayarak** süre bitene kadar
yeniden koşuyor; en iyi sonuç turlar boyunca saklanıyor. Geometrik büyüme, tekrarlanan ışın
maliyetini son turun ~2 katında tutuyor — doğrusal artış her turu aynı maliyete getirip israf
ederdi.

### Ölçüm (25 örnek/küme)

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 | **Ort** |
|---|---|---|---|---|---|---|---|---|
| Sabit genişlik-8 | %89,33 | %90,10 | %90,73 | %89,89 | %90,22 | %89,98 | %89,41 | %89,95 |
| **İteratif** | %89,54 | %90,14 | %90,82 | %89,92 | %90,18 | %90,10 | %89,53 | **%90,04** |

Tekrar koşusu %90,03 — tutarlı.

Kazanç küçük (+0,09) ama **her küme artık bütçenin tamamını kullanıyor** ve en çok, bütçesi boşa
giden kümelerde kazanıldı (BR1 +0,21, BR7 +0,12). Yapısal fayda daha önemli: arama artık **anytime**
— süre dolduğunda elde her zaman tamamlanmış bir tur var, yarım kalmış bir ışın değil.

### Konum

**%90,04** — araştırmanın 2 saniye için verdiği gerçekçi hedef bandına (%90-92) girildi.

| | Oturum başı | Şimdi |
|---|---|---|
| Static (CI kapısı) | %80,09 | **%83,63** |
| Üretim | %86,23 | **%90,04** |

Tam destekli literatür çıpası %94,2 ama örnek başına 240-320 saniyeyle; bizimki 2 saniye.

173/36/228 yeşil, 17 snapshot sabit, kapı geçti.

---

## (blok, boşluk) aksiyon uzayı — **reddedildi**, ve beam'in gürültü bandı düzeltildi

### Denenen

Araştırmanın F-1'inin uygulanmamış yarısı. Beam bugüne kadar yalnız **"sıradaki ürün"** üzerinde
dallanıyordu; boşluk ve yönelim seçimini tamamen yerleştirici yapıyordu (bütün adayları VCS ile
puanlayıp en iyisini alarak).

`DecoderKeys.CandidateRank` eklendi: aramanın **ikinci ve üçüncü en iyi** adayı da denemesi. Bu,
dallanmayı fiilen *(blok, boşluk)* çiftine çıkarıyor — literatürdeki BSG'nin aksiyon uzayı budur.
`TryPlace` en iyi tek adayı tutmak yerine ilk `rank+1` tanesini sıralı tutuyor.

`rank = 0` ile statik yol **bit birebir** korundu (kapı geçti, 173 test yeşil).

### Ölçüm

| Yapılandırma | 2 sn | 8 sn |
|---|---|---|
| Ranksız (3 varyant) | **%90,04** | **%90,69** |
| Rank 0,1 (4 varyant) | %90,04 | %90,64 |
| Rank 0,1,2 (5 varyant) | %89,98 | — |

**Hiçbir bütçede kazandırmıyor.** Dört kat bütçede bile nötr-hafif negatif. Geri alındı.

**Neden:** VCS'in en iyi adayı zaten iyi ve ikinci/üçüncü en iyi genelde *yapısal olarak farklı bir
karar* değil — aynı boşlukta komşu bir yönelim. Yani rank, beklenen çeşitliliği getirmiyor; buna
karşılık varyant sayısını artırarak aynı bütçede daha az tur koşulmasına yol açıyor. Ayrıca
`TryPlace` başına küçük bir dizi ayırıyordu; sıfır kazanç için ölçülebilir bir maliyet.

### Düzeltme: beam'in gürültü bandı ±0,01 değil ~±0,05

Geri alma sonrası **aynı kod** üç kez koşuldu: %89,98 · %89,98 · %89,97. Oysa aynı kod birkaç saat
önce %90,04 · %90,03 vermişti. Kod değişmedi (`git status` temiz), değişen makine yükü — beam'in
bütçesi duvar saatidir, yani saniyede kaç dal değerlendirildiği yüke bağlıdır. O sırada beş Docker
konteyneri (backend, frontend, iki MSSQL, MinIO) ayaktaydı.

**Bunun geriye dönük etkisi var ve kaydedilmeli:**

- `DR-59` (`CS(b)`, +0,55) — bandın çok üstünde, **sağlam**.
- `DR-58` (`L(b)`, −0,12) — bandın sınırında; ret kararı yine de doğru çünkü kazanç da yoktu.
- `DR-60` (iteratif genişletme, +0,09) — **bandın içinde.** Doluluk kazancı kanıtlanmış sayılamaz.
  Kararın asıl gerekçesi zaten doluluk değil **yapısaldı**: arama anytime oldu ve her küme bütçeyi
  dolduruyor. O gerekçe ayakta; puan iddiası geri çekiliyor.

Bundan sonra beam ölçümlerinde **0,1 puandan küçük farklar gürültü sayılacak.** Static ölçümler
etkilenmiyor — orası saf hesap, bit kararlı.

---

## F-4 · Bileşik blok eşiği — **zaten optimum, kazanç yok**

Araştırmanın F-4'ü iki şey öneriyordu: bileşik blokları beam altında yeniden değerlendirmek ve
blok üretim eşiğini kalibre etmek.

Birincisi konusuz: bileşik blok bizde zaten **etkin** (`TopUp`, sütun tepesini başka ürünle
tamamlar). Eşiği `FootprintMatch = 0,85` — üst kat, taban sütununun ayak izinin en az %85'ini
kapatmalı.

İkincisi ölçüldü. Static, 700 örnek, gürültüsüz:

| Eşik | 0,60 | 0,70 | 0,80 | 0,82 | **0,85** | 0,88 | 0,90 | 0,95 | 1,00 |
|---|---|---|---|---|---|---|---|---|---|
| Doluluk | %82,57 | %83,12 | %83,56 | %83,59 | **%83,63** | %83,56 | %83,50 | %83,29 | %83,23 |

**Temiz tek tepeli eğri, tepe tam 0,85'te.** İki yönde de kaybettiriyor: gevşetmek daha çok
(−1,06 @ 0,60), sıkmak daha az (−0,40 @ 1,00). Değer değişmedi.

Eğrinin şekli bileşik bloğun **çalıştığını** da doğruluyor: 1,00'da mekanizma fiilen kapanıyor
(yalnız birebir ayak izi eşleşmesi) ve 0,40 puan kaybediliyor. Yani `GRASP'ta ±0` bulgusu beam'e
taşınmıyor — mekanizma değerli, yalnız *ek kalibrasyonda* puan yok.

### Yan tespit: `BlockCatalog` üretimde çağrılmıyor

`F7-2`'de yazılan blok kataloğu (`DR-51`) üretim yolunda **hiç kullanılmıyor**. Sebebi kayıtlı:
`F7-4b`'de dallanma "sıradaki ürün" üzerine kurulunca kataloğu ayrıca bağlamaya gerek kalmadı.

Ölü kod değil — `BlockCatalogDiagnostics` üzerinden ölçüm düzeneği kullanıyor ve `DR-51`'in
"blok zenginliği heterojenlikle çöküyor" bulgusu oradan geldi. Ama **üretim derlemesinde duran,
yalnız ölçümün çağırdığı bir sınıf**; ileride aksiyon uzayı yeniden ele alınmazsa taşınması ya da
kaldırılması gerekir. Açık borç olarak not edildi.

---

## F-6 öncesi teşhis · **doygunluk kümeye bağlı** — ve bu, sıradaki işi değiştiriyor

F-6 (sınırlı VNS) ve F-5 (defragmentation) aynı varsayıma dayanıyor: planda hâlâ doldurulabilecek
yer var, yeniden düzenlemekle kazanılabilir. Önce o varsayım sınandı.

### Yerleşemeyen kutular neden yerleşemiyor

BR1, 20 örnek, beam:

| Ölçü | Static | **Beam** |
|---|---|---|
| Kalan boşluk sayısı | 4 | **3** |
| Sığan ama yerleşemeyen | %18,4 | %10,5 |
| **Sığan + destekli** | %0,0 | **%0,0** |

Yerleşemeyen kutuların %10,5'i bir boşluğa **geometrik olarak** sığıyor, ama **hiçbiri orada destek
bulamıyor**. Kalan boşlukların tabanı havada — `DR-47`'nin teşhisi aynen duruyor.

Yani "kalanları bir de şuraya koyalım" türü bir post-optimizasyonun alacağı hiçbir şey yok.
VNS'in kazanabilmesi için **düz yüzey üretmesi** gerekir, boşluk doldurması değil.

### Süre/kalite eğrisi: iki farklı rejim

| Küme | Tip | 2 sn | 30 sn | Fark |
|---|---|---|---|---|
| **BR1** | 3 | %89,53 | %89,59 | **+0,06** |
| BR3 | 8 | %91,54 | %91,83 | +0,29 |
| BR5 | 12 | %90,21 | %91,45 | +1,24 |
| **BR7** | 20 | %89,35 | **%90,55** | **+1,20** |

**Doygunluk tek bir gerçek değil, kümeye bağlı:**

- **Az tipli yükte (BR1) beam doymuş.** On beş kat bütçe 0,06 puan getiriyor — gürültü. Üç kutu
  tipiyle dallanma uzayı küçük, arama onu tüketiyor. Buradaki sınır **yapısal**: kalan boşlukların
  tabanı havada ve hiçbir arama bunu değiştiremiyor.
- **Çok tipli yükte (BR5, BR7) doymamış.** On beş kat bütçe **+1,2 puan** getiriyor. Yirmi tiple
  dallanma uzayı büyük ve 2 saniye onu tüketmeye yetmiyor. Buradaki sınır **verim**.

### Sıradaki işi bu belirliyor

İki rejim iki farklı iş demek:

1. **Çok tipli yük için: F-3 (rollout maliyetini düşür).** Saniyede daha çok dal değerlendirmek
   doğrudan doluluğa dönüyor — BR7 bunu ölçülmüş biçimde gösteriyor. Araştırmanın önerdiği yollar:
   kısmi rollout, ucuz vekil skor, paralel dal değerlendirme.
2. **Az tipli yük için: hiçbir arama iyileştirmesi işe yaramaz.** Orada kazanç ancak yerleştiricinin
   **ürettiği yüzeyin** değişmesiyle gelir. O kaldıraç bu oturumda bir kez çekildi (`CS(b)`, +0,55)
   ve işe yaradı; ikinci bir çekiş için yeni bir mekanizma gerekir.

**F-5 ve F-6 ikisine de denk düşmüyor:** ne boşluk doldurmak mümkün (destek yok), ne de bunlar
saniyede dal sayısını artırıyor. Sıraya alınmadılar; gerekçe budur.

---

## F-3 · Paralel dal değerlendirme — **%89,98 → %90,51**

`DR-63` iki rejim tespit etmişti: az tipli yükte beam doymuş, çok tipli yükte doymamış ve 15 kat
bütçe +1,2 puan getiriyor. Oradaki sınır **verim**di — yani saniyede kaç dal değerlendirildiği.

Bir ışın durumunun bütün dalları (ürün × ayar) birbirinden bağımsız: her biri kendi kopyası
üzerinde çalışıyor ve yerleştirme yolunda **değişken statik durum yok** (doğrulandı). Makinede
20 çekirdek var.

### Determinizm nasıl korundu

Üç tasarım kararı:

1. **Sonuçlar sabit indeksli bir diziye yazılır**, sonra **indeks sırasında** toplanır. Paralellik
   değerlendirme sırasını değiştirir, sonucu değiştirmez.
2. **Süre kontrolü ışın durumu granülaritesinde.** Daha ince (dal başına) yapmak determinizmi
   bozardı: hangi dalın bütçe dolmadan bittiği iş parçacığı zamanlamasına kalırdı. Daha kaba
   (seviye başına) yapmak bütçeyi taşırırdı — bir kez yaşandı.
3. Bir ışın durumunun dalları ya **hepsi** çalışır ya hiçbiri.

**Sınandı.** Bütçe bağlayıcı olmayacak şekilde (120 sn verildi, 4,7 sn kullanıldı) aynı girdi üç
kez koşuldu: **%91,76 · %91,76 · %91,76**. Süre değişti (4695 / 4866 / 4833 ms), sonuç değişmedi.

### Ölçüm (25 örnek/küme)

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 | **Ort** |
|---|---|---|---|---|---|---|---|---|
| Seri | %89,54 | %90,14 | %90,82 | %89,92 | %90,18 | %90,10 | %89,53 | %89,98 |
| **Paralel** | %89,72 | %90,54 | %91,13 | %90,58 | %90,86 | %90,67 | %90,06 | **%90,51** |
| Fark | +0,18 | +0,40 | +0,31 | +0,66 | +0,68 | +0,57 | **+0,53** | **+0,53** |

**`DR-63`'ün tahmini birebir tuttu:** doymuş BR1'de kazanç en küçük (+0,18), doymamış BR4/BR5/BR7'de
en büyük (+0,53…+0,68). Paralellik doymamış kümelerde doğrudan doluluğa dönüşüyor.

Yedi kümenin yedisi de **%89,7'nin üstünde**, dördü **%90,5'in üstünde**.

### Açık kalan: üretimde eşzamanlılık

Ölçüm **tek istek** üzerinden yapıldı. Üretimde `MaxDegreeOfParallelism = Environment.ProcessorCount`
her plan isteğinin bütün çekirdekleri istemesi demek; eşzamanlı iki istek birbirini yavaşlatır ve
beam bütçeye bağlı olduğu için **doluluk düşer**. Konteynerin CPU sınırı da hesaba katılmalı.

Bu ölçülmedi ve açık borçtur. Muhtemel çözüm: paralellik derecesini istek başına sınırlamak ya da
motor çağrılarını bir kuyruğa almak.

173/36/228 yeşil, 17 snapshot sabit, statik yol etkilenmedi (paralellik yalnız beam'de), kapı geçti.

---

## Eşzamanlılık borcu kapandı — **ölçüldü: düşüş gerçek ama taban hâlâ GRASP'ın üstünde**

`DR-64` paralel dal değerlendirmeyi getirirken bir borç bırakmıştı: ölçüm **tek istek** üzerinden
yapılmıştı, oysa üretimde her plan isteği bütün çekirdekleri istiyor.

Ölçüm canlı ortamda yapıldı. Senaryo bilinçli olarak **taşan** bir yük (A aracı, %115 hedef,
176 kutu): orada arama gerçekten fark yaratıyor, yani kayıp görünür olur. Her şeyin sığdığı bir
senaryoda hepsi aynı sonucu verirdi.

### Eşzamanlı istek sayısına göre

| Eş zamanlı istek | Ortalama süre | **Doluluk** |
|---|---|---|
| 1 | 4,09 sn | **%87,01** |
| 4 | 4,12 sn | %84,69 |
| 8 | 4,17 sn | **%82,21** |
| 16 | 4,20 sn | %82,21 |

**Düşüş gerçek: 4,8 puan**, ve sekizde plato yapıyor. **Süre sabit** — çünkü bütçe duvar saatidir;
motor aynı iki saniyede daha az dal değerlendiriyor, daha uzun sürmüyor.

### Ama plato taban çizgisi değil

Aynı senaryoda üç sıralayıcı:

| | Doluluk |
|---|---|
| Static | %67,66 |
| GRASP (tek istek) | %80,57 |
| **Beam, 8+ eş zamanlı** | **%82,21** |
| **Beam, tek istek** | **%87,01** |

Beam **tam yük altında bile** yüksüz GRASP'ı geçiyor. Yani eşzamanlılık kaybı gerçek ama
üretim varsayılanını beam yapma kararını (`DR-56`) değiştirmiyor.

### Paralellik derecesini kısmak işe yaramadı

`MaxDegreeOfParallelism = 4` denendi:

| Eş zamanlı | 20 çekirdek | **4 ile sınırlı** |
|---|---|---|
| 1 | %87,01 | **%82,21** |
| 8 | %82,21 | %82,21 |

**Strictly kötü:** tek istekte 4,8 puan kaybettiriyor, yüklü durumda hiçbir şey kazandırmıyor.
Geri alındı.

Sebep: düşüş bir **çizelgeleme** sorunu değil, paylaşılan CPU'nun kendisi. Sekiz istek aynı anda
koşuyorsa her birine düşen hesap gücü sekizde bir olur; paralellik derecesini kısmak bunu
değiştirmez, yalnız yüksüz durumu da bozar.

### Gerçek çözüm kodda değil

Kayıp kapasiteyle ilgili, algoritmayla değil. Üç yol var ve üçü de bu oturumun kapsamı dışında:

1. **Daha çok çekirdek** — doğrudan orantılı.
2. **Motor çağrılarını kuyruğa almak** — her istek sırayla tam güç alır; gecikme artar, doluluk
   korunur.
3. **Asenkron plan üretimi** — istek hızlı bir taban planla döner, arka planda derinleşir. Beam
   zaten **anytime** (`DR-60`), yani bu desene hazır.

Ölçülmüş eğri elde: kaç eşzamanlı istekte ne kaybedildiği biliniyor. Karar kapasite planlamasıdır.

---

## `DR-38` kapandı — **kısıt tarafı ilk kez ölçüldü**, ve bir yanılsama yakalandı

İki korpusumuz da yalnız hacim ölçüyordu: `UnloadingOrder` hep `null`, hiçbir kutu kırılgan değil,
istif sınırsız. Yani motorun sekiz sert kapısının üçü **yedi yüz örnekte hiç ateşlenmiyordu**;
yalnız on yedi elle yazılmış senaryoda sınanıyorlardı.

`ConstraintCorpus` yazıldı: BR örneğinin **verisini değiştirmeden** kısıt alanlarını dolduruyor —
aynı kutular, aynı ölçüler. Böylece kısıtlı ve kısıtsız koşu birebir kıyaslanabiliyor ve fark
yalnızca kısıttan geliyor. `--constraints none | lifo | fragile | stack | all`.

### Önce bir yanılsama

İlk koşu **LIFO'nun bedava olduğunu** söyledi: %83,63 → %83,63, tam sıfır maliyet.

Şüphelenip bakınca sebep çıktı: `UseLifo` yalnızca `Criteria == Lifo` olduğunda açılıyor
(`OptimizationModules.FromCriteria`). `UnloadingOrder` doldurulmuştu ama kriter `VolumeFirst`
kalmıştı — **bölgeler hiç kurulmadı.** Ölçüm "LIFO bedava" diyordu çünkü LIFO hiç çalışmıyordu.

Bu tam olarak `ConstraintDiagnostics`'in kendi belge yorumunda uyardığı tuzak: *"kısıt hiç
ateşlenmediyse sıfır ihlal bir güvence değil, bir yanılsamadır."* Uyarıyı yazıp aynı tuzağa
düşmek, kapsama metriğinin neden zorunlu olduğunun en iyi kanıtı.

Düzeltildi: `Lifo` bayrağı kriteri de açıyor. Sıralama bozulmuyor — `ApplyCriteriaSort`'ta `Lifo`
ve `VolumeFirst` aynı sırayı veriyor (hacim-azalan), yani ölçülen fark **yalnızca bölge
kısıtından** geliyor.

### Kısıtların maliyeti (static, 700 örnek, gürültüsüz)

| Kısıt | Doluluk | Maliyet |
|---|---|---|
| Yok | **%83,63** | — |
| **LIFO** (3 boşaltma grubu) | %82,01 | **−1,62** |
| **İstif ≤ 2** | %65,44 | **−18,19** |
| **Kırılganlık** (her 3. tip) | %51,24 | **−32,39** |
| Hepsi birden | %45,92 | **−37,71** |

**İlk kez sayısal:**

- **LIFO ucuz.** Üç boşaltma grubu 1,62 puana mal oluyor. Aracı üç banda bölmenin bedeli
  beklenenden düşük — duvar örücü zaten `z` boyunca ilerlediği için bölge disiplini onun doğal
  çalışma biçimine yakın.
- **Kırılganlık çok pahalı.** Tiplerin üçte biri kırılgan olunca doluluk **32 puan** düşüyor.
  Sebep açık: kırılgan kutunun üstüne hiçbir şey konamıyor, yani her kırılgan kutu bulunduğu
  sütunu kapatıyor ve yığın yükselemiyor.
- **İstif sınırı da pahalı.** "Üstünde en fazla iki kutu" 18 puan.
- Üçü birden 37,71 puan — yani doluluk **yarıya** iniyor.

Bu sayılar bir uyarı olarak okunmalı: **BR ölçümlerimiz kısıtsız dünyanın sayılarıdır.** Gerçek
sevkiyatta kırılgan ürün varsa %90 beklentisi gerçekçi değil.

### İhlal taraması — asıl güvence

Sekiz sert kapı yerleştirme anında zaten uygulanıyor, yani ihlaller **sıfır olmalı**. Değer tam
bunda: sıfır olmadığı anda bir hata vardır ve yedi yüz örnekte aranması, on yedi senaryonun
veremeyeceği bir güvencedir.

| Yol | Kısıtlı kutu | Bölge ihlali | Kırılganlık | İstif |
|---|---|---|---|---|
| Static, her kısıt | %23-100 | **0** | **0** | **0** |
| **Beam, tüm kümeler, `all`** | **%100** | **0** | **0** | **0** |

Kapsama gerçek (kısıtlı kutu oranı raporlanıyor), ihlal sıfır.

Gerekçesi yaşanmıştı: `DepthSlack` ile LIFO bölgeleri çatıştı (`DR-57`) ve hata yalnızca varsayılan
açıldığında, değişmez testleri sayesinde görüldü. Kısıtlı korpus olsaydı aynı hata ölçümde de
görünürdü — bundan sonra görünecek.

173/36 test yeşil, kapı geçti (%83,63), motor kodu değişmedi.

---

## 19 Ağustos 2026 — `F8-0`: kısmi yük rejimi ilk kez ölçüldü

Görsel testte çıkan dört kusur (`G-1`…`G-4`, [notlar](notlar/2026-08-19-gorsel-test-revize.md))
tek bir kökte birleşti: **yük araca sığdığında doluluk bir kalite ölçüsü olmaktan çıkıyor.**
Wäscher/Haußner/Schumann (2007) tipolojisinde bu iki ayrı problem sınıfıdır — taşan yük
tek-sırt-çantası (SKP), sığan yük **açık boyut problemi** (3B şerit paketleme), ve orada amaç
"kullanılan uzunluğu en aza indirmek"tir.

BR korpusu **tamamen** taşan-yük rejimindedir. Yani üretim planlarımızın çoğunun bulunduğu rejim
bugüne kadar hiç ölçülmedi.

### Ne eklendi

`SpreadDiagnostics` — iki ölçü:

- **yayılma** = kullanılan uzunluk / ideal uzunluk (`hacim / (genişlik × yükseklik)`, aşağı sınır)
- **dilim doluluğu** = kullanılan dilimin *içindeki* doluluk

`--load-ratio` düzeltildi. Eskisi `max(1, adet × oran)` yapıyordu; BR15'te tip başına adet ~1
olduğu için her tip 1'de kalıyor ve **"%25 yük" aslında tam yük olarak koşuyordu** — kısmi rejim
hiç ölçülmemiş oluyordu. Yerine en büyük artık yöntemi: toplam hacim hedefi aşmıyor, tip
çeşitliliği korunuyor.

Kapı da genişledi: yayılma ayrı bir eşik (`±0,01`), ve **yük oranı yapılandırmanın parçası** —
%25 koşusu artık tam yük referansıyla kıyaslanamıyor.

### Ölçüm — static, 700 örnek/oran

| Yük oranı | Yayılma | Dilim doluluğu | Duvar |
|---|---|---|---|
| %25 | **×1,812** | %57,0 | 2,7 |
| %50 | ×1,457 | %69,3 | 4,5 |
| %75 | ×1,287 | %77,8 | 6,3 |
| %100 | ×1,182 | %84,7 | 6,6 |

**Araç boşaldıkça yayılma büyüyor — istisnasız.** Ve heterojenlik bunu ağırlaştırıyor: %25 yükte
BR1 ×1,613, BR7 ×2,009.

Bu, arayüzde 16 plan üzerinde gözle görülen desenin 2100 örnekle doğrulanmış hâli.

### Neden bugüne kadar görünmedi

Tam yükte yayılma ile dilim doluluğu birbirinin tersidir (yük zaten aracın sonuna dayanır), yani
`FillRate` her şeyi söyler. Kısmi yükte bağ kopar: bütün kutular yerleşir, doluluk sabittir,
**yerleşimin biçimi hiçbir sayıya yansımaz.**

`DR-57` F6-3'ü (duvar yüzü tam kaplama) tam da bu yüzden reddetmişti — ölçüm taşan yüktendi.
`DR-47` ise daha o zaman "çeyrek yükte darboğaz kesit döşemesi" demişti. İki karar farklı
rejimlerde alınmış, biri ötekinin alanına uygulanmıştı.

Motor kodu **değişmedi**; tam yük kapısı %83,63 ile geçti, 173/173 test yeşil.

Referanslar: `referans/br-wallbuilder-static-yuk{0.25,0.50,0.75}.json`.

---

## 19 Ağustos 2026 — `F8-1`: leksikografik amaç · kısmi yükte yayılma çöktü

`F8-0` sorunu ölçtü, bu onu düzeltiyor. Amaç fonksiyonu artık **leksikografiktir**:

1. yerleşen hacim (bugünkü amaç)
2. eşitse **kullanılan uzunluk** (`max(z + length)`) — küçük olan kazanır

Uygulandığı yer yalnızca arama katmanı (`BeamSequencer`): hem "en iyi" takibi hem de ışında
tutulacak dalların sıralaması. **Yerleştirici değişmedi.**

### Ölçüm — beam, 56 örnek/oran

| Yük | Yayılma önce | **sonra** | Dilim önce | **sonra** | Doluluk |
|---|---|---|---|---|---|
| %25 | ×1,767 | **×1,326** | %58,4 | **%75,7** | %24,73 → %24,73 |
| %50 | ×1,478 | **×1,209** | %68,3 | **%82,9** | %49,60 → %49,60 |
| %75 | ×1,280 | **×1,171** | %78,3 | **%85,5** | %74,44 → %74,44 |
| %100 | ×1,100 | ×1,099 | %91,0 | %91,0 | %90,71 → %90,75 |

**Kısmi yükte kazanç büyük:** %25'te yayılma 0,44 puan düştü, dilim doluluğu **17,3 puan** arttı.
Doluluk hiçbir oranda değişmedi — zaten değişemezdi, bütün kutular yerleşiyor. Kazanç tam da
ölçemediğimiz yerdeydi.

**Tam yükte davranış değişmedi:** ×1,100 → ×1,099, doluluk %90,71 → %90,75 (beam gürültü bandı
±0,05, `DR-61`). Leksikografik tasarımın vaat ettiği buydu: taşan yükte doluluklar birbirinden
farklıdır, birinci anahtar kararı verir, uzunluk ancak beraberlikte konuşur.

### Neden bu kadar etkili

Kısmi yükte her dal aynı doluluğu üretiyordu; arama tabanı aynen döndürüyordu (`G-2`). Şimdi
beraberlik bozuluyor ve "cebi doldur" dalı "yeni duvar aç" dalını deviriyor. Yerleştiricinin
kabiliyeti zaten vardı — eksik olan onu tercih ettirecek ölçüttü.

### Kalan

Araştırmanın hedefi %25 yükte < 1,30; **×1,326 ile kıl payı üstündeyiz.** Kullanıcının kabul
ölçütü %75 için ×1,17; **×1,171 ile tutturuldu.** Kalan mesafeyi `F8-2` (referans uzunluk +
bisection) kapatmalı.

Static yol dokunulmadı: tam yük kapısı %83,63, %25 kapısı ×1,812 — ikisi de değişmeden geçti.
173/173 test yeşil.

---

## 19 Ağustos 2026 — `G-5`: aday konum üretimi ve destek eşiği

Kullanıcı görsel testte kenarda boşluk görüp "sığacak ürün var ama konmuyor" dedi ve
`%80 destek kuralıysa 60'a indirebiliriz` diye önerdi. Ölçüm önce **başka bir yeri** gösterdi.

### Teşhis — aday konum boşluk başına tekti

`BR15 %100` planında 27 yerleşemeyen kalemin her biri için son yerleşimde her aday konum ve 6
yönelim tarandı: **21'inin bugünkü %80 eşiğini zaten geçen bir konumu vardı.** Örnek
`BR15-T026 → (0, 108, 318)`, %87,7 destek, sıfır çakışma — motor o noktayı hiç denememişti.

Kök neden `WallBuilderPlacement`: her boşluk için **tek** aday konum üretiliyordu, boşluğun köşesi.
Köşe desteksizse boşluk tamamen eleniyordu. Literatürdeki adı *corner point* yerine *extreme
point* aday üretimi (Crainic, Perboli & Tadei).

Aynı kusur teşhiste de vardı: `SpaceDiagnostics` desteği yalnız köşede sınadığı için
"sığan+destekli %0,1" diyor ve kusuru gizliyordu.

### İki düzeltme

1. **Destekli uç noktalar** — köşe desteksizse alttaki destek kutularının kenarlarına hizalı
   konumlar denenir. Köşe zaten destekliyse hiçbir şey değişmez.
2. **Son geçiş** — ana döngü tek yönlüydü; yerleşemeyen kutu bir daha denenmiyordu. Artık defterin
   son hâliyle, ilerleme durana kadar yeniden denenir.

Ölçüldü (static, tam yük): %83,63 → **%83,77**. BR15: %79,32 → **%79,92**.
"Sığan ama yerleşemeyen" BR15'te **%44,1 → %28,2**.

### Sonra eşik — ve kullanıcı haklı çıktı

Düzeltilmiş teşhisle bakınca kalan %28'in **tamamı** destek kapısında kalıyordu
(`sığan+destekli %0,0`). Yani aday üretimi artık tıkaç değildi; sıra eşiğe gelmişti.

`G-5` sonrası yeniden tarandı (static, BR1-BR7, 175 örnek):

| Eşik | Doluluk | %80 altı kutu | %70 altı | Azami taşma |
|---|---|---|---|---|
| 0,80 | %83,91 | %0,0 | %0,0 | 13 cm |
| 0,70 | %84,25 | %4,7 | %0,0 | 23 cm |
| **0,60** | **%84,48** | %6,9 | %3,0 | 29 cm |

`DR-16` eşiğin "fizik kanunu değil **politika**" olduğunu ve "müşteri kararı sayı olmadan
verilemez" dediğini kaydetmişti. Sayılar sunuldu, **0,60 seçildi.**

Eşik plan bütününü gevşetmiyor: ortalama destek %97,2'de kalıyor, kutuların yalnız %6,9'u %80'in
altına iniyor. Bedeli azami taşmanın 13 → 29 cm çıkması.

### Toplam — bugünün üç adımı

| Yapılandırma | Başlangıç | `F8-1` | `G-5` | **Eşik 0,60** |
|---|---|---|---|---|
| **Static, tam yük** | %83,63 | %83,63 | %83,77 | **%84,26** |
| **Beam, tam yük** | %90,71 | %90,75 | — | **%91,15** |
| Static %25 · yayılma | ×1,812 | — | ×1,785 | **×1,710** |
| Static %50 · yayılma | ×1,457 | — | ×1,447 | **×1,414** |
| **Beam %25 · yayılma** | ×1,767 | **×1,326** | — | — |
| BR15 static | %79,32 | — | %79,92 | **%81,38** |

Dört static referans tazelendi. On yedi snapshot'ın **yalnız biri** değişti ve orada kutu sayısı
aynı, konumlar daha sıkı (iki kutu z = 200'den z = 80'e geldi). 173/36/228 test yeşil.

---

## 19 Ağustos 2026 — `F8-2` ilk deneme: kıyas üretimi ölçmüyormuş; yerel gevşetme **reddedildi**

`G-4`'ün notunda "`DepthSlack` gevşemesine taban koyulmalı, bugün sınırsız gevşiyor" yazmıştım.
Uygulandı ve ölçüldü — ama önce başka bir şey çıktı.

### Kıyas koşusu derinlik bütçesi **olmadan** ölçüyormuş

`BrCommand` her koşuda `DepthSlack = options.DepthSlack` yazıyordu ve bayrağın varsayılanı
`null`'dı. Yani:

| | `DepthSlack` |
|---|---|
| Üretim (API) | **1,05** (`OptimizationInput` varsayılanı, `DR-57`) |
| Kıyas koşusu | **null — bütçe yok** |

Kıyas, üretimin çalıştırdığından **başka bir motoru** ölçüyordu. `F8-0` ve `F8-1`'in kısmi yük
sayıları da bu yüzden üretimi yansıtmıyordu.

Düzeltildi: bayrak verilmezse üretim varsayılanı korunuyor. Static taban belirgin değişti:

| Yük | Bütçesiz *(eski ölçüm)* | **Bütçeli — üretim gerçeği** |
|---|---|---|
| %25 | ×1,710 · dilim %60,4 | **×1,512 · dilim %67,2** |
| %50 | ×1,414 · dilim %71,3 | **×1,341 · dilim %75,0** |
| %75 | ×1,279 · dilim %78,3 | **×1,263 · dilim %79,3** |
| %100 | ×1,175 · dilim %85,2 | ×1,175 · dilim %85,2 |

**Bu, bugün yakalanan üçüncü ölçüm geçersizliği.** İlki `DR-66`'da LIFO'nun hiç ateşlenmemesi,
ikincisi `G-5`'te teşhisin motorla aynı kusuru paylaşması, üçüncüsü bu. Üçünün de deseni aynı:
*ölçüm düzeneği, ölçtüğünü sandığı şeyi ölçmüyordu.*

### Yerel gevşetme — ölçüldü, **kazanç sıfır**

Değişiklik: hedef derinlik bir kutu için gevşediğinde, o kutu yerleştikten sonra **eski değerine
dönsün** (önceden kalıcıydı; tek zor kutu bütçeyi sonraki bütün kutulara açıyordu).

Bütçe açıkken kalıcı ve yerel gevşetme karşılaştırıldı:

| Yük | Kalıcı *(eski)* | Yerel *(yeni)* |
|---|---|---|
| %25 | ×1,512 · %67,2 | ×1,512 · %67,1 |
| %50 | ×1,341 · %75,0 | ×1,340 · %75,1 |

Fark yok. **Değişiklik geri alındı** — motorun en sıcak döngüsüne ölçülen değeri sıfır olan kod
girmez.

Neden işe yaramadı: gevşeme nadiren tetikleniyor ve tetiklendiğinde bir adımda araç boyuna
sıçrıyor; kalıcı ya da yerel olması sonucu değiştirmiyor.

### Beam etkilenmedi — ve bu `F8-2`'nin gerekçesini zayıflatıyor

| Yük | Beam, bütçesiz | Beam, bütçeli |
|---|---|---|
| %25 | ×1,278 | ×1,276 |
| %50 | ×1,196 | ×1,196 |
| %75 | ×1,162 | ×1,162 |
| %100 | ×1,094 | ×1,094 |

Üretim yolunda derinlik bütçesi **fiilen etkisiz**: `F8-1`'in leksikografik amacı zaten uzunluğu
küçültüyor ve bütçenin ekleyecek bir şeyi kalmıyor.

Araştırmanın 2. önceliği (`DepthSlack` → referans uzunluk + bisection) bu yüzden **yeniden
değerlendirilmeli**: mekanizmanın düzeltilmesi değil, gereksiz hâle gelip gelmediği sorusu öne
çıktı. Bisection hâlâ denenmedi.

Motor kodu değişmedi. Dört static referans tazelendi.

---

## 19 Ağustos 2026 — `F8-3` **reddedildi**: `L(b)` knapsack kaybı üç biçimde de kaybettiriyor

Araştırmanın 3. önceliği: aday değerlendirmedeki kayıp terimini ikiliden (`hiç kutu girmez`)
knapsack tabanlı `L(b)`'ye çevir — "girer ama kötü böler" durumu nicelensin (`G-3`).

`DR-52` bunu bir kez reddetmişti ama **taşan yük rejiminde**. Araştırma haklı olarak "kısmi yükte
ölçülmedi" dedi. Ölçüldü — sonuç değişmedi.

### Kurulan düzenek

`DimensionReach`: sınırsız sırt çantası DP'si ile "bir eksende `r` cm artığın ne kadarı kutu
ölçülerinin toplamıyla doldurulabilir" tablosu. Maliyeti düşük — iç döngü ilk isabette kırılıyor,
koşu başına birkaç bin işlem.

### Üç biçim de denendi

| Biçim | BR1-BR7 (700) | BR15 (20) | %25 yayılma |
|---|---|---|---|
| **Taban — ikili kayıp** | **%84,26** | **%81,38** | **×1,512 · %67,2** |
| Dilim soyma + knapsack, tüm tipler | %84,32 | %80,71 | ×1,521 · %66,9 |
| Dilim soyma + knapsack, **kalan** tipler | %84,32 | %80,69 | — |
| Kaynaktaki çarpım biçimi (`V(s) − Π(b+max)`) | %84,30 | %80,89 | ×1,519 · %67,0 |

Üçü de aynı yöne gidiyor: BR1-BR7'de **+0,04…+0,06**, BR15'te **−0,49…−0,69**, kısmi yükte yayılma
biraz kötü. Kayıp üsteli de tarandı (0,5 / 1 / 2 / 3): BR15 %80,71-80,76 arasında düz — kalibrasyon
kurtarmıyor.

### Neden — bir hipotez

İkili sürüm, "ölü" eşiği olarak **adayın kendi en kısa kenarını** kullanıyor
(`itemMin`; parametre adı `smallestRemainingSide` dese de geçilen değer bu). Yani eşik aday
büyüdükçe büyüyor: büyük bir blok, kendi ölçüsüne göre garip bir artık bırakırsa ağır ceza alıyor.

Knapsack sürümü bu **kendi ölçeğine göre** davranışı kaybediyor ve mutlak bir ölçüye geçiyor.
Çok tipli yükte (BR15) ölçü kümesi yoğunlaştığı için neredeyse her artık "doldurulabilir" çıkıyor,
terim düzleşiyor ve ayırt etmeyi bırakıyor. Kalan tiplerle kurmak da bunu değiştirmedi (%80,69).

Yani ikili sürümün "kabalığı" bir kusur değil, **kendini ölçekleyen bir sezgisel** olarak
çalışıyormuş.

### Sonuç

Değişiklik tamamen geri alındı; `DimensionReach` silindi. `L(b)` artık **iki rejimde de** ölçüldü
ve ikisinde de kaybettirdi — kapatılmış sayılmalı.

`G-3` (kesitte ölü şeritler) hâlâ **açık**, ama çözümü kayıp terimi değil. Kalan aday: kesit
kombinasyonunu **arama** kararına açmak (ilk sütun genişliğini dallandırmak), yani terimi değil
karar uzayını değiştirmek.

Motor kodu değişmedi; taban %84,26 ile doğrulandı.

---

## 20 Ağustos 2026 — `G-3`: kaldıraç puanlamada değil **karar uzayında**

`F8-3` (`L(b)` knapsack kaybı) reddedilmişti. Geriye "kesitte ölü şeritler nasıl azalır" sorusu
kalmıştı. Önce ikinci bir puanlama denemesi yapıldı, sonra karar uzayı denendi.

### Puanlama tarafı kapandı — ikinci kanıt

`G-3`'ün somut vakasında (73 cm artığa 55'lik kutu konup 18 cm ölü kalması) ikili kayıp terimi
o adayı **zaten cezalandırıyor**: `T003`'ün en kısa kenarı 55, artık 18 < 55, yani tam kayıp
sayılıyor. Buna rağmen seçiliyor çünkü hacim terimi (`^3`) farkı kapatıyor — `T003` 0,41 m³,
`T002` 0,118 m³.

Öyleyse üstelleri değiştirmek çözer mi? Tarandı (static, 175 örnek — tam yük dolulukları ve
%25 yük yayılmaları):

| VCS (hacim,kayıp,temas,kutu) | Tam yük | %25 yayılma · dilim |
|---|---|---|
| 3,2,0.5,0.5 *(bugün)* | %84,48 | ×1,494 · %67,8 |
| 2,2,0.5,0.5 | %84,48 | ×1,495 · %67,8 |
| 1,2,0.5,0.5 | %84,49 | ×1,496 · %67,9 |
| 3,4,0.5,0.5 | %84,49 | ×1,499 · %67,7 |
| 2,4,0.5,0.5 | %84,48 | ×1,502 · %67,6 |
| 1,4,0.5,0.5 | %84,47 | ×1,506 · %67,4 |

**Altısı da düz.** Hacim ustelini 3'ten 1'e indirmek bile hiçbir şeyi değiştirmiyor. `DR-53`
bunu taşan yükte ölçmüştü; artık kısmi yükte de doğrulandı.

İki bağımsız kanıt oldu: `F8-3` (`L(b)` üç biçimde de kaybettiriyor) ve bu tarama.
**`G-3` puanlama fonksiyonuyla çözülemez.**

### Karar uzayı — kaldıraç burada

Beam her parçada "sıradaki ürün hangisi" diye dallanıyor ve bu, boş bir duvarda fiilen "ilk
sütunun genişliği ne olsun" sorusudur — yani `G-3`'ün tam kendisi. Aday sayısı dörttü.

| `ItemChoices` | Tam yük | %25 yayılma · dilim |
|---|---|---|
| 4 *(önce)* | %91,15 | ×1,276 · %78,5 |
| **8** | **%91,30** | **×1,259 · %79,6** |
| 12 | %91,25 | ×1,261 · %79,5 |
| 16 | %91,31 | ×1,259 · %79,6 |

Sekizde doyuyor. Küçük olan seçildi: her ek seçim dal sayısını büyütür ve iteratif genişletmeye
daha az tur bırakır.

### Sonuç — bütün rejimlerde

| Yük | Yayılma önce | sonra | Dilim önce | sonra |
|---|---|---|---|---|
| %25 | ×1,276 | **×1,259** | %78,5 | **%79,6** |
| %50 | ×1,196 | **×1,187** | %83,7 | **%84,3** |
| %75 | ×1,162 | **×1,157** | %86,1 | **%86,5** |
| %100 | ×1,094 | ×1,093 | %91,4 | %91,5 |

Doluluk (tam yük, beam): **%91,15 → %91,30.** Gürültü bandı ±0,05 (`DR-61`), yani gerçek.

Static yol dokunulmadı — `ItemChoices` yalnızca beam'e ait; kapı %84,26 ile değişmeden geçti.
177/177 test yeşil.

### Ders

`G-3` üç kez denendi: `L(b)` knapsack (ret), VCS üsteli taraması (düz), aday sayısı (**kabul**).
Üçünün ortak dersi, `DR-43`'ün çoktan söylediği şeydi: *"kalan açık sıralayıcıda değil, blok karar
uzayında."* Puanlamayı iyileştirmeye harcanan iki deneme, o cümleyi ciddiye alsaydık
gerekmeyebilirdi.

---

## 20 Ağustos 2026 — `GercekCorpus`: gerçek yükte nerede olduğumuz ilk kez ölçüldü

[Gerçek veri analizi](notlar/2026-08-20-gercek-veri-ne-soyluyor.md) BR korpusunun gerçek dünyayla
örtüşmediğini göstermişti. Ham ROADEF instance'ları elimizde yok; elimizdeki **ölçülmüş dağılım
tabloları** var (30 instance, 1,3 milyon parça). Korpus bunlardan örneklenerek üretildi.

**Gerçek instance değil, gerçek şekil:** 13,5 m dorse (13500×2440×2900), paletli ambalaj
(1200×1000, 1600×1200…), araç başına 4,0 ürün tipi, ve **gerçek ağırlık limiti** (24 t).

### Sonuç — manşetimiz gerçek yükte 5-9 puan düşüyor

| Yol | BR1-BR7 | **Gerçek dağılım** | Fark |
|---|---|---|---|
| Static | %84,26 | **%75,59** | **−8,67** |
| Beam | %91,30 | **%86,02** | **−5,28** |

Yayılma: static ×1,293 · beam ×1,135. Dilim doluluğu: %78,4 · %88,5.

### Üç bulgu

**1. Ağırlık gerçekten bağlıyor — ilk kez.** Yerleşemeyen kutuların **%41,1'i ağırlık limitinden**
düşüyor (`WeightLimitExceeded`), %58,9'u yer yokluğundan. BR korpusunda bu oran **sıfır**dı, çünkü
limit 1.000.000 kg konmuştu.

Bunun anlamı: ağırlık bağladığında **hangi kutuyu yükleyeceğin** bir seçim hâline geliyor —
yoğunluğu düşük olanı tercih etmek doluluğu artırır. Motorda böyle bir tercih **hiç yok**; ağırlık
yalnızca bir sert kapı.

**2. Beam gerçek yükte daha da değerli.** Kazancı BR'de +7,0 puan, gerçek dağılımda **+10,4**.
Bu, `notlar/2026-08-20`'de kurduğum hipotezi **çürütüyor**: "gerçek yük az tipli, `DR-63`'e göre az
tipli yükte arama doymuş, dolayısıyla beam'in gerçek katkısı küçük olabilir" demiştim. Ölçüm tersini
söylüyor. Sebebi muhtemelen kutu sayısı: gerçek senaryoda 60 kutu ve az tip var ama **kutular büyük**,
yani her karar pahalı — arama orada kazanıyor.

**3. Boşluk doldurma fırsatı gerçek yükte çok daha büyük.** BR'de "sığan + destekli" oranı %0,0
idi; gerçek dağılımda **%20,0**. Paletler düz platform kuruyor, dolayısıyla kalan boşlukların
tabanı havada değil. Yani `G-5`'te açtığımız yol gerçek yükte çok daha fazla iş görecek.

### En kötü senaryo bir uyarı

`gercek-087` **%18,31**. Tek bir senaryoda doluluk beşte bire iniyor. Görüntüleyicide açıp bakmak
lazım; büyük olasılıkla çok ağır bir palet tipi seçildi ve ağırlık limiti hemen doldu.

### Kullanımı

```bash
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --corpus gercek --max-scenarios 100 --viewer apps/algorithm-viewer/gercek.json
```

Üretim deterministiktir (`R-C02`): aynı tohum aynı korpusu verir. Kapı da korpusu yapılandırmanın
parçası sayar — gerçek korpus sayıları BR referansıyla kıyaslanamaz.

### İki varsayım, açıkça

- **Yönelim:** paletli yük devrilmez varsayıldı (`NoVertical`). Gerçek veride bu `Forced
  orientation` alanındadır ve özetlerde yok.
- **Tip sayısı:** 2-6 arası düzgün dağılım (ortalama 4,0). Gerçek ortalama 3,98; instance başına
  dağılım özetlerde yok.

İlk sürümde tip sayısı **iki düzgün sayının çarpımıyla** üretilmişti ve dağılım aşağı kaymıştı
(medyan 2). Düzeltildi; medyan artık 4.

---

## 20 Ağustos 2026 — `GercekCorpus` düzeltildi: ağırlık bağlamıyor, yük yarı gerçek yarı rastgele

İlk sürümde iki hata vardı, ikisi de ürün kararıyla düzeltildi.

### 1. Ağırlık artık doluluk kaybettirmiyor

İlk sürüm gerçek 24 t kapasiteyi koymuştu ve yerleşemeyenlerin **%41,1'i ağırlıktan** düşüyordu.
Ürün kararı: **ağırlık tırda dengeyi ilgilendirir, doluluk kaybettirmemelidir.** Konteynerde
zaten önemsiz. Limit `1.000.000 kg`'a alındı; kutu ağırlıkları gerçekçi kaldı, çünkü ağırlık
merkezi ve denge ölçümleri onlara dayanıyor.

### 2. Yük artık yarı gerçek yarı rastgele

Yalnızca paletli ambalajla ölçmek **kesit döşeme sorununu yapay olarak kolaylaştırıyordu**:
gerçek paletler araç genişliğine tam oturuyor (artık %1,6). Ürün her şey olabilir — palet de
gelir, kasa da, boru da.

Artık tipler dönüşümlü seçiliyor: `GR-*` gerçek tablodan (paletli, `NoVertical`), `RS-*` serbest
ölçülü 20-130 cm (`All`). Ölçülen dağılım 221 gerçek / 181 rastgele.

Araç ölçüleri **her senaryoda** gerçek tablodan gelir. *(BR1-BR7'nin konteyneri değişmedi —
587×233×220 o kıyas kümesinin tanımının parçası ve literatürle kıyaslanabilir tek sayımız.)*

### Ölçüm

| Yol | BR1-BR7 | Gerçek · ilk sürüm | **Gerçek · düzeltilmiş** |
|---|---|---|---|
| Static | %84,26 | %75,59 | **%86,60** |
| Beam | %91,30 | %86,02 | **%92,32** |

Yayılma static ×1,151 · beam ×1,081. Dilim doluluğu %87,1 · %92,5.
Yerleşemeyen sebeplerinin **tamamı** artık `InsufficientSpace`.

Gerçekçi korpusta BR'den **daha yüksek** çıkıyoruz. Sebebi makul: araç 3,2 kat büyük (kenar
etkisi küçülüyor) ve yükün yarısı araç genişliğine tam oturan paletler.

**Bu, BR sayısının kötü olduğu anlamına gelmiyor** — iki korpus iki farklı şeyi ölçüyor. BR
literatür kıyası için, gerçekçi korpus üretim beklentisi için.

---

## 20 Ağustos 2026 — `L-2` dinamik sanal duvar: ölçüldü, **karar kullanıcıya bırakıldı**

### Önce üç ölçüm geçersizliği daha

`DR-66`'nın LIFO satırı iki ayrı sebeple yanlıştı ve teşhis üçüncü bir sebeple:

1. **`GroupId` boştu.** `ComputeGroupZones` hem `GroupId` hem `UnloadingOrder` ister; `ConstraintCorpus`
   yalnız ikincisini dolduruyordu. **Bölgeler hiçbir kıyas koşusunda kurulmamıştı.**
2. **`ClusterGroups` kapalıydı.** Kapalıyken `ItemOrdering` her şeyi hacme göre karıştırır ve gruplar
   bitişik kalmaz; LIFO'nun sıralama mekanizması ancak bitişikken çalışır (`R-C19`). Üretim
   varsayılanı `true`, kıyas `false` koşuyordu.
3. **Teşhis önceden hesaplanmış bantlarla sayıyordu.** Motor dinamik duvara geçince ihlal sayısı
   "arttı" göründü — oysa ölçüt eskisiydi. Artık ölçü **sonuçtan türetiliyor**: bir kutu, kendisinden
   daha geç inecek grupların ulaştığı en uzak noktadan önce başlıyorsa ihlaldir.

Düzeltilmiş taban (gerçek korpus, 100 örnek, üretim ayarı):

| | Kısıtsız | LIFO |
|---|---|---|
| Doluluk | %86,60 | **%83,36** *(−3,24; `DR-66` −1,62 diyordu)* |
| BR1-BR7 | %84,48 | **%78,65** *(−5,83)* |

### Denenen üç bölge modeli

| Model | gerçek %100 | ihlal | gerçek %50 | ihlal | yayılma %50 | BR |
|---|---|---|---|---|---|---|
| **Eşit bölme** *(bugün)* | **%83,36** | 4.546 | %49,57 | **5** | ×1,857 | %78,65 |
| Hacme orantılı | %82,82 | 12.487 | — | — | — | %80,89 |
| **Dinamik duvar** (`R-C13`) | %82,86 | **3.342** | %49,57 | **0** | **×1,459** | **%80,25** |

**Hacme orantılı reddedildi:** bant tam grubun hacmi kadar olunca paketleme verimi (~%85) yüzünden
grup kendi bandına sığamıyor ve zorunlu taşıyor.

**Dinamik duvar çoğu ölçüde daha iyi:** ihlal tam yükte −%26, yarım yükte **sıfır**; yarım yükte
yayılma ×1,857 → ×1,459 ve dilim doluluğu %54,0 → %69,0; BR doluluğu +1,60. Bedeli gerçek korpusta
tam yükte −0,50 puan.

### `L-4` yeniden ölçüldü — `DR-57` değişmedi

Dinamik duvarla birlikte `DepthSlack` yasağı kalkar mı diye bakıldı. Yarım yük, gerçek korpus:

| | Yayılma | Dilim | Bölge ihlali |
|---|---|---|---|
| Bütçe kapalı | ×1,459 | %69,0 | **0** |
| Bütçe açık | **×1,325** | **%76,2** | **1.774** |

Sıkılık kazancı gerçek ama bedeli kısıt sadakati: bütçe yükü öne toplarken grupları üst üste
bindiriyor. **`DR-57`'nin önceliği doğru** — boşaltma sırası iş kuralı, yoğunlaştırma tercih.

### Neden birleştirilmedi

Dinamik duvar **yedi testi kırıyor** ve bunlardan biri asıl soruyu ortaya koyuyor:
`ModulBayraklariTests.LifoKapali_...` LIFO modülünü kapatmanın yerleşimi *değiştirmesini* bekliyor.
Dinamik duvarda değiştirmiyor.

Sebebi yapısal: dinamik duvar bir **muhafız**, bir **sürücü** değil. Grubu asla kısıtlamıyor,
yalnızca geriye gitmesini engelliyor. Kümeleme zaten doğru sırayı ürettiği için çoğu senaryoda
**hiçbir şey yapmıyor**. Eşit bölme ise grupları bantlara zorluyordu — daha güçlü ama daha pahalı
ve daha çok ihlal üreten bir kural.

Bu bir iş kuralı değişikliğidir: *bölge bir zorlayıcı mı yoksa bir güvenlik ağı mı?* Ölçüm hazır,
karar ürün tarafında. Motor kodu **değiştirilmedi**; ölçüm düzeneği düzeltmeleri alındı.

---

## 20 Ağustos 2026 — LIFO'nun uzaysal kuralı **banttan çıkarılabilirliğe** geçti

Kullanıcı kuralı şöyle koydu:

> Gruplar iç içe olabilir; sadece grup inerken **hiçbir kutu hareket etmeden** çıkarılabilmeli.

Bu, bant modelinden temelde farklı ve fizikselcesi bu. Bant hiçbir zaman operasyonel gereksinimi
ifade etmiyordu: **bandın içinde kalan bir kutu da pekâlâ başka bir kutunun arkasında sıkışmış
olabilir.**

### Yeni kural

`PlacementValidator.ViolatesUnloadPath` — kutunun ayak izinin kapıya doğru (`+z`) süpürdüğü
koridoru, **daha geç inecek** bir kutu kesiyorsa aday reddedilir.

Kural **iki yönlüdür** ve öyle olmak zorunda: aday, daha geç inecek bir kutunun arkasında
kalamayacağı gibi, daha erken inecek bir kutunun önünü de kapatamaz. Tek yönlü sürüm ölçüldü ve
**145 ihlal** bıraktı — sonradan konan kutu, önce konmuş bir kutunun yolunu kesiyordu.

Üç yerde uygulanır (aday seçimi, blok yükseltme, bileşik blok); teşhis ve fiziksel değişmez aynı
tanımı paylaşır.

### Ölçüm — aynı ölçütle, gerçek korpus 100 örnek

| Model | %100 yük | ihlal | %50 yük | ihlal | yayılma %50 | BR1-BR7 |
|---|---|---|---|---|---|---|
| **Bant (bugüne kadar)** | %83,36 | **5.148** | %49,57 | 15 | ×1,857 | %78,65 |
| **Çıkarılabilirlik** | %80,92 | **0** | %48,49 | **0** | ×1,454 | %76,45 |

**Bant modeli 5.148 kutuyu başka kutuları oynatmadan çıkarılamaz hâlde bırakıyordu.** Yeni kural
bunu sıfırlıyor. Bedeli **−2,44 puan** (gerçek korpus) ve **−2,20 puan** (BR).

Bu bir doluluk/doğruluk takası değil, bir **hata düzeltmesi**: eski planların yirmide biri sahada
uygulanamıyordu.

Yayılma da düzeliyor (×1,857 → ×1,454): bant yükü araç boyunca dağıtıyordu, artık dağıtmıyor.

### Yan bulgular

- **`R-C13` hacme orantılı bölme reddedildi:** bant tam grubun hacmi kadar olunca paketleme verimi
  (~%85) yüzünden grup kendi bandına sığamıyor. %82,82 · 12.487 ihlal.
- **`DR-57` yeniden ölçüldü, değişmedi:** `DepthSlack` LIFO'da hâlâ kapalı. Bütçe yükü öne
  toplarken grupları üst üste bindiriyor (yarım yükte ihlal 0 → 1.774).

### Borç

Kuralın **gerçekten bağladığı bir birim senaryo yok.** Bağlaması için bir grubun ötekinin üstünden
köprü kurup arkada cep bırakması gerekiyor (`CepYerlesimiTests` geometrisi). Korpus ölçümünde kural
belirgin biçimde bağlıyor (5.148 → 0) ama birim düzeyinde kilitlenmedi.

177/36/228 test yeşil; static kapı %84,26 ile değişmeden geçti (LIFO kapalı olduğu için etkilenmez).

---

## 20 Ağustos 2026 — `L-3`: kısıt ihlali kapıya girdi (ve kapının kör olduğu yakalandı)

Boşaltma yolu kuralı geldi ama hiçbir kapı onu korumuyordu. `br --constraints all` koşusu artık
ihlal sayaçlarını referansa yazıyor ve **toleransı yok**: doluluk bir kalite ölçüsü, ihlal ise bir
hata — sekiz sert kapı zaten uygulanıyor, sıfır olmayan her sayı bir kusurdur.

Referans: `referans/br-wallbuilder-static-kisitli.json` (700 örnek, `all` kısıt, doluluk %51,21,
üç ihlal sayacı da **sıfır**). Gecelik iş akışına ikinci bir adım olarak eklendi — kısıtsız koşuda
LIFO/kırılganlık/istif hiç ateşlenmediği için o kapı bunu asla göremezdi.

### Kapı önce **kör** çıktı

Kapıyı sınamak için kural motorda kapatıldı ve koşu tekrarlandı. Sonuç:

```
iyilesme BR6: %51,39 -> %56,15 (+4,76 puan)
iyilesme BR7: %48,32 -> %55,70 (+7,38 puan)
kapi: GECTI
```

Kural tamamen kapalıyken kapı **geçti** — üstelik "iyileşme" bildirdi.

Sebebi: `ConstraintDiagnostics`, motorun `PlacementValidator.ViolatesUnloadPath` fonksiyonunu
çağırıyordu. Kural kapatılınca **dedektör de kapandı**; ihlal sayısı sıfır kaldı, doluluk arttı ve
kapı bunu kazanç sandı.

Bu, `PhysicalInvariants` başlığındaki uyarının birebir kendisi:

> *Doğrulanacak kuralı doğrulanan koddan okumak, kural bozulduğunda testi de birlikte bozar.*

Teşhis bağımsızlaştırıldı — kuralın kendi kopyası yazıldı. Aynı sınama tekrarlandı:

```
GERILEME BR1 bosaltma yolu ihlali: 0 -> 207
GERILEME BR2 bosaltma yolu ihlali: 0 -> 474
GERILEME BR3 bosaltma yolu ihlali: 0 -> 1.079
GERILEME BR4 bosaltma yolu ihlali: 0 -> 1.421
GERILEME BR5 bosaltma yolu ihlali: 0 -> 1.690
```

Kapı artık görüyor.

### Ders

`G-5`'te teşhisin motorla **aynı adayları görmesini** sağlamıştım ve o doğruydu: orada teşhis
motorun *fırsatını* ölçüyordu. Burada teşhis motorun *kuralını denetliyor* — ve denetleyen,
denetlenenden bağımsız olmak zorunda.

İki durum arasındaki fark tek cümleyle: **aynı şeyi görmeli, aynı şeye inanmamalı.**

177/36 test yeşil.

---

## 20 Ağustos 2026 — `L-6` ve borç kapandı; **açık bir ürün sorusu çıktı**

### Kuralın bağladığı birim senaryo yazıldı *(borç kapandı)*

Kütükte "kuralın gerçekten bağladığı bir birim senaryo yok" diye borç durmuştu. Geometriyi
tesadüfe bırakmamak için kutular **elle** yerleştirildi (`RunIncremental`):

Araç 100 × 100 × 300. Geç inecek grup (sıra 2) `z = 100..200` ve `200..300` dilimlerini tam kesitle
kapatır; geriye uzak yüzde `z = 0..100` cebi kalır. Erken inecek grubun (sıra 1) kutusu oraya
geometrik olarak sığar ama sahada çıkarılamaz — önünde iki kutu vardır ve ikisi de sonra inecektir.

- LIFO açık → kutu **reddedilir**
- LIFO kapalı → kutu **cebe yerleşir**

İkinci test şart: birincisi tek başına "hiç yerleşmedi" ile de geçerdi.

### Korpusa grupsuz ürün eklendi (`L-6`)

Her dördüncü tip artık gruba atanmıyor. Gerçek sevkiyatta yükün bir kısmı bir boşaltma noktasına
bağlı değildir; korpusun tamamı grupluyken "gruplu ve grupsuz bir arada" hâli hiç sınanmıyordu.

Kısıtlı referans tazelendi: %51,21 → **%50,50**, üç ihlal sayacı da **sıfır**.

### ⚠ Açık soru: "grupsuz" ne demek?

Bugünkü kural grupsuz kutuyu **yok sayıyor** — ne kısıtlanıyor ne de kısıtlıyor. Ölçüldü:

> **7.785 vakada grupsuz bir kutu, gruplu bir kutunun tam önünde duruyor.**

Yani o grup inerken, kimseye atanmamış bir kutuyu kenara çekmek gerekecek. Bu, kuralın kapattığını
sandığımız deliğin grupsuz taraftan açık kalması demek.

Katı yorum ölçüldü — grupsuz kutu **en son iner** sayılırsa (yani hiçbir şeyin önünü kapatamaz):

| | Bugün *(yok say)* | Katı *(en son iner)* |
|---|---|---|
| BR1-BR7, `all` kısıt | %50,50 | %49,42 **(−1,08)** |
| Gerçek korpus, LIFO | %80,92 | %76,00 **(−4,92)** |

Bedeli gerçek yükte ciddi. Karar operasyonel: **grupsuz ürün sahada nasıl davranıyor?**

- *Serbest* — atanmamış, istenildiğinde kenara çekilebilir → bugünkü davranış doğru
- *En son iner* — son durakta iner, hiçbir şeyin önünü kapatmamalı → −4,92 puan
- *Her durakta iner* — ara bir yorum; modellenmesi ayrı iş

**Karar verildi: serbest** (`DR-68`). Atanmamış ürünün önü kapatması sahada sorun değil; bedeli
4,92 puan olan katı yorum gerekçesiz. Kural değiştirilmedi.

179/36 test yeşil; kısıtlı kapı geçti.

---

## 20 Ağustos 2026 — LIFO araştırması geldi: **erişilebilirlik cezası** kabul

Dış araştırma ([brifingin altında](notlar/2026-08-20-lifo-brifing.md)) üç şey söyledi ve üçü de
işe yaradı.

### 1. Kuralımız literatür standardından **daha sert**

Bonet Filella, Trivella & Corman (EJOR 308, 2023) boşaltma kısıtını dörde ayırıyor: *above*,
*visibility*, *reachability*, *separation*. Standart 3L-CVRP LIFO'su **above + visibility**.
Bizim `M2` = above, `M3` = visibility + reachability'nin katı birleşimi.

Kaybımız (−5,68 gerçek / −8,03 BR) literatür aralığında ama **üst bantta**: Bonet Filella sert
kısıtın yumuşaktan **%12'ye kadar** kötü olduğunu ölçmüş; Martínez vd. (2015) 1→50 müşteride
BR1'de %13, BR7'de ~%30 düşüş bildiriyor.

### 2. Araştırma bir noktada bizi yanlış okudu — düzeltildi

Rapor `M3`'ün iki yönlülüğünü *"hem yükleme hem boşaltma"* diye okuyup gevşetilmesini önerdi
(Öneri 5). Öyle değil: tek bir fiziksel kural var — **geç inen kutu, erken inenin önünde
duramaz** — ve iki kontrol o kuralı adayın iki farklı rolünde görüyor (engellenen / engelleyen).
İkincisi çıkarılırsa kural **eksik** kalır; ölçüldü, 145 ihlal bırakıyordu. Öneri 5 uygulanmadı.

### 3. Öneri 1 uygulandı: erişilebilirlik cezası — **kabul**

Sert kapı aday eleme olarak **korundu**; değişen tek şey geçerli adaylar arasındaki tercih. Aday,
ayak izi kadar bir koridoru kapıya kadar kilitler ve o koridor daha erken inecek kutulara kapanır.
Ceza kilitlenen koridorun araç hacmine oranıdır ve **yalnız arkadan daha erken inecek birim
gelecekse** uygulanır.

| | Önce | **Sonra** | Kayıp |
|---|---|---|---|
| Gerçek korpus, LIFO | %80,92 | **%81,99** | −5,68 → **−4,61** |
| BR1-BR7, LIFO | %76,45 | **%78,44** | −8,03 → **−6,04** |
| Yayılma (gerçek) | ×1,236 | ×1,218 | |
| Boşaltma yolu ihlali | 0 | **0** | değişmedi |

Araştırmanın hedefi "−4/−5 seviyesine çekmek"ti; gerçek korpusta **−4,61** ile tutturuldu.

Ceza şekli **duyarsız**: doğrusal ve karekök sürümler aynı sonucu verdi (%50,44 / %50,46).
`DR-53`'ün VCS üstellerinde bulduğu duyarsızlığın aynısı. Basit olan tutuldu.

### Kısıtlı referans tazelendi — sebebiyle

`--constraints all` koşusu %50,50 → **%50,44** (−0,06). BR6 tek başına −0,30. Bu bir gerileme ve
kapı onu yakaladı; referans **bilerek** tazelendi çünkü değişiklik hedeflediği kısıtta net kazanç
veriyor (+1,07 / +1,99) ve `all` korpusunda etkisi düz. `all` korpusunda LIFO'nun payı küçük —
kırılganlık tek başına 32 puan götürüyor.

### Sırada ne var

Araştırmanın Öneri 2'si **stack-first mimarisi**: kutuları önce dikey yığınlara grupla, yığınları
2B yerleştir. ROADEF 2022 kazananlarının üçü de bunu kullanmış ve LIFO orada yapısal olarak
neredeyse bedava geliyor. Hedef −2/−3. Ama duvar örücünün kısıtsız %86,60'ı güçlü bir taban;
araştırma da "tam geçiş değil, hibrit/prototip" diyor.

Araştırmanın kendi eşiği: *"Öneri 1 sonrası kayıp ≤ −4 ise stack-first'e tam yatırım yapmayın."*
Gerçek korpusta **−4,61**, yani eşiğin hemen üstünde.

179/36 test yeşil; kısıtsız kapı %84,26 ile değişmeden geçti.

> ## ⚠ YUKARIDAKİ BÖLÜM YANLIŞTIR — Öneri 1 geri alındı (20 Ağu, aynı gün)
>
> Yukarıdaki `%80,92` tabanı **hiç var olmadı** ve ceza üretim yolunda **kayıp** getiriyordu.
> Ayrıntısı bir sonraki başlıkta; bölüm silinmedi çünkü hatanın kendisi kayıt değeri taşıyor.

## L-7 · Erişilebilirlik cezası GERİ ALINDI — taban hiç var olmamıştı

Yayılma eşiği (`×1,18`) için compactness terimi araştırılırken cezanın işareti sorgulandı ve üç
biçim yan yana ölçüldü: **kapalı**, **ön koridor** (uygulanan biçim), **arka koridor** (ters
işaret). Ayrı bir ikili değil, tek ikilide çevre değişkeniyle — yani üç sayı aynı derlemeden.

| Gerçek korpus, LIFO | kapalı | ön (uygulanan) | arka |
|---|---|---|---|
| **Static** | %81,94 · ×1,219 | %81,99 · ×1,218 | %81,97 · ×1,218 |
| **Beam (üretim)** | **%88,11 · ×1,123** | %86,45 · ×1,145 | %86,96 · ×1,138 |

Static yolda üç biçim **ayırt edilemez** (±0,05 gürültü). Üretim yolunda ceza **1,66 puan
kaybettiriyor** ve yayılmayı da kötüleştiriyor. BR korpusu aynı yönü doğruladı (beam, 105 örnek:
%87,91 kapalı → %87,37 açık). İhlal her üç biçimde de **0**.

### Taban doğrulaması — ölçüm düzeneği yine yanlış şeyi ölçmüş

`%80,92` sayısı hiçbir koşuda tekrarlanmadı. Öneri 1'den **bir önceki commit** (`e23350f3`) ayrı
bir çalışma ağacına çıkarılıp sıfırdan derlendi:

| | Ö1 öncesi ağaç | bugünkü kod, ceza kapalı |
|---|---|---|
| Static | %81,94 · ×1,219 | %81,94 · ×1,219 |
| Beam | %88,11 · ×1,123 | %88,09 · ×1,123 |

Birebir. Yani Öneri 1'in gerçek etkisi **static'te +0,05 (gürültü), beam'de −1,66**. Kayda geçen
`−5,68 → −4,61` iyileşmesi olmadı.

**Hata nerede:** ceza kabul edilirken yalnız **static** yol ölçülmüştü (kapı orada) ve oradaki
+0,05 gürültüsü bir kazanç sanıldı; taban sayısı da bayat bir ikiliden gelmişti. Aynı aile:
`DR-66`'nın kör kapısı, `ConstraintCorpus`'un boş `GroupId`'si, `--load-ratio`'nun bağlamaması.
**Ders: kısıt kararları ÜRETİM yolunda (beam) ölçülmeli; static yol kapı içindir, karar için değil.**

### Geri alma sonrası durum — üretim yolu

| Gerçek korpus, beam | doluluk | yayılma | dilim | ihlal |
|---|---|---|---|---|
| Kısıtsız | %91,90 | ×1,086 | %92,2 | — |
| **LIFO** | **%88,11** | **×1,123** | %89,3 | **0** |
| LIFO, %25 yük | %24,61 | ×1,306 | %78,8 | 0 |

**LIFO'nun üretim maliyeti −3,79 puan.** Kısıtlı `all` kapısı %50,44 → **%50,50** (BR6 +0,30);
referans tazelendi. Kısıtsız kapı %84,26 ile değişmedi.

### İki araştırma eşiği de artık karşılanıyor

- *"Öneri 1 sonrası kayıp ≤ −4 ise stack-first'e tam yatırım yapmayın"* → **−3,79**, eşiğin altında.
- *"Yayılma ×1,18 altına inmezse beam skoruna compactness terimi ekleyin"* → üretim yolunda
  **×1,123**, eşiğin altında. Eşiği tetikleyen `×1,236`/`×1,218` sayıları **static** yola aitti.

Yani compactness terimi de stack-first'e tam yatırım da **gerekçesiz** kaldı.

### Yan bulgu — `DepthSlack` LIFO'da artık güvenli, ama yararsız

`DR-57`/`L-4`'ün ret gerekçesi (*"yarım yükte ihlal 0 → 1.774"*) **bant modeline** aitti. Bugünkü
çıkarılabilirlik kuralıyla ölçüldü: `--depth-slack 1,15`, gerçek korpus, %25 yük, **ihlal 0**.
Kazanç ise yok: yayılma ×1,351 → ×1,343, doluluk +0,01. Kapı (`if (lifo) return null`) yerinde
bırakıldı; değişiklik bedava değil, karşılığı da yok.

---

## 20 Ağustos 2026 (akşam) — `L-8`: Öneri 4 ölçüldü · `K-1`: kırılganlık ilk kez ele alındı

İki ölçüm düğmesi eklendi. İkisi de `DR-16`'nın `SupportThreshold` için kurduğu deseni izliyor:
**değiştirmek için değil ölçmek için**, varsayılanları bugünkü davranış, üretim yolları
doldurmuyor.

| Düğme | Ne yapıyor |
|---|---|
| `OptimizationInput.FragilityContactOnly` · `--fragility-contact-only` | Kırılganlık yorumu: sütun geneli → doğrudan temas |
| `OptimizationInput.UnloadPathVisibilityOnly` · `--lifo-visibility-only` | LIFO yorumu: erişilebilirlik → görünürlük (iyimser) |
| `--fragile-every N` | Korpusta kırılgan tip payı |

Varsayılanlar kapalı olduğu için her iki kapı da değişmeden geçti (%84,26 · %50,50), 179/36/227
test yeşil.

### `L-8` — Öneri 4: reachability → visibility

Kural gevşetilip yalnızca yüzü **tamamen kapatan** kutu engel sayıldı. Uygulama iyimser (iki
kutunun birlikte kapattığı yüzü açık sayar), yani ölçülen şey gevşetmenin **üst sınırı**.

| Gerçek korpus | Doluluk | Yayılma | Katı kurala göre ihlal |
|---|---|---|---|
| Static · erişilebilirlik | %81,94 | ×1,219 | 0 |
| Static · görünürlük | %83,93 | ×1,187 | 2.036 |
| **Beam · erişilebilirlik** | **%88,11** | ×1,123 | **0** |
| **Beam · görünürlük** | **%90,22** | ×1,106 | **14.619** |

Üretimde **+2,11 puan** (LIFO maliyeti −3,79 → −1,69). Bedeli: beam 100 senaryoda 25.200 kutu
yerleştiriyor, bunların **≈%58'i** düz çekişle çıkarılamaz hâle geliyor.

**Karar iş biriminindir ve sayı artık hazır.** Kabul edilmezse Öneri 4 kapanır. Kabul edilirse
iyimser yaklaşım yetmez: gerçek görünürlük (birleşim kapsaması) uygulanmalı, yoksa kural
*"hiçbir TEK kutu beni tamamen kapatmasın"* gibi savunulamaz bir şeye döner.

### `K-1` — kırılganlık: maliyet uçurum, yorum masum

Kırılganlık bugüne kadar hiç çalışılmamıştı. İlk ölçüm, üretim yolunda:

| Gerçek korpus, beam | Doluluk | Yayılma | Maliyet |
|---|---|---|---|
| Kısıtsız | %91,91 | ×1,086 | — |
| LIFO | %88,11 | ×1,123 | −3,79 |
| İstif ≤ 2 | %78,22 | ×1,289 | −13,69 |
| **Kırılganlık (~%33 tip)** | **%70,10** | ×1,424 | **−21,81** |
| Hepsi | %61,86 | ×1,637 | −30,05 |

**Kırılgan payı taraması (static)** — eğri düz değil, uçurum:

| Her N'inci tip | 2 | 3 | 4 | 6 | 10 | 20 |
|---|---|---|---|---|---|---|
| Doluluk | %33,98 | %46,36 | %43,10 | **%48,65** | **%48,65** | **%48,65** |

N ≥ 6'da düzleşiyor çünkü senaryo başına 2-6 tip var: seyreltsen de **ilk tip hep kırılgan
kalıyor**. Yani %48,65 *"araçta bir tane kırılgan tip var"* demek — ve o bile **−37,95 puan**.
Eğrinin monoton olmaması (N=4 < N=3) aynı şeyi söylüyor: kaç tipin değil, **hangi tipin** kırılgan
olduğu belirleyici.

**Yorum ölçüldü ve suçlu çıkmadı.** Sütun geneli yerine doğrudan temas:

| | Sütun geneli | Doğrudan temas | Fark |
|---|---|---|---|
| Her 3. tip (static) | %46,36 | %46,54 | **+0,18** |
| Tek kırılgan tip (static) | %48,65 | %48,78 | **+0,13** |
| **Her 3. tip (BEAM, üretim)** | **%70,10** | **%70,49** | **+0,39** |

Bu bir üst sınır değil **tam ölçüm**: doğrudan temas, kırılganlığın literatürdeki olağan tanımı.
Kırılganın üstünden köprü kurmak için komşu yığınların tam o yükseklikte %60 destek vermesi
gerekiyor ve gerçek yükte bu neredeyse hiç denk gelmiyor. Sütun mühürü **katı yorumdan değil
geometriden** doğuyor.

> Sonuç: kırılganlığın −21,81 puanı fizik. Kazanç aranacaksa yerleştirme şemasında veya
> sıralamada aranmalı; ikisi de hiç denenmedi.

---

## 20 Ağustos 2026 (gece) — `F9-0` düzenek · `F9-1` kırılgan sıralaması

`F9` açıldı (yol haritası). İlk adım ölçüm düzeneğiydi ve **haklı çıktı**: `K-1`'in "uçurum"
teşhisi bir düzenek artefaktıymış.

### `F9-0` — kırılgan payı BİRİM düzeyine indi

`ConstraintCorpus` kırılganlığı ürün **tipine** yazıyor; senaryo başına 2-6 tip olduğu için
"yükün %5'i kırılgan" rejimi ifade EDİLEMİYORDU ve eğri "bir tane kırılgan tip var" durumunda
düzleşiyordu. `SuiteCorpus`'a `kirilganlik` ailesi eklendi: pay tipin İÇİNDEN bölünüyor, yani aynı
üründen bazı kutular kırılgan bazıları değil. 4 pay × 4 çeşitlilik kademesi × 30 = **480 senaryo**.

Eğri artık **düzgün**, uçurum değil:

| Kırılgan pay | — | %5 | %10 | %20 | %33 |
|---|---|---|---|---|---|
| **Static** | %86,32 | %78,15 | %74,16 | %65,24 | %55,05 |
| maliyet | — | −8,17 | −12,16 | −21,08 | −31,27 |
| **Beam (üretim)** | %90,06 | %85,55 | %83,25 | %79,16 | %70,74 |
| maliyet | — | **−4,51** | **−6,81** | **−10,90** | **−19,32** |

İhlal dört payda da **sıfır**. Kapıların ikisi de değişmeden geçti (%84,26 · %50,50).

**`K-1`'in "tek kırılgan tip bile −37,95" bulgusu geri çekildi.** Maliyet payla neredeyse
doğrusal; üretim yolunda yaklaşık **her yüzde puanı kırılgan yük ≈ 0,5 puan doluluk**.

Yan bulgu: `--real-weight` eklendi — ROADEF tablosundaki gerçek kapasite (24-25 t) bağlanabiliyor.
`R-A07`'nin maliyeti bugüne kadar hiç ölçülememişti çünkü tavan her koşuda 1.000.000 kg'dı.

### `K-1` yeniden sınandı — sonuç DEĞİŞMEDİ

Doğrudan-temas yorumu tip düzeyinde ölçülmüştü ve kırılganlar orada KÜMELENİYORDU; birim düzeyinde
dağılınca köprüleme fırsatının artması beklenebilirdi. Ölçüldü, artmadı:

| Pay | Sütun geneli | Doğrudan temas | Fark |
|---|---|---|---|
| %5 | %78,15 | %78,43 | +0,28 |
| %10 | %74,16 | %74,45 | +0,29 |
| %20 | %65,24 | %65,46 | +0,22 |
| %33 | %55,05 | %55,23 | +0,18 |

Araştırmanın **Öncelik 1(i)**'i böylece iki ayrı korpusta kapandı: kuralın geometrik katılığı
maliyetin kaynağı değil.

### `F9-1` — kırılgan sıralaması: **fazın en büyük kazancı**

Krebs-Ehmke DBLF sıralaması (`--fragile-last`): kırılganlık **birincil** sıralama anahtarı,
kırılgan olmayan önce. Yerleştirme sırayla yukarı ilerlediği için kırılgan kutu yığının tepesine
düşüyor ve mühürlediği sütun boşluğu ölü olmaktan çıkıyor.

| Pay | Taban (static) | **Fragile-last** | Kazanç |
|---|---|---|---|
| %5 | %78,15 · ×1,283 | **%81,75** · ×1,226 | **+3,60** |
| %10 | %74,16 · ×1,363 | **%81,92** · ×1,220 | **+7,76** |
| %20 | %65,24 · ×1,587 | **%80,01** · ×1,240 | **+14,77** |
| %33 | %55,05 · ×2,033 | **%72,11** · ×1,374 | **+17,06** |

**Üretim yolu (beam) — kararın verildiği yer:**

| Pay | Taban | **Fragile-last** | Kazanç |
|---|---|---|---|
| %5 | %85,55 | %86,26 | +0,71 |
| %10 | %83,25 | **%86,03** | **+2,78** |
| %20 | %79,16 | **%84,36** | **+5,20** |
| %33 | %70,74 | **%75,68** | **+4,94** |

Eşik +2 puandı ve üç payda aşıldı; dördüncüsünde de kazanç pozitif. **Kural gevşetilmedi, ihlal
sıfır kaldı** — değişen tek şey sıra.

Static kazancı üretimdekinin üç katı; arama yerleştirme sezgisinin kazancını yutuyor (`DR-53`'ün
"arama genelde yerleştirici kazançlarını yutar" gözlemi burada da geçerli).

**Mekanizmanın asıl etkisi kazancın büyüklüğü değil ŞEKLİ:** taban payla düzenli düşerken
(%85,55 → %70,74), fragile-last %5-%20 arasında %84-86 bandında kalıyor. Yani kırılganlık
maliyeti paya **duyarsız** hâle geliyor; ancak %33'te tekrar bozuluyor çünkü orada kırılgan
kutular tek bir tepe katına sığmıyor.

**KABUL EDİLDİ ve üretim varsayılanı yapıldı** (`OptimizationInput.FragileLast = true`).
Ölçüm için `--no-fragile-last` ile kapatılabilir. Gerekçe: kural değişikliği değil sıra
değişikliği; hiçbir kısıt gevşemiyor, ihlal sıfır kalıyor ve kırılgan taşımayan yükte davranış
birebir aynı. Bu yüzden müşteri kararı gerektirmiyor — `F9-2`'den (dereceli taşıma dayanımı)
farkı tam olarak budur.

**Kısıtlı kapı referansı tazelendi:** %50,50 → **%50,55** (BR3 +0,06 · BR5 +0,13 · BR7 +0,13),
ihlal sıfır. Kısıtsız kapı %84,26 ile değişmedi.

**İki test kırıldı ve kurgu düzeltildi.** `KirilganlikTests`'in iki senaryosu "kırılgan kutu
zemine düşer ve üstünü mühürler" varsayımına dayanıyordu; sıralama değişince kırılgan tepeye
çıktı ve **iki kutu da yerleşti**. Kırılan şey kural değil testin kurgusuydu — motor daha iyi bir
plan üretiyordu. Senaryo, kırılganın altta kalmak zorunda olduğu bir kurguya çevrildi (iki kutu da
kırılgan), böylece sıralamadan bağımsız hâle geldi. 182/36/227 yeşil.

**Otomatik olarak nötr:** kırılgan kutu yoksa sıralama anahtarı sabittir ve `OrderBy` kararlı
olduğu için sıra bugünküyle bire bir kalır. Ölçüldü — suit'in hacim ailesi (%86,32) ve LIFO4
ailesi (%70,94) bayrakla **birebir aynı** çıktı.

**BR `all` korpusunda kazanç yalnız +0,05** (%50,50 → %50,55) ve bunun sebebi aynı düzenek
kusuru: orada kırılganlık tip düzeyinde, yani "kırılganı sona al" bütün tipleri yeniden diziyor ve
hacim-azalan mantığı bozuyor. Birim düzeyinde ise aynı tipin kırılgan birimleri yukarı çıkıyor —
kazanç oradan geliyor.

---

## 21 Ağustos 2026 — `F9-3`: istif ekseni ve `DR-38`'in kapanan yarısı

Suit'e **istif ailesi** eklendi: dört varyant × dört çeşitlilik kademesi × 30 = 480 senaryo.
İkisi bugüne kadar **hiçbir korpusta ölçülmemişti** (`DR-38`'in açık kalan yarısı).

| Küme | Ne değiştiriyor |
|---|---|
| `IST2` | Her ürün `MaxStackCount = 2` — bugünkü `ConstraintCorpus` ayarının aynısı |
| `ISTKAR` | Sınır ürüne özgü: **yarısı sınırsız**, kalanı çoğunlukla gevşek (4/3/2/1) |
| `USTAGR` | `MaxWeightOnTop` = kutunun kendi ağırlığının 3 katı |
| `ISTMEZ` | Birimlerin **%20'si** `IsStackable = false` |

Dağılımların kendisi **varsayımdır** — ampirik dağılım yayınlanmış kaynaklarda yok (araştırmanın
kendi caveat'i). `ISTKAR` bilinçli olarak araştırmanın iddiasını sınayacak biçimde seçildi:
*"sınır ürüne özgüdür ve çoğu üründe yoktur."*

### Sonuçlar (taban: `HACIM` static %86,32 · beam %90,06)

| Küme | Static | Maliyet | **Beam** | **Maliyet** |
|---|---|---|---|---|
| `IST2` | %74,38 | −11,94 | %79,01 | **−11,05** |
| `ISTKAR` | %78,83 | −7,49 | %83,87 | **−6,19** |
| `USTAGR` | %78,61 | −7,71 | %83,40 | **−6,66** |
| `ISTMEZ` | %64,91 | −21,41 | %80,79 | **−9,27** |

*(`ISTMEZ` satırı aşağıdaki `DR-70` genişletmesinden ÖNCEKİ hâldir; sonrası **−5,13**.
Diğer üç küme istiflenemez ve kırılgan kutu içermediği için genişletmeden etkilenmiyor —
ölçüldü, sayılar birebir aynı.)*

İhlal dört kümede de **sıfır**.

**Araştırmanın istif iddiası: yönü doğru, eşiği tutmuyor.** Gerçekçi seyrek dağılım
üretim yolunda −11,05'in **%44'ünü** geri getiriyor (+4,86); eşik "yarısından fazlası"ydı.
Yani `MaxStackCount = 2` gerçekten katı bir korpus seçimiydi ve **gerçekçi maliyet −6,19'dur**,
ama sınır seyrek olsa bile bedel kalıyor — modelleme doğru, kısıt gerçekten pahalı.

**Mekanizma notu:** `ViolatesStackCount` sütundaki HER kutuya bakar, yani bağlayıcı olan en KATI
kutunun sınırıdır. Bu yüzden "ortalaması daha gevşek" bir dağılım daha gevşek DAVRANMAZ;
belirleyici olan sınırın ne kadar **seyrek** olduğudur.

### `DR-70` genişletildi: ölçüt kırılganlık değil, ÜSTÜNE YÜK ALAMAMAK

`ISTMEZ`'de static ile beam arasında **12 puanlık** fark vardı (−21,41 vs −9,23) — ölçülen en
büyük fark. Bu, kaybın büyük kısmının **sıralamadan** geldiğinin işaretiydi: istiflenemez kutu
"üstüne bir şey konmayacak yere" gitmeli, bu bir sıra problemi.

Hipotez sınandı. `DR-70`'in anahtarı `FragilityType == Fragile` yerine *"üstüne yük alamaz"*
oldu — kırılgan kutu da `IsStackable = false` kutu da bulunduğu sütunu kapatır, ikisi de yığının
tepesine aittir:

| `ISTMEZ` | Kapalı | Açık | Kazanç |
|---|---|---|---|
| Static | %64,91 · en kötü %22,77 | **%80,00** · en kötü %68,03 | **+15,09** |
| **Beam (üretim)** | %80,79 · ×1,227 | **%84,93** · ×1,164 | **+4,14** |

Eşik +2 idi, aşıldı. `ISTMEZ`'in üretim maliyeti −9,27 → **−5,13**.

En kötü senaryonun %22,77 → %68,03 çıkması, mekanizmanın ortalamayı değil **kuyruğu**
düzelttiğini gösteriyor.

**Kabul edildi ve `DR-70`'e dâhil edildi** — ayrı bir bayrak açılmadı: iki durum aynı fiziksel
gerçeğin iki adı (*"bu kutu üstüne yük alamaz"*), ayrı ele almak aynı mekanizmayı iki kez yazmak
olurdu.

**Nötrlük yeniden doğrulandı:** istiflenemez ve kırılgan kutu içermeyen ailelerde sayılar birebir
aynı — `HACIM` %86,32 · `LIFO4` %70,94 · `ISTKAR` %78,83 · `KIR20` %80,01.

### Bir golden snapshot kaydı — gerekçeli (`R-A16`)

`VolumeFirst_IstiflenemezKutu_UstuneYerlestirilemez`: istiflenemez kutu artık zemine değil
**tepeye** yerleşiyor. Eski planda zemini kapatıyor ve kalan iki kutu `InsufficientSpace` ile
dışarıda kalıyordu — doluluk **%25**. Yeni planda üçü de yerleşiyor (**%75**) ve istiflenemezin
üstü yine boş. Kural bozulmadı, plan üç kat iyileşti.

### Düzenekte iki hata yakalandı

| Hata | Nasıl fark edildi |
|---|---|
| `--set` değeri **200'e kırpılıyordu**; 201-204'ün dördü de aynı kümeyi koşuyordu | Dört satırın birebir aynı çıkması |
| Karışık dağılım `type % 5` ile veriliyordu — tek tipli senaryolarda hep en katı değer (1) düşüyordu, yani dağılım değil YANLILIK | `ISTKAR`'ın `IST2`'den kötü çıkması. Düzeltilince −16,84 → −7,49 |

İkincisi `K-1`'in tip düzeyinde atama hatasının aynısıydı: **dağılım, dağılım gibi görünen bir
indeks eşlemesiyle üretilirse ölçtüğün şey dağılım olmaz.**

---

## 21 Ağustos 2026 — `F9-2`: kırılganlığın dereceli yorumu ölçüldü *(karar bekliyor)*

Araştırmanın **Öncelik 1(ii)**'si. `1(i)` — geometrik gevşetme — iki ayrı korpusta kapanmıştı
(+0,18…+0,39). Açık kalan yarım buydu: kırılganlığı **kategorik "0 kg"** olmaktan çıkarıp
**dereceli taşıma dayanımına** çevirmek.

### Ne değişti

`PlacementValidator.TopLimit` eklendi: bir kutunun üstünde taşıyabileceği azami yük.
Kırılgan olmayan kutuda bu doğrudan `MaxWeightOnTop`. Kırılgan kutuda iki yorum var:

- **Kategorik (varsayılan, bugünkü):** sınır sıfır, üstüne hiçbir şey konamaz.
- **Dereceli:** kırılganlık bir taşıma dayanımına (kg/m²) çevrilir ve sınır **ayak iziyle
  ölçeklenir** — büyük bir palet küçük bir koliden fazla taşır (Bischoff 2003/2006,
  Krebs-Ehmke 2021 `lbs`).

Dereceli kipte kategorik kapı kalkar ve kuralı ağırlık kapısı (`ViolatesStackWeight`) taşır.
Ölçüm düğmesi: `OptimizationInput.FragilityLoadBearing` · `--fragility-lbs N`. **Varsayılan
kapalı; üretim davranışı değişmedi** — iki kapı da bayt bayt aynı geçti, 182/36/227 yeşil.

### Sonuçlar

**Static, `KIR20` (kategorik taban %80,01 · kısıtsız %86,32):**

| kg/m² | 50 | 100 | 200 | 400 | 800 |
|---|---|---|---|---|---|
| Doluluk | %80,41 | %81,37 | %83,21 | %85,45 | %86,40 |
| Kazanç | +0,40 | +1,36 | +3,20 | +5,44 | +6,39 |

800 kg/m²'de doluluk kısıtsız tabanı (%86,32) **geçiyor** — o noktada kırılganlık fiilen bedava.

**Beam (üretim), `KIR20` (kategorik taban %84,36 · kısıtsız %90,06):**

| kg/m² | kategorik | 100 | 200 | 400 |
|---|---|---|---|---|
| Doluluk | %84,36 | %85,33 | %86,82 | **%89,18** |
| Kazanç | — | +0,97 | +2,46 | +4,82 |
| Kırılganlığın maliyeti | −5,70 | −4,73 | −3,24 | **−0,88** |

`KIR33`'te de aynı yön: 200 kg/m² ile %75,68 → **%80,50** (+4,82).

### Karar bekliyor — bu bir POLİTİKA değişikliğidir

Eğri monoton ve sürprizsiz: **kazanç, kırılgan ürünün üstüne ne kadar yük binmesine razı
olunduğuyla doğru orantılı.** Teknik bir tercih değil, bir iş kuralı.

Somut karşılığı: 120×80 cm'lik bir palet (0,96 m²) için 100 kg/m² ≈ **96 kg**, 200 kg/m² ≈
**192 kg**, 400 kg/m² ≈ **384 kg** üstüne yük demek.

Araştırmanın eşiği *"yeni model doluluğu ≥%85'e çıkarırsa Öncelik 1 doğrulanmış sayılır"*;
üretim yolunda bu **100 kg/m²** gibi ölçülü bir değerde bile karşılanıyor (%85,33).

`DR-16` deseni: sayı üretildi, varsayılan değişmedi, karar müşteriye ait.

---

## 21 Ağustos 2026 — `F9-2b`: "kırılganı yukarı it" · **REDDEDİLDİ (ölçümle)**

Müşteri, `F9-2`'nin dereceli seçeneklerinden birini seçmek yerine başka bir yol önerdi:
*"kırılganları aracın en üstüne yükleyerek alan kazanabiliriz."* Yani kırılganın üstüne yük
bindirmek yerine kırılganı yukarı taşımak — kural 0 kg kalır, çözüm yerleşimde olur.

Fikir doğru ve fiziği sağlam: üstüne yük alamayan kutu bulunduğu sütunu kapatır, kapattığı ölü
hacim kutu ne kadar yüksekteyse o kadar küçüktür.

Bir kısmı zaten `DR-70` ile yapılıyordu (sıralama kutuyu sona alıyor). Eksik görünen şey şuydu:
sona kalmak yukarı çıkmayı **garanti etmez** — kutu yeni açılan bir duvarın zeminine de düşebilir.
Bu yüzden aday skoruna, üstüne yük alamayan kutu için yüksekliği ödüllendiren bir terim eklendi
(sert kapı değil, tercih).

### Ölçüm: terim hiçbir şey katmıyor

| Güç | 0,5 | 1 | 2 | 4 |
|---|---|---|---|---|
| `KIR20` | %80,01 | %80,01 | %80,02 | %80,03 |
| `KIR33` | %72,13 | %72,13 | %72,13 | %72,13 |
| `ISTMEZ` | %80,00 | %80,00 | %80,00 | %80,00 |

Taban zaten %80,01 / %72,11 / %80,00. Yani kazanç **+0,01 mertebesinde**.

### Sebebi ölçüldü, tahmin edilmedi

Sıralama kapatılıp terim tek başına bırakıldı:

| | `KIR20` | `ISTMEZ` |
|---|---|---|
| İkisi de kapalı | %65,24 | %64,91 |
| **Yalnız yükseltme** | %66,30 (+1,06) | %65,64 (+0,73) |
| **Yalnız sıralama** (`DR-70`) | **%80,01 (+14,77)** | **%80,00 (+15,09)** |
| İkisi birden | %80,01 (**+0,00**) | %80,00 (**+0,00**) |

Mekanizma çalışıyor — tek başına +1,06 getiriyor. Ama etkisi **sıralamayla tükeniyor**: `DR-70`
kutuyu sona aldığı için zemin çoktan dolmuş oluyor ve kutu kendiliğinden tepeye çıkıyor. Skorla
ayrıca yukarı itmek, tükenmiş bir etkiyi ikinci kez itmek.

**Terim kaldırıldı**, gerekçesi kodda bir yorum olarak duruyor. Ölü düğme bırakılmadı (`DR-67`
bölge plumbing'inin dersi). Kapılar ve testler değişmedi.

> **Müşterinin fikri kabul edilmiş sayılır** — istediği davranış zaten üretimde, `DR-70` ile.
> `F9-2`'nin dereceli seçeneği (kırılganın üstüne yük binmesi) **uygulanmadı**; müşteri yerleşim
> yolunu seçti. Ölçüm düğmesi (`--fragility-lbs`) duruyor: karar ileride yeniden açılırsa sayı
> yeniden üretilmek zorunda kalmasın.
