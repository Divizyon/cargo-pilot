# Cargo Pilot · Yükleme Algoritması — Araştırma Brifingi

**Tarih:** 17 Ağustos 2026 · **Dal:** `feat/algoritma-arama-katmani`
**Amaç:** Dış araştırmaya girdi olacak tek referans. "Ne denendi, ne ölçüldü, ne kaldı" sorularının
tamamı burada; tahmin ve ölçüm ayrı ayrı işaretli.

**İlgili dosyalar:** `ALGORITMA-RULEBOOK.md` (bağlayıcı kurallar) · `ALGORITMA-YOL-HARITASI.md`
(faz planı) · `ALGORITMA-GELISTIRME-LOG.md` (ham ölçüm tablosu)

---

## 1. Problem ve pazarlıksız kısıt

3B konteyner yükleme (Container Loading Problem). Bir araca, kısıtları olan kutuları
yerleştirip **hacim doluluğunu** en yükseğe çıkarmak.

**Pazarlıksız kısıt — `R-C07a` / `DR-12`:** Çıktı **fiziksel olarak yüklenebilir** olmalıdır.
Yatay katman (layer building) yaklaşımı projenin ilk algoritmasıydı ve **müşteri tarafından
reddedildi**: konteynerin tüm kesitini kaplayan bir katmanı kurup üstüne çıkmak sahada
uygulanamaz — işçi kapıdan girer ve duvar duvar örer, uzak uçtaki katmanı yakın uç dolduktan
sonra tamamlayamaz.

> **Araştırmaya not:** Doluluk kazancı ne olursa olsun katman tabanlı yöntemler kapsam dışıdır.
> Önerilecek her yöntem "kapıdan içeri doğru, duvar duvar" örülebilmelidir.

## 2. Ölçüm düzeneği — sayıları okumadan önce

Sayıların anlamı düzeneğe bağlı; bu bölüm olmadan tablolar yanlış okunur.

**Korpus:** Konteyner giyotin kesimlerle parçalara bölünür, her parça bir kutu olur. Yani
**üretilen yük konteynere tam sığar ve ulaşılabilir doluluk %100'dür.** Ölçülen doluluk bu yüzden
doğrudan kalite oranıdır — rastgele kutu üretiminde böyle bir referans yoktur ve "%52 doluluk iyi
mi kötü mü" sorusu yanıtsız kalır.

**Değişkenlik:** Her senaryoda araç ölçüleri (genişlik 200-260, yükseklik 200-280, uzunluk
400-1400 cm) ve kutu dağılımı yeniden rastgele. Kutu kenarları 20-160 cm.

**İzole edilenler:** Ağırlık ve kısıtlar devre dışı (araç kapasitesi sonsuz, tüm kutular
istiflenebilir, tüm rotasyonlar serbest). Ölçülen tek şey hacim yerleşimi — ağırlık limiti
devreye girseydi düşük doluluk algoritmanın değil senaryonun sonucu olurdu.

**Koşucu:** `dotnet run --project CargoPilot.Engine.Bench -- soak`. Kimlik doğrulama yok,
veritabanı yok. Senaryo başına ~54 ms (canlı API yolunda ~1.275 ms idi).

**Determinizm:** Aynı tohum → bit birebir aynı plan. `determinismDigest` ile pinlenir.

## 3. Bugünkü sayısal durum

| Yol | Ortalama | Medyan | p5 | En kötü | Süre/senaryo |
|---|---|---|---|---|---|
| Greedy (üretim motoru) | %75,2 | — | — | — | 78 ms |
| **Wall-Builder statik** | **%75,99** | %76,06 | %68,01 | %60,16 | 54 ms |
| Wall-Builder + GRASP | %76,8 | %76,48 | %69,78 | %65,87 | 1.022 ms |
| **Hedef** | **%90-95** | | | | |

Ölçüm 300 senaryo üzerinden; ortalama ~100 senaryodan sonra ±0,15 puanlık bantta oturuyor.

## 4. Mimari — bugün ne var

**Motor** `apps/backend/CargoPilot.Application/Common/Optimization/`

| Katman | Dosya | Rol |
|---|---|---|
| Sert kapılar | `PlacementValidator.cs` | 7 fiziksel kural — tek kaynak, kopyalanmaz |
| Greedy | `OptimizationEngine.cs` | Üretim motoru, extreme-point taraması |
| **Wall-Builder** | `WallBuilder/WallBuilderPlacement.cs` | Duvar tabanlı yerleştirici |
| Boşluk defteri | `WallBuilder/SpaceLedger.cs` | Maximal-space temsili |
| Arama | `Search/{Gwca,Ga,Grasp}Sequencer.cs` | Sıra optimizasyonu (random-key) |
| Ortak değerlendirme | `Search/SearchEvaluation.cs` | Üç aramanın ortak fitness'ı |

