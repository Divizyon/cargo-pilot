# LIFO — bugünkü durum *(araştırma brifingi)*

**Geçici dosya, 20 Ağustos 2026.** Kalıcı kayıtlar `01-kurallar.md` §A6 / `R-C13`, `02-kararlar.md`
`DR-67`/`DR-68` ve `04-olcum-gunlugu.md`'dedir. Bu dosya onları **tek yerde özetler** ve dışarıya
araştırma sorusu sormak için yazılmıştır.

> **Uyarı:** bu dosyanın 20 Ağustos öğleden önceki sürümü bant (bölge) modelini anlatıyordu ve
> artık geçersizdir. Kural o gün değişti.

---

## 1. LIFO üç ayrı mekanizmadır

| # | Mekanizma | Kod | Ne yapar |
|---|---|---|---|
| **M1** | Sıralama | `ItemOrdering.ApplyCriteriaSort` | Grupları `UnloadingOrder` DESC yükler: en son inecek grup **önce** yüklenir. Yalnız `ClusterGroups` açıkken gruplar bitişik kalır (`R-C19`) |
| **M2** | Dikey istif | `PlacementValidator.ViolatesStackability` | Geç inecek kutu, erken inecek kutunun **üstüne** konamaz |
| **M3** | Çıkarılabilirlik | `PlacementValidator.ViolatesUnloadPath` | Kutu, kendi iniş sırası geldiğinde hâlâ araçta olan hiçbir kutuyu oynatmadan kapıya çıkabilmeli |

`M3` **sert kapıdır** ve üç yerde uygulanır: aday seçimi, blok yükseltme, bileşik blok.
Yol = kutunun ayak izinin `+z` yönünde süpürdüğü koridor. Kural **iki yönlüdür**.

**Gruplar uzayda iç içe geçebilir.** Bant/bölge kavramı yoktur (`DR-67`).
Boşaltma sırası atanmamış ürün **serbesttir** — ne kısıtlanır ne kısıtlar (`DR-68`).

## 2. Bugünkü sayılar

> **20 Ağu akşamı güncellendi.** Aşağıdaki tablonun ilk hâli **static** yolun sayılarını taşıyordu
> ve sistemin durumu diye okunuyordu. Kararlar üretim yolunda (beam) verilir; ikisi ayrı ayrı
> yazıldı (`DR-69`).

**Üretim yolu — beam, gerçek korpus (ROADEF dağılımı, 100 senaryo):**

| | Kısıtsız | LIFO | Maliyet |
|---|---|---|---|
| Doluluk | %91,90 | **%88,11** | **−3,79** |
| Yayılma | ×1,086 | **×1,123** | |
| %25 yük | %24,61 · ×1,161 | %24,61 · ×1,306 | ~0 |

**Kapı yolu — static (deterministik, karar için değil):**

| | Kısıtsız | LIFO | Maliyet |
|---|---|---|---|
| Gerçek korpus | %86,60 | %81,94 | −4,66 |
| BR1-BR7 | %84,48 | %76,45 | −8,03 |

Boşaltma yolu ihlali: **sıfır**, her rejimde ve her sequencer'da. Gecelik kapı
`br --constraints all` ile koruyor (referans `referans/br-wallbuilder-static-kisitli.json`,
doluluk %50,50, üç sayaç sıfır).

## 3. Denenmiş ve reddedilmiş olanlar — tekrar önerilmesin

