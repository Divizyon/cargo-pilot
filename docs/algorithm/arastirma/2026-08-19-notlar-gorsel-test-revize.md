# Cargo Pilot — Kısmi Yük Rejimi ve Önizleme Sorunları: Literatür Temelli Teşhis ve Öncelikli Çözüm Önerileri

## TL;DR
- Dört sorunun ortak kökü tek: amaç fonksiyonunuz **hacim maksimizasyonu** (Wäscher tipolojisinde *knapsack/SKP* sınıfı), ama üretim planlarınızın çoğu **yük araca sığıyor** rejiminde; bu rejim aslında **Açık Boyut Problemi (3D Strip Packing / ODRPP)** — "kullanılan uzunluğu minimize et". Yanlış problem sınıfını optimize ettiğiniz için doluluk kör kalıyor (G-2, G-4), kesit kötü bölünüyor (G-3) ve önizleme motoru baypas ediyor (G-1).
- Önerilen ana çözüm: taşan-yük rejimini (BR1–BR7, %90,54) **hiç bozmadan**, kısmi rejimde devreye giren **leksikografik amaç** — "önce yerleşen hacim, eşitse kullanılan uzunluğu (z-erişimi) minimize et" — ve `DepthSlack`'i bedelsiz gevşeme yerine **referans-uzunluk + bisection** (Wei-Oon-Zhu-Lim 2012; Bortfeldt & Mack 2007) mekanizmasına çevirmek. G-3 için VCS'nin zaten içerdiği knapsack tabanlı `L(b)` kayıp terimini kesit/şerit genişliği seçimine taşımak (Pisinger 2002 strip-width-by-knapsack).
- G-1 için endüstri standardı yaklaşım nettir: **artımlı motor çağrısı** ("lock items + re-pack remaining") — EasyCargo, 3DPACK.ING ve CargoLoader3D bu davranışı sunuyor; frontend'in kendi paketleyicisini kullanması hatalı. Motordaki `Run(..., PlacementState start)` bunu zaten mümkün kılıyor; sadece uç nokta ve kapı paylaşımı eksik.

## Key Findings

**1. Teşhis doğrulaması — dört sorun tek bir problem-sınıfı uyumsuzluğunun belirtisi.** Wäscher, Haußner & Schumann (2007) tipolojisi (EJOR 183:1109–1130) C&P problemlerini ayırır: sizin optimize ettiğiniz **Single Knapsack Problem (SKP)** — sabit konteynere sığan alt-kümenin hacmini maksimize et — ile **Open Dimension Problem (ODP)** — tüm parçaları yerleştir, kullanılan boyutu (uzunluğu) minimize et. Pisinger (2002, EJOR 141:382–392) aynı ayrımı yapar: "strip packing, knapsack container loading, bin-packing, multi-container". BR1–BR15 korpusu bir SKP/knapsack korpusudur (yük hep taşar, doluluk = yerleşen/araç hacmi). Üretimde yük sığdığında problem sınıfı **3D Strip Packing (3D-SPP)**'e döner: amaç artık hacim değil, **kullanılan uzunluk**. Amaç fonksiyonunuz sınıf değiştirmediği için G-2/G-3/G-4 kaçınılmaz. Bu, tahmin değil, literatürdeki iki ayrı problem sınıfının tanımıdır.

**2. G-2 (yeni duvar açma) teşhisi doğru ve literatürde adı var: "compactness eksikliği".** Container-loading derlemesi (Bortfeldt & Wäscher; OvGU çalışma raporu FEMM 2012/07) şunu net söyler — birebir alıntı: "Authors argue that stability becomes an immediate consequence of the corresponding load compactness when high container space utilization can be guaranteed (Pisinger 2002, p. 383; Parreño et al. 2008, p. 413)". Yani kompaktlık, yalnızca **hacim maksimizasyonu (taşan yük)** rejiminde doluluğun bir yan-ürünü olarak "bedava" gelir. Sığan-yük rejiminde doluluk sabittir → kompaktlık ödülü kaybolur → motor kayıtsız kalır. Sizin "amaç yerleşimin NEREDE olduğuna kör" teşhisiniz literatürle birebir örtüşür.

