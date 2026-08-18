# Cargo Pilot 3B Konteyner Yükleme Motoru: Blok-Beam Literatürüne Göre Konum, Kalan ~3 Puanın Kaynağı ve Öncelikli Yol Haritası

## TL;DR
- Bugünkü %89,4 (tam-destek, 2 sn), blok-beam literatürünün **alt-orta bandında**; kalan ~3 puanın **en olası tek kaynağı**, aksiyon uzayının "sıradaki ürün" olması (literatürdeki BSG/ID-GLTS/CLTRS **(blok, boşluk) çifti** üzerinde dallanır) ve buna bağlı olarak beam'i besleyen **tek geçişli greedy tabanın zayıflığı** (%83,4 vs BSG greedy ~%87); ikincil kaynak, kenar şeridi + tavan artığını toplayan **post-optimizasyon eksikliği**.
- Literatürdeki %93,8–95,0 rakamları **destek kısıtsız (cutting) ve 240–500 sn** koşullarına aittir; tam-destekli ve 2 sn'lik adil karşılaştırma hedefi CLTRS'nin **tam-destek %94,2 (BR1–7)** değeridir — yani gerçek açığınız ~3 puan olup kapatılabilir.
- En yüksek getirili üç hamle, sırayla: (1) aksiyonu **(blok, boşluk) çiftine** taşımak + VCS/VPD'nin **L(b) kayıp terimini** (knapsack tabanlı kullanılabilir-uzunluk) greedy tabana gömmek; (2) **iteratif beam genişletme** (DoubleEffort/iterative widening — anytime); (3) **space defragmentation + sınırlı VNS** ile kenar şeridi ve tavan artığını son 200–500 ms'de toplamak.

## Key Findings

**1. Konumlandırma.** Blok-beam literatürünün referans çıpası Fanslau & Bortfeldt CLTRS'dir (2010, INFORMS J. Computing 22(2):222–235): **tam-destek (packing) varyantı BR1–7'de %94,2, BR1–15'te %91,9**; destek kısıtsız (cutting) varyantı BR1–7'de %95,0, BR1–15'te %93,9 — hepsi ~240–320 sn/örnek. BSG-VCS (Araya-Riff 2014 + Araya-Guerrero-Nuñez 2017) güçlü heterojen (BR8–15) kümede güncel SOTA'dır; Yang vd. 2025 (ScienceDirect S2192437625000160) doğrudan "BSG, which represents the state-of-the-art method for solving 3D-SKP" der ve kendi yöntemlerinin BR8–15'te ID-GLTS/CLTRS/BRKGA'yı sırasıyla %0,62/%1,3/%0,95 geçtiğini ama BSG'nin %0,44 gerisinde kaldığını raporlar. BSG literatürde **500 sn/örnek** maksimum süreyle çalıştırılır. Sizin bağlamınızdaki "2 sn'de BSG %93,8/94,7", büyük olasılıkla Metasolver'ın `-t 2` ile **destek kısıtsız** varyantındaki kendi ölçümünüzdür; yayınlanmış çıpayla adil kıyas, tam-destekli CLTRS %94,2'dir. Dolayısıyla %89,4'ünüz, tam-destek düzeltmesinden sonra bile ~3 puan geride.

**2. Tam-destek maliyeti.** En iyi belgelenmiş rakam CLTRS'den: cutting−packing farkı **ortalama ~2 puan**, ama heterojenliğe şiddetle bağlı — homojen uçta ~0,12 puan, BR15'te ~4,8–5 puan (CLTRS Tablo 3: BR15 cutting %92,40 vs packing %87,57). Sizin BR1–7 ağırlıklı zayıf-heterojen profilinizde maliyet düşük uçtadır; bu, bağlamınızdaki "~0,8 puan" tahminiyle tutarlı. Sonuç: tam-destek *tek başına* açığınızı açıklamıyor.

