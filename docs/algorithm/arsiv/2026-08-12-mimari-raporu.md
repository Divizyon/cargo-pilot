# Mimari Raporu · Cargo Pilot Backend

> **Arşiv — dondurulmuş belge.** 12 Ağustos 2026'da yazıldı (PR #935 → #936 → #937).
> Bugünkü klasör mimarisini kuran modülerleştirmenin kaynağıdır ve
> [ADR-0001](../adr/0001-yerlestirme-algoritmasi.md) buna atıf verir.
> **Sayıları bayattır** — o tarihte duvar örücü de arama katmanı da yoktu, greedy koşuyordu.
> Güncel dosya haritası [01-kurallar.md §A1](../01-kurallar.md)'dedir. Düzenlenmez.

---


Optimizasyon motoru: yeni dosya yapısı ve algoritmanın işleyişi
583 satırlık tek dosya, biri kapatılamaz altı modüle ayrıldı ve yanlış katmandan doğru katmana taşındı. Bu sayfa hangi dosyanın ne olduğunu, bir kutunun motorun içinden nasıl geçtiğini ve yeni bir kuralın nereye yazılacağını anlatır.

Tarih: 12 Ağustos 2026
Sürüm: v0.9.0 · main
PR: #935 → #936 → #937
Test: 0 → 33 motor testi
Motor eskiden CargoPilot.Infrastructure/Services/ altında tek dosyaydı ve hiç testi yoktu. Oysa hiçbir dış dünya bağımlılığı yok — veritabanı, dosya deposu, HTTP, log kullanmıyor; girdi verip çıktı alınan saf bir hesap. Bu yüzden Application katmanına taşındı ve iş modülü başına bir dosya olacak şekilde bölündü. Bölme biçimi arayüz/plugin değil, motorun doğrudan çağırdığı statik fonksiyonlar: sıcak döngüye tek bir dolaylı çağrı bile eklenmedi.

Bölmeden önce mevcut davranışı kilitleyen 16 anlık görüntü testi yazıldı. Yedi adımın hiçbirinde bu görüntülerin biri bile kaymadı — yani üretimde çıkan planlar taşımadan sonra da birebir aynı.

1 · Klasör yapısı
Algoritmanın tamamı artık tek klasörde. Etiketler mimarinin gerçek eksenini gösteriyor: bazı modüller iş tercihidir, kapatılabilir; bazıları fizik kuralıdır, kapatılamaz.

apps/backend/CargoPilot.Application/Common/Optimization/
  OptimizationEngine.cs       çekirdek      döngüyü yürütür, kimseyi kapatamaz
  PlacementValidator.cs       KAPATILAMAZ   çakışma · destek · istif · rotasyon · kırılganlık
  ItemOrdering.cs             KAPATILAMAZ   yerleştirme sırası (kriterle parametreli)
  LifoPlacement.cs            bayraklı      son giren ilk çıkar: bölge hesabı
  BalanceScoring.cs           bayraklı      ağırlık merkezi ve denge iyileştirme
  VolumeScoring.cs            bayraklı      sıkı istif tercihi
  PlacedBox.cs                              modüllerin paylaştığı veri tipleri

apps/backend/CargoPilot.Application/Common/
  ContaminationFilter.cs      bayraklı      birbirine değmemesi gerekenleri ayırır
  Models/OptimizationInput.cs               girdi + OptimizationModules bayrakları

apps/backend/CargoPilot.Engine.Tests/                 33 test · 16 anlık görüntü
Dosya	Ne işe yarar	Ayrıntı
OptimizationEngine.cs
çekirdek	Orkestratör	Ürünleri sıraya dizer, her kutu için aday noktaları tarar, kazanan konumu seçer ve sonucu (doluluk, ağırlık merkezi, yerleşemeyenler) toplar. Artık kural içermiyor — yalnızca kimin ne zaman çalışacağını bilir. 583 → 240 satır.
PlacementValidator.cs
kapatılamaz	Fiziksel geçerlilik	Kutu başka kutuyla çakışıyor mu, altında en az %80 zemin var mı, istif adedi ve üstüne binen ağırlık aşılıyor mu, hangi dönüşlere izin var, altta kırılgan ürün var mı. Bu dosya kapatılamaz — kapatılabilseydi motor üst üste binen kutu planları üretebilirdi.
ItemOrdering.cs
kapatılamaz	Yerleştirme sırası	Kutuların hangi sırayla ele alınacağı. Denge kriterinde ağır olan önce, diğerlerinde hacmi büyük olan önce; grup kümeleme açıksa aynı gruptakiler birlikte yüklenir. Sıra bir puanlama işi değil, o yüzden ayrı dosya.
LifoPlacement.cs
bayraklı	Boşaltma sırası	Kamyonu boşaltma sırasına göre bölgelere ayırır: ilk inecek grup kapıya en yakın bölgeye düşer. Kendi bölgesinin dışına taşan aday ceza alır. Yalnızca arka kapıdan yüklemede geçerli.
BalanceScoring.cs
bayraklı	Ağırlık merkezi	Ağırlık merkezinin araç ortasından ne kadar saptığını cezalandırır. Ayrıca greedy yerleştirme bittikten sonra ikinci bir geçiş yapar: kutu çiftlerini takas ederek dengeyi iyileştirir (en fazla 3 tur, her tur tüm çiftleri dener).
VolumeScoring.cs
bayraklı	Sıkı istif	Kutuyu kapıya ve sol duvara yakın tutan iki terim. Boşluk bırakmadan doldurmayı teşvik eder. En küçük modül — 28 satır.
ContaminationFilter.cs
bayraklı	Uyumsuz yük ayrımı	Birbirine değmemesi gereken ürünleri (gıda ile kimyasal gibi) aynı yüklemeye sokmaz. Motorun içinde değil, motor çağrılmadan önce çalışır.
PlacedBox.cs	Paylaşılan tipler	Yerleşmiş kutunun konumu, boyutu, ağırlığı, istif limitleri, kırılganlığı ve boşaltma sırası. Modüllerin ortak dili — eskiden motor dosyasının içinde gizliydi.
2 · Bir yükleme planı nasıl üretilir
Motor tek geçişte açgözlü (greedy) çalışır: her kutu için o anda en iyi görünen yeri seçer, geri dönüp kararı bozmaz. Denge kriterinde sonradan bir düzeltme turu vardır.