| Deneme | Sonuç |
|---|---|
| **Eşit bölme** (bant) | 5.148 kutu çıkarılamaz hâlde; terk edildi |
| **Hacme orantılı bölme** (`R-C13`'ün eski hâli) | %82,82 · **12.487** ihlal. Bant tam hacim kadar olunca paketleme verimi (~%85) yüzünden grup kendi bandına sığmıyor |
| **Dinamik `zWall`** | Muhafız ama zayıf: grubu kısıtlamıyor, kolay senaryolarda hiçbir şey yapmıyor |
| **`DepthSlack` + LIFO** | İki kez ölçüldü (`DR-57`, `L-4`), iki kez reddedildi: bütçe yükü öne toplarken grupları üst üste bindiriyor (yarım yükte ihlal 0 → 1.774) |
| **Grupsuz = en son iner** | Gerçek korpusta −4,92 puan; müşteri "serbest" dedi (`DR-68`) |

## 4. Açık borç

- ~~**Ölü kod.**~~ **Kapandı (20 Ağu).** Bölge plumbing'i tamamen kaldırıldı:
  `ComputeGroupZones`, `IsInsideZone`, `zoneStart`/`zoneEnd`, `bestInZone` kademesi,
  `Attempt.InZone` ve `TopUp`'taki bölge kontrolü. −262 satır. Her iki kapı da bayt bayt
  aynı sonucu verdi (BR %84,26 · kısıtlı %50,44) — değişiklik davranış-nötrdü, beklendiği gibi:
  sözlük zaten boştu, dolayısıyla `IsInsideZone` her zaman `true` dönüyordu.
- **Çok katmanlı LIFO** korpusta hâlâ zayıf temsil ediliyor; `03-yol-haritasi.md` `SC-17` bunu
  tarif ediyor ama korpusa girmedi.

## 5. Araştırmaya sorulabilecek sorular

1. **LIFO'nun 5-8 puanlık maliyeti literatürde ne kadar?** Bizim kayıp gerçek korpusta −5,68.
   Multi-drop CLP yayınlarında (Junqueira vd., Ceschia & Schaerf) bu maliyet raporlanıyor mu,
   hangi mertebede?
2. **Çıkarılabilirlik kısıtını yerleştirme sırasında değil sıralamada çözen yaklaşım var mı?**
   Bizde kural bir sert kapı — aday reddediliyor. Sıra düzeyinde çözülse kayıp düşer mi?
3. **Grup başına ayrılan hacmi önceden kestirmenin bir yolu var mı?** Bant modelleri
   (eşit / orantılı) paketleme verimini hesaba katmadığı için başarısız oldu. Literatürde
   verim-farkında bir bölme var mı?
4. **Multi-drop'ta yükleme sırası ile araç rotası birlikte optimize ediliyor mu?** Bizde rota
   girdi, sıra ondan türüyor. Birlikte optimizasyonun kazancı ölçülmüş mü?
5. **Yayılma:** LIFO açıkken yük ×1,236'ya yayılıyor, kapalıyken ×1,151. Bu kaçınılmaz mı,
   yoksa yoğunlaştırma ile boşaltma sırası uzlaştırılabilir mi? (Bizde `DepthSlack` iki kez
   çakıştı ve iki kez geri alındı.)




araştırma:

# Cargo Pilot LIFO/Multi-drop Doluluk Kaybını Azaltma: Literatür ve Uygulama Raporu

## TL;DR
- **Bizim M1+M2+M3 tanımımız literatürdeki standart 3L-CVRP "sequential loading" (üstünde/önünde olmasın) kuralından DAHA SERT:** M3'ün "tam ayak izi süpürme koridoru + iki yönlü + aday/blok/bileşik blokta" uygulaması, literatürün "visibility" (görünürlük) ve "reachability" (erişilebilirlik) tanımlarının katı birleşimine denk; bu yüzden −5,68/−8,03 puanlık kaybımız literatürle tutarlı ama üst banttadır ve **gevşetme alanı vardır.**
- **Kaybı ihlal-sıfır kalarak azaltmanın kanıtlanmış yolları öncelik sırasıyla:** (1) sert kapıyı korurken beam/VCS değerlendirmesine "gelecek erişilebilirlik" cezası eklemek, (2) stack-first (önce dikey istif, sonra 2D yerleştirme) mimarisi — ROADEF/EURO 2022 Renault probleminin doğal yapısı, LIFO'yu büyük ölçüde yapısal olarak elimine eder, (3) kısıtsız paketle→LIFO'ya onar (repair/re-sequencing post-pass).
- **Bant modelinizin battığı sebep literatürce doğrulanıyor:** "separation" kısıtı literatürde yalnızca sert kısıt olarak modellenebilir ve en düşük doluluğu verir; verim-farkında bölge boyutlama literatürde standart bir yöntem DEĞİLDİR. Doğru yön bantsız (sizin gibi) + akıllı arama/onarım/mimaridir.

## Key Findings

**1. Tanım kıyası — bizimki daha sert.** Multi-drop/unloading kısıtı literatürde dört farklı biçimde tanımlanıyor. Bonet Filella, Trivella & Corman (EJOR 308:336-352, 2023, ETH Zürich / Univ. Twente) doğrudan alıntıyla: *"we identified four different specifications: (i) above constraints, (ii) visibility constraints, (iii) reachability constraints, and (iv) separation constraints. The above constraints are violated if an item of a later customer lies above (even partly) of an item of an earlier customer... The visibility constraints demand that an item is visible from the container doors when it has to be unloaded, which is a condition needed in practice to unload a box using a forklift... The reachability constraints model the ability of a worker to reach an item... which may not be possible for a box that is visible. Lastly, the separation constraints force the placement of items belonging to different customers into dedicated regions in the container that are separated by virtual walls."* Standart 3L-CVRP LIFO kuralı (Gendreau vd. 2006; Krebs, Ehmke & Koch 2021 doğrulayıcısında formüle edildiği gibi) *above + visibility* birleşimidir: "i'nin kutusu, i'den sonra hizmet edilen müşterinin kutusunun üstüne konulamaz VEYA o kutunun kapıya giden yolunu bloke edemez." Bizim M2 = above; **M3 = visibility + reachability'nin katı, iki yönlü birleşimi** → literatürün çoğundan daha sert.

**2. Doluluk maliyeti literatürde.** Martínez, Alvarez-Valdes & Parreño (2015): müşteri sayısı 1'den 50'ye çıktığında çözüm kalitesi (doluluk) zayıf heterojen BR1'de %13, güçlü heterojen BR7'de yaklaşık %30 düşüyor. Bonet Filella vd. (2023), 1500 instance'lık (Bischoff-Janetz-Ratcliff 1995 + Davies-Bischoff 1999) sette, doğrulanmış verbatim bulgu: kısıtı sert yerine yumuşak (ceza fonksiyonlu) modellemek, *"compared to: (i) the hard unloading constraints approach, by up to 12%, and (ii) a sequential approach that neglects the unloading constraints when loading boxes and assesses penalties a posteriori, by up to 15%"* daha iyi hedef değeri veriyor. Junqueira vd. (2012a): reachability parametresi katılaştıkça paketleme verimi düşüyor (nicel yüzde verilmemiş; yönlü kanıt). **Bizim −5,68 (gerçek korpus) / −8,03 (BR1-BR7) puanlık kaybımız bu aralığın içinde ama yüksek uçta.**

**3. Kaybı azaltan mekanizmalar (kanıtlı).** (a) Arama değerlendirmesine erişilebilirlik terimi: sert kapıyı korur, sadece hangi geçerli adayın seçileceğini yönlendirir — ihlal-sıfır bozulmaz. (b) Stack-first mimarisi: ROADEF 2022 Renault problemi zaten "kutuları stack'lere grupla, stack'leri kamyona yerleştir" olarak tanımlıydı. (c) Repair/soft: Bonet Filella'nın "böl-yeniden-inşa" iyileştirme fazı yüksek-cezalı bölgeleri yıkıp yeniden paketliyor.

**4. Açık kaynak.** Krebs, Ehmke & Koch (2021, OR Spectrum 43:835-875) "Advanced loading constraints for 3D vehicle routing problems" — kod ve instance'lar açık (github.com/CorinnaKrebs). Solution Validator (Krebs & Ehmke 2023) LIFO dahil kısıtları doğruluyor. ROADEF 2022 dokümanları renault-iaa/challenge-roadef-2022'de.

## Details

### (a) M1+M2+M3 vs literatür standardı — detaylı kıyas

- **M1 (UnloadingOrder DESC yükleme, gruplar bitişik):** Klasik yaklaşım. Lai, Xue & Xu (1998) konteyneri uzunlamasına dilimlere böler ve kargoyu ziyaret sırasının TERSİNE atar — sizin M1'inizle aynı mantık. Bischoff & Ratcliff (1995) "her seferinde tek müşteri yükleme" ile başlattı.
- **M2 (dikey istif kuralı):** Literatürün "above" kısıtı ile birebir aynı. Standart.
- **M3 (tam ayak izi süpürme koridoru, iki yönlü):** Bu, *visibility + reachability*'nin katı birleşimi. Standart 3L-CVRP LIFO tanımı (Krebs, Ehmke & Koch 2021 doğrulayıcısı; Mathematics 13(10):1668, 2025'te formüle edildiği gibi: *"if the destination of box i is visited before the destination of box j, item j must not be placed above item i or blocking the path from item i to the door"*) yalnız above+visibility'dir. Sizin M3'ünüz "ayak izi koridoru boyunca +z'de HİÇBİR kutu olmasın" diyor — bu, "önünde olmasın"dan daha katıdır (kutunun tüm ayak izi genişliği×yüksekliği boyunca koridoru boş ister) ve iki yönlüdür (hem yükleme hem boşaltma). **Sonuç: kural literatür standardından daha sert; gevşetme alanı var.**