**3. G-4 (yayılma) için doğru mekanizma referans-uzunluk + bisection'dır, bedelsiz gevşeme değil.** Wei, Oon, Zhu & Lim (2012, EJOR 220:37–47) "A reference length approach for the 3D strip packing problem": paketleme bir **referans uzunluğa** kadar yapılır, sonra bu hedef küçültülerek yinelenir. Yazarların özeti — birebir: "the results show that our approach produces better solutions on average than all other approaches in literature for the majority of these data sets using comparable computation time." Bortfeldt & Mack (2007, EJOR 183:1267–1279) "descending container lengths" ile azalan hedef uzunlukta CLP örnekleri çözer ve önceki en iyi çözümün parçalarını yeniden kullanır — "kapalı konteyner" (hedef uzunluk sabitlenmiş) yaklaşımının açık konteynerden **belirgin biçimde daha başarılı** olduğunu raporlar. Wei et al. (2011, EJOR 215:337–346) 2D için **"Iterative Doubling Binary Search (IDBS)"**: uzunluk üzerinde ikili arama; olurlu ise küçült. Sizin `DepthSlack`'iniz doğru sezgi (hedef derinlik) ama yanlış uygulama: gevşeme amaç fonksiyonunda bedelsiz. Literatürdeki karşılığı, gevşemeyi bir **sert/yumuşak uzunluk kısıtı + fizibilite kontrolü** haline getirmek.

**4. G-3 (kesit kombinasyonu) için çözüm sizin motorunuzda zaten var ama yanlış yerde: VCS'nin `L(b)` knapsack terimi.** Araya & Riff (2014) / VCS (Araya, Guerrero & Nuñez 2017) heuristiğinin `L(b)` terimi (Metasolver repo, VPD fonksiyonu) tam olarak sizin ihtiyacınız olan şeyi hesaplar — README birebir: "L(b) estimates the wasted volume in the residual space of the selected free space cuboid. The estimation takes into account that the maximum usable space in each direction of the residual space must be a **linear combination of the dimensions of the remaining boxes**. The problem is modeled as a **knapsack problem** and solved with a standard algorithm in pseudo-polynomial time." Formül (Wen & Zhang 2025, arXiv:2503.08705 §4.4, Araya'yı replike ederek): `V_loss(b,s) = V(s) − (l(b)+l_max)·(w(b)+w_max)·(h(b)+h_max)` — burada `l_max`, artık uzunluğa (`l(s)−l(b)`) sığan, kalan kutu uzunluklarının en büyük subset-sum'ıdır. Bu tam olarak "73 cm'lik şeride 55 koy 18 ölü kalsın mı, yoksa 43+25 mı" kararıdır. Sizin `UnusableResidual`'ınız yalnızca `l_max=0` (hiç kutu girmez) halini yakalıyor; `L(b)` ise "girer ama kötü böler" halini (0<l_max<l(s)−l(b)) sürekli bir ceza olarak niceler. Pisinger (2002) zaten şerit genişliğini/derinliğini **0-1 knapsack ile optimal** seçer — birebir: "The packing of a strip may be formulated and solved optimally as a Knapsack Problem with capacity equal to the width or height of the container. The depth of a layer as well as the thickness of each strip is decided through a branch-and-bound approach."

## Details

### Sorunların literatürdeki adları/sınıfları

