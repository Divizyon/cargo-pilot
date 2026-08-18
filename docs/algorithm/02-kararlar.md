# Cargo Pilot · Algoritma Karar Kaydı

**Kalıcı dosya.** Yeni bir `DR-` kaydı, kapanan bir borç ya da ölçüm sınırı değişikliği
**buraya** yazılır. Kurallar (`R-*`) [01-kurallar.md](01-kurallar.md)'de, ölçüm sayıları
[04-olcum-gunlugu.md](04-olcum-gunlugu.md)'de durur.

Bu dosya 16 Ağustos 2026 tarihli rulebook'un `BÖLÜM E`'siydi; 18 Ağustos 2026'da belge
düzeni kurulurken ayrıldı. İçerik birebir korunmuştur.

---


# BÖLÜM E — Karar Kayıtları, Açık Borç, Yol Haritası

## E1. Karar kayıtları (DR)

| DR | Karar | Gerekçe |
| --- | --- | --- |
| ~~DR-01~~ | ~~Yeni yerleştirici **kriter** olarak, greedy'nin **yanına**~~ — **tersine çevrildi (`DR-39`)** | Bayrak kombinasyon patlaması; greedy golden korpusu korunur; A/B kıyas mümkün |
| DR-02 | Hacme orantılı bölme kilidi **yalnız Wall-Builder için** açılır (sanal duvar dinamik) | Greedy'de K4 kilidi sürer; yeni yerleştirici zaten farklı model |
| DR-03 | GWCA **deneyseldir**; GA/GRASP kıyası zorunlu; kaybederse sequencer olgun olanla değiştirilir, Wall-Builder kalır | Literatürde GWCA↔CLP yok; ayrık zayıflığı belgeli |
| ~~DR-04~~ | ~~İkinci golden korpus; eski korpus dokunulmaz~~ — **geçersiz (`DR-39`)**: tek korpus kaldı ve duvar örücüyle yeniden üretildi | Snapshot kayması sıfır ilkesi |
| DR-05 | Fitness terim toplamı (Pareto değil) | "Düşük kazanır + sabit sıra" sözleşmesi korunur; Pareto ileride ayrı DR |
| DR-06 | Seed API'nin parçası (`OptimizationInput.Seed`) | Determinizm ve yeniden üretilebilirlik |
| DR-07 | Denge takas geçişi yeni sistemde yok | Arama bunu yapar; O(n²) +%43 bedeli tekrar ödenmez |
| DR-08 | Uzun arama **asenkron** iş olarak (plan taslağı hemen, iyileştirme arka planda) — Faz 3 | 120 sn tavan; kullanıcı deneyimi |
| DR-09 ⏳ | **Baseline garantisi = fitness seçimi + FillRate kilidi** (`R-C21`) | RK-03 çelişkisi; tek terimli ölçü diğer fitness terimlerini işlevsizleştirirdi |
| DR-10 ⏳ | **Sanal duvar kapsaması = tam ayak izi** `[z, z+length)` (`R-C13a`) | Greedy `IsInsideZone` ile tek semantik; iki farklı kural doğmasın |
| DR-11 ⏳ | **`AvgWallFlushness`: `[0,1]`, `WallCount==0` → `1.0`, NaN yasak** (`R-C14a`) | `UnplacedCount` ile çift cezalandırmayı önler; arama NaN ile çökmez |
| **DR-12** | **Katman (layer) inşası kalıcı olarak kapsam dışı** (`R-C07a`) | Müşteri reddetti: kesit boyu katman sahada yüklenemez. Doluluk kazancı gerekçe sayılmaz — çıktı yüklenebilir olmak zorunda |
| **DR-13** | **GWCA sequencer olarak emekli, GRASP devralır** | 300 senaryo, aynı bütçe: GWCA her eksende kaybetti (ortalama, medyan, süre, p95). `DR-03`'ün koşulu sağlanmadı. GWCA ve GA kodda referans kalır |
| **DR-14** | **Birincil ölçüm BR1-BR7'ye taşınır**; giyotin korpus regresyon testi olur | Giyotin korpus %100 ulaşılabilir doluluk sunuyor ama gerçek dağılımı temsil etmiyor; iyileştirmeler yanıltıcı ölçülüyor. BR'de kutular konteynerden bağımsız üretildiği için %100 zaten mümkün değil (Parreño 2008: ort. %99,46, sığma garantisi yok) |
| **DR-15** | **%90-95 hedefi korpus adıyla birlikte söylenir** | Literatürün en iyileri BR1-BR7'de ~%92-93. "Hedef %90-95" hangi korpusta dendiği belirtilmeden anlamsız |
| **DR-16** | **%80 destek eşiği KORUNUYOR — ölçüldü, kapatıldı** | Eşik %80'den %60'a indirildiğinde BR1-BR7'de kazanç duvar örücüde yalnızca **+0,75**, greedy'de +1,97 puan; buna karşılık en zayıf kutunun desteği %87 → %72, azami taşma 11 → 24 cm. Eski "eşik en büyük tıkaç" teşhisi giyotin korpusundan geliyordu ve orada kazanç gerçekten +3,27 — ama o korpusta her kutu benzersiz (`DR-19`). Gerçekçi yükte ortalama destek %99,2, yani plan eşiğe nadiren dayanıyor. Düzenek yerinde: `--support` ile yeniden ölçülebilir |
| **DR-17** | **Boşluk defteri destek-farkında yapılmayacak; F2b (düzlük) F2a'nın önüne alındı** (`R-C09a`) | 300 senaryo, üç varyant, hepsi taban çizginin altında (%75,99 → en iyi %74,00). Havada duran taban, %80 kuralının köprü kurmasını sağlayan aday kaynağı; kırpınca boşluk 72 → 25'e, engebe 56,6 → 62,6 cm'ye gidiyor. "Sığıyor ama desteksiz" oranı defterin değil yüzey engebesinin ölçüsü |
| **DR-18** | **Yüzey engebesi yerleştirme skoruyla çözülmüyor; kritik yol F4a (kule inşası)** (`R-C09b`) | Altı varyant ölçüldü, engebe 56,6 cm'den 56,1 cm'nin altına hiç inmedi (hedef <30). Düzlük skoru miyop: defterin sunduğu adaylar arasından seçiyor, o adayların üst yüzü ise kutunun kendi yüksekliğiyle belirli. Yüzeyi düzleştirmek "hangi kutular yan yana gelsin" kararı — skor değil gruplama. Terim yine de korundu: ortalama +0,24, **en kötü senaryo +2,73** |
| **DR-19** | **Birincil ölçüm artık BR1-BR7; giyotin korpus regresyona indi** (`DR-14` uygulandı) | Korpus değişikliği kararı gizliyordu: Wall-Builder'ın greedy'ye üstünlüğü giyotinde +0,8, BR'de **+3,8** puan. Kule inşası giyotinde +0,07 (ölçülemez), BR'de **+2,03** |
| **DR-20** | **BR sayısı her zaman iki uçla söylenir: `strict` (alt sınır) ve `free` (üst sınır)** | BR'nin "hangi ölçü dikey durabilir" kısıtını `AllowedRotations` tam karşılamıyor; tiplerin %37'si (`011` düzeni) yaklaşık okunuyor. Hangi ucun ölçüldüğü belirtilmeden sayı literatürle kıyaslanamaz |
| **DR-21** | **Sıradaki iş blok inşası (Eley 2002)**; kule tek sütunla sınırlı | BR1 (3 tip, bol tekrar) bizim EN KÖTÜ kümemiz (%81,26) hâlbuki literatürde en kolayı. Tekrarın en yüksek olduğu yerde en az kazanıyoruz: yerleştirici aynı ölçüdeki kutu çokluğunu fırsat olarak görmüyor |
| **DR-22** | **Aday seçimi blok ADEDİNE bakar, blok hacmine değil** (`R-C09c`) | Hacim biçimi BR'de en iyisiydi (%79,84) ama giyotinde %76,30 → %75,41 düşürdü: orada her kutu benzersiz olduğu için blok daima tek kutudur ve ölçüt sessizce "en büyük kutuyu seç"e dönüşüyor. Adet biçiminde tek kutu durumunda adaylar eşitlenir ve karar eski sığdırma ölçütüne kalır — iki korpusta da doğru |
| **DR-23** | **Duvar derinliği sabit kuralla belirlenmez, kromozomda aranır** (`R-C15a`) | Derin duvar BR1'i +1,36 yükseltirken BR6'yı −1,45 düşürüyor, sığ duvar tam tersi; ortalamada üçü de aynı (%79,85-79,88). Doğru değer kutu setine bağlı. Genle: GRASP %85,22 → %85,32, BR1 %83,09 → %83,92 |
| **DR-24** | **Sequencer opsiyonel; duvar örücünün varsayılanı GRASP** (`DR-13` uygulandı) | Arama +5,5 puan getiriyor ve istemcinin bunu ayrıca istemesi gerekmemeli. Komut varsayılanını doğrudan GRASP yapmak bayrak kapalıyken bugünkü çağrıyı reddettirirdi; alan nullable yapılıp çözüm `SequencerSelection.Resolve`'a alındı. Kapı korundu |
| **DR-25** | **`SearchBudget.Default` ölçülen işletme noktasıdır: 40 · 20 · 2.000 ms · 15** | Eski `20_000` ms duvar saati bir istek içinde savunulamazdı ve hiçbir ölçümü temsil etmiyordu. Yeni değerler, raporlanan %85,32'nin alındığı bütçenin kendisi |
| **DR-26** | **Plan, kendisini üreten koşunun kimliğini saklar** (yerleştirici, sequencer, tohum, arama istatistiği) | Determinizm sözleşmesi (`R-C02`) bunlar olmadan kullanılamaz: planı yeniden üretmek isteyenin elinde yalnızca sonuç kalırdı. Duvar örücü açıldığında aynı girdi iki farklı motordan geçebiliyor ve veritabanında ayırt edilemiyordu |
| **DR-27** | **Sekizinci kapı: aday kendi istif/kırılganlık kısıtlarına karşı da sınanır** (OPT-15 kapatıldı) | Dört istif kuralı yalnızca aşağı bakıyordu; "yeni kutu daima yığının en üstüne konur" varsayımı yanlış, çünkü boşluk defteri cebi aday olarak tutar. Ölçüldü: köprü altındaki cebe kırılgan kutu yerleşiyordu. Düzeltme doluluğu değiştirmedi ve 17 golden snapshot bayt birebir aynı kaldı |
| **DR-28** | **Doluluk kapısı yalnızca statik sequencer'ı ölçer** (`engine-bench.yml`) | Aramanın bütçesi duvar saatidir; yavaş koşucu daha az iterasyon yapar ve sonuç makineye bağlı çıkar, kapı gürültüden kalırdı. Statik yol saf hesap olduğu için her düşüş gerçek bir gerilemedir ve tolerans (0,05 puan) yalnızca JSON yuvarlamasına karşıdır |
| **DR-29** | **Yedek kademe sırası (cep / yeni duvar) da kromozomda** (`R-C15a`) | Cebi önce taramak BR'de +0,23, giyotinde −3,38. İkisi de gerçek yük biçimi; sabit sıra birini feda ediyor. Oturumun üçüncü "sabit değer kazanmıyor" bulgusu (`DR-18`, `DR-23`) |
| **DR-30** | **GRASP sabitleri ölçüldü: `Alpha` 0,30 → 0,45 · `SwapsPerRound` 12 → 72** | Hiç taranmamışlardı. Eski takas sayısı arama bütçesinin büyük kısmını harcamadan bitiriyordu. BR1-BR7 (GRASP, 175 örnek) %85,38 → **%86,24**; statik yol birebir aynı, giyotin −0,12 (gürültü). İki parametre etkileşiyor, optimum iki turda bulundu |
| **DR-31** | **GRASP her turu taban çizgiden başlatır, bulunan en iyiden değil** | Ölçüldü: en iyiden başlatmak −0,62 puan. Çeşitlendirme kayboluyor ve arama tek tepede sıkışıyor. Klasik GRASP tasarımı doğruymuş; `Alpha` da bu tasarıma göre kalibre |
| **DR-32** | **Arama tohumları üçte kalır** | Tohumlar bütçe içinde değerlendiriliyor; her ek tohum bir tam yerleştirme koşusu ve o süre arama turlarından çalınıyor. Altı tohum −0,11, tek ek tohum −0,10 |
| **DR-33** | **K-Means ön kümeleme reddedildi** (`R-B4` iddiası) | Doluluk her `k` değerinde taban çizginin altında; `k` büyüdükçe taban çizgiye yaklaşıyor, yani zarar veren kümelemenin kendisi. Hız 2× artıyor ama sebebi kazanç değil kayıp: benzer ölçüler bir arada gelince daha az boşluk hayatta kalıyor |
| **DR-34** | **Amalgamation uygulanmayacak** (`R-C11`) | Ölçüldü: defterdeki boşlukların **%0,0'ı** maksimal değil, ortalama büyüme %0. Altı yönün hepsinde tıkalılar; iki maksimal kutuyu birleştirmek prizma vermez. Madde Parreño'nun temsilinden geliyordu ve orada anlamlı, bizimkinde değil |
| **DR-35** | **Bileşik blok: sütun tepesi başka üründen kutuyla tamamlanır, ayak izi uyumu ≥ %85** (`R-C09d`) | Kısıtsız hâli kaybediyor (BR %78,71): geniş bir sütunun tepesine küçük kutu koymak yüzeyin geri kalanını ölü havaya çeviriyor. Uyum şartıyla statik yolda giyotin %76,29 → **%79,16**, BR %79,86 → %80,09. Aramada nötr — GRASP bu kazancı sıralamayla zaten buluyor |
| **DR-36** | **Yönelim anahtarları aramaya açılmayacak** | Ayarlı GRASP ile yeniden sınandı (%86,68 / taban %86,70-86,78). İlk bulgu ayarlardan bağımsızmış: tarama zaten tüm yönelimleri görüp en sıkı oturanı seçiyor |
| **DR-37** | **`R-C15` OBL uygulanmayacak** | Popülasyon gerektirir; GRASP popülasyon tutmaz (`DR-31`), GWCA ve GA emekli (`DR-13`). GA'ya dönülürse yeniden açılır |
| **DR-38 ⚠** | **Kısıt tarafının kıyas kapsaması YOK** | İki korpus da `UnloadingOrder: null` ve ağırlık/kırılganlık/istif kısıtı taşımıyor; `R-C14` metrikleri (`WallCount`, `AvgWallFlushness`, `ZoneViolations`) hiç üretilmiyor. Bu yüzden `DR-09`, `DR-10` ve `DR-11` **ölçülemiyor**. Ölçüm programı baştan yalnız hacim üzerine kuruldu |
| **DR-39** | **Greedy kaldırılıyor; ağırlık dengesi gerilemesi ölçüldü ve kabul edildi** | Denge sapması greedy'nin ~3 katı: %9,21 → %28,14 (GRASP), %38,35 (Static). Karşılığında doluluk +3,66 puan ve statik yol 27 kat hızlı. Gerileme **yerleştirme düzeyinde**; GRASP'ın 5e4 denge katsayısı zaten çalışıyor ve tek başına yetmiyor, yani gelecekteki çalışma `OrientationFit`'e terim koymalı. `R-C07`/`DR-01` ("greedy'nin yanına") bilinçli olarak tersine çevrildi |
| **DR-40** | **LIFO bölge garantisi duvar örücüde üç yerden deliniyordu; üçü de onarıldı** | Varsayılan çevrilince ortaya çıktı: `[100,200)` bölgesine ait kutular `Z=0..60`'a düşüyordu. (1) Duvar döngüsü ilk aday veren duvarda duruyordu, o aday bölge dışı olsa bile. (2) `TryPlace` z'yi bölge başına çekmiyordu — greedy'de bölge başları extreme-point olarak tohumlanıyordu, duvar örücüde öyle bir tohum yok. (3) Blok inşası bölgeyi hiç sormuyordu; `TopUp` başka ürünü kendi bölgesi dışına koyabiliyordu |
| **DR-41** | **Yükleme köşesi tercihi `OrientationFit`'e eşlik bozucu olarak taşındı** | Greedy'de bunu `VolumeScoring.WidthTerm` (katsayı 1) yapıyordu. Onsuz eşit adaylar arasında kazananı defter sırası belirliyor ve yükleme köşesi sözleşmesi (`docs/COORDINATE_STANDARD.md §7`) beraberlikte kayboluyordu |