Gevşetme alanı (kanıtlı):
- **Above+visibility'e indirmek** (reachability'yi bırakmak): Junqueira vd. gösterdi ki reachability katılaştıkça verim düşer; onu gevşetmek ihlal-sıfır kalırken (forklift erişimi pratik varsayımıyla) doluluğu artırabilir — ama kuralın pratik anlamını değiştirir.
- **Tek yönlü yapmak:** Çoğu literatür yalnız boşaltma yönü (kapıya doğru) kuralını uygular; iki yönlü kural genellikle gereksizdir.

### (b) Doluluk maliyetleri tablosu

| Çalışma | Kısıt tanımı | Müşteri/drop | Kısıtsız | Kısıtlı | Kayıp | Süre |
|---|---|---|---|---|---|---|
| Bischoff & Ratcliff 1995 (Omega 23:377-390) | multi-drop, stack-building, tek müşteri/seferde | belirtilmemiş | ~%81-83 (stabilite metodu) | bulunamadı | bulunamadı | — |
| Christensen & Rousøe 2009 (ITOR 16:727-743) | visibility (üst+kapı) + yük taşıma | 1,2,5,10,50 | bulunamadı | drop arttıkça düşüyor | yönlü | 60 sn limit |
| Junqueira, Morabito & Yamashita 2012a (Annals OR 199:51-75) | reachability/separation (δ param), MIP | 3 | bulunamadı | katılaştıkça düşer | nicel yok | 3600 sn |
| Martínez, Alvarez-Valdes & Parreño 2015 (Pesquisa Op. 35:1-24) | visibility/touchable/separated | 1,2,5,10,50 | 1 müşteri | 50 müşteri | BR1 %13, BR7 ~%30 düşüş | i7, ~60 sn |
| Bonet Filella, Trivella & Corman 2023 (EJOR 308:336-352) | above+visibility+reachability, soft vs hard | 1500 BR/Davies instance | soft | hard | sert kısıt soft'tan **%12'ye kadar** kötü | — |
| **Cargo Pilot (biz)** | **above+visibility+reachability, full sweep, 2-yönlü, sert** | grup bazlı | %86,60 / %84,48 | %80,92 / %76,45 | **−5,68 / −8,03** | 2 sn |

