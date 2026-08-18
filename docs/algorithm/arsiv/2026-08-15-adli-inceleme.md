# Cargo Pilot · Optimizasyon Motoru · Adli İnceleme

> **Arşiv — dondurulmuş belge.** 15 Ağustos 2026'da yazıldı. `OPT-01` ve `OPT-02`
> hatalarının kök neden analizidir. O tarihte greedy koşuyordu; motorun bugünkü hâli
> [01-kurallar.md](../01-kurallar.md)'dedir. Düzenlenmez.

---

Kutu havada, yük ters
Motor üretimde fiziksel olarak geçersiz yükleme planları üretiyordu. İki ayrı hata bulundu; ikisi de önce testle kırmızıya düşürülerek ispatlandı, sonra düzeltildi. Her iki düzeltmede de golden master snapshot'ları tek bayt kaymadı.

2026-08-15
.NET 8.0.419
gerçek dotnet test ölçümleri
OPT-01 · OPT-02
Durum
Her iki düzeltme de yalnız yerel commit olarak duruyor. Hiçbir dal push edilmedi, hiçbir PR açılmadı. İki dal birbirinden bağımsız ve dev'e alınmadı — birleşik bir motor durumu bugün mevcut değil.
Sonuç
Dört kırmızı test, sıfır snapshot kayması
4 → 0
Kırmızı test
OPT-01'de 2, OPT-02'de 2 · hepsi düzeltme öncesi yazıldı
0 bayt
Snapshot kayması
16 golden master (OPT-01) + 5 LIFO golden master (OPT-02)
0 kutu
Kapasite kaybı
FillRate P1 1,0 · P2 0,2125 — baseline ile birebir
1,43×
WeightBalance yavaşlaması
OPT-01'in bedeli · 20.562 → 29.453 ms (500 kutu)
Bugün doğru olan hiçbir plan değişmedi. Yalnız bugün sessizce yanlış olanlar düzeldi — ve o yanlış davranış hiçbir snapshot'ta kayıtlı olmadığı için kayacak snapshot da yoktu.

Kök neden · puanlama
Bölge kısıtı, yerçekiminin 500'de biri kadar bağlayıcıydı
Motorun maliyet fonksiyonu beş terimin toplamıdır OptimizationEngine.cs:213. Terimler aynı ölçekte yarışır; katsayılar arasındaki mesafe doğrudan öncelik demektir.

Puanlama katsayıları · logaritmik ölçek
Yatay eksen 10 tabanında; iki nokta arasındaki mesafe oranı gösterir. Kaynak: dev dalı, doğrudan sabit bildirimleri.
yerçekimi ÷ bölge = 500×
Yerçekimi
OptimizationEngine.cs:11 · kapatılamaz
1.000.000
Denge · ağırlık
BalanceScoring.cs:25 · bayraklı
900.000
Bölge · LIFO
LifoPlacement.cs:86 · yumuşak ceza
2.000
Derinlik
VolumeScoring.cs:19 · bayraklı
1.000
Denge · hacim
BalanceScoring.cs:24 · bayraklı
500
Genişlik
VolumeScoring.cs:28 · bayraklı
1
1
10
100
1.000
10.000
100.000
1.000.000
katsayı (log₁₀)
Her iki terim de santimetre cinsinden lineerdir. Motor, taşma_cm × 2.000 < yükselme_cm × 1.000.000 olduğu sürece bölge ihlalini seçer: 1 cm yükselme, 500 cm taşmayı affeder. Zeminde yer varken bölge kısıtı bu yüzden daima ihlal ediliyordu.

Kriter başına aktif terimler
Kapalı modülün terimi tam olarak 0m. Toplama sırası sabittir — decimal yuvarlaması aday seçimini kaydırmasın diye.
Kriter	Skor ifadesi	Bölge terimi
VolumeFirst	ey·1e6 + ez·1e3 + denge·500 + ex	+ bölge
WeightBalance	ey·1e6 + denge·900.000	+ bölge
Lifo	ey·1e6 + ez·1e3 + ex	+ bölge
Bölge sözlüğü yalnız UseLifo ile dolar OptimizationEngine.cs:49 ve UseLifo yalnız criteria == Lifo iken doğrudur OptimizationInput.cs:52 — bu yüzden LIFO dışı golden master'lar yapısal olarak etkilenemez.