**Wall-Builder nasıl işliyor:**
1. Kutular hacim-azalan sırada gelir (arama açıksa sıra aramadan gelir).
2. Duvar = `[zStart, zEnd)` z bandı; derinliğini o duvara giren **ilk kutu** belirler (G&R kuralı).
3. Her kutu için: önce var olan duvarlar (açılış sırasıyla), sonra yeni duvar, sonra **bant
   kısıtı olmadan tüm defter** (son çare) denenir.
4. Aday konumlar boşluk defterinden gelir; her aday 7 sert kapıdan geçer.
5. Seçim sözlükbilimsel: `(y, taban alanı artığı, derinlik artığı, −taban alanı, rotasyon)`.

**Teşhis araçları** (`CargoPilot.Engine.Bench/`): `WasteDiagnostics` (voksel — ölü hava / iç
boşluk), `RejectionDiagnostics` (ret sebebi dağılımı), `SpaceDiagnostics` (kalan boşluklar,
defter yeniden kurularak).

## 5. Teşhis zinciri — kanıtlanmış mekanizma

Dört ölçüm, baş şüpheli iki kez değişti. **Bu bölüm araştırmanın çıkış noktasıdır.**

**Ölçüm 1 — Kayıp hacim nerede?** (voksel ayrışımı, 100 senaryo)

| | Değer |
|---|---|
| İç boşluk (yığının **içinde**) | **%1,08** |
| Ölü hava (yığının **üstünde**) | **%15,82** |
| Ortalama yığın yüksekliği | %84,5 |
| En yüksek sütun | %100,0 |

→ Paketleme sıkı. Sorun yığının yükselememesi.

**Ölçüm 2 — Üst yüzey ne durumda?**

| | Değer |
|---|---|
| Yüzey engebesi (std sapma) | **58,5 cm** |
| Düz sütun oranı | **%11,1** |

→ Yüzey darmadağın. Kutu yükseklikleri 20-160 cm iken bu, hiçbir yere düzgün oturulamaması demek.

**Ölçüm 3 — Boşluk mu kalmadı?** (defter yeniden kurularak, 300 senaryo)

| | Değer |
|---|---|
| Boş hacim | %24,0 |
| Boşluk sayısı | 74 (ortalama 0,297 m³) |
| En büyük boşluk | %2,2 (aracın) |
| **Yerleşemeyen kutulardan boşluğa sığan** | **%73,1** |

→ Hacim var, kutu da sığıyor. Yerleştirici koymuyor.

**Ölçüm 4 — Neden koymuyor?**

| | Değer |
|---|---|
| Sığan yerleşemeyen | %73,1 |
| **Sığan + destekli** | **%2,5** |

→ **Darboğaz `%80 destek kuralı`.** Aradaki ~70 puanı tek başına o yiyor.

**Kanıtlanmış mekanizma:** Kalan boş hacim **dikey bacalar ve çıkıntılar** hâlinde; tabanları
kısmen havada. Bir maximal-space'in tabanı yalnızca altındaki kutuların üst yüzeyleri kadar katı,
geri kalanı boşluk. Kutu oraya konamaz çünkü havada duramaz.

> **Araştırma sorusu 1:** Duvar inşası disiplinini bozmadan, **katı platform** üreten yerleştirme
> nasıl kurulur? (Katman inşası yasak — bkz. §1.)

## 6. Deney kütüğü — 22 deneme

### Kazananlar (3) — üçü de aynı türden

| # | Değişiklik | Kazanç | Mekanizma |
|---|---|---|---|
| v2 | Kapanan duvarların boşlukları da taranıyor | **+2,08** | Duvar kapandığında içindeki boşluklar taramanın dışında kalıyordu |
| v20 | Duvar bandı dışı son çare | **+0,75** | Kutu hiçbir bandın z aralığına girmiyorsa düşüyordu; boşluk uygunken |
| v5 | Başarısızlık bellekleme | p95 **−%46** | Aynı ürün üst üste sığmadığında defter her seferinde baştan taranıyordu |

**Örüntü:** Üç kazancın üçü de "kaçırılan adayı geri kazan" türünde. Hiçbiri skor ayarı değil.

### Geri alınanlar (6) — hiçbir skor ayarı kazandırmadı