| Sizin sorun | Literatür adı / sınıf | Ana referans |
|---|---|---|
| G-2: sığan yükte yeni duvar | Compactness eksikliği; SKP amaç fonksiyonunun ODP rejiminde geçersizliği | Wäscher et al. 2007; Bortfeldt & Wäscher 2013; Pisinger 2002 |
| G-4: yarım yükte yayılma | 3D Strip Packing / minimize used (open) dimension; "loaded length" | Bortfeldt & Mack 2007; Wei et al. 2012; Allen et al. 2011 |
| G-3: kesit kötü bölünüyor | Strip/wall-width selection by knapsack; wasted-space `L(b)`/`V_loss` loss term | Pisinger 2002; Araya & Riff 2014; Araya et al. 2017 |
| G-1: önizleme farklı paketleyici | Incremental repacking / re-optimization with fixed (locked) placements; "re-pack remaining" | EasyCargo, 3DPACK.ING, CargoLoader3D; USPTO 12456089/12217208 |
| `DepthSlack` | Reference length + bisection / iterative-doubling binary search | Wei et al. 2011, 2012; Bortfeldt & Mack 2007 |

### Kısmi yük rejimini ölçen literatür: 3D Strip Packing benchmark'ları BR tabanlı

Sizin kısmi-yük rejiminiz literatürde **birebir** ölçülüyor. Bortfeldt & Mack (2007) ve Allen, Burke & Kendall (2011, EJOR 209:219–227), Bischoff-Ratcliff BR1–BR15 örneklerini **3D-SPP varyantına uyarladı**: aynı kutu seti, ama amaç "kullanılan konteyner uzunluğunu minimize et". Wei et al. (2012) bu yaklaşımı iki kategori üzerinde test etti: (a) Allen et al. 2011'in de kullandığı Bischoff-Ratcliff / Davies-Bischoff SCLP-türevi setler ve (b) Bortfeldt & Mack 2007'nin ürettiği **%100-doluluk optimumu bilinen** üç set — bu ikincisi kısmi-yük optimum ölçümü için altın standarttır. Metrik: `used length / optimal (lower-bound) length` oranı; Allen et al. bunu "optimal length divided by maximum extreme y position over all the boxes" olarak hesaplar; lower bound = hacim/(kesit alanı).

### ROADEF/EURO 2022 (Renault) — "loaded length" ve kamyon-içi sıkılık

