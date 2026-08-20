# Cargo Pilot: Kırılganlık, İstif Sınırı ve Ağırlık Kısıtları — Literatür Karşılaştırmalı, Öncelik Sıralı Araştırma Raporu

## TL;DR
- **En büyük kayıp (kırılganlık −21,81 puan) büyük ölçüde MODEL kaynaklı, korpus kaynaklı değil:** mevcut "sütun-geneli + köprülemeye rağmen + kategorik 0 kg" kuralı literatürdeki her tanımdan (Gendreau 2006 doğrudan-temas C7a; Bischoff 2003 / Krebs-Ehmke 2021 dereceli load-bearing) daha katıdır; doğrudan-temas veya dereceli LBS'ye geçiş ve "fragile-on-top" sıralaması kaybın çoğunu fizik doğruluğunu bozmadan geri kazandırır. Bu #1 önceliktir.
- **İstif sınırı (−13,69 puan) geometrik bir tavandır ve büyük ölçüde geri alınamaz;** MaxStackCount=2 keyfî ve gerçekçiden muhtemelen katıdır (ROADEF/Renault'da stackability kodu + item-başına max-stackability değişkendir), ama modelleme doğrudur. Kazanç küçük; korpusu gerçekçi bir max-stack dağılımıyla yeniden parametrelemek en yüksek getirili adımdır.
- **Ağırlık üç konudan yalnızca CoG/denge beam'de optimize edilmiyor;** literatür (Ramos-Silva-Oliveira 2018) CoG'un doluluğu BOZMADAN sert kısıt olarak uygulanabildiğini gösteriyor. CoG için leksikografik üçüncü terim yerine **CoG-onarım post-pass** 2 sn bütçeye en uygun seçenektir. Araç ağırlık tavanı Renault verisinde çoğu zaman (özellikle orta aks) bağlayıcıdır; ağırlık-farkında kutu seçimi orta vadeli yatırımdır.

## Key Findings

1. **Kırılgan pay ~%30 literatürde standarttır; bizim %33 tip-oranımız gerçekçidir.** Krebs, Ehmke & Koch (2021, OR Spectrum 43:835–875, §6.2) 600 instance'lık setinde kırılganlık bayrağını verbatim olarak "The fragility flag is set randomly to the items, where approx. 30% are fragile" biçiminde atar. Gendreau vd. (2006) kırılganlık bayrağını instance başına rastgele atar. Dolayısıyla %33 oranımız literatür normunun içindedir — sorun oran değil, KURAL katılığıdır.

2. **Bizim kırılganlık kuralı literatürdeki en katı tanımdan bile daha katı.** Gendreau (2006) C7a, Krebs-Ehmke 2021 §4.3.1'de verbatim şöyle yeniden ifade edilir: "On top of a fragile item, only another fragile item can be stacked, whereas both fragile and non-fragile items can be stacked on a non-fragile item." Bu DOĞRUDAN üstteki (directly-underlying) temas ilişkisidir, sütun geneli değildir. Bizim kural (a) sütun geneli tavana kadar, (b) arada boşluk/köprüleme olsa bile, (c) kategorik 0 kg — üç ayrı eksende Gendreau'dan katıdır.

3. **Dereceli load-bearing (LBS) literatürde standart ve daha esnektir.** Bischoff (2003/2006, EJOR 168:952–966) ve Krebs-Ehmke (2021) her kutuya "birim alan başına taşıyabileceği maksimum yük" (lbs) parametresi verir; küçük lbs = kırılgan. Krebs-Ehmke, kırılganlık C7a'nın çoğu instance'da dereceli LBS'den DAHA KISITLAYICI olduğunu ölçmüştür (bazı instance'larda LBS ile amaç değerleri düşer, çünkü C7a daha kısıtlayıcıdır).

