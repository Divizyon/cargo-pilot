# Cargo Pilot: Duvar-İnşa Yerleştiricide "Üst Yüzey Ölü Havası" Darboğazına Çözüm Önerileri

## TL;DR
- **Teşhisiniz literatürle büyük ölçüde doğrulanıyor:** Kayıp hacmin yığının üstünde (ölü hava) toplanması ve "%80 taban destek" kuralının kutuları dikey bacalara/çıkıntılara hapsetmesi, tam-destek (full support) kısıtının bilinen ve ölçülmüş bir yan etkisidir; Ramos, Oliveira & Lopes (2016) tam-destek kuralı için birebir şöyle yazar: *"Used as a proxy for real-world static stability, this constraint excessively restricts the container space utilization and has conditioned the algorithms developed for this problem."* %90-95 hedefi bu kısıt ALTINDA bile ulaşılabilir (BRKGA, GRASP/VNS BR1-BR7'de ~%92-95), ama sizin ~%76'nız bu kısıt altında bile düşük — yani kısıt tek başına açığı açıklamıyor, yerleştiricinin "düz platform üretememesi" asıl sorun.
- **En yüksek getirili üç hamle:** (1) yerleştirme skoruna WallE tarzı YEREL yükseklik-haritası düzlük terimi eklemek; (2) aynı-tabanlı kutuları önce dikey KULE'ye yığıp kuleyi duvara koymak (Gehring & Bortfeldt 1997 stack/column-building), bu tabanı katılaştırır ve kapıdan-içeri sırayı korur; (3) maximal-space defterini "destek-farkında" hale getirmek (boşluğun tabanı olarak yalnız desteklenen kısmı almak).
- **Korpusunuz adaletsiz derecede kolay:** giyotinle bölünmüş "perfect-packing" korpusu %100 ulaşılabilir doluluk sunar ama gerçek dağılımı temsil etmez; ölçümü BR1-BR7 (Bischoff & Ratcliff) ve Martello-Pisinger-Vigo sınıflarına taşıyın, aksi halde iyileştirmeler yanıltıcı ölçülür.

## Key Findings

**1. Darboğaz teşhisi literatürle uyumlu.** Tam (100%) taban desteği kısıtı, kutuların yalnızca alttaki kutuların düz üst yüzeyine oturabilmesini şart koşar; bu, engebeli üst yüzeylerde "geometrik olarak sığan ama desteklenmeyen" boşlukların kaçınılmaz biçimde ölü hacme dönüşmesine yol açar. Ramos vd. (2016) bunu doğrudan tam taban destek kısıtının "konteyner hacim kullanımını aşırı kısıtladığını ve bu problem için geliştirilen algoritmaları koşullandırdığını" ifade eder. Bortfeldt & Wäscher (2013) tam desteğin stabilite ele alınan makalelerin neredeyse yarısında kullanıldığını, alternatifin "kısmi destek" (tabanın önceden belirlenmiş asgari oranı) olduğunu belgeler.

**2. %76 rakamınız tam-destek altında bile düşük.** Somut bir BR karşılaştırma tablosu (IOP Conf. MSE 392:062149, 2018; en iyi algoritma sütunu) zayıf-heterojen sınıflarda şu doluluğu gösterir: BR1=%93,27, BR2=%93,38, BR3=%93,39, BR4=%93,16, BR5=%92,89, BR6=%92,62, BR7=%91,86. Gonçalves & Resende'nin mp-BRKGA'sı (tam-destek uygulayan) ve Parreño vd. maximal-space GRASP/VNS'i de bu ~%92-95 aralığında raporlar. Yani kısıt %90-95'i imkânsız kılmıyor; sizin motorunuz düz platform üretemediği için geride kalıyor.

**3. Aramanızın +1,5'te doyması, decoder "kararsızlığının" klasik belirtisi.** Gonçalves & Resende BRKGA'sında kromozom yalnız sırayı değil, YERLEŞTİRME kuralı parametrelerini de (maximal-space seçim kuralı + kutu yönelim tercihi) kodlar; yani arama sinyali yerleştiriciye geçebilsin diye yerleştirme kararı kısmen kromozoma taşınır. Sizin GRASP'ınız yalnız sırayı ararsa ve yerleştirici deterministik/kararsızsa, sıra sinyali "yutulur".

**4. Kule (tower/column/stack) inşası duvar disiplinini bozmaz.** Parreño vd.'nin (2008) tanımıyla, *"In 1997 Gehring and Bortfeldt presented a genetic algorithm for the container loading problem, based on a column-building procedure."* Önce ayrık kutu kuleleri (sütunları) üretilir, sonra bu kuleler konteyner tabanına yerleştirilir; kule = katı bir dikey birim, düz üst platform sağlar ve kapıdan-içeri z-ekseni sırasını korur (kule bir duvar diliminde yerleşir).

**5. Destek-farkında maximal-space literatürde standart.** Parreño vd. maximal-space temsili, Zhu/Oon/Lim/Weng (2012) blok-inşa "altı öğe" çerçevesi ve heightmap/skyline tabanlı 2.5D temsiller boşluğu üretirken destek yüzeyini hesaba katar.

## Details

### (a) Teşhis onayı ve nüanslar
Voksel + defter yeniden-kurma teşhisiniz (yığın içi boşluk %1,08; ölü hava %15,8; üst yüzey engebesi 58,5 cm SS; kalan-boşluğa sığan kutuların %73'ü geometrik sığıyor ama %2,5'i destek buluyor) literatürdeki mekanizmayla birebir örtüşür: tam-destek kısıtı + engebeli yüzey = erişilemeyen dikey bacalar. Bu, Ramos vd. (2016) ve Parreño vd. (2010b) gözlemleriyle tutarlı; ikincisi "yüksek hacim kullanımı sağlandığında stabilitenin kompaktlığın bir sonucu haline geldiğini" savunur — yani düzlük ve kompaktlık aynı problemin iki yüzü.

**İtiraz/nüans:** Teşhisiniz "darboğaz sıra araması değil, yerleştirme" diyor; literatür bunu destekliyor. Ancak yerleştiricinin düzlük üretmemesi kısmen sıra × yerleştirme etkileşiminden kaynaklanır: kötü sıra, iyi yerleştiriciyi de engebeye zorlar. Bu yüzden çözüm hem yerleştirme skorunu hem decoder'ı hedeflemeli.

### (b) Öncelik sıralı çözüm önerileri

**ÖNERİ 1 — Yerleştirme skoruna YEREL yükseklik-haritası düzlük terimi (WallE tarzı).**
*Mekanizma:* Konteyner tabanını 2.5D yükseklik-haritası (skyline/heightmap) olarak tut. Bir aday yerleşim için skoru şu bileşenlerle hesapla (Ojha vd. 2020, WallE): `S = −α₁·G_var + α₂·G_high + α₃·G_flush − α₄·(i+j) − α₅·h_ij`. Burada G_var yerleştirmeden SONRA yerel komşulukta (kutunun tabanının değdiği hücreler + 1-2 hücre halka) yükseklik varyansı; G_high yeni üst yüzeyin komşularla aynı yükseklikte olması ödülü; G_flush kenar hizalama ödülü; h_ij yükseklik cezası. Ojha vd. deneyle sabitledikleri katsayıları verir: *"we use α1=0.75, α2=1, α3=1, α4=0.01, α5=1 after experimentation; the idea is to ensure all terms are of the same order of magnitude."* Bu değerler başlangıç noktası olarak kullanılabilir.
*Neden çözer:* Küresel "flush/hizalama"nız −0,5 verdi çünkü küresel hizalama tüm yığını tek referansa zorlayıp yerel engebeyi kötüleştirir. YEREL formülasyon yalnız komşuya göre düzlük arar; WallE'nin tüm mantığı budur ("dört komşu duvarla yaklaşık aynı yükseklikte duvar ör").
*Yüklenebilirlik:* Skor terimi yerleştirme sırasını değiştirmez; duvar/kapıdan-içeri disiplini korunur.
*Beklenen kazanç:* Sizin engebeniz (58,5 cm SS) çok yüksek olduğundan düzlük teriminin marjinal getirisi büyük olmalı — tahminî +3 ila +6 puan (VARSAYIM; literatürde doğrudan aynı düzeneğe kalibre sayı yok).
*Karmaşıklık:* Orta; heightmap zaten defterinizden türetilebilir.
*Risk:* α katsayıları veri-bağımlı; reaktif/otomatik ayar (reactive GRASP) gerekebilir.
*Kaynak:* Ojha vd. 2020 (arXiv:2007.00463); Zhao vd. 2021 heightmap+feasibility-mask (AAAI, arXiv:2006.14978).

**ÖNERİ 2 — Aynı-tabanlı kutuları KULE/SÜTUN'a yığıp kuleyi duvara koy (column/stack-building, Gehring & Bortfeldt 1997).**
*Mekanizma:* İki aşama: (1) aynı taban ayak-izine (veya uyumlu ayak-izine) sahip kutuları dikey kulelere/sütunlara yığ — kule üstü mümkün olduğunca düz; (2) kuleyi tek katı birim olarak duvar dilimine yerleştir.
*Neden çözer:* Kule, tam-destek kuralını İÇ olarak otomatik sağlar (her kutu altındakinin tam üstünde) ve dışarıya düz bir üst yüzey + katı taban sunar; bu tam olarak sizin "%80 destek bulamayan %73" kutunuzu kurtaran mekanizma.
*Yüklenebilirlik:* Kule bir z-dilimine yerleşir; işçi kapıdan girip kuleyi yerine iter — kapıdan-içeri sıra korunur. (Parreño vd. 2010b kule/tower yapılarının yatay stabilitede zayıf olabileceğini uyarır; bu yüzden kule genişlik/derinlik-yükseklik oranını sınırlayın.)
*Beklenen kazanç:* Stack/column-building BR sınıflarında wall-building'le kıyaslanabilir sonuç verir; asıl kazanç sizin engebe metriğinizde. Tahminî +2 ila +5 puan (VARSAYIM).
*Karmaşıklık:* Orta-yüksek.
*Risk:* Zayıf-heterojen kutu setinde iyi; güçlü-heterojende kule kurmak zorlaşır.
*Kaynak:* Gehring & Bortfeldt 1997 (doi:10.1111/j.1475-3995.1997.tb00095.x); Yap vd. 2012 tower building.

**ÖNERİ 3 — Destek-farkında maximal-space (support-aware residual space).**
*Mekanizma:* Yeni boşluk üretirken boşluğun TABANI olarak yalnız altta gerçekten desteklenen alanı al; kısmen havada kalan taban kısımlarını boşluğun kullanılabilir tabanından düş (veya boşluğu destekli alt-dikdörtgene kırp). Böylece defter, "sığar ama desteklenmez" adayları en baştan üretmez.
*Neden çözer:* Sizin darboğazınız tam olarak defterin desteksiz boşluk önermesi; bu, %73 sığan/%2,5 destekli uçurumunu kapatır.
*Yüklenebilirlik:* Salt defter/temsil değişikliği; sıra ve duvar disiplini etkilenmez.
*Beklenen kazanç:* Doğrudan doluluk yerine "boşa harcanan arama" azalır; ÖNERİ 1/2 ile birleşince çarpan etkisi.
*Karmaşıklık:* Orta.
*Kaynak:* Parreño vd. 2008 maximal-space (doi:10.1287/ijoc.1070.0254); Zhu/Oon/Lim/Weng 2012 "altı öğe" (doi:10.1007/s10489-012-0337-0). Uygulama örneği: jerry800416/3D-bin-packing'de `support_surface_ratio` + `check_stable` mantığı (dört alt köşe destek kontrolü) doğrudan bu fikri gösterir.

**ÖNERİ 4 — Yerleştirme kuralını kromozoma taşı (decoder kararsızlığını çöz).**
*Mekanizma:* Gonçalves & Resende BRKGA'sındaki gibi, random-key kromozomuna sıra ANAHTARLARININ yanına (a) maximal-space seçim kuralı seçici anahtarı ve (b) düzlük-vs-derinlik ağırlığı (yani ÖNERİ 1'deki α'lar) ekle. Böylece arama, yalnız sırayı değil "nasıl yerleştirileceğini" de keşfeder.
*Neden çözer:* Aramanız +1,5'te doyuyor çünkü yerleştirici sıra sinyalini yutuyor; kararı kromozoma taşımak sinyali geri açar. Literatürde standart çözüm budur.
*Yüklenebilirlik:* Etkilemez.
*Beklenen kazanç:* G&R BRKGA sıra+yerleştirme birleşimiyle BR'de literatürün en iyileri arasına girer; sizde arama tavanını +1,5'ten yukarı taşıması beklenir (VARSAYIM +1 ila +3).
*Kaynak:* Gonçalves & Resende 2012 (doi:10.1016/j.cor.2011.03.009), 2013 (doi:10.1016/j.ijpe.2013.04.019).

**ÖNERİ 5 — Duvar derinliğinin dinamik/çoklu-aday seçimi (Pisinger ranking).**
*Mekanizma:* İlk-kutu-derinliği (G&R) yerine birden çok aday derinlik üret (en sık görülen derinlik, kalan kutuların min-boyutlarının maksimumu, hacimce büyük kutunun derinliği) ve sığ ağaç aramasıyla en iyisini seç (Pisinger 2002 ranking kuralları).
*Neden çözer:* Tek sabit derinlik, dilim içinde kalıntı boşluk yaratır; çoklu aday bunu azaltır.
*Beklenen kazanç:* Pisinger ranking BR'de anlamlı fark yaratır; tahminî +1 ila +2 puan (VARSAYIM).
*Kaynak:* Pisinger 2002 (doi:10.1016/S0377-2217(02)00132-7).

**ÖNERİ 6 — Kısmi destek eşiğini gözden geçir (fiziksel gerçeklikle).**
Not: Kuralınızı "fiziksel/gevşetilemez" saymışsınız; ancak literatür %80'in mutlak olmadığını gösterir: Hemminki, Leipälä & Nevalainen (1989) plastik filmle sarılmış paletlerde %70 desteğin pratikte yeterli olduğunu öne sürer; Ramos vd. (2016) statik mekanik denge kriterinin tam-destekten daha iyi olduğunu gösterir. Birebir bulguları: *"by using the new stability criterion it is always possible to achieve a higher percentage of space utilization than with the classical full base support constraint, for all classes of problems, while still guaranteeing static stability"* ve yeni kriter *"outperforms best-in-class in 8 over 15 classes of problems."* Müşteri kabul ederse %80→%75 veya destek-yüzdesi yerine kütle-merkezi/mekanik-denge kriteri anlamlı hacim açar. Bu bir politika kararı; teknik olarak Ramos vd. kriteri kapıdan-içeri yüklemeyle uyumludur.

### (c) Denenip başarısız olanların literatürce açıklaması
- **Şerit (strip) bandı (−25):** ilk kutunun yüksekliğine kilitlenmek, klasik shelf/strip patolojisidir; Pisinger dahi strip genişliğini branch-and-bound ile SEÇER, sabitlemez. Sabit yükseklik engebeyi ve ölü havayı büyütür.
- **Küresel flush/hizalama (−0,5, engebe kötüleşti):** WallE'nin tüm tasarım gerekçesi YEREL düzlüktür; küresel hizalama tüm sütunları tek düzleme zorlayıp yerel uyumu bozar (bkz. ÖNERİ 1).
- **LAFF sıralaması (−2,8):** LAFF (Largest-Area-Fit-First) seviye-tabanlı 2D yığınlama için tasarlandı (skjolber deposu bunu açıkça "level-by-level 2D stacking" diye tanımlar); duvar disiplininde en-büyük-alan önceliği yükseklik uyumunu gözetmez.
- **Yönelim anahtarları / best-fit boşluk (±0 / −0,2):** yerleştirici kararsızsa bu sinyaller de yutulur — ÖNERİ 4 bunları verimli kılar.
- **Sıra araması doyumu (+1,5, 10×→+0,7):** decoder kararsızlığı; sıra sinyali yerleştiricide kaybolur (ÖNERİ 4). Kazananlarınızın hep "kaçırılan adayı geri kazan" türü olması bunu doğrular: bunlar yerleştiriciyi düzeltir, sırayı değil.

### (d) Benchmark/korpus önerisi
Giyotinle bölünmüş "perfect-packing" korpusu %100 ulaşılabilir doluluk garanti eder; bu, Martello-Pisinger-Vigo (2000) sınıf-6-8 tarzı yapay "bilinen-optimumlu" instance mantığıdır ve algoritma AYIKLAMA için iyidir ama gerçek dağılımı temsil etmez ve iyileştirmeleri abartılı/yanıltıcı ölçebilir. Dikkat: BR setinde bile tam sığma garanti değildir — Parreño vd. (2008) teknik raporu şöyle der: *"The total volume of the boxes is on average 99.46% of the capacity of the container, but as the boxes' dimensions have been generated independently of the container's dimensions, there is no guarantee that all the boxes of one instance can actually fit into the container."* Yani BR'de %100 ulaşılamaz; bu, giyotin korpusunuzun neden yapay derecede kolay olduğunu vurgular.
Öneri: (1) birincil ölçümü Bischoff & Ratcliff BR1-BR7 (zayıf-heterojen) + BR8-BR15 (güçlü-heterojen) üzerinde yapın (OR-Library / Brunel, thpack1-7 dosyaları); literatürle doğrudan kıyas için. (2) Giyotin korpusunu yalnız regresyon/ayıklama testi olarak tutun. (3) Kendi gerçek kutu dağılımınızdan sentetik set üretin.

### (e) Makale ve repo listesi (linklerle)

Makaleler:
- George & Robinson 1980 — doi:10.1016/0305-0548(80)90001-5
- Pisinger 2002, wall-building + strip knapsack + ranking — https://www.sciencedirect.com/science/article/abs/pii/S0377221702001327 (doi:10.1016/S0377-2217(02)00132-7)
- Eley 2002, block arrangement — https://www.researchgate.net/publication/222570028 (doi:10.1016/S0377-2217(02)00133-9)
- Gehring & Bortfeldt 1997, column/tower building GA — doi:10.1111/j.1475-3995.1997.tb00095.x
- Bischoff & Ratcliff 1995, stability + BR instances — Omega 23/4:377-390; veri: https://people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html
- Bischoff 2006, limited load bearing strength — EJOR 168(3):952-966
- Parreño vd. 2008, maximal-space GRASP — https://pubsonline.informs.org/doi/10.1287/ijoc.1070.0254 (doi:10.1287/ijoc.1070.0254)
- Parreño vd. 2010, VNS neighborhoods — https://link.springer.com/article/10.1007/s10732-008-9081-3 (doi:10.1007/s10732-008-9081-3)
- Gonçalves & Resende 2012, mp-BRKGA CLP — doi:10.1016/j.cor.2011.03.009; 2013, BRKGA 2D/3D bin packing — doi:10.1016/j.ijpe.2013.04.019
- Zhu/Oon/Lim/Weng 2012, "six elements of block building" — https://link.springer.com/article/10.1007/s10489-012-0337-0
- Ramos vd. 2016, static mechanical equilibrium stability — https://www.sciencedirect.com/science/article/abs/pii/S0191261515302022 (doi:10.1016/j.trb.2016.06.003)
- Junqueira, Morabito & Yamashita 2012, cargo stability + load bearing (kısmi destek/support factor) — doi:10.1016/j.cor.2010.07.017
- Bortfeldt & Wäscher 2013, constraints review — doi:10.1016/j.ejor.2012.12.006; açık working-paper: https://www.fww.ovgu.de/fww_media/femm/femm_2012/2012_07-EGOTEC-503ec3895182dc0d922a6bd7feebb3a5.pdf
- Martello-Pisinger-Vigo 2000, 3D-BPP + instance sınıfları — https://pubsonline.informs.org/doi/10.1287/opre.48.2.256.12386
- Ojha vd. (WallE) 2020 — https://arxiv.org/pdf/2007.00463
- Zhao vd. 2021, online 3D-BPP constrained DRL (heightmap) — https://arxiv.org/pdf/2006.14978

Repolar:
- davidmchapman/3DContainerPacking (C# EB-AFIT; `EB_AFIT.cs` içinde "Finds the most proper layer height" layer/topology mantığı) — https://github.com/davidmchapman/3DContainerPacking
- skjolber/3d-bin-container-packing (Java LAFF; "Plain packager prefer supported area", level-by-level 2D stacking) — https://github.com/skjolber/3d-bin-container-packing
- jerry800416/3D-bin-packing (Python; `support_surface_ratio=0.75`, `check_stable`, `fix_point`, dört alt köşe destek kuralı) — https://github.com/jerry800416/3D-bin-packing
- OliverYangMin/3D-loading-problem-bin-packing (maximal-space + GRASP/VND, Parreño temelli) — https://github.com/OliverYangMin/3D-loading-problem-bin-packing
- alexfrom0815/Online-3D-BPP-DRL (Zhao vd. heightmap + feasibility mask) — https://github.com/alexfrom0815/Online-3D-BPP-DRL

## Recommendations
1. **İlk sprint (düşük risk, yüksek getiri):** ÖNERİ 3 (destek-farkında defter) + ÖNERİ 1 (yerel heightmap düzlük terimi). Bu ikisi salt yerleştirici/temsil değişikliği; duvar disiplinini bozmaz. Ojha vd.'nin α1=0.75, α2=1, α3=1, α4=0.01, α5=1 değerleriyle başlayın. Başarı eşiği: üst-yüzey SS 58,5 cm'den <30 cm'e inmeli ve ölü hava %15,8'den <%8'e düşmeli.
2. **İkinci sprint:** ÖNERİ 4 (yerleştirme kuralını kromozoma taşı). Eşik: sıra araması doyumu +1,5'ten yukarı çıkmalı; çıkmazsa decoder hâlâ kararsız demektir, ÖNERİ 1 katsayılarını arama içine alın.
3. **Üçüncü sprint:** ÖNERİ 2 (kule/sütun inşası) — özellikle kutu setiniz zayıf-heterojense. Eşik: kule oranı sınırlanınca yatay stabilite bozulmamalı.
4. **Paralel:** ÖNERİ 5 (dinamik derinlik) ve benchmark geçişi (BR1-BR7). BR1-BR7'de <%85 alıyorsanız sorun hâlâ yerleştiricide; >%88 ise decoder/arama katmanına odaklanın. Referans hedef: literatürün en iyileri BR1-BR7'de ~%92-93 (ör. BR1=93,27 … BR7=91,86).
5. **Politika:** ÖNERİ 6'yı müşteriyle görüşün; %80→%75 veya mekanik-denge kriteri en büyük tek hamle olabilir (Ramos vd. yeni kriter 15 sınıfın 8'inde best-in-class'ı geçiyor).

## Caveats
- Beklenen kazanç puanları "VARSAYIM" işaretli; literatürde sizin tam düzeneğinize (giyotin korpus + %80 destek + hacim-only) kalibre birebir sayı yoktur.
- Ramos vd. (2016) ve Gonçalves & Resende (2012) tam sayısal ortalama tabloları ödemeli erişimde; verdiğimiz BR sınıf yüzdeleri (ör. BR1=93,27…BR7=91,86) ikincil derleme kaynaklardan (IOP MSE 392:062149, 2018 karşılaştırma tablosu) alındı, birincil tablodan bire bir doğrulanmadı. Tam-destek-vs-desteksiz ortalama doluluk farkının kesin puan değeri birincil PDF tablolarında; erişilemedi (açık teşhis boşluğu).
- WallE katsayıları veri-bağımlıdır; verilen α değerleri Ojha vd.'nin veri setine göredir, kör kopyalama yerine kendi setinize kalibre edin.
- Kule inşası yatay stabilitede zayıflık riski taşır (Parreño vd. 2010b uyarısı); kule oran sınırı ve/veya duvar-arkası kilitleme ile hafifletin.
- BR instance'larında bile boyutlar konteynerden bağımsız üretildiğinden %100 sığma garanti değildir (Parreño vd. 2008: ortalama %99,46 hacim, sığma garantisi yok); dolayısıyla BR'de "%92-93" pratikte tavan sayılabilir — kendi korpusunuzdaki %100 tavanla kıyaslarken bunu göz önünde tutun.