**3. Kalan açığın mekanizması.** İki teknik neden öne çıkıyor:
- **Aksiyon uzayı.** Zhu-Oon-Lim-Weng "altı öğe" çerçevesinde (Applied Intelligence 2012, 37:431–445) K3 (boşluk seçimi) ve K4 (blok seçimi) *birlikte* karar verilir; ID-GLTS "doğru bloğu doğru artık-boşluğa" yerleştirmeyi açıkça amaç edinir (Zhu & Lim 2012, EJOR 222(3), abstract: "select the right block to place into the right free space cuboid"). BSG'nin dallanması efektif olarak (blok, boşluk) düzeyindedir. Sizin beam'iniz "sıradaki ürün" düzeyinde dallanıp gerisini greedy'ye bıraktığından, kenar şeridi/köşe kararları greedy'ye emanet ediliyor.
- **Greedy taban kalitesi.** Beam'in her dalı greedy tamamlanıp ölçüldüğü için beam kalitesi doğrudan greedy tabanın kalitesine bağlıdır. BSG'nin tek-geçişli greedy'si yüksek skoru, VPD fonksiyonundaki iki terim sayesinde alır (Araya & Riff 2014, COR 43:100–107; box-selection Araya-Guerrero-Nuñez 2017, COR 82:27–35 ile geliştirildi): **CS(b)** (bloğun komşu bloklar/duvarlarla temas eden yüzey oranı) ve **L(b)** (seçilen boşluğun artık kısmındaki israfın, kalan kutu boyutlarının doğrusal kombinasyonuyla tahmini — bir knapsack olarak modellenip pseudo-polinom sürede çözülür; Metasolver README'de doğrulanmıştır). Sizin VCS ağırlıklı çarpımınız temas/hacim/kayıp/kutu-sayısı içeriyor ama tek-geçişli tabanınız %83,4 — bu ~3,6 puanlık taban açığı doğrudan beam'e yansıyor.

**4. Post-optimizasyon boşluğu.** Kalan kaybınızın yarısı kenar şeritleri + tavan artığı. Literatürde bunları toplayan iki hazır mekanizma var: **space defragmentation** (Zhu-Zhang-Oon-Lim 2012, EJOR 222(3):452–463 — "dead space between placed items is consolidated by pushing the items to the edges; new items are then placed in the resulting space, and the existing items are pushed back") ve **Parreño VNS** (2010, J. Heuristics 16:1–22 — fiziksel yerleşim üzerinde beş ekle/sil komşuluğu). CLP yazınında defragmentation'ın öne çıktığı belirtilir: "Out of all these heuristics, the space-defragmentation approach of Zhu et al. (2012b) is found to perform the best."

**5. Kısıt tarafı olgunluğu.** LIFO/multi-drop, CoG/aks yükü, kırılganlık için sağlam kıyas korpusu ve blok-beam uyumlu yöntemler mevcut: Christensen & Rousøe 2009 (duvar örücü + multi-drop + load-bearing), Ceschia & Schaerf 2013 (dizi + deterministik "loader" local search, çoklu kısıt), Ramos-Silva-Oliveira 2018 (yük dengesini *sert* kısıt olarak, araç yük dağıtım diyagramlarıyla), Bischoff 2006 (sınırlı taşıma dayanımı). Endüstriyel altın standart veri: **ROADEF/EURO 2022 Renault kamyon yükleme** — Hexaly'ye göre Renault tedarik zinciri 17 ülkede 40+ fabrika ve 1.500 tedarikçiyi kapsar, haftada 6.000 kamyon parça taşır, yıllık iç lojistik bütçesi birkaç yüz milyon euro; 51 takım yarıştı. Kazanan (senior) takım S41 = Florian Fontan & Luc Libralesso (2018 challenge'ın da şampiyonları); junior kazanan J31 (Rick Willemsen, Bart van Rossum, Hollanda); ORTEC üçüncü.

## Details

### A. Bugünkü %89,4'ün konumu ve kalan farkın kaynağı (kaynaklı)

Karşılaştırma çıpaları (BR1–7 / BR1–15, tam-destek durumu, süre):
- **CLTRS packing (tam-destek):** %94,2 / %91,9 — ~240–320 sn (Fanslau & Bortfeldt 2010, INFORMS JoC 22(2), Tablo 3–4). Per-BR packing: BR1 94,51 … BR7 93,20 … BR15 87,57.
- **CLTRS cutting (destek yok):** %95,0 / %93,9.
- **ID-GLTS** (Zhu & Lim 2012, EJOR 222(3)): CLTRS'yi daha az kaynakla geçtiğini raporlar; tam-destek (SCLP-FS) varyantı da var. Zaman: 500 sn/örnek. CPU'nun yarısını Single-Best-Space, yarısını Multi-Best-Space şemasına ayırıp iyisini alır; iteratif ikiye-katlama (iterative doubling) kullanır.
- **BSG / BSG-VCS:** güçlü-heterojen SOTA; 500 sn/örnek.
- **Sizin motor:** %89,4 tam-destek, 2 sn; tek-geçişli %83,4; GRASP %88,34.