4. **Krebs-Ehmke, her kısıt için maliyeti nicel tablolamıştır (verbatim: "our analysis is based on 30,000 results — 600 instances, 10 constraint sets, 5 runs").** Kritik sayılar (kullanılan araç / toplam mesafe artışı, baseline P1'e göre):
   - LBS'ye geçiş (P5/P6): "the number of used vehicles increases by approx. 3.2% (vused), the total travel distance by approx. 2.6% for both approaches"; hesap süresi "on average by around 29%" artar.
   - Robust stability multiple overhanging (P3): "the number of used vehicles rise by 10.80%, the total travel distance by 8.27%, on average"; top overhanging (P4) buna "additional 4.16% points … total travel distance by 2.66% points" ekler.
   - Axle + balanced (P8/P9): "the number of used vehicles increase by around 2.9%, the total travel distance by approx. 1.8%. Moreover, there is a positive effect on the calculation time, which is reduced by around 20%."
   - Tüm karmaşık kısıtlar (P10): "+24.42% vused, +17.15% ttd" (toplamdan az — kısıt etkileşimi).

5. **Krebs-Ehmke'nin DBLF paketleyicisi zaten "fragile-on-top" sıralamasını uygular (verbatim §5.2 sıralama):** "1. fragility flag fi,k (non-fragile first) 2. volume (larger volume first) 3. length li,k (longer first) 4. width wi,k (wider first)." Bu, duvar-örücümüze doğrudan uyarlanabilir standart hiledir.

6. **CoG doluluğu bozmadan uygulanabilir.** Ramos, Silva & Oliveira (2018, EJOR 266:1140–1152) araç-özel Yük Dağıtım Diyagramları (LDD) ile CoG fizibilite zarfını SERT kısıt yaparak, abstract'ta verbatim "it is possible to obtain stable and load balanced solutions without compromising the performance in terms of container volume utilization" sonucunu raporlar.

7. **Ayrışım literatürde bölgeli/çok-konteynerli çözülür, tam eleme değil.** Eley (2003, OR Spectrum 25:45–60) uyumsuz kutu çiftlerini AYNI araçta yasaklayıp farklı konteynerlere/patternlere ayıran set-partitioning yaklaşımı kullanır. Bizim "en büyük grup kalır, diğerleri tamamen elenir" ön-elemesi bu literatürde YOKTUR; kabul edilebilirliği müşteriye özeldir ve muhtemelen hacim kaybettiricidir.

8. **Araç ağırlık tavanı Renault verisinde bağlayıcıdır.** ROADEF 2022 dokümantasyonu ve katılımcı raporları (CVUT/CIIRC tezi; Balogh vd. "Modelling Choices for the Roadef 2022 Challenge"), özellikle orta aks limitinin doluluğu sık sık kısıtladığını gösterir. Balogh vd. verbatim: "loading too many stacks in the front of the truck quickly exceeds the axle weight constraint of the second axle." Tez örnek değerleri: orta aks EMmm=12000 kg, arka aks EMmr=31500 kg. Bizim korpusta tavanın 1.000.000 kg olması bu boyutu ölçülemez kılmıştır — gerçekçi bir tavan senaryosu şarttır.

## Details

### (a) Üç kısıtın literatür tanımları vs bizim tanımlar

| Kısıt | Literatür tanımı (kaynak) | Bizim tanım | Görece katılık |
|---|---|---|---|
| Kırılganlık (temel) | Gendreau vd. 2006 (C7a): kırılganın DOĞRUDAN üstüne kırılgan-olmayan konamaz; kırılgan üstüne kırılgan OK | Sütun geneli, tavana kadar, köprüleme/boşlukta bile hiçbir kutu konamaz; kategorik 0 kg | **Çok daha katı** (3 eksende) |
| Kırılganlık (dereceli) | Bischoff 2003/2006, Ceschia vd. 2013, Krebs-Ehmke 2021 (C7b): her kutuya lbs (kg/alan); yük yalnızca taşınan zincir boyunca; küçük lbs=kırılgan | Dereceli yok; kategorik Fragile=0 kg | **Çok daha katı** |
| Yük dağıtım modeli | Krebs-Ehmke C7b2 "complete selection": yük yalnızca doğrudan altındaki kutulara, statik zinciriyle zemine kadar dağıtılır (ayak izi sütunu DEĞİL) | Ayak izi gölgesi (footprint shadow), köprüleme yok sayılır | **Daha katı** (köprüleme fiziksel olarak geçerli) |
| İstif sınırı | Ratcliff-Bischoff 1998, Gendreau 2006, ROADEF 2022: stackability kodu + item-başına max-stackability (ROADEF S6: yığındaki min ISM) | Tüm ürünlerde MaxStackCount=2, sütun geneli | **Muhtemelen katı** (keyfî sabit) |
| MaxWeightOnTop / IsStackable | Junqueira vd. 2012, Bischoff 2006: taşınan ağırlık üst yüzeyde aşılamaz | Kapı var, sütun geneli uygulanıyor | **Aynı** (ölçülmüyor) |
| Ağırlık dengesi/CoG | Davies-Bischoff 1999 (post-process), Ramos-Silva-Oliveira 2018 (sert LDD zarfı), Bortfeldt-Gehring 2001 (amaç terimi) | Hesaplanıyor ama beam'de optimize EDİLMİYOR | **Daha gevşek** (uygulanmıyor) |
| Aks yükü | Krebs-Ehmke 2021, Lim-Ma-Qiu-Zhu 2013, Pollaris vd. 2016, ROADEF 2022 | Yok (sıra düzeyinde "sığmayan düşer") | **Daha gevşek** |
| Ayrışım/segregation | Eley 2003 (set-partitioning, bölgeli/çok-konteyner), Bortfeldt-Wäscher 2013 (C5 separation) | ContaminationFilter: en büyük hacim geçer, diğerleri tam elenir | **Farklı/daha kaba** (eleme = hacim kaybı) |

### (b) Literatürde raporlanan maliyetler ve bizim konumumuz

| Kısıt (kaynak) | Parametre/oran | Raporlanan maliyet | Not |
|---|---|---|---|
| Fragility C7a (Krebs-Ehmke 2021, baseline P1) | ~%30 kırılgan | Baseline'a dâhil; LBS'den DAHA kısıtlayıcı | Gendreau doğrudan-temas |
| LBS (C7b, P5/P6) | lbs r∈[1,2] kırılgan; [1,5] değil | +%3,2 araç, +%2,6 mesafe; süre +%29 | Bazı instance'da C7a'dan İYİ |
| Robust stability multiple overhang (P3) | α destek eşiği | +%10,80 araç, +%8,27 mesafe | Bizim %60 taban desteğiyle ilişkili |
| Robust stability top overhang (P4) | α | +%4,16pp ek araç, +%2,66pp mesafe | En katı stabilite |
| Axle + balanced (P8+P9) | p | +%2,9 araç, +%1,8 mesafe; **süre −%20** | Güvenlik + hız kazancı |
| Tüm karmaşık kısıtlar (P10) | — | +%24,42 araç, +%17,15 mesafe | Toplamdan az (etkileşim) |
| CoG sert kısıt (Ramos-Silva-Oliveira 2018) | LDD zarfı | **~0 hacim kaybı** ("without compromising … volume utilization") | Doluluk korunur |
| Weight distribution (Davies-Bischoff 1999) | dengeli dağılım | Yüksek doluluk + düzgün dağılım birlikte mümkün | Post-process |

**Konumlandırma:** Bizim kırılganlık **−21,81 puanı** (fill: 91,91→70,10), literatürdeki doğrudan-temas C7a veya dereceli LBS maliyetlerinden (VRP amaç fonksiyonunda araç sayısı cinsinden ~%3) **kat kat büyüktür.** Bu, oranın (%33) değil, kuralın (sütun-geneli + köprüleme yok + kategorik) sonucudur; kaybın büyük kısmı geri kazanılabilir. İstif sınırı **−13,69 puanı** geometrik tavan olduğu için literatürde de "beam static'e göre az kazandırır" gözlemiyle tutarlıdır (kule/blok stratejisi tavanı yükseltemez).

### (c) Öncelik sıralı öneriler

**Öncelik 1 — Kırılganlık: sütun-geneli → doğrudan-temas/dereceli LBS.**
- Mekanizma: ViolatesLoadAbove/ViolatesFragility'yi "yalnızca DOĞRUDAN temas eden kutu + taşınan yük" testine indir. İki aşama: (i) hızlı kazanım = Gendreau C7a doğrudan-temas (kırılganın doğrudan üstüne kırılgan-olmayan konamaz, köprüleme serbest); (ii) tam çözüm = Krebs-Ehmke C7b2 "complete selection" dereceli LBS — kategorik 0 kg yerine lbs parametresi, yük yalnızca alttaki zincire dağıtılır.
- Beklenen kazanç: −21,81'in büyük kısmı; kesin puan **varsayım** (literatür VRP amacında araç sayısında ~%3 seviyesindedir, bizim fill metriğinde doğrudan eşlenmez). Köprüleme serbestisi ek kazanç.
- İhlal-sıfır/fizik: Korunur — dereceli LBS statik olarak doğrudan-temas modelinden daha gerçekçidir.
- 2 sn bütçe: C7a versiyonu bedava-benzeri (daha az ihlal → daha az budama). C7b2 zincir dağıtımı Krebs'te hesabı ~%29 artırır; beam'de yerleştirme başına O(yığın yüksekliği) — kabul edilebilir, ama önbelleğe alma gerekli.
- Karmaşıklık: Orta (C7a düşük, C7b2 orta).

**Öncelik 2 — Fragile-on-top sıralama + yerleştirme.**
- Mekanizma: Krebs-Ehmke DBLF sıralamasını uygula — kutuları (kırılgan-olmayan önce, sonra hacim/uzunluk/genişlik) sırala; duvar-örücüde kırılganı duvarın/sütunun en üstüne yerleştir; "iki fazlı: önce kırılgan-olmayan yığınlar, sonra kırılgan tepe kutuları". Kırılganları ayrı sütunlara toplama opsiyonel.
- Beklenen kazanç: Öncelik 1'i çarpanlar; standart 3L-CVRP hilesi. Kesin puan **varsayım**.
- Fizik: Korunur (kırılganın üstü zaten boş kalır).
- 2 sn: İhmal edilebilir (yalnızca sıralama). Karmaşıklık: Düşük.

**Öncelik 3 — CoG: leksikografik üçüncü terim yerine onarım post-pass.**
- Mekanizma: Beam amaç fonksiyonuna (doluluk, uzunluk, CoG sapması) üçüncü leksikografik terim eklemek beam'i pahalılaştırır ve doluluğu tehdit eder. Bunun yerine silinen BalanceScoring'i CoG-onarım post-pass olarak geri getir (Davies-Bischoff 1999 tarzı simetrik takas); veya Ramos-Silva-Oliveira 2018 tarzı LDD zarfını yerleştirme-sonrası fizibilite filtresi yap.
- Beklenen kazanç: Güvenlik/denge; doluluk kaybı ~0 (Ramos vd. "without compromising … volume utilization"). Kesin iddia **kaynaklı** ama bizim beam'e uyarlaması **varsayım**.
- Fizik: İyileşir.
- 2 sn: Post-pass birkaç ms; leksikografik terim ise beam dallanmasını büyütür → önerilmez. Karmaşıklık: Düşük-orta.

**Öncelik 4 — Ağırlık-farkında kutu seçimi (araç tavanı bağlayıcıyken).**
- Mekanizma: Sıra düzeyinde "sığmayan düşer" yerine hacim VE ağırlık knapsack ön-seçimi (Ratcliff-Bischoff 1998 opportunity-cost; değer=hacim knapsack); beam içinde ağırlık-farkında dallanma. Aks-yükü için Krebs-Ehmke/Lim vd. formülleri.
- Beklenen kazanç: Yalnızca tavan bağlayıcı korpuslarda anlamlı (Renault'da orta aks sık bağlayıcı). Kesin puan **varsayım**.
- Fizik: Korunur.
- 2 sn: Knapsack ön-seçim ucuz; aks-farkında beam orta maliyet. Karmaşıklık: Orta-yüksek.

### (d) Korpus parametre önerileri
- **Kırılgan payı:** %5 / %10 / %20 / %33 kademeli eğri üret (literatürde bu spesifik maliyet-eğrisi YOK — kendi katkımız olacak; %30 Krebs-Ehmke ile hizalı taban). Her kademede yeni (doğrudan-temas + dereceli LBS) modelin maliyet eğrisini ölç.
- **MaxStack dağılımı:** Sabit 2 yerine ROADEF/Renault mantığıyla ürün-tipine bağlı max-stackability (ISM) dağılımı (ROADEF S6: yığındaki min max-stackability); tipik değerler instance dosyalarından çıkarılmalı (bkz. Caveats). Senaryolar: tümü=2 (mevcut), karışık {1,2,3,4,∞}, kısıtsız.
- **Ağırlık tavanı senaryoları:** 1.000.000 kg yerine gerçekçi ~24–26 t brüt + aks limitleri (ROADEF örnek değerleri: orta aks ~12 t, arka aks ~31,5 t). Böylece ağırlık-farkında seçimin ve CoG'un maliyeti ölçülebilir hale gelir.

### (e) Makale + repo listesi (linklerle)
Makaleler:
- Krebs, Ehmke & Koch 2021, "Advanced loading constraints for 3D VRP", OR Spectrum 43:835–875 — https://link.springer.com/article/10.1007/s00291-021-00645-w
- Krebs & Ehmke 2023, "Solution validator and visualizer…", Annals of OR 326:561–579 — https://link.springer.com/article/10.1007/s10479-023-05238-0
- Gendreau, Iori, Laporte & Martello 2006, Transportation Science 40(3):342–350 — https://www.jstor.org/stable/25769310
- Ratcliff & Bischoff 1998, OR Spektrum 20(1):65–71 — https://link.springer.com/article/10.1007/BF01545534
- Bischoff 2006, EJOR 168(3):952–966 — DOI 10.1016/j.ejor.2004.04.037
- Junqueira, Morabito & Yamashita 2012, C&OR 39(1):74–85 — https://www.sciencedirect.com/science/article/abs/pii/S0305054810001486
- Davies & Bischoff 1999, EJOR 114(3):509–527 — https://www.sciencedirect.com/science/article/abs/pii/S0377221798001398
- Ramos, Silva & Oliveira 2018, EJOR 266(3):1140–1152 — https://sciencedirect.com/science/article/abs/pii/S0377221717309633
- Eley 2003, OR Spectrum 25(1):45–60 — https://link.springer.com/article/10.1007/s002910200113
- Bortfeldt & Wäscher 2013, "Container loading — state-of-the-art review" (working paper 2012) — https://www.fww.ovgu.de/fww_media/femm/femm_2012/2012_07-EGOTEC-503ec3895182dc0d922a6bd7feebb3a5.pdf
- Moon & Nguyen 2014, "Container packing problem with balance constraints", OR Spectrum 36:837–878 — https://link.springer.com/article/10.1007/s00291-013-0356-1
- Fragility-constrained VRPTW (arXiv 2109.01883) — https://arxiv.org/pdf/2109.01883
- IET taksonomi incelemesi (Chi 2026, 3L-CVRP systematic review) — https://ietresearch.onlinelibrary.wiley.com/doi/10.1049/itr2.70281

Repolar/veri:
- Krebs SolutionValidator (Java/C++, fragility/stacking/LBS formülasyonları) — https://github.com/CorinnaKrebs/SolutionValidator
- Krebs Results / Instances — https://github.com/CorinnaKrebs/Results ; https://doi.org/10.24352/UB.OVGU-2020-139
- felicze/3l-cvrp (branch-and-cut, "impact of loading constraints" tablosu) — https://github.com/felicze/3l-cvrp
- ROADEF/EURO 2022 (Renault) — https://github.com/renault-iaa/challenge-roadef-2022 ; https://roadef.org/challenge/2022/en/index.php
- CVUT/CIIRC tezi (Hromada 2023, ROADEF 2022 kısıt notasyonu S1/S5/S6/S7/W1/W2) — https://dspace.cvut.cz/server/api/core/bitstreams/59ff0733-4a22-4b54-ad21-a5838a913d69/content
- Balogh vd. "Modelling Choices for the Roadef 2022 Challenge" — https://cora.ucc.ie/bitstreams/1051577a-6a56-47bc-87b7-c1cd9f0f888d/download

## Recommendations
1. **Hemen (en yüksek getiri/risk):** Kırılganlık kuralını sütun-geneli'nden Gendreau C7a doğrudan-temasa çevir + Krebs-Ehmke DBLF "fragile-on-top" sıralamasını uygula. Bunlar birlikte en düşük riskle en büyük geri kazanımı verir; ihlal-sıfır korunur; 2 sn bütçeyi bozmaz.
2. **Sonra:** Kategorik Fragile=0 kg yerine dereceli MaxWeightOnTop/lbs tek eksende birleştir (Krebs C7b2 complete selection); köprülemeyi geçerli say. Önbelleğe alma ile ~%29 süre artışını beam bütçesine sığdır.
3. **Paralel:** CoG için BalanceScoring'i onarım post-pass olarak geri getir; leksikografik beam terimi EKLEME (doluluğu ve hızı tehdit eder).
4. **Korpus:** Ağırlık tavanını gerçekçi (~24–26 t + aks) yap ve MaxStack'i ürün-tipine bağlı dağıt; ancak o zaman ağırlık-farkında seçimin değeri ölçülebilir.
5. **Ayrışım:** "En büyük grup kalır" tam elemesini gözden geçir; Eley 2003 tarzı bölgeli/mesafe kuralı hacmi korur.
- **Karar eşikleri:** Yeni kırılganlık modeli fill'i ≥%85'e çıkarırsa Öncelik 1 doğrulanmış sayılır ve Öncelik 2/4'e geçilir; CoG post-pass fill'i >0,5 puan düşürürse LDD zarfı gevşetilmeli; gerçekçi ağırlık tavanı senaryosunda araçlar hacimden ÖNCE ağırlıkla dolarsa Öncelik 4 derhal devreye alınır; MaxStack karışık dağıtıldığında −13,69'un yarısından fazlası geri gelirse korpus yeniden parametrelemesi kalıcılaştırılır.

## Caveats
- Krebs-Ehmke maliyetleri **VRP amaç fonksiyonunda** (kullanılan araç sayısı, toplam mesafe) raporlanmıştır; bizim tek-araç doluluk yüzdemize doğrudan çevrilemez — puan eşlemeleri yaklaşıktır ve yön/büyüklük göstergesi olarak yorumlanmalıdır.
- Gendreau (2006) orijinal instance'larındaki KESİN kırılgan yüzdesi kaynaklarda net değil (rastgele atanır); ~%30 rakamı Krebs-Ehmke'nin ürettiği 600'lük set içindir.
- ROADEF/Renault için toplam payload'un tek sabit değeri ve max-stackability'nin ampirik dağılımı yayınlanmış kaynaklarda YOK; yalnızca örnek aks değerleri (orta ~12 t, arka ~31,5 t) ve per-truck TMmₜ notasyonu bulundu. Kesin dağılımlar instance CSV'lerinden (datasetA.zip / dataset_B.zip) çıkarılmalıdır. "Item classes ~60.000" CIIRC'nin en büyük instance'a ilişkin ifadesidir.
- Davies-Bischoff 1999 ve Junqueira 2012'nin kesin sayısal doluluk-kaybı tabloları tam metin erişimi olmadan doğrulanamadı; bu iki kaynağa ilişkin ifadeler nitel bulgulara dayanıyor.
- Ramos-Silva-Oliveira "doluluk kaybı ~0" iddiası kendi BRKGA'ları içindir; bizim 2 sn'lik beam+duvar-örücü mimarimize aktarımı test edilmelidir (varsayım).
- Layer building önerilmemiştir (müşteri kararıyla yasak); tüm öneriler duvar-örücü / maksimal-uzay defteri / kule-blok mimarisiyle uyumludur.