Hata 1 · OPT-01
Denge takasında atlanan destek doğrulaması
BalanceScoring.ImproveBalance, eşit yükseklikli kutu takaslarında destek kontrolünü hiç çalıştırmıyordu. Sonuç: kutu havada kalıyor, plan kullanıcıya "denge iyileştirildi" diye sunuluyordu.

Tek satırlık kök neden
BalanceScoring.cs:178 — düzeltme öncesi
175  // Yükseklikler farklıysa: eski konumların üstündeki kutular havada kalabilir.
178  if (a.H != b.H)
179  {
180      var oldATopY = b.Y + a.H;
181      var oldBTopY = a.Y + b.H;
183      foreach (var c in others)
185          if (c.Y != oldATopY && c.Y != oldBTopY) continue;
187          if (!PlacementValidator.HasSupportFor(c, ...)) return false;
188  }
Destek kaybının koşulu yükseklik farkı değil, taban alanı farkıdır. Eşit yükseklikli iki kutu takas edildiğinde eski üst yüzeyler aynı Y'de kalır ama alttaki destek alanı değişir — ve blok hiç çalışmaz.

Test senaryosu · araç 200×200×100
A.H == B.H == 50 → blok atlanır. C, A'nın üstünde %100 destekliydi.
Kutu	Konum	W×H×D	Ağırlık
A	(0, 0, 0)	100×50×100	100
B	(100, 0, 0)	50×50×100	10
C	(0, 50, 0)	100×50×100	10
Takas sonrası C'nin altında yalnız B kalıyor: örtüşme 50×100 = 5.000, taban 100×100 = 10.000 → destek oranı 0,50. Denge cezası 0,4375 → 0,3125 düştüğü için BalanceScoring.cs:122 kapısı takası kabul ediyordu.

Ölçülen destek oranları · eşik 0,80
Her iki değer de düzeltme öncesi, çalışan motor üzerinden ölçüldü. Sentetik senaryo değil.
geçerli bölge
Takas testi · C kutusu
BalanceSwapSupportTests
0,50
Buyuk500_WeightBalance
318. kutu @(180,110,415) 60×35×50
0,6667
0
0,25
0,50
0,75
1,00
↑ gereken destek 0,80
İkinci satır kritik: 500 kutuluk gerçekçi WeightBalance yükünde bugüne kadar 1 kutu havada kalıyordu (destek oranı 0,6667). Bu hata üretimde plan üretiyordu. Düzeltmeden sonra iki test de yeşil; doluluk üç kriterde de değişmedi (%58,4).

Düzeltme · üç ayrı kör nokta kapandı
2 üretim dosyası · +726 / −38 · 7 dosya · commit'ler f9a4383d (test) → a7b4a53a (düzeltme)
Kör nokta	Neydi	Ne yapıldı
Eşit yükseklik	Destek taraması if (a.H != b.H) bloğuna hapsedilmişti	Koşul ve süslü parantezler kaldırıldı — OPT-01'in çekirdeği
a ↔ b	others listesi k != i && k != j ile kuruluyordu; a ve b birbirine karşı hiçbir kısıtta test edilmiyordu	othersA / othersB ayrımı — altı kısıtın tamamı kapandı
Yalnız aşağı bakan kısıtlar	Takas bir kutuyu yığının altına taşıdığında kendi IsStackable / FragilityType / MaxStackCount / MaxWeightOnTop kısıtları değerlendirilmiyordu	Yeni PlacementValidator.ViolatesLoadAbove — erken çıkışlı, tek geçişli O(n)
Hata 2 · OPT-02
LIFO bölge cezası yerçekiminden 500× zayıftı
Boşaltma sırası bozuluyordu: ilk inecek grup tavana, son inecek grup kapının önüne düşüyordu. P1 senaryosunda yerleşim tam ters çıktı.

