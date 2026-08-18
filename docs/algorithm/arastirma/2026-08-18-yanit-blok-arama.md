# Cargo Pilot: %86–88'den %90+'a — Blok Tabanlı Aramaya Geçiş için Kaynaklı, Öncelik Sıralı Yol Haritası

## TL;DR
- **2 saniyelik bütçede %86,2 strict / %88,3 free sonucunuz bütçeye göre saygın; ancak literatürün "en iyi ~%94–95"i (CLTRS, ID-GLTS, BSG-VCS, mp-BRKGA) tam-destekli (packing) varyantta ve instance başına ~240–320 saniyeyle elde edilmiştir — kıyas eşit süreli DEĞİLDİR.** Sizi asıl geride bırakan şey yerleştirici değil, arama uzayının kendisidir: sıra (permütasyon/random-key) araması doymuştur; literatür liderleri "hangi boşluğa hangi blok" kararı üzerinde greedy-lookahead / beam search yapar.
- **En yüksek kaldıraçlı tek hamle: random-key sıra decoder'ını, duvar disiplinini koruyan bir blok-yerleştirme beam search / greedy-lookahead (G2LA/BSG tarzı) ile değiştirmek.** Fanslau & Bortfeldt'in kendi verisi gösteriyor ki zayıf heterojen BR1-BR7'de blok zenginleştirmesi neredeyse hiçbir şey kazandırmıyor (yalnız basit bloklarla %94,7, jeneralize bloklarla %95,0 — sadece ~0,3 puan); kazanç blok çeşitliliğinde değil arama şemasındadır. Bu, sizin "bileşik blok GRASP'ta ±0" gözleminizle birebir örtüşür.
- **BR1'de kaçırdığınız şey büyük olasılıkla duvar kesitinin 2B tam doldurulmamasıdır:** 3 kutu tipli, en tekrarlı sette duvar yüzü bir "manufacturer's pallet loading" (tek tip dikdörtgen) problemidir; kule/blok kesitin tamamına yayılmadığında defter parçalanır (sizde 4-16 boşluk, %8,6-13 ölü hava). Çözüm: duvar yüzünü G4/G5-blok mantığıyla tam kapla.

## Key Findings

**1. Konum (dürüst kıyas).** Sizin ölçümünüz strict (tam-destek muadili) %86,2. Literatürün tam-destekli en iyileri BR1-BR7 ortalamasında: CLTRS-packing %94,2; mp-BRKGA %94,53; ID-GLTS ve BSG-VCS BR1'de sırasıyla %94,40 ve %94,74 (BSG-VCS ScienceDirect S2192437625000160'ta "3D-SKP için state-of-the-art yöntemi temsil eder" ifadesiyle en iyi olarak anılır). Ama bu sonuçlar instance başına ~240–320 s (CLTRS: 60 s + 180 s aşamalı, ~320 s ortalama CPU, 2,6 GHz Intel) mertebesinde sürelerle alınmıştır. Yani ~%6-8 puanlık farkın büyük kısmı **süre bütçesi farkıdır**, yerleştirici kalitesi değil.

**2. Tam-destek kısıtının maliyeti BR1-BR7'de küçüktür (~0,8 puan).** Fanslau & Bortfeldt aynı algoritmayı C2'li (packing) ve C2'siz (cutting) çalıştırdığında BR1-BR7 farkı sınıf başına BR1'de 0,54 → BR7'de 1,04 puan, ortalama ~0,8 puan (cutting %95,0 → packing %94,2). Tüm BR0-BR15'te bu maliyet ~2 puana, BR15'te yazarların ifadesiyle "neredeyse 5 puana" çıkar. **Sonuç: sizin sabit %80 / gerçekte ~%99 destek koşulunuz BR1-BR7'deki kaybınızın kaynağı DEĞİL.** Kayıp arama/yerleştirmededir.

