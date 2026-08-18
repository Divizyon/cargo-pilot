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