P1 · ölçülen bölge ihlalleri, düzeltmeden önce
Araç 100×200×200 · 2 grup × 4 kutu (100×50×100) · Fixed · Rear · clusterGroups: true
← arka kapı (Z = 0)
Bölge 1 · Grup 1 — ilk inecek
Bölge 2 · Grup 2 — son inecek
Z = 0
100
200
Ölçülen ihlaller — 4 / 8 kutu
Z = 0 · D = 100 → bölgesi [100, 200)
×2
Z = 100 · D = 100 → bölgesi [0, 100)
×2
bölge dışında yerleşen kutu
│ bölge sınırı (Z = 100)
Her iki ihlal bloğu da bölge sınırının tamamen yanlış tarafında. Grup 2 (en son inecek) kapının önünde Z = 0'da, grup 1 (ilk inecek) Z = 100'de — boşaltmada önce erişilmesi gereken yük en arkada.

Öncesi / sonrası · kutu bazında
Her kare gerçek bir kutu. P1: 8 kutu · P2: 5 kutu. Ölçüm: LifoBolgeKisitiTests, düzeltmeden önce kırmızı yazıldı.
P1 · önce
4 / 8 ihlal
P1 · sonra
0 / 8 ihlal
P2 · önce
2 / 5 ihlal
P2 · sonra
0 / 5 ihlal
bölge dışında
bölge içinde
P2 ayırt edici senaryodur: grup 1'in ikinci sıra kutusu bölgesini yalnız 20 cm aşar, bölge içi alternatif bir kat (50 cm) yukarıdadır. Aynı kaldı: yerleşen kutu 8 / 5, FillRate 1,0 / 0,2125 — sert kısıt hiçbir kutu kaybettirmedi.

Belirleyici dayanak
Kodun kendi testi, kodun kendi davranışıyla çelişiyordu
Assert.True(placement.Z >= zoneStart && placement.Z + placement.Depth <= zoneEnd)
GroupZoneTests.cs:46 — kesin bölge içermesi iddia ediyor
Test sert kısıt bekliyordu; üretim kodu yumuşak ceza uyguluyordu. Bu assert bugün tesadüfen geçiyor: GroupZoneTests araç yüksekliği 100 GroupZoneTests.cs:15 ve grup başına tek kutu kullanıyor — zemin rekabeti yok, dolayısıyla bölge-yerçekimi çatışması hiç tetiklenmiyor. Kararın en güçlü tek dayanağı buydu: kod tabanının kendi sözleşmesi zaten sert kısıttı.

Golden master boşluğu — doğrulandı
LIFO snapshot	Yerleşim	Farklı Y
Lifo_GrupsuzUrunler_BolgeUygulanmaz	6	1 (Y=0)
Lifo_IkiGrup_ArkaKapi_BolgelereAyrilir	4	1 (Y=0)
Lifo_KumelemeKapali_GecInen…	1	1 (Y=0)
Lifo_UcGrup_ArkaKapi_BolgeSirasiKorunur	6	1 (Y=0)
Lifo_YanKapi_BolgeUygulanmaz	6	1 (Y=0)
5/5 tek katmanlı. Çok katmanlı LIFO senaryosu adedi = 0. Nedeni yapısal: 4 senaryoda araç yüksekliği kutu yüksekliğine eşit (100 cm), ikinci kat geometrik olarak imkânsız. Zone-vs-gravity çatışması bu kod tabanında hiçbir testte tetiklenmiyordu.

Mimari tutarsızlık
LIFO kuralının yarısı	Uygulama sınıfı	Yer
Dikey — istif sırası	sert kısıt	OptimizationEngine.cs:96
Yatay — bölge sırası	yumuşak ceza	LifoPlacement.cs:86
Aynı iş kuralının — "geç inecek yük erken inecek yükün önünü kapatmasın" — iki yarısı iki farklı sınıfta uygulanıyordu. Dikey yarı aday döngüsünde continue ederken yatay yarı yalnızca skoru biraz kötüleştiriyordu. OPT-02 bu asimetriyi kapattı.