⏳ = **geçici karar.** Üçü de F0'ı açmak için verildi; ölçüm olmadan doğrulanmadılar. **F3 çıkışında (SC-58/SC-59 ölçümleri geldiğinde) ilk bakılacak teknik borç kalemleridir** — bkz. §E3.

**Kilitli yapılmayacaklar (greedy):** bölge katsayısı 2.000.000 · `Zone > Gravity` sıra testi · hacme orantılı bölme (greedy) · koşulsuz sert eleme.

## E2. Karar noktalarının cevapları (Rulebook Temel §8)

1. Yanına, kriter olarak (DR-01). 2. Seed API'de, tek Random (R-C02, DR-06). 3. Evet, tek kaynak (R-C01). 4. Terim toplamı kalır (DR-05). 5. İkinci korpus, `FragilityType` eklenir (DR-04). 6. İlk koşu `ignore_baseline`, sonra yeni referans (R-D07). 7. Varsayılan 20 sn arama, tavan 120 sn; asenkron Faz 3 (R-C20, DR-08). 8. Seed katalog genişletilir (R-D08). 9. Wall-Builder'da dinamik sanal duvar (R-C13, DR-02). 10. Evet — `ZoneViolations` sonuçta raporlanır ve araç `lifoZone` bunu okur.

## E3. Açık borç — güncel liste