**Bizim −5,7/−8'in konumu:** Martínez'in çok-müşterili (10-50) düşüşleri (%13-30) bizden büyük görünüyor, ama onlar 1 müşteriden 50'ye giderken ölçüyor; bizim gruplarımız uzayda iç içe geçebildiği ve gerçek korpusta grup sayısı sınırlı olduğu için −5,7/−8 makul. Bonet Filella'nın **"sert kısıt soft'tan %12'ye kadar kötü"** bulgusu, ihlal-sıfır sert kapımızın maliyetinin tam da bu literatür aralığında olduğunu doğruluyor. **Yani kaybınız anormal değil; ama üst banttasınız ve arama/mimari iyileştirmeleriyle alt banda (−2 ila −4) çekilebilir.**

### (c) Öncelik sıralı somut öneriler

**Öneri 1 (YÜKSEK öncelik) — Beam/VCS değerlendirmesine "gelecek erişilebilirlik" cezası ekle.**
- *Mekanizma:* Sert kapıyı (M3) aday-eleme olarak KORU; beam skorlamasına, adayın gelecekteki gruplar için ne kadar erişilebilirlik koridoru "kilitlediğini" ölçen ceza terimi ekle. İki geçerli aday arasında ileride daha az koridor bloklayanı tercih et.
- *Neden kaybı azaltır:* Bugün sert kapı sadece geçerli/geçersiz diyor; hangi geçerli yerleşimin gelecekte daha çok kutuya izin vereceğini görmüyor. İleri bakışlı skorlama "koridor açgözlü" yerleşimleri seçtiriyor.
- *İhlal-sıfır:* KORUNUR (sert kapı hâlâ eliyor; ceza sadece geçerliler arasında sıralıyor).
- *Literatür kanıtı:* Bonet Filella vd. (2023) — soft/ceza tabanlı değerlendirme sert kısıttan %12'ye kadar daha iyi hedef; "böl-yeniden-inşa" fazı yüksek-cezalı bölgeleri hedefliyor. Ren, Tian & Sawaragi (2011) shipment-priority beam search'te benzer ileri-değerlendirme.
- *Karmaşıklık:* Orta. Skor fonksiyonuna ek terim; koridor-doluluk tahmini kaba izdüşümle O(kutu×grup).
- *2 sn bütçe etkisi:* Yönetilebilir; ceza değerlendirmesi hafif tutulmalı (kaba koridor-izdüşümü, tam geometrik tarama değil).