Hazırlık
Bayraklar bir kez çözülür. Adetli ürünler tek tek kutulara açılır (3 adet palet → 3 kutu) ve ItemOrdering ile sıraya dizilir.
Bölgeler
LIFO açıksa LifoPlacement kamyonu boşaltma sırasına göre eşit bölgelere böler ve her bölgenin başlangıcını aday nokta yapar.
Kutu döngüsü
Sıradaki her kutu için: araç ağırlık limiti aşılıyorsa kutu hiç denenmez, WeightLimitExceeded ile ayrılır. Aşılmıyorsa aday tarama başlar.
Aday tarama
Her aday nokta × her izinli dönüş kombinasyonu aşağıdaki kapılardan geçirilir. Geçenler puanlanır, en düşük puan kazanır.
Yerleştirme
Kazanan konum işlenir ve kutunun sağ, üst ve ön köşeleri yeni aday nokta olur — plan böyle büyür. Araç dışına taşan adaylar atılır.
İkinci geçiş
Yalnızca denge kriterinde: BalanceScoring.ImproveBalance kutu çiftlerini takas ederek ağırlık merkezini ortaya çeker. Her takas, aynı sert kısıtlardan yeniden geçmek zorundadır.
Sonuç
Doluluk oranı, toplam ağırlık, üç eksende ağırlık merkezi, denge sapma yüzdeleri ve yerleşemeyen ürünler sebepleriyle birlikte döner.
Aday tarama kapıları
Sıra rastgele değil: en ucuz ve en çok eleyen kontrol başta. Bir aday herhangi bir kapıda takılırsa puanlamaya hiç girmez. Hepsi PlacementValidator içinde, hepsi kapatılamaz.

1
Araca sığıyor mu
Bu dönüşle kutu genişlik, yükseklik veya uzunluk sınırını aşıyor mu.
2
Başka kutuyla çakışıyor mu HasOverlap
Üç eksende kesişim testi. Temas çakışma sayılmaz — kutular yan yana durabilir.
3
Altında zemin var mı HasSupport
Havada kutu olmaz: taban alanının en az %80'i ya araç zemininde ya da alttaki kutuların üst yüzeyinde olmalı.
4
Altındaki istiflenebilir mi ViolatesStackability
Alttaki ürün "üstüne konulamaz" işaretliyse aday elenir. LIFO'da ayrıca: daha geç inecek ürün, daha erken inecek olanın üstüne konamaz.
5
Kat sayısı aşılıyor mu ViolatesStackCount
Altta kalan her kutunun kat limiti kontrol edilir, yalnızca bir alttakinin değil.
6
Üst ağırlık aşılıyor mu ViolatesStackWeight
Altta kalan kutuların üzerindeki mevcut ağırlık + yeni kutu, o kutunun taşıyabileceğini geçiyor mu.
7
Altında kırılgan var mı ViolatesFragility
Kırılgan ürünün üstüne hiçbir yük konmaz. Bu adımda eklendi — veri veritabanına kadar geliyordu ama motora hiç girmiyordu.
✓
Puanla ve en iyisini sakla
Yedi kapıyı da geçen aday puanlanır. Puan düşükse kazanan güncellenir.
Ret sebebi nasıl seçilir

Hiçbir aday geçemezse ürün "yerleşemedi" listesine girer. Sebep normalde yer yetersizliğidir; ancak bir aday diğer tüm kapıları geçip yalnızca kırılganlıktan elendiyse sebep kırılganlık kısıtı olarak raporlanır. Bu ayrım operatöre "araç dolu" ile "kırılgan yük yüzünden sıkıştı" arasındaki farkı gösterir.

3 · Puanlama: switch değil, terim toplamı
Eskiden her kriter için ayrı bir formül yazılıydı. Artık tek bir toplam var; kapalı modülün terimi sıfır oluyor. Katsayılar hiç değişmedi.