Yorum: 2 sn'de %89,4, tam-destekli literatür çıpasının (~%94,2, ama ~240 sn) belirgin altında; ancak süre farkı devasa (2 sn vs 240–500 sn). Adil "aynı 2 sn" kıyası için sizin BSG-2s ölçümünüz (%93,8–94,7, destek kısıtsız) en anlamlı referans. Tam-destek düzeltmesi (zayıf-heterojen için ~0,5–1 puan) uygulandığında bile hedef ~%93; yani **~3 puanlık gerçek ve kapatılabilir bir açık** var. Bu açığın kaynak ayrıştırması:
- **~1,5–2 puan (varsayım):** aksiyon uzayı + greedy taban (yukarıda madde 3). Kanıt zinciri: BSG greedy ~%87 alırken sizinki %83,4; beam kalitesi greedy tabana lineer bağlı.
- **~1–1,5 puan (varsayım):** post-optimizasyon eksikliği (kenar şeridi + tavan artığı; sizin ölçümünüzde kaybın yarısı).
- **~0,5–1 puan:** tam-destek maliyeti (kaçınılmaz kısım).

### B. Beam'in kalan ~3 puanı — öncelikli somut hamleler

**F-1 (En yüksek getiri): Aksiyonu (blok, boşluk) çiftine taşı + L(b) kayıp terimini greedy tabana göm.**
- **Mekanizma:** Dallanma noktasında "sıradaki ürün" yerine (blok, artık-boşluk) çiftlerini üret ve VPD/VCS ile puanla; ışın bu çiftler üzerinde ilerlesin. Metasolver'ın VPD'si: V(b)·(profit/density)·CS(b,θ₄)·(1−L(b))… biçiminde; **L(b)** = seçilen boşluğun artık kısmında, kalan kutu boyutlarının doğrusal kombinasyonuyla ulaşılabilecek maksimum "kullanılabilir uzunluk" knapsack ile hesaplanıp israf tahmini (pseudo-polinom). Metasolver'da varsayılan θ_v = "1 0 −0,13 0,02 3,85 6,27 0,48"; `--min_fr` (tipik 0,98) ve `--maxb` üretilecek blok sayısını sınırlar.
- **Neden darboğazı çözer:** Kenar şeridi kararları artık greedy'ye bırakılmaz; köşe/temas (CS) ve knapsack-israf (L) sinyali doğrudan seçim anında devreye girer — bu tam olarak kenar şeridi kaybını hedefler.
- **Ölçülmüş kazanç:** Araya-Riff, greedy look-ahead yerine beam koyarak literatürü ilerletti; VCS (2017) box-selection'ı yenileyerek BSG-VCS'i SOTA yaptı. Puan-bazlı birebir ablation paywall arkasında — **varsayım:** (blok, boşluk) + L(b) birlikte ~1,5–2 puan.
- **2 sn etkisi:** (blok, boşluk) aksiyon uzayını büyütür; min_fr/maxb ile bütçeye sığdırın. Karmaşıklık: orta-yüksek. Risk: aday patlaması — min_fr/maxb kalibrasyonu şart.

**F-2: İteratif beam genişletme (DoubleEffort / iterative widening) — anytime.**
- **Mekanizma:** Libralesso & Fontan iterative beam search'ü: D=1'den başlayıp geometrik (×2, gerekirse ×√2) artışla ardışık beam koşuları, süre bitene dek; en iyiyi sakla ("performs a series of restarting beam search with geometrically increasing beam size until the time limit is reached"). ID-GLTS aynı fikri "iterative doubling" olarak kullanır; CLTRS partition-controlled arama + aşamalı süre paylaşımı yapar.
- **Neden darboğazı çözer:** Sıra araması doyduğu (30× bütçe +0,04) için sabit genişlik-8 beam bütçeyi verimsiz kullanıyor olabilir; iteratif genişletme "önce hızlı iyi çözüm, sonra derinleştir" ile 2 sn'yi tam doldurur ve doğal anytime kesme sağlar.
- **Ölçülmüş kazanç:** iterative beam search çeşitli C&P/permütasyon problemlerinde SOTA; açık uygulamalar mevcut (aşağıda repo listesi).
- **2 sn etkisi:** doğal — süre dolunca son tamamlanan beam'in en iyisi döner. Karmaşıklık: düşük-orta. Risk: küçük.