**Öneri 2 (YÜKSEK öncelik) — Stack-first mimarisini prototiple (bkz. bölüm d).**
- *Mekanizma:* Önce aynı boşaltma grubundaki kutuları dikey stack'lere grupla, sonra stack'leri XY zemin düzleminde 2D olarak yerleştir. LIFO stack içinde otomatik sağlanır (aynı grup); stack'ler arası LIFO 2D sıralama problemi olur.
- *Neden kaybı azaltır:* Renault ROADEF 2022 problemi bu şekilde tanımlıydı; LIFO stack seviyesinde büyük ölçüde "bedava" gelir, 3D koridor problemi 2D'ye iner.
- *İhlal-sıfır:* KORUNUR (mimari gereği).
- *Literatür kanıtı:* Fontan & Libralesso (senior/genel kazanan, S41), ORTEC (3.), Willemsen & van Rossum (junior kazanan J31, Erasmus — stack-graph column generation); Bischoff & Ratcliff (1995) stack-building multi-drop.
- *Karmaşıklık:* YÜKSEK — duvar örücüden köklü sapma. Prototip önerilir, tam geçiş değil.
- *2 sn bütçe:* Stack-first genelde daha hızlıdır (2D problem).

**Öneri 3 (ORTA öncelik) — Kısıtsız paketle → LIFO onarım geç-geçişi.**
- *Mekanizma:* Önce kısıtsız (veya gevşek) paketle, sonra LIFO ihlallerini yerel takas/yeniden-yerleştirme + akıllı bölge-yeniden-inşa ile onar.
- *Neden kaybı azaltır:* Kısıtsız paketleme daha yüksek doluluk verir; akıllı onarım bunu mümkün olduğunca korur.
- *İhlal-sıfır:* Onarım tam ihlal-sıfıra ulaşana kadar döndürülmeli; ulaşamazsa geçerli önceki çözüme dön (fallback).
- *Literatür kanıtı/UYARI:* Bonet Filella'nın iyileştirme fazı olumlu; ancak AYNI makale "kısıtı yok sayıp sonra değerlendiren ardışık yaklaşım"ın soft'tan %15'e kadar kötü olduğunu gösteriyor — yani onarım NAİF yapılırsa zayıftır. Akıllı bölge-yeniden-inşa şarttır.
- *Karmaşıklık:* Orta-yüksek.
- *2 sn bütçe:* Riskli; onarım iterasyonları bütçeyi zorlayabilir.

**Öneri 4 (ORTA öncelik, VARSAYIM) — Reachability'yi gevşet, visibility+above'de kal.**
- *Mekanizma:* M3'ün "tam koridor boş" katılığını "kapıdan görünür + üstünde yok" tanımına indir; forklift erişimini pratik varsayımla kabul et.
- *Neden kaybı azaltır:* Junqueira gösterdi reachability katılaştıkça verim düşer; gevşetmek doluluğu artırır.
- *İhlal-sıfır:* Tanım değiştiği için "ihlal"in tanımı da değişir; **iş kuralı onayı gerekir. VARSAYIM.**
- *Karmaşıklık:* Düşük (kural gevşetme).
- *2 sn bütçe:* Nötr/olumlu.

**Öneri 5 (DÜŞÜK öncelik, VARSAYIM) — İki yönlü kuralı tek yönlü yap.**
- İki yönlü M3 gereksiz olabilir; çoğu literatür yalnız boşaltma yönü uygular. Tek yöne indirmek doluluğu artırabilir. **VARSAYIM — doğrulanmamış, iş kuralına bağlı.**