ROADEF/EURO 2022 kamyon yükleme problemi (Renault) tam olarak sizin üretim rejiminizdir. Amaç, Erasmus/J31 takımının tanımıyla birebir: "the goal is to combine a set of items into stacks and load these into trucks, as to **minimise total transportation and inventory costs**" — yani **kullanılan kamyon sayısı + erken teslim envanteri**, ki bu kamyon-içi sıkılığı ve kullanılan uzunluğu doğrudan ödüllendirir. Sonuçlar (roadef.org final): kazanan **S41 (Florian Fontan & Luc Libralesso)**, junior kazanan **J31 (Rick Willemsen & Bart van Rossum)**, ORTEC üçüncü (51 takım, 15'i finale). Fontan & Libralesso'nun imza yaklaşımı **anytime tree search + guide functions** (2018 cam-kesme galibi; HAL hal-02531037, arXiv:2004.02603) — sizin beam search + greedy tamamlama mimarinizle aynı ailedendir; "guide functions make it possible to compare nodes at different levels of the search tree". J31'in yöntemi ise "a scalable column generation heuristic... pricing problems correspond to single truck loading problems... solved using a labelling algorithm on a dynamically defined stack graph". Bilimsel ödül: Willemsen et al. "Two-phase matheuristic" (EJOR 2024, S0377221724007951), "New best solutions for the ROADEF/EURO challenge 2022".

### VCS/VPD ve sizin motorunuz

Motorunuz zaten VCS (Araya-Guerrero-Nuñez 2017) ağırlıklı çarpım kullanıyor. Metasolver'daki VPD default vektörü `theta_v = "1 0 -0.13 0.02 3.85 6.27 0.48"` (hacim maksimizasyonu; L-terimine negatif ağırlık) ve `theta_p` (kâr). VCS bileşenleri: **V**olume, **C**overed-surface (temas yüzeyi/kompaktlık), wasted-**S**pace (=`L(b)` knapsack kaybı) + bloktaki kutu sayısı. Kritik gözlem: **kompaktlık zaten VCS'nin `CS(b,θ)` teriminde var** ama tek-blok yerleşiminde ve hacim-baskın vektörle çalıştığı için sığan-yük rejiminde G-2/G-3/G-4'ü engelleyemiyor. Yani düzeltmeler mevcut fonksiyona **yeni terim eklemekten çok**, (a) sığan-yük rejiminde amaç/tie-break değiştirmek ve (b) `L(b)`'yi kesit-kombinasyon kararına da uygulamaktan geçer.

---

## Recommendations

Öncelik sırası, sizin nedensellik zincirinizi (G-3 → kutu sığmaz → G-4 derinlik gevşer → G-2 yeni duvar → yayılma) tersten, en yüksek kaldıraçla kırar.

### Öncelik 1 — Rejim-duyarlı leksikografik amaç fonksiyonu (G-2 + G-4'ün kökü)
**Mekanizma:** Amaç fonksiyonunu iki rejime ayır. Yük taşıyorsa (yerleşemeyen kutu var) → mevcut hacim maksimizasyonu (BR davranışı, DEĞİŞMEZ). Yük sığıyorsa (tüm kutular yerleşti) → **leksikografik**: (1) yerleşen hacim (zaten maksimum), (2) tie-break: kullanılan uzunluğu (max z-erişimi) minimize et, (3) tie-break: ağırlık merkezini kapıya/öne çek. Rejim tespiti ücretsizdir (yerleşemeyen kutu sayısı=0).
**Neden çözer:** G-2'de "yeni duvar açma vs cebe koyma" artık eşit-doluluk değil; cebe koyan çözüm daha küçük z-erişimi verir → kazanır. G-4'te yayılmanın amaçta bedeli oluşur.
**BR garantisi:** Taşan-yük rejiminde ikinci amaç hiç devreye girmez (kutular yerleşemez, birinci amaç ayrıştırır) → **BR1–BR7 %90,54 matematiksel olarak değişmez**. Bu, leksikografik tasarımın en güçlü yanıdır.
**Literatür kanıtı:** Lexicographic packing objectives standart (Vieira & Carvalho, multi-container open-dimension, lexicographic; OR Spectrum 2021 "bin packing with lexicographic objectives", 43 vol.). Bortfeldt & Wäscher 2013: kompaktlık ancak doluluk garanti edilemediğinde ayrı ödül gerektirir.
**Karmaşıklık:** Düşük-orta. Amaç değerlendirmesi ve beam sıralaması dokunulur; yerleştirici değişmez.
**2 sn etkisi:** İhmal edilebilir (skorlama O(1) ek terim).

### Öncelik 2 — `DepthSlack`'i referans-uzunluk + bisection'a çevir (G-4)
**Mekanizma:** Bedelsiz ×1,05→×1,10 gevşemesini kaldır. Yerine: hedef uzunluk `L0 = hacim/(G×Y)` ile başla; beam search'ü **"tüm kutular ≤ L üzerinde yerleşti mi?"** fizibilite testiyle çalıştır; olurluysa L'yi küçült (ikili arama / iterative doubling), değilse büyüt. Son çözüm en küçük olurlu L. 2 sn bütçesi içinde 3–5 bisection adımı sığar.
**Neden çözer:** Gevşeme artık "tercih" değil, aranan bir değişken; sınırsız yayılma imkânsız çünkü her L bir üst sınır.
**BR garantisi:** BR'de yük taşar → hiçbir L tüm kutuları alamaz → bisection en gevşek L'de (araç boyu) sonlanır = mevcut davranış. **Risk yok.** *(Varsayım: fizibilite testi mevcut greedy tamamlama ile yapılırsa maliyet ~1 beam koşusu; ölçülmeli.)*
**Literatür kanıtı:** Wei et al. 2012 (referans uzunluk); Bortfeldt & Mack 2007 ("kapalı konteyner belirgin biçimde daha başarılı"); Wei et al. 2011 IDBS.
**Karmaşıklık:** Orta (dış döngü + fizibilite bayrağı). **2 sn etkisi:** Bütçeyi bisection adımlarına böler; her adım kısmi beam. Anytime yapıda ilk olurlu çözüm erken bulunur.

### Öncelik 3 — `L(b)` knapsack kaybını kesit/şerit-genişliği seçimine uygula (G-3)
**Mekanizma:** Aday değerlendirmede kutu-başına `L(b)`'yi zaten hesaplıyorsanız, onu **kombinasyon kararına** genişletin: bir şeridin/cebin genişliğini seçerken, kalan kutu boyutlarının subset-sum'ıyla (Pisinger 2002 knapsack) o genişliği en iyi bölen kombinasyonu ara. Beam dallanmasını "sıradaki ürün"e ek olarak **kesit kombinasyonuna** da aç (ilk sütun/blok genişliği kesiti belirlediği için).
**Neden çözer:** 73 cm şeritte 55 (18 ölü) yerine 43+25'i `V_loss` daha düşük olduğu için seçer; "girer ama kötü böler" niceliklenir (0,82 m³ vs 1,54 m³ farkı amaçta görünür olur).
**BR garantisi:** `L(b)` zaten VCS'de var ve BR sonuçlarını üreten fonksiyonun parçası; ağırlığını artırmak/kombinasyona taşımak BR'de nötr-pozitif olmalı ama **regresyon riski gerçek** → BR1–BR15 üzerinde A/B şart. *(Varsayım: kombinasyon dallanması beam faktörünü artırır; ışın 8'de budama gerekebilir.)*
**Literatür kanıtı:** Pisinger 2002 (strip width by 0-1 knapsack, optimal); Araya & Riff 2014 / Araya et al. 2017 `L(b)`/`V_loss`; formül arXiv:2503.08705.
**Karmaşıklık:** Orta-yüksek (subset-sum DP pseudo-polinom, zaten var; dallanma değişikliği daha riskli). **2 sn etkisi:** DP ucuz; kombinasyon dallanması beam'i genişletirse maliyetli — budama ile kontrol.
**Not:** F6-3 ("duvar yüzü 2B tam kaplama") taşan-yükte reddedilmişti; yarım-yükte **ölçülmedi**. Öncelik 1+2 sonrası yeniden ölçülmesi önerilir — ama **katman (kesit-boyu yatay layer) tabanlı yerleştirme önerilmiyor** (müşteri yasağı ve ayrıca G-3 çözümü zaten kesit-içi kombinasyon, layer değil).

### Öncelik 4 — G-1: Artımlı motor çağrısı (ürün + API)
**Mekanizma:** Frontend'in basit katman-paketleyicisini önizlemeden **çıkar**. Manuel kutu eklendiğinde `Run(items_new, PlacementState start=mevcut_yerleşim)` çağıran bir **artımlı uç nokta** ekle: mevcut yerleşim sabit (locked), yalnız yeni kutular motorun tüm kapılarıyla (destek/kırılganlık/istif/LIFO) yerleşir.
**Neden en iyi seçenek:** Endüstri standardı bu. 3DPACK.ING (birebir): "Incremental loading adds items to a partly loaded container without starting over, and the drag-and-drop editor lets the plan be rearranged by hand." CargoLoader3D (birebir): "place boxes as desired, and use the **Continue** function to automatically load only the remaining unplaced items **without disturbing already positioned ones**." EasyCargo: "manual load plan editor" + re-pack. Tam yeniden optimize (2–4 sn, kullanıcının kutusunu oynatır) kullanıcı güvenini kırar; frontend'de ikinci boşluk defteri iki-motor tutarsızlığını (bugün yaşadığınız) kalıcılaştırır.
**Kapı paylaşımı:** Artımlı motor çağrısı kapıları **doğal olarak** paylaştırır (aynı motor). Anlık drag-drop geri bildirimi için motor kapılarının istemci tarafında aynalanması (paylaşılan validation) gerekiyorsa, çekirdek geometri/destek kontrollerini **WASM** olarak derleyip aynı kodu istemcide çalıştırmak tek-doğruluk-kaynağı sağlar. USPTO 12217208 & 12456089 (backtracking/re-arrangement) ve "anytime re-optimization" API tasarımını destekler.
**Karmaşıklık:** Orta (uç nokta + `PlacementState` serileştirme zaten var). **2 sn etkisi:** Artımlı çağrı yalnız yeni kutuları yerleştirdiği için **tam koşudan çok daha hızlı** (< 1 sn tipik, varsayım — profillenmeli).
**Fallback:** Artımlı çağrı yeni kutuyu yerleştiremezse (çakışma), kullanıcıya "tam yeniden optimize" seçeneği sun — anytime, iptal edilebilir. Crainic et al. Extreme-Point (EP) heuristiği bu senaryoya uygundur: "EP rule facilitates handling packing constraints such as **fixed item positions**" (CIRRELT-2007-41).

---

## Kısmi Yük Rejimi için Benchmark ve Kabul Metrikleri

**Test korpusu:** Mevcut BR tohum verinizle `--load-ratio ∈ {0.25, 0.50, 0.75, 1.0}` koşuları üretin (kutu setini araç hacminin bu oranına inecek şekilde kırpın). Ek olarak Bortfeldt & Mack 3D-SPP varyantını (BR tabanlı, %100-doluluk çözümü bilinen setler) doğrudan alın — literatür referans değerleri buradadır.

**Metrikler ve hedefler:**
| Metrik | Tanım | Kabul hedefi (öneri) | Literatür referansı |
|---|---|---|---|
| Kullanılan uzunluk oranı | used_z / (Σhacim/(G×Y)) | ≤ 1,15 (%100 yükteki mevcut değeriniz) tüm oranlarda | Allen et al. 2011; Wei et al. 2012 (3D-SPP optimal'e yakın) |
| Yayılma oranı | used_z / ideal_z | %25 yükte < 1,3 (bugün 1,7–2,0) | G-4 mevcut ölçümünüz |
| Dilim/kesit doluluğu | kullanılan uzunluk içindeki yerleşen hacim / (G×Y×used_z) | ≥ %85 | 3D-SPP util literatürü |
| Duvar sayısı | açılan duvar adedi | minimize (regresyon izleme) | — |
| BR1–BR7 doluluk | mevcut korpus | **≥ %90,54 (regresyon eşiği, düşmemeli)** | mevcut değeriniz; BSG BR1–7 ort. ≈ %92,9 (AR_BSA, üçüncü-taraf tablolama, IOP MSE 392:062149) |

**Karar eşiği:** Öncelik 1+2 sonrası %25 yük yayılma oranı < 1,3'e inmezse referans-uzunluk hedefini agresifleştir (L0 payını 1,05→1,02). BR1–BR7 %90,54'ün altına düşerse leksikografik rejim-tespiti sızıntısı vardır (taşan yükte ikinci amaç devreye giriyordur) → rejim koşulunu sıkılaştır.

---

## Repo ve Makale Listesi

**Makaleler (öncelik sırasına göre):**
- Wäscher, Haußner & Schumann (2007), "An improved typology of cutting and packing problems", EJOR 183(3):1109–1130. https://doi.org/10.1016/j.ejor.2005.12.047 (açık PDF: mansci.ovgu.de)
- Wei, Oon, Zhu & Lim (2012), "A reference length approach for the 3D strip packing problem", EJOR 220(1):37–47. https://doi.org/10.1016/j.ejor.2012.01.039
- Bortfeldt & Mack (2007), "A heuristic for the three-dimensional strip packing problem", EJOR 183(3):1267–1279.
- Allen, Burke & Kendall (2011), "A hybrid placement strategy for the 3D strip packing problem", EJOR 209(3):219–227. PDF: graham-kendall.com/papers/abk2011.pdf
- Pisinger (2002), "Heuristics for the container loading problem", EJOR 141(2):382–392.
- Araya & Riff (2014), "A beam search approach to the container loading problem", C&OR 43:100–107.
- Araya, Guerrero & Nuñez (2017), "VCS: A new heuristic function for selecting boxes...", C&OR 82:27–35.
- Wei et al. (2011), "A skyline heuristic for the 2D rectangular packing and strip packing problems" (IDBS), EJOR 215(2):337–346.
- Bortfeldt & Wäscher (2013), "Constraints in container loading – A state-of-the-art review", EJOR 229(1):1–20.
- Willemsen, van Rossum et al. (2024), "Two-phase matheuristic for assignment and truck loading problems" (ROADEF 2022 bilimsel ödül), EJOR. https://doi.org/10.1016/j.ejor.2024.09.045
- Fontan & Libralesso (2020/2021), anytime tree search — HAL hal-02531037; arXiv:2004.02603.
- Wen & Zhang (2025), `V_loss` formülü kaynağı, arXiv:2503.08705 §4.4.

**Repolar (C#/Java tercihli):**
- `rilianx/Metasolver` (C++): BSG/VCS/VPD referans implementasyonu, `L(b)` knapsack kaybı, BR benchmark'ları. https://github.com/rilianx/Metasolver
- `davidmchapman/3DContainerPacking` (C#): EB-AFIT algoritması, tam rotasyon; artımlı/kilitli yerleşim uyarlaması için taban.
- `303248153/Sharp3DBinPacking` (C#): 3D bin packing.
- `fontanf/packingsolver` ekosistemi + `fontanf/roadef2018`: anytime tree search, strip packing dahil çok sayıda C&P varyantı.
- `renault-iaa/challenge-roadef-2022`: problem tanımı, kurallar, checker (loaded-length/maliyet amacı).
- CIRRELT-2007-41: Crainic et al. Extreme-Point (EP) tabanlı heuristik — "fixed item positions" desteği (G-1 artımlı için birebir).

## Caveats
- **Kaynak kalitesi:** VCS (Araya et al. 2017) ve Araya & Riff (2014) tam metinleri ScienceDirect'te ücretlidir; `L(b)`/`V_loss` formülü ve VCS bileşen açılımı (Volume/Covered-surface/wasted-Space) yazarların Metasolver README'si + replike eden hakemli kaynak (arXiv:2503.08705) üzerinden doğrulandı, orijinal denklemden birebir alıntı değil. VCS acronym açılımı **orta-yüksek güven** (çıkarım).
- **BR sayıları:** BSG'nin BR1–7 ortalaması ≈ %92,9 değeri üçüncü-taraf tablolama (IOP Conf. Ser. MSE 392:062149, 2018); orijinal Araya & Riff tablosuyla veya Metasolver'ın canlı sonuç sayfasıyla teyit edilmeli. Sizin %90,54'ünüz farklı kısıt setinde (tam/%80 destek) olduğundan doğrudan kıyaslanamaz.
- **Wei et al. 2012 sonuç ifadesi:** Yayınlanmış özet "the majority of these data sets" der; halk arasında dolaşan "19/20 grup" ifadesi özette geçmez — bu raporda özet ifadesi esas alınmıştır.
- **ROADEF 2022 amaç formülü:** "toplam taşıma + envanter maliyeti (kullanılan kamyon + erken teslim)" olarak doğrulandı; ağırlıkların ve kamyon-içi sıkılık teriminin tam formülü için `renault-iaa/challenge-roadef-2022/Rule_Challenge_2022.pdf` okunmalı (bu raporda birebir formül alıntılanmadı).
- **"Varsayım" işaretli kalemler:** fizibilite testinin maliyeti (Öncelik 2), kombinasyon dallanmasının beam genişlemesi (Öncelik 3) ve artımlı çağrının tipik süresi (<1 sn) — bunlar mühendislik tahminidir, sizin profilleme verinizle doğrulanmalı.
- **Katman yasağı:** Tüm öneriler kesit-boyu yatay layer tabanlı yerleştirme İÇERMEZ; G-3 çözümü duvar-içi kesit kombinasyonudur (mevcut duvar-örücü mimarinizle uyumlu), horizontal layer değil.