| # | Değişiklik | Sonuç | Neden başarısız |
|---|---|---|---|
| v17 | Şerit (strip) bandı | **−24,9** | Bandın yüksekliğini ilk kutu belirleyince o duvara giren tüm kutular o yüksekliğe mahkûm kaldı |
| v9 | LAFF sıralaması | −2,84 | — |
| v8 | Duvar-farkında sıralama (derinlik kovası) | −1,04 | — |
| v18 | Hizalanma tercihi (flush) | −0,55 | Seviye listesi şiştikçe "en yakın seviye" hep sıfıra yakın çıkıyor, terim gürültüye dönüşüyor |
| v14 | Yönelim anahtarları (`double[2N]`) | −0,18 | Yerleştirici zaten en sıkı oturanı seçiyor; aramanın tercihini uygulatmak onun seçimini bozuyor |
| v6/v7 | Yönelim en-iyi-oturan, best-fit boşluk | ±0 | Süre +%19 / +%29 |
| v22 | Taban alanı artığı ölçütü | ±0 | Medyan +0,32, en kötü −2,44 (korundu, kazanç iddia edilmiyor) |

### Arama katmanı — DR-03 kıyası (300 senaryo, aynı bütçe)

| Sequencer | Ortalama | Medyan | p5 | En kötü | p95 süre |
|---|---|---|---|---|---|
| Statik sıra | %75,25 | %74,99 | %67,32 | %62,26 | — |
| GWCA | %76,65 | %76,09 | %68,91 | %64,73 | 5.419 ms |
| GA | **%76,85** | %76,22 | %68,91 | %64,73 | 4.910 ms |
| **GRASP** | %76,77 | **%76,48** | **%69,78** | **%65,87** | **1.128 ms** |

**GWCA her eksende kaybetti** → `DR-03` gereği emekli olmalı, GRASP devralmalı. Rulebook B1'in
literatür uyarısı doğrulandı: GWCA sürekli optimizasyon için tasarlandı, ayrık problemde zayıf.

**Bütçe kalibrasyonu (GWCA, aynı 60 senaryo):** 500 ms → %76,88 · 2.000 ms → %77,25 · 5.000 ms →
%77,61. On kat bütçe yalnızca +0,73 puan.

> **Araştırma sorusu 2:** Sıra araması ~+1,5 puan veriyor ve doyuyor. Arama katmanı mı zayıf,
> yoksa yerleştirici mi arama sinyalini geçirmiyor?

## 7. Bağlayıcı kısıtlar (değiştirilemez)

**Fizik — `PlacementValidator`, tek kaynak:**
1. Kutular çakışamaz (temas çakışma değildir)
2. **Taban alanının ≥ %80'i destekli olmalı** ← ölçüm bunu darboğaz olarak işaretledi, ama fiziksel kural, gevşetilemez
3. `IsStackable=false` üstüne kutu konamaz
4. `MaxStackCount` / `MaxWeightOnTop` sütun geneli
5. Kırılgan ürünün üstüne yük konmaz
6. Rotasyon `AllowedRotations` kümesinden
7. Araç iç ölçüsü ve ağırlık kapasitesi aşılamaz

**Diğer:** Koordinat standardı (`x`=width, `y`=height, `z`=length; kapı `z=length`) · determinizm
(aynı tohum → bit birebir) · greedy davranışı ve 17 golden snapshot değişmez · katman inşası
yasak (`DR-12`).

## 8. Rulebook'ta yazıp uygulanmayanlar

| Kimlik | Ne | Durum |
|---|---|---|
| `R-C08` | Alternatif duvar derinliği kuralı ("kalan kutuların en küçük boyutunun en büyüğü") | yazılı, uygulanmadı |
| `R-C09` | Knapsack-optimal şerit doldurma | "Faz 2 opsiyonu", uygulanmadı |
| `R-C10` | Aday sıralaması **Chebyshev** mesafesi olmalı | sapma — `(y, artık)` kullanılıyor |
| `R-C11` | `EnableAmalgamation` — dar boşlukları komşuyla birleştirme | yazılı, uygulanmadı |
| `R-C14`/`R-C18` | `AvgWallFlushness` — WallE formülü düzlüğü **varyansla** cezalar | uygulanmadı |
| `R-C24` | K-Means ön kümeleme (30-35× hız iddiası, tek kaynaklı) | Faz 3, uygulanmadı |
| `OPT-15` | Ana döngü yalnızca aşağı bakıyor — kutu var olan yığının altına konabiliyor ve kendi kısıtları sorulmuyor | **kanıtlanmış motor hatası**, ertelendi |

## 9. Duvarla uyumlu, denenmemiş yöntemler

Rulebook B3'ten, katman tabanlı olanlar elenerek:

| Yöntem | Kaynak | Neden umut verici |
|---|---|---|
| **Block building** | Eley 2002 | Aynı ölçüdeki kutular blok hâlinde yerleşir; blok kendi üstünde **düz platform** bırakır — ölçümün işaret ettiği sorun. Duvar içinde kaldığı için yükleme sırası bozulmaz |
| **Compound approach** | Bischoff & Marriott 1990 (14 kural); Modified Wall Building (36 varyant: 6 konteyner rotasyonu × 3 ranking × 2 öncelik) | Yerleştirici 54 ms; 36 varyant ≈ 2 sn, bütçeye sığar |
| **Tree search + 27 ranking** | Pisinger 2002 | Duvar inşası + ileriye bakış |
| **Stack/tower building** | Gehring & Bortfeldt 1997; Yap 2012 | Kule kule — duvara benzer, yüklenebilir |
| **WallE yumuşak skoru** | Ojha vd. 2020 (arXiv:2007.00463) | `−α₁·G_var + α₂·G_high + α₃·G_flush`; **varyans** tabanlı düzlük. Rulebook notu: α katsayıları aramanın öğrenebileceği bir yer |
| **LLM-güdümlü heuristik keşfi** | EoH 2024-25 | Rulebook notu: wall-building'i icat edemez ama hacim/yüzey/stabilite kombinasyon skorlarını iyi üretir |

## 10. Araştırmaya sorular

1. **Duvar inşasında katı platform.** Katman yasağı altında, duvar içinde tabanı tam kaplayan
   yüzeyler nasıl üretilir? Blok inşası bunu ne kadar çözer?
2. **%80 destek kuralı ile yaşamak.** Literatürde bu kısıtla çalışan wall-building varyantları
   dolulukta nereye ulaşıyor? Bizim %76 rakamımız bu kısıt altında iyi mi kötü mü?
3. **Bilinen optimumlu korpus.** Giyotin bölünmüş korpus adil bir zorluk ölçüsü mü, yoksa
   yapay olarak mı zor? Literatür BR1-BR7 (Bischoff & Ratcliff) kullanıyor — karşılaştırma için
   o korpusa geçmeli miyiz?
4. **Arama doygunluğu.** Sıra araması +1,5 puanda doyuyor. Literatürde sıra + yerleştirme
   ayrımının tipik kazancı ne kadar?
5. **Duvar derinliği kuralı.** İlk kutunun derinliği (G&R) vs "kalan kutuların en küçük boyutunun
   en büyüğü" — hangisi hangi kutu dağılımında iyi?

## 11. Kaynakça (rulebook B5'ten)

| Başlık | Yazar | Yıl | Link |
|---|---|---|---|
| A heuristic for packing boxes into a container | George, Robinson | 1980 | https://www.sciencedirect.com/science/article/abs/pii/0305054880900015 |
| Heuristics for the container loading problem | Pisinger | 2002 | https://www.sciencedirect.com/science/article/abs/pii/S0377221702001327 |
| Solving CLP by block arrangement | Eley | 2002 | https://www.sciencedirect.com/science/article/abs/pii/S0377221702001339 |
| Issues in the development of approaches to container loading | Bischoff, Ratcliff | 1995 | https://www.semanticscholar.org/paper/4aefcbf2e5cc21921036cef8bcc2cea1893517df |
| A genetic algorithm for solving the CLP | Gehring, Bortfeldt | 1997 | https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1475-3995.1997.tb00095.x |
| Constraints in container loading — SOTA review | Bortfeldt, Wäscher | 2013 | https://www.sciencedirect.com/science/article/abs/pii/S037722171200937X |
| A comparative review of 3D CLP algorithms | Zhao vd. | 2016 | https://onlinelibrary.wiley.com/doi/abs/10.1111/itor.12094 |
| Practical constraints in the CLP | Correcher vd. | 2020 | https://www.sciencedirect.com/science/article/pii/S0305054820303038 |
| WallE / PackMan (online 3D-BPP, DRL) | Ojha vd. | 2020 | https://arxiv.org/pdf/2007.00463 |
| Great Wall Construction Algorithm | Guan vd. | 2023 | https://www.sciencedirect.com/science/article/abs/pii/S0957417423014070 |
| BR1–BR7 benchmark | ORLib | — | https://people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html |

## 12. Bu brifingin sınırları

- Tüm sayılar **giyotin bölünmüş korpustan**; gerçek müşteri yükünde farklı çıkabilir.
- Ağırlık, kırılganlık, LIFO ve kontaminasyon kısıtları ölçümde **devre dışı**; hacim izole edildi.
- Greedy'nin %75,2 rakamı bu korpusta; üretimdeki gerçek yüklerde ölçülmedi.
- `OPT-15` motor hatası açık; ölçümleri etkileme ihtimali değerlendirilmedi.
- GWCA/GA/GRASP kıyası tek bütçede yapıldı; `KK-05`'in istediği eşleştirilmiş protokol
  (10 tohum, işaret testi p<0,05) koşulmadı.