### (d) Stack-first mimarisinin LIFO altında değerlendirmesi

ROADEF/EURO 2022 Renault problemi (renault-iaa/challenge-roadef-2022) tam olarak "kutuları stack'lere birleştir, stack'leri kamyonlara yükle" olarak tanımlıydı. Erasmus School of Economics / GERAD sunumu (Willemsen, doğrulanmış verbatim): *"the goal is to combine a set of items into stacks and load these into trucks, as to minimise total transportation and inventory costs... a scalable column generation heuristic... a labelling algorithm on a dynamically defined stack graph."* Genel kazanan Fontan & Libralesso (S41), üçüncü ORTEC (S47), junior kazanan Willemsen & van Rossum (J31) bu stack-tabanlı yapıyı kullandı.

**LIFO'yu bedavaya getirir mi?** Kısmen evet: aynı boşaltma grubunun kutuları tek stack'te toplanırsa, stack İÇİNDE dikey istif LIFO'yu ihlal edemez (hepsi aynı grup). Geriye stack'ler ARASI LIFO kalır ki bu bir 2D zemin-yerleştirme problemidir — duvar örücünün 3D koridor problemi yerine çok daha kolaydır. Bischoff & Ratcliff (1995) multi-drop'u zaten stack-building ile ele almıştı.

**Bizim duvar örücüye kıyasla:** Duvar örücü, gruplar iç içe geçtiğinde her yeni kutuda 3D koridor kontrolü yapıyor; stack-first bunu 2D'ye indirger ve LIFO maliyetinin büyük kısmını yapısal olarak elimine eder. **Değerlendirme: Prototip yapmaya değer, ama duvar örücünüzün kısıtsız %90,5 (BR1-BR7) / %86,60 (gerçek korpus) performansı çok güçlü — stack-first'e tam geçiş bu tabanı riske atabilir.** Öneri: hibrit (LIFO aktifken stack-first, kısıtsızken duvar örücü); veya önce Öneri 1'i dene, kazanç yetersizse stack-first'e geç.

**Verim-farkında bölge boyutlama (Soru 4):** Literatürde "beklenen paketleme yoğunluğu ile bölge boyutlama" STANDART BİR YÖNTEM DEĞİLDİR. Bant/separation modeli literatürde en katı ve en verimsiz seçenek (Bonet Filella: separation kısıtı "yalnızca sert kısıt olarak modellenebilir" ve daha az hacim taşır). Sizin bant modelinizin %85 verimi hesaba katmadığı için battığı gözlemi literatürce doğrulanıyor; doğru yön bantsız + akıllı arama. First-fit-by-group-with-backtracking benzeri yaklaşımlar bölge değil sıralı yerleştirme mantığıdır — sizin M1'inize yakındır.

### (e) Makale + repo listesi