Hakem kararı · K4
"Katsayıyı büyüt" önerisi ölçülerek yanlışlandı
Savunma B, bölge katsayısını 1.000× büyütmeyi (2.000 → 2.000.000) önerdi. P1'i düzeltiyor, ama P2'de 1/5 ihlal bırakıyor: eşik kaydırması, garanti değil.

Bugünkü motor
bölge katsayısı = 2.000
P1 · 8 kutu
4 ihlal
P2 · 5 kutu
2 ihlal
✗ fiziksel olarak geçersiz
FillRate 1,0 / 0,2125. Zeminde yer varken bölge kısıtı daima ihlal ediliyor.

Savunma B
bölge katsayısı = 2.000.000
P1 · 8 kutu
0 ihlal
P2 · 5 kutu
1 ihlal
✗ garanti yok
FillRate 1,0 / 0,2125. Kalan ihlal tam öngörülen eşikte: taşma 20 cm < kat yüksekliği 50 ÷ 2 = 25 cm. Hiçbir sonlu katsayı garanti üretemez.

İki kademeli seçim
katsayı 2.000'de kaldı
P1 · 8 kutu
0 ihlal
P2 · 5 kutu
0 ihlal
✓ kazanan · uygulandı
FillRate 1,0 / 0,2125 — değişmedi. 4 satır üretim kodu, tek commit ile geri alınabilir. Bölge içi geçerli aday varsa yalnız onlar; hiç yoksa bugünkü skorlamaya düşülür.

bölge dışında yerleşen kutu
bölge içinde yerleşen kutu
Reddedilen üçüncü seçenek: koşulsuz sert eleme. Lifo_KumelemeKapali senaryosunda araç uzunluğu 100, 2 bölge → bölge boyutu 50, kutu derinliği 100 → hiçbir aday bölge içinde değil. Koşulsuz elemede FillRate 0,5 → 0 olurdu. İki kademeli biçim tam da bunun için seçildi.

Aday tarama
Yedi sert kapı, sonra iki kademeli seçim
Bölge kısıtı artık skorun bir terimi değil, seçimin bir kademesi. Ceza değeri değişmedi — yalnız yedek kademedeki adayları kendi aralarında sıralıyor.

Aday üretimi
uç nokta × yönelim · OptimizationEngine.cs:85–87
7 sert kısıt kapısı
herhangi biri düşerse aday elenir → continue
1
Araç sınırları
:90–92 · W / H / L
2
HasOverlap
:94 · çakışma
3
HasSupport
:95 · havada kalma
4
ViolatesStackability
:96 · LIFO dikey
5
ViolatesStackCount
:98 · istif adedi
6
ViolatesStackWeight
:99 · üst ağırlık
7
ViolatesFragility
:100 · kırılganlık
ComputeScore
:213 · yerçekimi + derinlik + denge + genişlik + bölge
1. kademe — en iyi skor
:115 if (score < bestScore)
Mevcut davranış, aynen korundu. Katı < → determinizm bozulmuyor.
2. kademe — bölge içi en iyi skor
YENİ LifoPlacement.IsInsideZone(...)
Yalnız bölge sınırlarının tamamen içinde kalan adaylar arasında.
best = bestInZone ?? best
YENİ · tek satır · bölge kısıtı burada sertleşir
Yerleşim
:123 if (best is null) → UnplacedBox
Bölge içi aday yoksa bestInZone null kalır ve tek satırlık ?? işlemsizdir — bugünkü best aynen döner. Bu, koşulsuz elemenin snapshot bozan davranışını önleyen tam mekanizmadır. Bedeli: aday başına O(1) ek karşılaştırma.