| ID | Konu | Yer | Durum |
| --- | --- | --- | --- |
| ~~OPT-15~~ | Ana yerleştirme döngüsü yalnızca AŞAĞI bakıyordu | `OptimizationEngine` · `WallBuilderPlacement` · `PlacementValidator` | **KAPANDI** (`DR-27`) — sekizinci kapı üç yere eklendi; 17 snapshot bayt birebir aynı kaldı |
| OPT-14 | `UnloadingOrder ?? -1` sentinel'i `GroupId` kontrolü yapmıyor | `OptimizationEngine.cs` | açık · zararsız |
| — | Eşit bölme kusuru | `LifoPlacement.ComputeGroupZones` | açık (greedy); Wall-Builder'da çözülür |
| — | Sessiz yedek kademe raporlanmıyor | `OptimizationEngine` | açık → `ZoneViolations` ile kapanacak |
| — | Snapshot `FragilityType` yok | `Golden/SnapshotPayload.cs` | açık → yeni korpusla kapanacak |
| — | `ViolatesLoadAbove` doğrudan takas testi yok | `PlacementValidator.cs` | açık (aday tarafı `CepYerlesimiTests` ile kapandı) |
| OPT-05 | `FragilityType` 10 üyeden 9'u etkisiz | `ContaminationFilter.cs` | kısmen |
| — | `NotStackable`, `GeometryConstraint` üretilmiyor | `UnplacedReason` | açık → R-C04 |
| — | WeightBalance ~29,5 sn / 500 kutu | `BalanceScoring.ImproveBalance` | kabul edildi |
| — | Araç README 13 kural / `CHECK_IDS` 14 | `apps/algorithm-test-ui/README.md` | açık |
| — | `checks.ts` `lifoZone` yorumu bayat | `verification/checks.ts:529` | açık |
| — | `sourceRef` satır numaraları kayar | `verification/checks.ts` | açık |
| — | `dotnet build CargoPilot.slnx` SDK 8.0.419 (MSB4068) | ortam | açık |
| **yeni** | GWCA resmi MATLAB kodu repodan silinmiş; File Exchange kopyası tek kaynak | araştırma | not |
| **yeni** | K-Means 30–35× / %15 iddiası tek kaynaklı | R-C24 | ölçülecek |