Makaleler:
- Bischoff & Ratcliff 1995, "Issues in the development of approaches to container loading", Omega 23(4):377-390. https://www.semanticscholar.org/paper/4aefcbf2e5cc21921036cef8bcc2cea1893517df
- Christensen & Rousøe 2009, "Container loading with multi-drop constraints", ITOR 16(6):727-743. https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1475-3995.2009.00714.x
- Junqueira, Morabito & Yamashita 2012, "MIP-based approaches for the container loading problem with multi-drop constraints", Annals OR 199(1):51-75. https://link.springer.com/article/10.1007/s10479-011-0942-z
- Martínez, Alvarez-Valdes & Parreño 2015, "A GRASP algorithm for the container loading problem with multi-drop constraints", Pesquisa Operacional 35:1-24. https://www.scielo.br/j/pope/a/Mp4Pd8CS86hTKMLKnGhQDsp/?lang=en
- Ceschia & Schaerf 2013, "Local search for a multi-drop multi-container loading problem", J. Heuristics 19:275-294. https://dl.acm.org/doi/10.1007/s10732-011-9162-6
- Gendreau, Iori, Laporte & Martello 2006, "A tabu search algorithm for a routing and container loading problem", Transportation Science 40(3):342-350.
- Iori, Salazar-González & Vigo 2007, "An exact approach for the VRP with 2D loading constraints", Transportation Science 41:253-264.
- Lai, Xue & Xu 1998, "Container packing in a multi-customer delivering operation", Computers & Industrial Engineering 35(1-2):323-326.
- Pan, Chu, Han & Huang 2009, "A tree-based wall-building algorithm... multi-drop", IEEE IEEM. https://ieeexplore.ieee.org/document/5373282
- Liu, Yue, Dong, Maple & Keech 2011, "A novel hybrid tabu search approach to container loading" (untakeout field / reachability), Computers & Operations Research 38:797-807.
- Bonet Filella, Trivella & Corman 2023, "Modeling soft unloading constraints in the multi-drop container loading problem", EJOR 308(1):336-352. https://www.sciencedirect.com/science/article/pii/S0377221722008219
- Bortfeldt & Wäscher 2013, "Constraints in container loading — A state-of-the-art review", EJOR 229(1):1-20. https://www.fww.ovgu.de/fww_media/femm/femm_2012/2012_07-EGOTEC-503ec3895182dc0d922a6bd7feebb3a5.pdf
- Pollaris vd. 2016, "CVRP with sequence-based pallet loading and axle weight constraints", EURO J. Transp. Logist. 5:231-255. https://link.springer.com/article/10.1007/s13676-014-0064-2
- Bortfeldt 2012, "A hybrid algorithm for the CVRP with 3D loading constraints", Computers & Operations Research 39(9):2248-2257.
- Männel & Bortfeldt 2016, "A hybrid algorithm for the VRP with pickup and delivery and 3D loading constraints", EJOR 254(3):840-858.
- Krebs, Ehmke & Koch 2021, "Advanced loading constraints for 3D vehicle routing problems", OR Spectrum 43(4):835-875. https://ideas.repec.org/a/spr/orspec/v43y2021i4d10.1007_s00291-021-00645-w.html
- Krebs & Ehmke 2023, "Solution validator and visualizer for (combined) VRP and CLP", Annals OR 326(1):561-579. https://link.springer.com/article/10.1007/s10479-023-05238-0
- Schulte & Wetzel 2025, "Two-phase matheuristic for assignment and truck loading problems" (ROADEF 2022 bilimsel ödülü), EJOR 322(1):105-120. https://www.sciencedirect.com/science/article/pii/S0377221724007951