**F-3: Rollout/greedy tamamlama maliyetini düşür.**
- **Mekanizma:** (a) kısmi rollout (yalnız ilk k adım greedy, gerisi ucuz surrogate); (b) surrogate değerlendirme (L(b)+CS(b) tabanlı hızlı skor); (c) çok-çekirdekli paralel beam — .NET `Parallel.For` ile dalları paralel değerlendirme (deterministik birleştirme için sabit-sıralı indirgeme). Araya ekibi paralel/çok-amaçlı BSG'yi yayınladı (Metasolver `bo-bsg`); C++ referansı açık.
- **Neden darboğazı çözer:** Tasarruf edilen süre F-1'in büyümüş aksiyon uzayını finanse eder.
- Karmaşıklık: paralel için orta; determinizm için dikkat. Risk: nondeterminizm — sabit-sıra indirgemeyle önlenir.

**F-4: Bileşik (composite) bloklar + blok üretim eşiği kalibrasyonu.**
- **Mekanizma:** Fanslau-Bortfeldt "iç boşluklu genel bloklar" + Zhu-Lim'in zayıf-heterojen için basit, güçlü-heterojen için genel blok anahtarı (δ parametresi, h_t göstergesi). Sizde bileşik blok GRASP'ta ±0 verdi; ama beam'de (blok, boşluk) aksiyonuyla yeniden değerlendirilmeli — GRASP'taki nötrlük beam'e taşınmayabilir.
- Karmaşıklık: düşük (BlockCatalog zaten var). Risk: düşük.

### C. Kenar şeridi ve tavan artığı — post-optimizasyon (200–500 ms hedefli)

**F-5: Space defragmentation (Zhu-Zhang-Oon-Lim 2012, EJOR 222(3):452–463).**
- **Mekanizma:** Yerleşim sonrası kutuları duvara/tabana doğru "iterek" (push to the edges) parçalı boşlukları tek sürekli kullanılabilir boşlukta birleştir; ardından kalan kutularla o boşluğu doldur ve mevcut kutuları geri it. Tam-destek koşulunda push yönleri destek yüzeyini bozmayacak şekilde (aşağı + bir yatay eksen) kısıtlanır.
- **Neden darboğazı çözer:** Doğrudan tavan artığı/ölü hava ve kenar şeritlerini birleştirip 3–16 parçalık kalan boşluğa kutu sokar.
- **Ölçülmüş kazanç:** Yazarlar tekniğin *tek başına* karmaşık metasezgisellerin kalitesine yaklaştığını raporlar; CLP yazını "space-defragmentation approach of Zhu et al. (2012b) is found to perform the best" der.
- **2 sn etkisi:** son geçiş olarak ucuz; 200–500 ms'ye sığar. Karmaşıklık: orta. Risk: tam-destek doğrulaması push sonrası tekrar gerekir.

**F-6: Sınırlı VNS post-optimizasyonu (Parreño 2010, J. Heuristics 16:1–22).**
- **Mekanizma:** Maximal-space üzerine beş fiziksel komşuluk (kutu/blok ekle-sil, boşalt-yeniden doldur; ruin-and-recreate / unload-and-repack ruhu). Tüm komşulukları değil, kenar/tavan bölgesine odaklı 1–2 komşuluğu süre kutusuyla çalıştır.
- **Neden darboğazı çözer:** Beam'in bıraktığı yerel kusurları (kenar şeridi) düzeltir.
- Karmaşıklık: orta. Risk: 2 sn'de yalnız kısa VNS; tam VNS bütçeyi aşar.

### D. Kısıt tarafı (üretim riski) — blok-beam uyumlu, kaynaklı