Güvence
Snapshot kayması: sıfır, iki düzeltmede de
16 / 16
OPT-01 golden master
VolumeFirst 6 + Lifo 5 + WeightBalance 5 — hepsi yeşil
5 / 5
OPT-02 LIFO golden master
Başarılı: 5, Başarısız: 0
0 dosya
git status --short Snapshots/
boş çıktı — her iki dalda da
0
Yeni regresyon
OPT-01: 57/2 → 59/0 · OPT-02: 33/2 → 35/0
Beş LIFO snapshot'ının her biri neden kaymadı
Hakem kararı senaryo bazında gerekçe verdi; uygulama ölçümü bunu birebir doğruladı.
Snapshot	Mekanizma	Neden değişmiyor
Lifo_UcGrup_ArkaKapi_BolgeSirasiKorunur	bölge zaten sağlanıyor	Bölgeler [0,100)/[100,200)/[200,300); yerleşimler hepsi bölge içinde → bestInZone == best
Lifo_IkiGrup_ArkaKapi_BolgelereAyrilir	bölge zaten sağlanıyor	Bölgeler [0,150)/[150,300); yerleşimler [0,50],[50,100] / [150,200],[200,250] — hepsi içeride
Lifo_GrupsuzUrunler_BolgeUygulanmaz	bölge sözlüğü boş	GroupId + UnloadingOrder birlikte aranıyor LifoPlacement.cs:57 → zoneStart == null, IsInsideZone daima true
Lifo_YanKapi_BolgeUygulanmaz	bölge sözlüğü boş	loadingType != Rear LifoPlacement.cs:53 → bölge hiç oluşmuyor
Lifo_KumelemeKapali_GecInen…	yedek kademe	Araç uzunluğu 100, 2 bölge → bölge boyutu 50, kutu derinliği 100 → hiçbir aday bölge içinde değil; bestInZone null kalır, bugünkü sonuç bit-birebir döner
Üçünde bölge zaten sağlanıyor, ikisinde bölge sözlüğü hiç oluşmuyor — beşincisi ise yedek kademeye düşerek korunuyor. LIFO dışı golden master'lar yapısal olarak etkilenemez.

Bedel
Performans: biri yavaşladı, diğeri hızlandı
OPT-01'in yavaşlaması gerçektir ve WeightBalance'a özgüdür: if (a.H != b.H) kalkınca eşit yükseklikli çiftlerde atlanan destek taraması artık her çiftte koşuyor.

500 kutu · [PERF] satırları · aynı makine
Üst sınır 120.000 ms PerformansTabanCizgisiTests.cs:26 — hiçbir ölçümde zorlanmadı. Ölçekler ortak; tek eksen.
OPT-01 · DENGE TAKAS DOĞRULAMASI
VolumeFirst
9.785
10.017
+2 %
WeightBalance
20.562
29.453
+43 %
Lifo
9.662
9.771
+1 %
OPT-02 · LIFO BÖLGE SERT KISITI
VolumeFirst
10.058
9.855
−2 %
WeightBalance
20.968
20.771
−1 %
Lifo
9.777
8.107
−17 %
0
10.000
20.000
30.000
süre (ms)
düzeltmeden önce
düzeltmeden sonra
OPT-01 · +43 % — 1,43× artış, kabul kriterindeki 2× eşiğinin altında. En yavaş kriter 29,5 sn, 120 sn sınırının çok altında. Yerleşen kutu, dışarıda kalan ve doluluk üç kriterde de değişmedi: yerlesen=500 disarida=0 doluluk=58,4 %.

OPT-02 · −17 % — LIFO hızlandı. Farklar ölçüm gürültüsü mertebesinde; kararın öngördüğü gibi aday başına yalnızca O(1) ek karşılaştırma eklendi. Hiçbir kriterde regresyon yok.

Motor haritası
Yedi dosya, 915 satır
apps/backend/CargoPilot.Application/Common/Optimization/ — dev dalındaki taban çizgisi. İki düzeltme dalı da dev'e alınmadı.