### E3.0 OPT-15 — ana döngüde yukarı bakan kısıt yok (2026-08-17, ölçülmüş)

**Nasıl bulundu:** `apps/algorithm-test-ui` fixture kipi, tohum 7, senaryo 19, Hacim Önceliği.
Araç kapısı `stackCount` ihlali raporladı; bozuk vaka `--dump-failures` ile diske alındı.

**Kanıt** (liste sırası = motorun yerleştirme sırası):

```
#6: (0, 60, 0)   40×30×220
#7: (40, 60, 0)  40×30×220
#8: (0, 90, 0)   40×30×220
#9: (0,  0, 180) 80×40×80   ← MaxStackCount=2, EN SON konmuş
```

`#9` kendisinden **önce** konmuş üç kutunun altına yerleşti (y = 0…40; diğerleri y = 60 ve y = 90;
taban örtüşmesi 40×40). Nihai planda `#9`'un üstünde 3 kutu var, limiti 2.

**Kök neden:** `ViolatesStackCount` / `ViolatesStackWeight` / `ViolatesFragility` yalnızca adayın
**altındaki** kutuların limitlerini sorar. `PlacementValidator` bunu açıkça bir varsayıma dayandırıyor:

> *"Aday taraması için bu yeterlidir, çünkü yeni kutu daima mevcut yığının en üstüne konur;
> üstünde hiçbir şey yoktur."*