**F-7: Multi-drop / LIFO.**
- **Christensen & Rousøe 2009** (Int. Trans. OR 16(6):727–743): duvar örücü + ikili-ağaç, maximal spaces, dinamik uzay ayrıştırma, repacking + space amalgamation; load-bearing ve alttan destek dahil. Blok-beam'e uyarlama: her drop için "sanal duvar/bölme" — sonra boşaltılacak müşterinin kutuları kapıya/üste yakın; VPD skoruna drop-sırası cezası ekleyin.
- **Ceschia & Schaerf 2013** (J. Heuristics 19:275–294): dizi uzayında local search + deterministik "loader"; multi-container, rotasyon, taşıma-dayanımı, kırılganlık, multi-drop. EasyLocal++ açık altyapı.
- **Junqueira-Morabito-Yamashita 2012** (Annals of OR 199): multi-drop + stability + load-bearing MIP — küçük örnekler için doğrulama referansı.
- **Wang-Lim-Zhu 2013** (IJPE 145(2):531–540): shipment priority için **multi-round partial beam search** — sizin beam mimarinize en yakın kısıtlı yöntem; ortalama kullanımı ~%1 iyileştirip SOTA'dan daha kısa sürede çalıştığını raporlar.

**F-8: Ağırlık dengesi / CoG / aks yükü.**
- **Ramos-Silva-Oliveira 2018** (EJOR 266(3):1140–1152): yük dengesini **sert kısıt** olarak, araç-spesifik yük dağıtım diyagramı (LDD) ile CoG'nin fizibilite bölgesini tanımlar; çok-popülasyonlu BRKGA + statik denge + yük dengesi fitness'i; hacmi bozmadan uyguladığını raporlar.
- **Lim-Ma-Qiu-Zhu 2013** (IJPE 144(1):358–369): tek konteyner + aks yükü kısıtı.
- **Davies & Bischoff 1999** (EJOR 114(3):509–527): boyuna+enine ağırlık dağılımı; BR8–15 uzantılı veri.
- Uygulama: Bağlamınızdaki ~3× gerileme ve DepthSlack-LIFO çatışması nedeniyle **arama-sonrası hafif düzeltme** (CoG'yi zarfa çekecek yerel takaslar) daha güvenli; sert CoG gerekiyorsa VPD'ye zarf-cezası ekleyip in-search yapın.

**F-9: Kırılganlık / istiflenebilirlik / load-bearing.**
- **Bischoff 2006** (EJOR 168(3):952–966): sınırlı taşıma dayanımı; yük-taşıma yeteneğini yalnız kısıt olarak değil aktif kriter olarak kullanmanın "çok üstün" sonuç verdiğini gösterir — blok üretiminde (K2) üst-ağırlık/istif-yüksekliği eşiğini gömün.

### E. Kısıtlı benchmark setleri
- **OR-Library thpack1–7** (Bischoff-Ratcliff 1995) + **Davies-Bischoff 1999** uzantıları (BR8–15, ağırlık verisi): people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html.
- **Junqueira 2012** multi-drop örnekleri; **Ceschia & Schaerf 2013** gerçek-dünya + literatür örnekleri (EasyLocal++).
- **ROADEF/EURO 2022 Renault** kamyon yükleme: en zengin çok-kısıtlı endüstriyel veri (yükleme sırası, ağırlık limiti, aks yükü, fren kaymasını önleme). Kurallar/veri: github.com/renault-iaa/challenge-roadef-2022; sonuç: roadef.org/challenge/2022.
- **Metasolver BRwp / NMFTA / 1C** setleri (ağırlık/profit) BSG için hazır: github.com/rilianx/Metasolver.

### F. Bütçe dışı: anytime + asenkron iyileştirme
- İteratif beam search doğası gereği anytime'dır (F-2). Endüstriyel desen: önce hızlı fizibıl plan (≤2 sn), arka planda 30–60 sn iteratif genişletme + defragmentation ile planı güncelle; API/DB 2 sn'si sürerken motor arka planda derinleşir. Libralesso-Fontan MBA*/iterative beam ve PackingSolver bu "hızlı-sonra-iyileştir" desenini somutlar (2018 glass-cutting challenge'ı 64 katılımcı arasında birinci).

## Recommendations

**Aşama 1 (2–4 hafta, en yüksek getiri):**
1. **F-1**: Dallanmayı (blok, boşluk) çiftine taşı; VPD/VCS'e **L(b) knapsack kayıp terimi** ekle. *Eşik:* tek-geçişli greedy tabanı %83,4 → ≥%86'ya çıkmazsa L(b) implementasyonunu/kalibrasyonunu gözden geçir.
2. **F-2**: Sabit genişlik-8 yerine **iteratif genişletme** (D=1, ×√2 veya ×2). *Eşik:* BR1–7 ortalaması ≥%91 olmazsa dallanma aralığını (her 20 kutu) küçült.

**Aşama 2 (post-optimizasyon):**
3. **F-5 space defragmentation** son geçiş (≤500 ms). *Eşik:* kenar şeridi + tavan artığı kaybı yarıya inmezse push yönlerini/tam-destek yeniden-doğrulamasını revize et.
4. **F-6 sınırlı VNS** yalnız kenar/tavan bölgesinde, kalan süreyle.

**Aşama 3 (verim + kısıt):**
5. **F-3 paralel beam** (.NET Parallel.For, deterministik indirgeme) — F-1'in maliyetini finanse et.
6. Kısıt entegrasyonu: **F-7 (multi-round partial beam, Wang-Lim-Zhu)** LIFO/multi-drop için; **F-8** CoG'yi önce post-processing, gerekirse VPD-zarf-cezasıyla in-search; **F-9** load-bearing'i K2 blok üretimine göm.
7. Kısıtlı doğrulama için **ROADEF 2022 + Junqueira/Ceschia** setlerini CI'ya ekle.

**Kararı değiştirecek eşikler:** BR1–7 ≥ %92,5'e ulaşırsa aksiyon-uzayı hamlesi başarılı sayılır ve odak post-optimizasyona kayar. Tek-geçişli taban %86'yı geçmezse L(b)/CS(b) formülasyonu birincil şüpheli. Defragmentation +1 puan getirmezse tavan artığının kaynağı blok geometrisidir, üretim tarafına (min_fr/maxb) dönülür.

## Caveats
- **Süre kıyası kritik uyarı:** Yayınlanmış %93,8–95,0/%94,2 rakamları **240–500 sn/örnek** koşullarındandır; sizin 2 sn bütçenizle birebir değildir. "2 sn'de BSG %93,8/94,7" ölçümü büyük olasılıkla Metasolver'ın kendi `-t 2` cutting (destek kısıtsız) çalıştırmanızdır. Adil çıpa: tam-destekli, aynı 2 sn.
- Altı-öğe **ablation'ının puan-bazlı ayrıntısı** ve BSG/ID-GLTS/BRKGA/G2LA'nın kesin BR1–7/BR1–15 ondalıkları paywall arkasında; bu raporda CLTRS'nin kesin tablo değerleri (%94,2/%91,9 packing; %95,0/%93,9 cutting) çıpa alınmıştır. Puan-bazlı kazanç tahminleri "varsayım" olarak işaretlenmiştir.
- Bağlamınızdaki "BSG greedy 12 ms'de %87" ile literatürün "500 sn'de SOTA" ifadesi çelişmez: %87, BSG'nin *tek-geçişli greedy tabanı*dır; beam bunun üzerine kurulur. Alt-araştırma, BSG'nin yayınlanmış zaman bütçesini **500 sn** olarak buldu (150 sn'yi destekleyen kaynak yok) — sizin gözleminiz muhtemelen kendi kısa-süreli çalıştırmanızdır.
- Tam-destek maliyeti heterojenliğe bağlı (0,12–~5 puan); sizin zayıf-heterojen profilinizde düşük uçtadır — bağlamınızdaki ~0,8 puanla tutarlı.
- Katman (kesit-boyu yatay layer) tabanlı yaklaşım müşteri yasağı ve öneri kapsamı dışıdır; önerilen tüm yöntemler blok/stack/duvar-serbest mimarilerle uyumludur.

---

### Makale + Repo Listesi (linklerle)

**Blok-beam / arama çekirdeği**
- Araya & Riff 2014, "A beam search approach to the container loading problem," COR 43:100–107 — https://www.sciencedirect.com/science/article/abs/pii/S0305054813002530
- Araya, Guerrero, Nuñez 2017, "VCS: a new heuristic function...," COR 82:27–35 — https://www.sciencedirect.com/science/article/abs/pii/S0305054817300023
- Fanslau & Bortfeldt 2010, CLTRS, INFORMS JoC 22(2):222–235 — https://ub-deposit.fernuni-hagen.de/receive/mir_mods_00000665
- Zhu & Lim 2012, ID-GLTS, EJOR 222(3):408–417 — https://ideas.repec.org/a/eee/ejores/v222y2012i3p408-417.html ; Java kodu: https://alim.algorithmexchange.com/orlib/topic/ID%20GLTS%20to%20SCLP/
- Zhu, Oon, Lim, Weng 2012, "The six elements to block-building...," Applied Intelligence 37:431–445 — https://link.springer.com/article/10.1007/s10489-012-0337-0
- Wang, Lim, Zhu 2013, "Multi-round partial beam search... shipment priority," IJPE 145(2):531–540 — https://www.sciencedirect.com/science/article/abs/pii/S0925527313001928

**Post-optimizasyon**
- Zhu, Zhang, Oon, Lim 2012, "Space defragmentation for packing problems," EJOR 222(3):452–463 — https://www.sciencedirect.com/science/article/abs/pii/S037722171200389X
- Parreño, Alvarez-Valdes, Oliveira, Tamarit 2010, "Neighborhood structures for the CLP: a VNS implementation," J. Heuristics 16:1–22 — https://link.springer.com/article/10.1007/s10732-008-9081-3

**Anytime tree/beam search**
- Libralesso & Fontan 2020, "Anytime tree search... 2018 ROADEF glass cutting," EJOR 291(3):883–893 — https://hal.science/hal-02531037 ; arXiv: https://arxiv.org/abs/2004.00963
- Fontan & Libralesso, "PackingSolver / anytime tree search for 2D guillotine packing," arXiv:2004.02603 — https://arxiv.org/pdf/2004.02603
- Libralesso vd., "Iterative beam search... permutation flowshop," arXiv:2009.05800 — https://arxiv.org/pdf/2009.05800

**Kısıtlar**
- Christensen & Rousøe 2009, "Container loading with multi-drop constraints," ITOR 16(6):727–743 — https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1475-3995.2009.00714.x
- Ceschia & Schaerf 2013, "Local search for a multi-drop multi-container loading problem," J. Heuristics 19:275–294 — https://link.springer.com/article/10.1007/s10732-011-9162-6
- Junqueira, Morabito, Yamashita 2012, "MIP-based approaches... multi-drop," Annals of OR 199 — https://link.springer.com/chapter/10.1007/978-1-4614-4469-5_12
- Ramos, Silva, Oliveira 2018, "A new load balance methodology...," EJOR 266(3):1140–1152 — https://ideas.repec.org/a/eee/ejores/v266y2018i3p1140-1152.html
- Lim, Ma, Qiu, Zhu 2013, "SCLP with axle weight constraints," IJPE 144(1):358–369
- Davies & Bischoff 1999, "Weight distribution considerations in container loading," EJOR 114(3):509–527
- Bischoff 2006, "Three-dimensional packing of items with limited load bearing strength," EJOR 168(3):952–966
- Bortfeldt & Wäscher 2013, "Constraints in container loading — a state-of-the-art review," EJOR 229(1):1–20 — https://ideas.repec.org/a/eee/ejores/v229y2013i1p1-20.html

**Repolar**
- rilianx/Metasolver (BSG + BSG-B, C++; BR/BRwp/NMFTA/1C setleri, `--min_fr`, `--fsb` full-support): https://github.com/rilianx/Metasolver ; BeamSearchCLP: https://github.com/rilianx/BeamSearchCLP
- fontanf/packingsolver (anytime iterative beam, C++, 222★): https://github.com/fontanf/packingsolver ; fontanf/treesearchsolver: https://github.com/fontanf
- Zhu & Lim ID-GLTS Java: https://alim.algorithmexchange.com/orlib/
- ROADEF 2022 Renault veri/kurallar: https://github.com/renault-iaa/challenge-roadef-2022 ; sonuçlar: https://roadef.org/challenge/2022/en/
- OR-Library BR benchmark: https://people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html