**3. Zayıf heterojen sette kazanç arama şemasındadır, blok zenginliğinde değil.** Fanslau & Bortfeldt (db426, verbatim): *"For the test cases BR1 to BR7 the CLTRS now achieves a mean capacity utilization of 94.7% (cutting variant) right away in the first search stage (simple blocks only)"* — jeneralize (iç boşluklu) bloklarla bu ancak %95,0'e çıkar. Aynı kaynakta karşılaştırma yöntemleri olan saf Tabu Search %92,7 ve SA/TS hibriti %93,2 kalır; asıl sıçramayı getiren CLTRS'nin **partition-controlled tree search** şemasıdır. Bu, sizin "bileşik blok statik +2,87 ama GRASP'ta ±0" bulgunuzu açıklar: arama zaten basit-blok optimumuna yakınsıyor; blok zenginliği marjinal, ileri-görüşlü arama belirleyici.

**4. Altı öğe çerçevesi (Zhu, Oon, Lim, Weng 2012) ve hangi öğe kazandırıyor.** K1 boş uzay temsili, K2 blok üretimi, K3 boşluk sıralama, K4 kutu sıralama, K5 yerleştirme kuralı, K6 genel arama stratejisi. Yazarların G2LA'sı (greedy 2-step lookahead) — verbatim: *"our approach outperforms all other existing single-threaded approaches, and is comparable to the best parallel approach to the SCLP"* (1.600 instance). Farkı getiren öğe K6'dır (arama stratejisi): deterministik greedy-lookahead + maximal-space. Araya & Riff (2014) tam olarak K6'yı greedy-lookahead'ten beam search'e çevirdi — verbatim: *"the new approach outperforms all the others for each set of instances"* (16 benchmark seti).

**5. Parçalanma (4-16 boşluk, %8,6-13 ölü hava) literatürde adı konmuş bir hastalıktır.** Zhu, Zhang, Oon & Lim (2012) "space defragmentation": yerleştirilmiş kutuları kenarlara itip parçalanmış boş uzayı tek sürekli uzayda birleştirir, yeniden doldurur, sonra geri iter. Verbatim: *"our defragmentation technique alone is able to produce solutions approaching the quality of considerably more complex meta-heuristic approaches"*; ve sonraki literatür değerlendirmesinde *"Out of all these heuristics, the space-defragmentation approach of Zhu et al. (2012b) is found to perform the best."*

**6. Yönelim eşlemesi.** OR-Library thpack formatı her kutu tipi için 8 sayı verir: `tip, uzunluk + 0/1, genişlik + 0/1, yükseklik + 0/1, adet`. Her boyuttan sonraki 0/1 bayrağı, o boyutun **dikey (vertical) eksende durmasına izin verilip verilmediğini** gösterir (1 = izinli). Yani model "per-dimension vertical flag"tır; en fazla 3 dikey yönelim vardır. BR "011" tipi bir kutuda ilk boyut dikey olamaz → 4 geçerli yönelim. Strict/free farkınız bu bayrakların doğru eşlenmesinden doğuyor.

**7. BR8-BR15 verisi.** OR-Library'de resmî olarak yalnız thpack1-7 (Bischoff & Ratcliff 1995) vardır. BR8-BR15 (Davies & Bischoff 1999, güçlü heterojen) aynı OR-Library dizinine Nottingham'dan Sam Allen katkısıyla **br.zip** olarak eklenmiştir.

## Details