Repolar:
- github.com/CorinnaKrebs/Instances (3L-CVRP/3L-VRPTW instance'ları, LIFO dahil)
- github.com/CorinnaKrebs/SolutionValidator (LIFO dahil kısıt doğrulayıcı, Java+C++)
- github.com/renault-iaa/challenge-roadef-2022 (ROADEF/EURO 2022 kural dokümanları)

## Recommendations

1. **Önce Öneri 1'i (erişilebilirlik cezalı beam/VCS) uygula** — en düşük risk, ihlal-sıfır kesin korunur, 2 sn bütçeye uyar. Hedef: −5,68/−8,03'ü −4/−5 seviyesine çekmek.
2. **Paralel olarak stack-first prototipi kur** (Öneri 2) — yalnız LIFO aktif senaryolar için; duvar örücüyü fallback tut. Hedef: −2/−3.
3. **Reachability gevşetmesini (Öneri 4) iş birimine danış** — pratikte kabul edilebilirse en ucuz kazanç.
4. **Onarım geç-geçişini (Öneri 3) yalnız 1-2 yetersizse ve akıllı bölge-yeniden-inşa ile dene** — naif onarım literatürce zayıftır; 2 sn bütçe riski yüksektir.

**Eşikler/benchmarklar (kararı değiştirecek):**
- Öneri 1 sonrası kayıp **≤ −4 puan** ise stack-first'e tam yatırım YAPMAYIN (risk/ödül düşük); prototiple sınırlı kalın.
- Kayıp **> −5 puan** kalırsa stack-first'e (Öneri 2) tam yatırım gerekçelenir.
- Yayılma (kullanılan uzunluk/ideal) **×1,236 → hedef ×1,18** altına inmezse, beam skoruna ayrı bir "yük-öne-toplama/compactness" terimi ekleyin (load compactness with sequential unloading).

### Eşiklerin bugünkü durumu (20 Ağu akşamı, `DR-69` sonrası)

| Araştırmanın eşiği | Bugün | Sonuç |
|---|---|---|
| Kayıp ≤ −4 → stack-first'e **tam yatırım yapma** | **−3,79** (beam) | ✅ eşiğin altında → tam yatırım **gerekçesiz** |
| Kayıp > −5 → stack-first **gerekçelenir** | −3,79 | ❌ tetiklenmiyor |
| Yayılma < ×1,18 değilse **compactness terimi ekle** | **×1,123** (beam) | ✅ eşiğin altında → terim **gerekçesiz** |

Eşikleri tetikleyen `−5,68`/`×1,236` sayıları **static** yola aitti; Öneri 1'in kendisi de o yolda
ölçülüp yanlış kabul edilmişti. Ceza geri alınınca üretim yolunda her iki eşik de karşılandı.

### Öneri 4 ölçüldü — karar iş biriminin, sayı hazır

`--lifo-visibility-only` bayrağıyla, kural ERİŞİLEBİLİRLİK yerine GÖRÜNÜRLÜK'e gevşetildi:
yalnızca yüzü **tamamen kapatan** bir kutu engel sayılıyor. Uygulama İYİMSER — iki kutunun
birlikte kapattığı yüzü açık sayıyor — yani ölçülen şey gevşetmenin **üst sınırı**.

| Gerçek korpus | Doluluk | Yayılma | Katı kurala göre ihlal |
|---|---|---|---|
| Static · erişilebilirlik | %81,94 | ×1,219 | 0 |
| Static · görünürlük | %83,93 | ×1,187 | **2.036** |
| **Beam · erişilebilirlik (bugün)** | **%88,11** | ×1,123 | **0** |
| **Beam · görünürlük** | **%90,22** | ×1,106 | **14.619** |

**Kazanç üretimde +2,11 puan** — LIFO maliyeti −3,79 → −1,69. Gerçek görünürlük uygulaması
(birleşim kapsaması) bundan **daha az** kazandırır; bu bir tavan.

**Bedeli:** beam 100 senaryoda 25.200 kutu yerleştiriyor ve bunların **14.619'u** (≈%58) düz
çekişle çıkarılamaz hâle geliyor — operatörün kaydırması ya da çevirmesi gerekiyor. Static'te oran
çok daha düşük (%9) çünkü static zaten seyrek paketliyor; beam boşluğu bulunca sonuna kadar
kullanıyor.

> **İş birimine soru:** *"2,11 puan doluluk karşılığında, boşaltmada kutuların yarıdan fazlasının
> düz çekilemeyip kaydırılması/çevrilmesi kabul edilebilir mi?"*
>
> Kabul edilmezse Öneri 4 kapanır ve LIFO tarafında yapılacak iş kalmaz. Kabul edilirse
> **iyimser yaklaşım yeterli değildir**: gerçek görünürlük (birleşim kapsaması) uygulanmalı,
> aksi hâlde kural "hiçbir tek kutu beni tamamen kapatmasın" gibi savunulamaz bir şeye döner.

**Öneri 3** (onarım geç-geçişi) açık ama araştırmanın kendi şartı sağlanmıyor: *"yalnız 1-2
yetersizse"* deniyor, yetersiz değil.

## Caveats
- Christensen & Rousøe ve Bischoff & Ratcliff'in mutlak doluluk yüzdeleri paywall arkasındadır; kayıp puanları ikincil kaynaklardan ve yönlü ifadelerden çıkarılmıştır (tabloda "bulunamadı" işaretli).
- Öneri 4 ve 5 "VARSAYIM" işaretlidir — kuralın pratik anlamını değiştirir, iş birimi onayı gerektirir.
- Martínez'in %13-30 düşüşleri 1→50 müşteri geçişi içindir; bizim grup-iç-içe modelimizle doğrudan kıyaslanamaz, bağlamsal referanstır.
- Bonet Filella'nın %12/%15 rakamları "objective value" (kargo değeri − ceza) üzerinden ölçülmüştür, saf hacim doluluğu değil; ancak sert-vs-soft kıyası için en yakın nicel kanıttır.
- Stack-first tam geçişi kısıtsız %90,5 tabanınızı riske atabilir; hibrit/prototip önerilir, köklü geçiş değil.
- Bant/eşit-orantılı bölge ve yatay layer (kesit boyu horizontal layer) önerilmemiştir (talep gereği ve literatürce "separation" en verimsiz seçenektir).