Puan maliyettir, ödül değil — düşük olan kazanır. Yerçekimi terimi devasa katsayısıyla diğer her şeyi bastırır: motor önce alçak yerleri doldurur, ancak eşit yükseklikteki adaylar arasında diğer terimler konuşur.

Terim	Sahibi	Katsayı	Ne yapar
Yerçekimi	çekirdek	1 000 000	Alçak nokta her zaman tercih edilir. Kapatılamaz.
Derinlik	VolumeScoring	1 000	Kapıya yakın tut — boşluk bırakmadan doldur.
Denge	BalanceScoring	900 000 / 500	Ağırlık merkezi sapması. Denge kriterinde baskın, hacim kriterinde hafif bir düzeltici, LIFO'da hiç yok.
Genişlik	VolumeScoring	1	Beraberlik bozucu: eşit adaylar arasında sola yakın olan kazanır.
Bölge	LifoPlacement	2 000	Kutu kendi boşaltma bölgesinin dışına taşarsa taşma mesafesiyle orantılı ceza.
Bayraklar neden arayüze açılmadı

Dört bayrak on altı kombinasyon üretir, ama bu katsayılar yalnızca mevcut üç kriter için kalibre edildi. Kalibre edilmemiş bir kombinasyon anlamsız planlar üretebilir. Bu yüzden bayraklar kodun içinde hazır duruyor ama API'ye ve arayüze açılmadı; handler'lar bayrak vermiyor, dolayısıyla üretim davranışı bugün birebir eskisi gibi.

4 · Bu ne işe yaradı
Yapının pratik karşılığı — dört somut kazanım.

Bir kuralı tek başına test edebiliyoruz
Eskiden kurallar motorun içinde gizli metotlardı; "%80 destek kuralı doğru mu?" sorusu ancak tüm motoru çalıştırıp plana bakarak yanıtlanabiliyordu. Artık her kural ayrı çağrılabilir. Motor testi sıfırdan 33'e çıktı ve bunların 16'sı, davranış kazarsa hangi kutunun hangi koordinatta kaydığını gösteren anlık görüntü testi.

Yeni kural eklemek tek dosyaya indi
Kırılganlık kuralı bunun canlı denemesiydi: kuralı yazarken puanlama, sıralama, LIFO ve denge kodunun hiçbirine bakmak gerekmedi. Dokunulan dokuz dosyanın yedisi tek satırlık mekanik bağlantıydı (alanı ekle, alanı geçir); düşünme gerektiren mantığın tamamı PlacementValidator.cs'te toplandı.

Aynı kural iki kere yazılmıyor
Eski dosyada çakışma testi iki ayrı yerde (HasOverlap ve BoxesOverlap), %80 destek kuralı yine iki ayrı yerde yazılıydı. Bunlar birleştirilmeden önce satır satır karşılaştırılıp birebir eşdeğer oldukları doğrulandı; şimdi tek kaynak var. Bir kuralı düzeltirken diğer kopyayı unutma riski kalktı.

Test projesi hafifledi
Motor Application katmanına taşınınca test projesi yalnızca Application'a bağlandı; veritabanı, arka plan işleri ve dosya deposu paketleri test çıktısından tamamen düştü. Motor testleri artık 21 saniyede koşuyor ve hiçbir altyapıya ihtiyaç duymuyor.

5 · Bilinen borç
Bilinçli olarak bu kapsamın dışında bırakılanlar; her biri ayrı bir iş.

Takas geçişi sert kısıtları elle sayıyor. BalanceScoring içindeki takas doğrulaması yedi kontrolü tek tek tekrar eder. Sekizinci kuralı ekleyen kişi burayı unutursa takas kuralı delebilir — sessiz bir tuzak. Tek bir toplayıcı fonksiyona indirilmeli.
Anlık görüntüler kırılganlığı kaydetmiyor. Bugünkü 16 görüntüyü kaydırmamak için bilinçli bırakıldı; bir sonraki yenilemede alan eklenip hepsi tek seferde yeniden üretilmeli.
İki ret sebebi hâlâ hiç üretilmiyor. "İstiflenemez" ve "geometri kısıtı" sebepleri enum'da var ama motor bunları raporlamıyor; kırılganlıkta kullanılan aynı desen buraya da uygulanabilir.
Denge kriteri %6 yavaşladı. 500 kutuluk sentetik senaryoda 10,8 → 11,4 saniye. Kaynak izole edildi: kopyaların birleştirilmesiyle gelen değer kopyalama maliyeti, yalnızca takas turunda sıcak. Tek kaynak ilkesi lehine kabul edildi; gerçek plan boyutlarında ölçülebilir etkisi beklenmiyor.
Bu yapı 11 Ağustos 2026 tarihli Algoritma Mimarisi Heyet Kararı'nın yedi geçiş adımının uygulanmasıyla oluştu. Her adım ayrı commit; taşıma commit'i ile davranış değiştiren commit hiçbir yerde birleştirilmedi. Kararda öngörülen iki hata düzeltmesi uygulanmadı — dev dalı ikisini de zaten içeriyordu; karar metni eski bir main kopyasına göre yazılmıştı.