### (a) 2 saniyelik konumunuz — sayılarla
| Yöntem | Kısıt | BR1-BR7 ort. | Süre / instance | Kaynak |
|---|---|---|---|---|
| Cargo Pilot (siz) | strict (≈tam destek) | **%86,2** | **2 s** (8 s'de doyum) | ölçümünüz |
| Cargo Pilot free | yönelim gevşek | %88,3 | 2 s | ölçümünüz |
| Duvar örücü statik | strict | %80,1 | ~anlık | ölçümünüz |
| CLTRS packing | tam destek (C2) | %94,2 | ~320 s (60+180 s aşamalı), 2,6 GHz | Fanslau & Bortfeldt 2010 (db426) |
| CLTRS cutting | destek yok | %95,0 | ~319 s | aynı |
| CLTRS cutting, yalnız basit blok | destek yok | %94,7 | aşama-1 | aynı |
| Tabu Search (kıyas) | — | %92,7 | — | db426 |
| SA/TS hibrit (kıyas) | — | %93,2 | — | db426 |
| mp-BRKGA | tam destek | %94,53 (BR1 94,34; BR2 94,88; BR3 95,05; BR4 94,75; BR5 94,58; BR6 94,38; BR7 93,74) | 2,66 GHz Xeon Quad, C++ | Gonçalves & Resende 2012, C&OR 39(2):179-190 |
| ID-GLTS | tam destek | BR1 %94,40 / BR2 %94,85 | 2,27 GHz Xeon E5520, Java | Zhu & Lim 2012 |
| BSG-VCS | tam destek | BR1 %94,74 / BR2 %95,38 ("en iyi") | 2,2 GHz | Araya/Guerrero/Nuñez 2017 |
| QMCTS | — | en iyiden +~0,1 puan iddiası | ~60 s, i7, C++ | Springer 2018 |

Yorum: Ham fark ~%8 puan görünse de literatür bunu ~120-160 kat daha fazla sürede alıyor. **2 s bütçede %86 saygın bir taban; %90+ hedefi 2 s'de yalnızca arama paradigmasını değiştirerek gerçekçi olur** — mevcut random-key sıra araması bu bütçede zaten doymuş.

### (b) Öncelik sıralı öneriler

**Öneri 1 — Blok-yerleştirme greedy-lookahead / beam search (K6 değişimi). [En yüksek öncelik]**
- *Mekanizma:* Arama uzayını "kutu sırası" (2N+4 kromozom) yerine "her adımda hangi boşluğa hangi blok yerleşsin" karar ağacı yap. Her düğümde birkaç aday blok-boşluk çifti üret, her birini bir greedy tamamlamayla değerlendir (G2LA'daki 2-adım lookahead; Zhu-Oon-Lim-Weng 2012), en iyi ışın-genişliği (beam width) kadarını tut (Araya & Riff 2014 bsg). Değerlendirme fonksiyonu olarak VCS'i (Araya/Guerrero/Nuñez 2017) kullan: blok hacmi + komşu bloklarla temas yüzeyi + boş uzayda oluşacak israf + bloktaki kutu sayısı.
- *Neden doygunluğu kırar:* Sıra araması, decoder'ın kör noktalarını (duvar derinliği kuralının tekrarlı desenle uyumsuzluğu) aşamaz; her "iyi sıra" aynı yerleştirici davranışına çarpar. Karar-tabanlı arama doğrudan yerleştirme kombinatoriğini keşfeder — sizin "kalan ~6 puan arama uzayının kendisinde" teşhisinizin literatürdeki karşılığı budur.
- *Duvar disiplini nasıl korunur:* Beam'i "aktif duvar" kısıtıyla çalıştır — yalnız o anki duvar diliminin (z-frontier) boşluklarına blok koymaya izin ver; duvar dolunca bir sonraki z'ye geç. Blok = kapıdan içeri yerleşen katı birim olduğu için kapıdan-içeri yüklenebilirlik korunur. Bu, Pisinger 2002 / Liu et al. 2014 HBTS'in "wall-building üzerinde ikili ağaç araması" çizgisidir; HBTS **C#'ta yazılmış olduğu için .NET'e doğrudan uyarlanabilir bir örnektir.**
- *Beklenen kazanç:* Greedy-lookahead + beam, aynı blok setiyle CLTRS/BSG'yi %94 bandına taşıyan bileşendir. 2 s bütçenizde tam %94 beklenmez; ışın genişliği küçük tutulup (ör. b=2-4, derinlik 1-2) %90-92 bandı gerçekçi hedeftir (**varsayım — bütçe kısıtlı beam için doğrudan yayınlanmış 2 s eğrisi yok; küçük b ile G2LA'nın hızlı olduğu Zhu-Oon-Lim-Weng'de belirtiliyor**).
- *Karmaşıklık / süre:* Orta-yüksek. Beam genişliği ve lookahead derinliği doğrudan süre knob'larıdır; 2 s'ye ayarlanabilir. Risk: değerlendirme fonksiyonu iyi ayarlanmazsa greedy'nin altına düşebilir — VCS'i referans al.

**Öneri 2 — Space defragmentation + yeniden doldurma (parçalanma ilacı). [Yüksek öncelik]**
- *Mekanizma:* Zhu, Zhang, Oon & Lim (2012). Duvar tamamlandığında kalan 4-16 parçalanmış boşluğu, yerleştirilmiş kutuları kenara/tavana iterek tek sürekli uzayda birleştir; bu uzaya yeni kutu(lar) yerleştir; sonra kutuları geri it (tam-destek gerekiyorsa "boş uzay birleştirme" prosedürü — Gonçalves & Resende'de de var).
- *Neden sizin sorununuzu çözer:* Sizde iç boşluk zaten düşük (%0,1-0,9); asıl kayıp %8,6-13 ölü hava + parçalanma. Defragmentation tam bu kaybı hedefler ve tek başına "çok daha karmaşık metasezgisellerin kalitesine yaklaşır" (yazarların verbatim ifadesi).
- *Duvar disiplini:* İtme yönünü z-ekseni (kapı) yönünde kısıtla; kutular kapıya doğru değil duvar içine/tavana itilirse yüklenebilirlik bozulmaz.
- *Beklenen kazanç:* Parçalanma profiliniz yüksek olduğundan +1-3 puan **varsayım (BR bağlamında birebir puanlanmamış, ama parçalanma profiliniz buna uygun).**
- *Karmaşıklık:* Orta. Reddettiğiniz "amalgamation (%0 birleştirilebilir)" bundan farklıdır: amalgamation boşlukları pasif birleştirir; defragmentation kutuları fiziksel iter — asıl mekanizma budur.

**Öneri 3 — BR1/az-tipli için duvar yüzünü 2B pallet-loading olarak tam kapla. [Yüksek öncelik, BR1'e özel]**
- *Mekanizma:* Duvar kesiti (W×H yüzü) tek tip dikdörtgenlerle doldurma = manufacturer's pallet loading. Morabito & Morales'in (1998, JORS 49(8)) özyinelemeli prosedürü / G4-G5 blok yapıları (Scheithauer & Terno; Lim, Ma, Xu, Zhang 2012) instance'ların ~%99'unda optimal 2B desen bulur. Duvar derinliğini "en tekrarlı kutunun bir boyutuna" kilitle, kalan yüzü G4/G5 deseniyle tam kapla. Basit blok üretimini "aynı tip, aynı yönelim, a×b dizisi" (simpleBlocks) ile duvar yüzüne yay.
- *Neden BR1'de kazandırır:* BR1 (3 tip) sette literatür kolayca %94'e çıkıyor çünkü duvar/kesit neredeyse mükemmel döşenebiliyor. Sizin duvar örücünüz kesitin tamamına yayılmayan kule/blok ürettiğinde kenar şeritleri boş kalıyor → parçalanma. G4/G5 tam-kaplama bunu giderir.
- *Duvar disiplini:* Zaten duvar içi — birebir uyumlu.
- *Beklenen kazanç:* BR1'i %84,7'den %90+'a çekmek en yüksek potansiyelli tekil kazanç; literatürde BR1 %94,3-94,7. Karmaşıklık: Orta (2B PLP çözücüsü gerekir; açık uygulamalar var).

**Öneri 4 — GRASP'ı reactive + path relinking + elite havuzu ile derinleştir (paradigma değişmeden ara kademe). [Orta öncelik]**
- *Mekanizma:* Reactive GRASP (α'yı çözüm kalitesine göre uyarla; Alonso/Alvarez-Valdes/Tamarit/Parreño 2014 CLP'de load-bearing ile reactive GRASP kullandı), elit havuz + path relinking (Resende & Ribeiro; Alvarez-Valdes/Parreño/Tamarit 2013 3B bin packing'de GRASP/PR). Iterated Local Search (perturbasyon + yeniden yerel arama) ve ruin-and-recreate / LNS (Schrimpf) placement üzerinde.
- *Neden:* "Tohum çeşitlendirme, en iyiden yeniden başlatma"yı denemişsiniz; path relinking bunlardan farklı olarak elit çözümler arasında yön izleyerek yeni bölgeler bulur.
- *Uyarı:* Sıra araması doymuşsa bunlar tavanı ~1-2 puandan fazla kaldırmaz **(varsayım — sizin doygunluk gözleminiz bunu ima ediyor)**; Öneri 1'in yerine değil, ona köprü olarak görün.

**Öneri 5 — VNS iyileştirme komşulukları post-optimizasyon olarak (Parreño 2010). [Orta öncelik]**
- *Mekanizma:* Parreño, Alvarez-Valdes, Oliveira & Tamarit (2010): fiziksel yerleşim üzerinde 5 hareket (blok ekleme/silme temelli insertion-deletion). Tam plan kurulduktan sonra bir bölgeyi boşalt-yeniden doldur.
- *Neden:* VNS, GRASP/maximal-space tabanını tüm rakipleri geçecek şekilde iyileştirmiştir (raporlanan "ortalama >%10 avantaj" ama uzun sürede). Sizde 2 s'lik son ~0,5 s'yi buna ayır.
- *Süre:* Ayarlanabilir; komşuluk sayısını 2 s'ye göre kırp.

**Öneri 6 — (Deneysel) LLM/DRL heuristik keşfi. [Düşük öncelik / araştırma]**
- GECCO 2025 "Accelerating LLM-Based Algorithm Evolution for the 3D Container Loading Problem" (DOI 10.1145/3795095.3805178): keşfedilen sezgisellerin "insan-tasarımı SOTA ile eşleştiği ve benzer algoritmaları yeniden keşfettiği" raporlanıyor. ReEvo (NeurIPS 2024, arXiv 2402.01145) genel çerçeve. MCTS için Edelkamp/Gath/Rohde 2014 ve QMCTS (BR1-BR7'de en iyiden +~0,1 puan iddiası, ~60 s) var.
- *Uyarı:* Bunlar üretim için değil, K3/K4/K5 sıralama-değerlendirme fonksiyonlarınızı offline keşfetmek için. Kazanç kanıtı BR bağlamında dolaylı — **varsayım.**

### (c) BR1'de kaçırdığınızın en olası nedenleri + teşhis
1. **Duvar derinliği tekrarlı desenle uyumsuz:** decoder'ın duvar derinliği kuralı BR1'in az tipinin ideal duvar kalınlığını seçemiyor olabilir. *Teşhis:* Her duvar için "seçilen derinlik" ile "o duvardaki baskın kutunun boyutları"nı logla; derinlik baskın kutunun tam katı değilse kenar şeridi oluşur.
2. **Kule/blok kesitin tamamına yayılmıyor:** *Teşhis:* Her duvar yüzünde (W×H) kaplanan alan oranını ölç; BR1'de <%95 ise 2B kaplama sorunu doğrulanır. "Kalan boşluk sayısı"nı duvar bazında ayrıştır — parçalanma duvar-içi (kesit) mi yoksa duvar-arası (derinlik uyumsuzluğu) mı?
3. **Defter parçalanması:** *Teşhis:* Ölü havanın (%8,6-13) ne kadarı tavanda ne kadarı kenar şeritlerinde — histogram çıkar. Tavandaysa son duvarın yüksekliği tam bölünmüyor; kenardaysa 2B kaplama.
4. **Doygunluk teşhisi (kritik):** Aynı BR1 instance'ında GRASP'a 2 s yerine 60 s ver; skor ~aynı kalıyorsa (8 s doyum gözleminiz) sorun kesin arama uzayında, yerleştiricide değil → Öneri 1'i doğrular. "Statik +2,87 bileşik blok, GRASP'ta ±0" farkını BR1'de tek tek ölç.

### (d) Yönelim eşlemesi cevabı (net)
- thpack1-7 formatında her kutu satırı: `tip, L, fL, W, fW, H, fH, adet`. `fL/fW/fH ∈ {0,1}` ilgili boyutun **dikey durmasına izin** bayrağıdır (1=izinli, 0=yasak).
- Uygula: bir yönelim geçerlidir ⇔ dikeye gelen boyutun bayrağı 1. En fazla 3 dikey yönelim (her izinli boyut için), her biri taban düzleminde 2 dönüşle → en fazla 6 yönelim; kısıtlı tiplerde daha az. Bu tam olarak literatürdeki **C3 orientation constraint**'tir (Fanslau & Bortfeldt; Bortfeldt & Wäscher 2013).
- Strict/free belirsizliğiniz: **strict doğru olandır.** free'niz bayrağı 0 olan dikey yönelimleri de deniyorsa fiziksel olarak yasak (devrilir) yerleşimleri sayıyor demektir; ~2 puanlık fark bu yüzden yapay. Kıyası daima strict üzerinden yap. Öneri: [N+4, 2N+4) yönelim genlerini kutu tipinin izin bayrağıyla maskele — yasak yönelim seçilirse en yakın izinliye yansıt. Bu, "yönelim kısıtı eşleme belirsizliğini" ortadan kaldırır.

### (e) BR8-BR15 verisi nerede
- **thpack1-7:** OR-Library, `https://people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html` → dosyalar: `https://people.brunel.ac.uk/~mastjjb/jeb/orlib/files` (thpack1..thpack7). Format: her kutu tipi satırında dikey-izin bayraklı 8 sayı.
- **BR8-BR15 (Davies & Bischoff 1999, güçlü heterojen):** aynı OR-Library dizinindeki **br.zip** dosyası — Sam Allen (Nottingham) tarafından orijinal üretim prosedürüyle yeniden üretilmiş; ilk 7 seti thpack1-7 ile aynı, 8-15 dahil. Üretici kaynak kodu Nottingham'da (`www.cs.nott.ac.uk/~sda`). (Dikkat: **thpack8/thpack9 BR8-15 DEĞİLDİR** — sırasıyla Loh & Nee tek konteyner ve Ivancic çoklu konteyner problemleridir.)

### (f) Makale ve repo listesi (linklerle)
**Anahtar makaleler:**
- Bischoff & Ratcliff (1995), "Issues in the development of approaches to container loading", Omega 23(4):377-390 — BR1-7 kaynağı.
- Davies & Bischoff (1999), "Weight distribution considerations in container loading", EJOR 114:509-527 — BR8-15 kaynağı.
- Pisinger (2002), "Heuristics for the container loading problem", EJOR 141(2):382-392 — wall-building tree search (layer→strip→knapsack).
- Parreño, Alvarez-Valdes, Tamarit & Oliveira (2008), "A maximal-space algorithm for the CLP", INFORMS JoC 20(3):412-422. `https://pubsonline.informs.org/doi/10.1287/ijoc.1070.0254`
- Parreño, Alvarez-Valdes, Oliveira & Tamarit (2010), "Neighborhood structures for the CLP: a VNS implementation", J. Heuristics 16(1):1-22. `https://link.springer.com/article/10.1007/s10732-008-9081-3`
- Fanslau & Bortfeldt (2010), "A tree search algorithm for solving the CLP", INFORMS JoC 22(2):222-235 (DOI 10.1287/ijoc.1090.0338); ücretsiz ön-baskı: `https://www.fernuni-hagen.de/wirtschaftswissenschaft/forschung/download/beitraege/db426.pdf`
- Zhu & Lim (2012), "A new iterative-doubling Greedy–Lookahead algorithm for the SCLP", EJOR 222:408-417. `https://www.sciencedirect.com/science/article/abs/pii/S0377221712003529`
- Zhu, Zhang, Oon & Lim (2012), "Space defragmentation for packing problems", EJOR 222(3):452-463 (DOI 10.1016/j.ejor.2012.05.031).
- Zhu, Oon, Lim & Weng (2012), "The six elements to block-building approaches for the SCLP", Applied Intelligence 37:431-445 (DOI 10.1007/s10489-012-0337-0). `https://link.springer.com/article/10.1007/s10489-012-0337-0`
- Gonçalves & Resende (2012), "A parallel multi-population BRKGA for a CLP", C&OR 39(2):179-190.
- Zhang, Peng & Leung (2012), "A heuristic block-loading algorithm based on multi-layer search", C&OR 39:2267-2276.
- Araya & Riff (2014), "A beam search approach to the CLP", C&OR 43:100-107 (DOI 10.1016/j.cor.2013.09.003).
- Araya, Guerrero & Nuñez (2017), "VCS: a new heuristic function for selecting boxes in the SCLP", C&OR 82:27-35 (DOI 10.1016/j.cor.2017.01.002).
- He & Huang (2011) / Huang & He (2009), caving degree ve fit degree (FDA) — güçlü heterojen.
- Liu, Tan, Xu & Liu (2014), "A tree search algorithm for the CLP" (HBTS, wall-building binary tree, **C#**), C&IE 75:20-30. `https://www.sciencedirect.com/science/article/abs/pii/S0360835214001776`
- Morabito & Morales (1998), "A simple and effective recursive procedure for the manufacturer's pallet loading problem", JORS 49(8) — G4/G5 duvar kaplama.
- Bortfeldt & Wäscher (2013), "Constraints in container loading – A state-of-the-art review", EJOR 229(1):1-20.
- Zhao et al. (2016), "A comparative review of 3D container loading algorithms", ITOR. `https://onlinelibrary.wiley.com/doi/10.1111/itor.12094`
- Saraiva, Nepomuceno & Pinheiro (2019), "A Two-Phase Approach for Single Container Loading with Weakly Heterogeneous Boxes", Algorithms 12(4):67 — BR1/BR2'de per-instance SOTA tablosu. `https://www.mdpi.com/1999-4893/12/4/67`
- GECCO 2025, "Accelerating LLM-Based Algorithm Evolution for the 3D CLP" (DOI 10.1145/3795095.3805178); ReEvo (arXiv 2402.01145).

**Depolar (.NET'e uyarlanabilirlik notlu):**
- `github.com/davidmchapman/3DContainerPacking` (C#, EB-AFIT) — doğrudan .NET; ama basit sezgisel, blok/beam yok. En kolay entegrasyon tabanı.
- `github.com/OliverYangMin/3D-loading-problem-bin-packing` (maximal-space + GRASP/VND, Parreño çizgisi) — algoritma referansı.
- `github.com/rilianx/Metasolver` (Araya bsg / bo-bsg beam search) — BSG'nin resmî uygulaması; C++, mantık .NET'e taşınabilir.
- `github.com/Yzhjdj/BSNA` (beam search + blok, arXiv 2503.08705) — blok+beam iskeleti temiz.
- `github.com/ai4co/reevo` (LLM hyper-heuristic; offline heuristik keşfi için).

## Recommendations
Aşamalı ve ölçütlü:

1. **Önce teşhis (1-2 gün):** (c)'deki dört ölçümü koş — özellikle "60 s'de skor değişmiyor mu?" ve "duvar yüzü kaplama oranı BR1'de <%95 mi?". Eşik: 60 s'de +<0,3 puan ise doygunluk kesin → paradigma değişimine geç. Duvar yüzü kaplama <%95 ise Öneri 3'ü öne al.
2. **Sonra en yüksek kaldıraç (2-4 hafta):** Öneri 1 (blok-yerleştirme greedy-lookahead/beam, aktif-duvar kısıtlı) + değerlendirmede VCS. Küçük ışın (b=2-4), lookahead derinliği 1-2 ile 2 s'ye ayarla. Benchmark: strict %90 eşiğini geçmek.
3. **Paralel olarak (1-2 hafta):** Öneri 3 (BR1 duvar yüzü G4/G5 tam kaplama) — BR1'i %90+'a çekmek tek başına küme ortalamanızı belirgin yükseltir.
4. **İnce ayar (1 hafta):** Öneri 2 (space defragmentation) son duvar/tavan ölü havasını kırpmak için; Öneri 5 (VNS) son ~0,5 s post-optimizasyon.
5. **Yönelim düzeltmesi (hemen, 1 gün):** (d) — yönelim genlerini izin bayrağıyla maskele; strict'i tek resmî metrik yap. Bu, "eşleme belirsizliğini" kapatır ve %88,3 free'yi rafa kaldırır.

**Ölçütler / eşik değiştiriciler:** (i) 60 s'de skor >+0,5 puan artıyorsa doygunluk teşhisi yanlıştır — GRASP'ta kalıp Öneri 4'e ağırlık ver. (ii) Beam BR1'de greedy'nin altına düşerse değerlendirme fonksiyonunu (VCS ağırlıkları) yeniden ayarla, ışın genişliğini kör artırma. (iii) Defragmentation itme yönü kapıya doğru gerekiyorsa (yüklenebilirlik bozuluyorsa) o hamleyi devre dışı bırak.

## Caveats
- **Süre kıyası eşit değil:** Literatürün %94-95'i ~240-320 s/instance ile alınmıştır; sizin 2 s'nizle doğrudan kıyaslanamaz. %90+ hedefi 2 s'de gerçekçi, ama %94 muhtemelen değil — bunu paydaşlara net söyleyin.
- **~500 s cap doğrulanmadı:** ID-GLTS/BSG-VCS için tam per-instance süre sınırını orijinal (paywall) makalelerden teyit edin; CLTRS için ~240-320 s kesindir.
- **2 s'de beam'in tam puanı için yayınlanmış eğri yok:** Öneri 1'in %90-92 tahmini varsayımdır; küçük bütçe-beam davranışını kendi verinizle kalibre edin.
- **Defragmentation ve VNS'in BR puan kazancı** birebir BR1-BR7'de puanlanmamıştır (bin packing bağlamında güçlü kanıt var); parçalanma profilinize (%8,6-13 ölü hava, 4-16 boşluk) uygunluğu güçlü ama sayısal kazanç varsayımdır.
- **LLM/DRL** kanıtları BR bağlamında dolaylıdır; üretim yol haritasına koymayın, offline araştırma olarak tutun.
- **br.zip içeriğini** indirip ilk 7 setin thpack1-7 ile birebir olduğunu doğrulayın (Sam Allen yeniden-üretimi orijinal prosedürle aynı ama seed farkları olabilir).
- **mp-BRKGA per-class değerleri** ikincil bir karşılaştırma tablosundan alınmıştır (BR1-BR5 sizin elinizdekilerle birebir eşleşti; BR6=94,38, BR7=93,74 yeni doğrulandı); orijinal C&OR 2012 makalesiyle son teyidi yapın.