Dosya boyutları ve kapatılabilirlik
Fizik modülleri koşulsuz çalışır; iş tercihi modülleri OptimizationModules bayraklarına bağlıdır.
PlacementValidator.cs
261
fizik · 7 sert kapının kaynağı
OptimizationEngine.cs
240
fizik · yerçekimi terimi bayraksız :222
BalanceScoring.cs
207
bayraklı · UseWeightBalance
LifoPlacement.cs
91
bayraklı · UseLifo + Rear
ItemOrdering.cs
71
kapatılamaz · bir sıra her zaman gerekir
VolumeScoring.cs
28
bayraklı · UseVolume
PlacedBox.cs
17
veri kaydı
kapatılamaz — fizik
bayraklı — iş tercihi
veri
İki dalın motora eklediği satırlar: OPT-01 PlacementValidator 261 → 314 ve BalanceScoring 207 → 220; OPT-02 LifoPlacement ve OptimizationEngine üzerinde +53 satır (çoğu açıklama yorumu). Bu iki dal birleştirilmediği için 915 satır bugünkü gerçek durumdur.

Kapsam dışı bırakılan
Bilinen borç
Hepsi bilinçli olarak açık bırakıldı. İki kademeli biçim altında hiçbiri kutu düşürmüyor.

ID	Konu	Yer	Etki
OPT-14	item.UnloadingOrder ?? -1 sentinel'i GroupId kontrolü yapmıyor; bölge sözlüğü GroupId + UnloadingOrder ile kuruluyor ama arama anahtarı yalnız UnloadingOrder	OptimizationEngine.cs:72	semantik · zararsız
OPT-10	Bölge kısıtı yalnız LoadingType.Rear kapsıyor — 5 yükleme tipinin 4'ünde bölge hiç oluşmuyor	LifoPlacement.cs:53	LIFO vaadi kısmi
—	Eşit bölme kusuru: zoneSize = vehicleLength / orders.Count grup hacmini görmüyor. Bölge kutudan dar kaldığında yedek kademe devreye giriyor	LifoPlacement.cs:66	ihlal sürebilir
—	Sessiz yedek kademe: bestInZone null kalıp yedeğe düşen yerleşim hiçbir yere raporlanmıyor. Kullanıcı planın bölge dışına taştığını göremiyor	OptimizationEngine.cs	görünürlük yok
—	ViolatesLoadAbove için kırılganlık / MaxWeightOnTop odaklı doğrudan takas testi yok; kapsam dolaylı (InvariantTests, KirilganlikTests)	PlacementValidator.cs	test boşluğu
OPT-05	FragilityType'ın 10 üyesinden 9'u motorda etkisiz; kod yorumu tersini iddia ediyor	ContaminationFilter.cs	yanlış sözleşme
Ayrıca yapılmayacaklar olarak kilitlendi: bölge katsayısını 2.000.000 yapmak (P2'de ölçülerek yetersiz çıktı) · ScoringWeights.Zone > Gravity sıra testi (yanlış invaryantı kilitler) · hacme orantılı bölge bölme (her iki savunucu da kendi risk bölümünde karşı-örnek veriyor) · koşulsuz sert eleme.

Kapsam ve sınırlar
Bu raporun ölçmediği şeyler
Ölçüm kapsamı
OPT-02 kararı iki senaryoda (P1, P2) ölçüldü. 400 senaryoluk tarama yapılmadı. Yön kesindir (0 ihlal, 0 kutu kaybı), ama büyüklük genellemesi değildir. Greedy yol bağımlılığının genel olarak zararsız olduğu kanıtlanmadı.

Ölçülemeyen bedel
OPT-01'in denge kalitesi bedeli ölçülemedi: mevcut snapshot korpusu tek tip 100×100×100 küplerden ibaret, ağırlık merkezi kaybının büyüklüğü görünmüyor. Doluluk değişmedi (%58,4) — iyiye işaret, ama tek gözlem.

Dal durumu
fix/OPT-01-... (7 dosya, +726/−38) ve fix/OPT-02-... (3 dosya, +185/−1) birbirinden bağımsız ve dev'e alınmadı. Push yok, PR yok. Birleşik motor durumu bugün mevcut değil; birleştirildiğinde ölçümlerin tekrarlanması gerekir.

Ortam kısıtı
dotnet build CargoPilot.slnx çalışmıyor — yerel SDK 8.0.419 .slnx biçimini tanımıyor (MSB4068). Tüm koşular proje düzeyinde yapıldı; Directory.Build.props analizörleri hataya çevrilmiş haliyle etkin.