Varsayım yanlış: extreme-point taraması bir kutuyu var olan yığının altındaki boşluğa koyabiliyor.

**OPT-01 ile ilişkisi:** Aynı kör nokta OPT-01'de bulunmuş ve `ViolatesLoadAbove` yazılmıştı — ama
yalnızca **denge takas geçişine** bağlandı, ana yerleştirme döngüsüne değil. Düzeltme yarım kaldı.

**Durum: KAPANDI (2026-08-18, `DR-27`).** Erteleme gerekçesi "17 golden snapshot'ı kaydırır" idi.
Önce kırmızı test yazıldı (`CepYerlesimiTests`: köprü altındaki cebe kırılgan kutu yerleşiyordu,
Wall-Builder'da üretildi), sonra `ViolatesLoadAbove` aday alanlarıyla çağrılabilen bir aşırı
yüklemeye ayrılıp **üç** yere sekizinci kapı olarak eklendi: greedy taraması, Wall-Builder taraması
ve blok inşası.

Erteleme gerekçesi ölçümle geçersiz çıktı: **17 snapshot bayt birebir aynı kaldı** ve doluluk
değişmedi (BR %79,86, giyotin %76,29). İki korpusta da kısıtlı kutu olmadığı için kapı orada hiç
ateşlenmiyor — düzeltme yalnızca gerçekten geçersiz olan yerleşimleri reddediyor.

### E3.0.1 Araç tarafı düzeltmesi — çakışma yükleminde epsilon yoktu (kapandı)

Aynı koşu iki ihlal daha raporlamıştı (`overlap`, `weightOnTop`); ikisi de **motor hatası değildi**.
Motor `decimal` ile çalışır ve temas tam eşitliktir. LIFO bölge başlangıcı `araçUzunluğu / grupSayısı`
(1360 ÷ 3) devirli ondalık üretir; JSON üzerinden `double`'a dönüşünce bir kutunun bittiği yer ile
sonrakinin başladığı yer aynı sayıya yuvarlanmıyor. Ölçülen hayalet örtüşme: **2,274 × 10⁻¹³ cm**.

`CONTACT_EPSILON_CM = 1e-6` araçta zaten vardı ve destek/doğrudan-üstünde yüklemlerinde
kullanılıyordu; `boxesIntersect` ve `footprintsOverlap` yüklemlerinde eksikti. Eklendi — tolerans
politikası artık tutarlı. **Ders:** istemci aynasındaki her geometrik yüklem aynı eşiği kullanmalı;
biri unutulduğunda kapı sahte kırmızı yakıyor ve gerçek bulgular gürültüde kayboluyor.

### E3.1 Test sonrası ilk bakılacaklar (geçici kararlar)

Aşağıdaki üç karar **ölçüm olmadan**, yalnızca F0'ı açmak için verildi. F3 çıkışında SC-58/SC-59 ölçümleri geldiğinde **bu sırayla** yeniden değerlendirilecekler; hiçbiri kalıcı sözleşme sayılmaz.

| Sıra | DR | Karar | Yeniden bakma tetiği | Ölçülecek şey |
| --- | --- | --- | --- | --- |
| 1 | DR-09 ⏳ | Baseline = fitness seçimi + FillRate −0,5 puan kilidi | F3 · SC-44, SC-58 | Kilit kaç senaryoda devreye giriyor? Devreye giriyorsa fitness katsayıları yanlış kalibre demektir |
| 2 | DR-11 ⏳ | `AvgWallFlushness`: `WallCount==0` → `1.0` | F3 · SC-59 | Boş/az dolu planlarda `UnplacedCount` cezası tek başına yeterli mi, yoksa arama boş plana mı kaçıyor |
| 3 | DR-10 ⏳ | Sanal duvar = tam ayak izi `[z, z+length)` | F2 · SC-19, SC-53 | Tam ayak izi kaç kutu düşürüyor? Yedek kademe kaç kez tetikleniyor (`ZoneViolations` > 0) |

## E4. Ölçüm kapsamının sınırları (kanıtlanmış vs gözlenmiş)

OPT-02 iki senaryoda ölçüldü, 400'lük tarama yok. OPT-01'in denge kalitesi bedeli ölçülemedi (korpus tek tip küp). Eski golden korpus çok katmanlı LIFO içermiyordu. Toplu koşu süresi uçtan uca. Rulebook Temel raporu `dotnet test` koşmadı. GWCA CLP performansına dair **hiçbir dış ölçüm yok** — tüm sayılar bu projede üretilecek.

## E5. Yol haritası

| Faz | İçerik | Çıkış kriteri |
| --- | --- | --- |
| **0 · Hazırlık** (1 hafta) | `Seed`, `Strategy`, `Sequencer` modeli; `SnapshotItem.FragilityType`; seed katalog genişletme; araç şema sürümü | Eski 17 snapshot sıfır kayma; araç şeması yeni alanları reddetmiyor |
| **1 · Wall-Builder + statik sıralama** (2–3 hafta) | R-C08…C14; sequencer = tohum kuralları; ikinci korpus; R-D01/02/06 | KK-01/02/04/06/08; doluluk greedy'ye eşit veya iyi |
| **2 · GWCA + GA + GRASP** (2–3 hafta) | R-C15…C23; `SequencerBenchmarkTests`; fitness kalibrasyonu | KK-03/05/07; DR-03 kararı verilir |
| **3 · Hızlandırma & ürünleştirme** (opsiyonel) | K-Means (R-C24), OBL, adalar/PGWCA, asenkron iyileştirme (DR-08), amalgamation | Süre ≥ %30 azalır, doluluk düşmez; asenkron uç canlı |

## E6. Kaynak dosya indeksi

- Motor: `apps/backend/CargoPilot.Application/Common/Optimization/*.cs`
- Filtre: `apps/backend/CargoPilot.Application/Common/ContaminationFilter.cs`
- Girdi/çıktı: `apps/backend/CargoPilot.Application/Common/Models/Optimization*.cs`
- Motor testleri: `apps/backend/CargoPilot.Engine.Tests/`
- Test aracı: `apps/algorithm-test-ui/` (`README.md`)
- CI: `.github/workflows/ci.yml`, `.github/workflows/algorithm-suite.yml`
- Koordinat standardı: `docs/COORDINATE_STANDARD.md`
- Arşiv belgeleri: `docs/algorithm/arsiv/`
- Kurallar: `docs/algorithm/01-kurallar.md` · Bu karar kaydı: `docs/algorithm/02-kararlar.md`
- Sözlük: `docs/algorithm/00-sozluk.md` · Güncel karne: `docs/algorithm/05-basari-karnesi.md`

## E7. Sözlük

Bu bölümün gövdesi [00-sozluk.md](00-sozluk.md)'ye taşındı ve genişletildi.
