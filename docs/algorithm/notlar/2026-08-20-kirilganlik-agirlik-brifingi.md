# Kırılganlık, istif ve ağırlık — durum bildirisi

**Tarih:** 20 Ağustos 2026 · **Amaç:** dış araştırmaya verilecek girdi.
Kardeşi: [LIFO brifingi](2026-08-20-lifo-brifing.md).

LIFO kapandı (üretim maliyeti **−3,79**, araştırmanın iki eşiği de karşılandı — `DR-69`). Sıradaki
kısıtlar bunlar ve **kırılganlık açık ara en pahalısı**: üretim yolunda LIFO'nun **beş buçuk katı**.

> **Bu belgedeki her sayı hangi yolda ölçüldüğü yazılarak veriliyor.** `DR-69` tam olarak bu
> ayrım yapılmadığı için yanlış bir karar verildiğini gösterdi: kısıt kararları **üretim
> yolunda (beam)** ölçülür; static yol kapı içindir, karar için değil.

---

## 1. Bir bakışta — kısıtların maliyeti

Gerçek korpus (ROADEF/EURO 2022 dağılımı, 100 senaryo, gerçek araç ölçüleri):

| Kısıt | Static | Üretim (beam) | Üretimdeki maliyet |
|---|---|---|---|
| Yok | %86,60 | **%91,91** | — |
| LIFO (3 grup) | %81,94 | %88,11 | **−3,79** |
| İstif ≤ 2 | %71,52 | %78,22 | **−13,69** |
| **Kırılganlık (tiplerin ~%33'ü)** | **%46,36** | **%70,10** | **−21,81** |
| Hepsi | %52,71 | %61,86 | **−30,05** |

Kırılganlık üretim yolunda **−21,81 puan** götürüyor — LIFO'nun (−3,79) **beş katından fazla**.
Static'te −40,24; aradaki fark beam'in kısıt altında ne kadar iş yaptığını gösteriyor (kısıt ne
kadar sıkarsa arama o kadar değerli).

Yayılma da aynı sırayı veriyor: kısıtsız ×1,086 · LIFO ×1,123 · istif ×1,289 · **kırılganlık
×1,424**. Kırılganlık yükü yukarı çıkaramadığı için ileri yayıyor.

### Maliyet eğrisi düz değil — UÇURUM

Kırılgan payı `--fragile-every` ile tarandı (static, gerçek korpus):

| Her N'inci tip kırılgan | 2 | 3 | 4 | 6 | 10 | 20 |
|---|---|---|---|---|---|---|
| Doluluk | %33,98 | %46,36 | %43,10 | **%48,65** | **%48,65** | **%48,65** |
| Yayılma | ×3,069 | ×2,359 | ×2,527 | ×2,251 | ×2,251 | ×2,251 |

N ≥ 6'da eğri **düzleşiyor**, çünkü gerçek korpusta senaryo başına yalnızca 2-6 ürün tipi var:
seyreltmeye devam etsen de **ilk tip her zaman kırılgan kalıyor**. Yani %48,65 bir taban değil,
*"araçta bir tane kırılgan ürün tipi var"* durumunun ta kendisi.

> **Bulgu: TEK BİR kırılgan tip bile −37,95 puan götürüyor** (%86,60 → %48,65, static).
> Maliyet kırılgan payıyla orantılı değil; kapı bir kere açılınca bedelin çoğu ödeniyor.

Eğrinin monoton olmaması da (N=4 → %43,10, N=3'ten kötü) aynı şeyi söylüyor: **kaç tipin**
kırılgan olduğu değil, **hangi tipin** kırılgan olduğu belirleyici. Hacmi büyük bir tip kırılgansa
plan çöküyor.

**Not — bu korpusun ölçemediği şey:** kırılganlık ürün TİPİ düzeyinde atanıyor, bir tipin tüm
birimleri birden kırılgan oluyor. "Yükün %5'i kırılgan" gibi bir rejim korpusta ifade edilemiyor.
Gerçek sevkiyatta payın ne olduğunu bilmiyoruz — **araştırmanın ilk sorusu bu.**

---

## 2. Kırılganlık

### 2.1 Kural bugün ne diyor

`PlacementValidator`, iki yönlü, ikisi de **kapatılamaz** (fizik sınıfı, modül bayrağı yok):

| Yön | Fonksiyon | Ne soruyor |
|---|---|---|
| Aşağı | `ViolatesFragility` | Adayın **altında**, ayak izi kesişen, kırılgan bir kutu var mı? |
| Yukarı | `ViolatesLoadAbove` | Adayın kendisi kırılgansa, **üstünde** herhangi bir kutu var mı? |

`FragilityType` enum'unun yalnız **`Fragile`** üyesi mekanik kırılganlıktır. Kalan sekiz üye
(`LiquidChemical`, `Flammable`, `Oxidizing`, `Corrosive`, `OdorSensitive`, `FoodContact`,
`KeepDry`, `Chemical`) sıralı bir şiddet ölçeği değil **ayrışım/elleçleme sınıflarıdır**; onların
kuralı `ContaminationFilter`'da `stackGroup`/`incompatibleGroups` üzerinden işler.

### 2.2 Kural SÜTUN GENELİDİR — ve bu hiç ölçülmedi

Kod, kırılgan kutunun **doğrudan üstündekini** değil, **ayak izi gölgesindeki her yüksekliği**
yasaklıyor:

```csharp
if (b.FragilityType != FragilityType.Fragile) continue;
if (b.Y + b.Height > y) continue;          // b adayın altında mı
// ... x/z kesişimi varsa REDDET — aradaki mesafeye bakılmaksızın
```

Yani zeminde duran 50 cm'lik kırılgan bir kutu, kendi ayak izi boyunca **araç tavanına kadar**
her şeyi yasaklıyor — o yükün ağırlığı komşu yığınlar tarafından taşınıyor ve kırılgan kutuya
hiç dokunmuyor olsa bile.

**Bu daha katı bir yorum.** Literatürdeki olağan tanım *"kırılganın üstüne yük binmez"* =
**doğrudan temas / taşınan yük**; bizimki *"ayak izinin üstü tamamen boş"*. Fark, köprüleme
(bridging) yapılabilen her senaryoda doluluğa doğrudan yansır.

Bu yorum bilinçli (`R-A05`, yol haritası `SC-14`/`SC-23` aynı şeyi söylüyor) ama **alternatifiyle
hiç kıyaslanmadı.** `DR-16`'nın destek eşiğinde yaptığı hatanın aynısı: bir politika, ölçülmeden
fizik gibi duruyor.

#### Ölçüldü — ve yorum SUÇLU DEĞİL

`--fragility-contact-only` bayrağıyla iki yorum yan yana koşuldu (static, gerçek korpus):

| | Sütun geneli (bugün) | Doğrudan temas | Fark |
|---|---|---|---|
| Her 3. tip, static | %46,36 · ×2,359 | %46,54 · ×2,353 | **+0,18** |
| Tek kırılgan tip, static | %48,65 · ×2,251 | %48,78 · ×2,247 | **+0,13** |
| **Her 3. tip, BEAM (üretim)** | **%70,10 · ×1,424** | **%70,49 · ×1,417** | **+0,39** |

**Yorumu gevşetmek hiçbir şey kazandırmıyor.** Bu bir üst sınır değil, tam ölçüm: doğrudan-temas
yorumu kırılganlığın literatürdeki olağan tanımıdır ve bizde uygulanınca 0,2 puandan az fark
yaratıyor.

**Neden:** kırılganın üstünden köprü kurabilmek için komşu yığınların tam o yükseklikte
%60 destek sağlaması gerekiyor; gerçek yükte bu neredeyse hiç denk gelmiyor. Yani sütun mühürü
katı yorumdan değil **geometriden** doğuyor.

> Sonuç: kırılganlığın −21,81 puanı **fizik**, yorum tercihi değil. Kazanç aranacaksa başka
> yerde aranmalı — yerleştirme şemasında ya da sıralamada.

### 2.3 Neden bu kadar pahalı — mekanizma

Kırılgan kutu bulunduğu sütunu **mühürlüyor**. Duvar örücü yığını yukarı doğru büyütürken
(`FillColumn`, `RaiseBlock`) kırılgan bir kutu tabana düştüğü anda o ayak izi ölü hacme dönüşüyor.
Yayılma sayısı bunu doğruluyor: kısıtsız ×1,151 → kırılganlıkla **×2,359** (static), üretim yolunda ×1,086 → **×1,424**. Yani yük, aynı hacmi
taşımak için belirgin biçimde daha uzun bir mesafeye yayılıyor — çünkü yukarı gidemiyor, ileri
gidiyor.

### 2.4 Bugüne kadar ne denendi

Kırılganlıkla ilgili tek eski kayıt `DR-27` (sekizinci kapı, `OPT-15`): aday kendi kırılganlık
kısıtına karşı da sınanır hâle getirildi — bir **doğruluk düzeltmesiydi**, doluluk çalışması değil.

Bugün (20 Ağu) iki şey ölçüldü ve ikisi de **kapandı**:

| Deneme | Sonuç |
|---|---|
| **Doğrudan-temas yorumu** (§2.2) | +0,18 puan. Yorum suçlu değil, geometri suçlu |
| **Kırılgan payı taraması** (§1) | Eğri uçurum; tek tip bile −37,95. Pay ayarlamak çözüm değil |

Geriye kalan yön: **yerleştirme şeması ve sıralama.** İkisi de hiç denenmedi.

### 2.5 Araştırmaya sorular

1. **Gerçek sevkiyatta kırılgan ürün payı nedir?** Bizim korpusumuzda tiplerin ~%33'ü. Literatürde
   (Bortfeldt & Wäscher derlemesi, 3L-CVRP instance aileleri, Krebs & Ehmke instance'ları) bu oran
   ne? %5-15 bandında mı?
2. **Kural sütun-geneli mi olmalı, doğrudan-temas mı?** Literatürde "fragility"/"load bearing
   strength" nasıl modellenmiş? Ratcliff & Bischoff'un *load bearing* yaklaşımı, Junqueira vd.'nin
   *load bearing strength* kısıtı, Bortfeldt & Gehring'in *stacking constraints* tanımı — hangisi
   sütun geneli, hangisi temas?
3. **`MaxWeightOnTop` ile kırılganlık aynı eksende mi?** Bizde kırılganlık **kategorik**
   (0 kg), `MaxWeightOnTop` **dereceli**. Literatür kırılganlığı dereceli taşıma dayanımıyla mı
   modelliyor? Öyleyse kategorik kapı gereksiz katı olabilir.
4. **Kırılgan yükte hangi yerleştirme şeması kazanıyor?** Duvar örücü sütun büyütmeye dayanıyor ve
   kırılganlık tam olarak onu kesiyor. Katman/şerit tabanlı şemalar bu rejimde daha mı iyi?
   *(Not: **layer building yasak** — `DR-12`, müşteri kararı. Alternatif aranıyorsa layer dışında
   aranmalı.)*
5. **Kırılgan kutuları önce mi sonra mı yerleştirmeli?** Bugün sıralama hacim-azalan; kırılganlık
   sıralamada hiç rol oynamıyor. "Kırılganları en sona bırak, üstlerini kapatacak yer kalmasın"
   ya da tersi — literatürde ölçülmüş mü?

---

## 3. İstif sınırı (`MaxStackCount`)

### 3.1 Kural

`R-A04`: `MaxStackCount` ve `MaxWeightOnTop` **sütun genelidir** (tek katman değil). İki yönlü
sorulur: `ViolatesStackCount` (aşağı) ve `ViolatesLoadAbove` (yukarı).

### 3.2 Sayılar

Gerçek korpus, üst üste en fazla **2** kutu (`ConstraintCorpus.MaxStack = 2`):

| | Static | Beam (üretim) |
|---|---|---|
| Kısıtsız | %86,60 | %91,91 |
| İstif ≤ 2 | %71,52 | **%78,22** |
| Maliyet | −15,08 | **−13,69** |
| Yayılma | ×1,151 → ×1,414 | ×1,086 → ×1,289 |

Üretimde **−13,69 puan**: kırılganlığın altında ama LIFO'nun **üç buçuk katı**. Dikkat çekici
olan, beam'in burada static'e göre çok az kazanç sağlaması (−15,08 → −13,69): istif sınırı
sıralamayla aşılabilen bir kısıt değil, geometrik bir tavan.

Bu da korpusun seçtiği bir sayı: **her ürün** `MaxStackCount = 2` alıyor. Gerçek sevkiyatta bu
sınır genelde ürüne özgüdür ve çoğu üründe **yoktur**.

---

## 4. Ağırlık — tek konu değil, ÜÇ ayrı konu

Bunlar sık karıştırılıyor; ayrı ayrı ele alınmalı.

### 4.1 Araç ağırlık tavanı (`R-A07`)

Kod: ana döngüde, **sıra düzeyinde**:

```csharp
if (totalWeight + item.Weight > input.VehicleMaxWeight)
    unplaced.Add(new UnplacedBox(item.ItemId, UnplacedReason.WeightLimitExceeded));
```

**Sırf sıralamaya bağlı.** Ağırlık bağlayıcı olduğunda hangi kutuların düşeceğini
*yerleştirme sırası* belirliyor; "kalan kapasiteye en çok hacim sığdır" diye bir seçim yok
(ağırlık-kapasiteli knapsack yok). Arama katmanı sırayı değiştirdiği için beam bunu **dolaylı
olarak** optimize ediyor, ama açık bir mekanizma yok.

**Ölçüm kapsaması: SIFIR.** Her iki korpus da `VehicleMaxWeight = 1.000.000` kg kullanıyor
(`BrCorpus.cs:90`, `GercekCorpus`), yani tavan **hiçbir kıyas koşusunda bağlamıyor**. Bu bilinçli
bir karardı — kullanıcı *"ağırlık yüzünden doluluğumuzu kaybedemeyiz, ölçüler daha önemli"* dedi —
ama sonucu şu: **`R-A07`'nin doluluk maliyeti hakkında hiçbir sayımız yok.**

### 4.2 `MaxWeightOnTop` ve `IsStackable = false`

Kural var, kapı var (`ViolatesStackWeight`, `ViolatesStackability`), ama:

> **Bu iki kısıt HİÇBİR korpusta ölçülmüyor.** `ConstraintCorpus` yalnız `UnloadingOrder`,
> `GroupId`, `FragilityType` ve `MaxStackCount` yazıyor. `MaxWeightOnTop` ve `IsStackable`
> dokunulmadan geçiyor; BR korpusunda ikisi de sıfır/true.

Bu, `DR-38`'in kapattığı sanılan kapsama deliğinin **açık kalan yarısı**. `DR-66` üç kısıtı ölçtü
(LIFO, kırılganlık, istif adedi); üst ağırlık ve istiflenemezlik hâlâ yalnız on yedi elle yazılmış
senaryoda sınanıyor.

### 4.3 Ağırlık dengesi / ağırlık merkezi (CoG) — **üretimde optimize EDİLMİYOR**

Bu bölüm brifingin en önemli bulgusudur.

**Hesaplanıyor:** `PlanResultBuilder` üç eksende CoG'yi ve `WeightBalanceOffsetX/Z` sapmalarını
üretiyor; API bunları döndürüyor, arayüz gösteriyor.

**Optimize edilmiyor:** üretim yolu `BeamSequencer`'dır (`SequencerSelection.Resolve` →
`SequencerKind.Beam`, `DR-56`). `BeamSequencer` dosyasında `Balance`, `Cog` ya da
`SearchEvaluation` geçmiyor — amaç fonksiyonu **yalnız** leksikografik `(doluluk, kullanılan
uzunluk)`. Duvar örücünün skorunda da denge terimi yok.

Denge terimi **yalnız `SearchEvaluation.Cost` içinde** yaşıyor (katsayı `WeightBalance`
kriterinde 5e4, diğerlerinde 5e2) — ve orayı **yalnız GRASP ile GWCA** çağırıyor.

**Nasıl oldu:** greedy kaldırılırken (`DR-39`) `BalanceScoring` — ağırlık merkezi cezası ve takas
geçişi — silindi. O kararın gerekçesi açıkça şuydu: *"GRASP üretim varsayılanı olduğu için denge
sıra düzeyinde optimize edilmeye devam eder."* Sonra `DR-56` varsayılanı **beam**'e çevirdi ve o
gerekçe **sessizce geçersizleşti.** Kimse bağı fark etmedi.

**Bugün `Criteria = WeightBalance` seçildiğinde üretimde tek etkisi:**
`ItemOrdering.ApplyCriteriaSort` kutuları **ağırlık-azalan** sıralıyor. Başka hiçbir şey.

**Ölçüm kapsaması: SIFIR.** `br` kipi denge sapmasını hiç raporlamıyor; `WeightBalance` kriteri
kıyas korpuslarında hiç koşmuyor.

---

## 5. Kontaminasyon / ayrışım

`ContaminationFilter` motordan **önce** çalışır: `stackGroup` taşıyan ürünlerden **en yüksek
hacimli grup geçer**, çakışan diğer gruplar `SegregationOrCompatibility` sebebiyle elenir.

Bu, bir yerleştirme kuralı değil bir **ön eleme**. Yani "uyumsuz iki grubu aynı araca ayrı
bölgelere koy" diye bir yetenek yok — biri tamamen düşüyor. Araştırmaya sorulabilir: literatürde
ayrışım (segregation) kısıtı böyle mi çözülüyor, yoksa mesafe/bölge tabanlı bir yerleşim kuralı mı?

---

## 6. Belge–kod ayrışmaları (bu brifingi hazırlarken bulundu)

| Ne | Durum |
|---|---|
| **Destek eşiği** — `R-A02`, sözlük ve `DR-16` **%80** diyordu, kod **%60** | ✅ **Düzeltildi** (bu commit). 19 Ağu'da müşteri kararıyla indirilmişti; kural metni güncellenmemişti |
| `01-kurallar.md` §A1 dosya haritasındaki ölü greedy tablosu | ✅ Düzeltildi (önceki commit) |
| `R-C13`/`R-C13a` sanal duvar (LIFO bant) | ✅ `DR-67` ile çıkarılabilirlik kuralına yeniden yazıldı |
| `C6` kısıt eşleme tablosu: *"Ağırlık dengesi → fitness `BalanceDev`"* | ⚠ **Yanıltıcı** — üretim yolunda böyle bir terim yok (§4.3) |

---

## 7. Açık borç

- **Kırılganlık yorumu ölçülmedi** (sütun geneli vs doğrudan temas) — en büyük tek belirsizlik.
- **`MaxWeightOnTop` ve `IsStackable=false` kıyas korpusunda yok** — `DR-38`'in açık kalan yarısı.
- **Ağırlık dengesi üretimde optimize edilmiyor** ve bu hiçbir yerde kayıtlı değil.
- **Araç ağırlık tavanının maliyeti ölçülmedi** (korpuslarda 1.000.000 kg).
- Kırılgan payı (`FragileEvery = 3`) ve istif sınırı (`MaxStack = 2`) **gerekçesiz** seçilmiş
  sabitler; maliyet eğrisinin nerede durduğu bilinmiyor.
- `BlockCatalog` üretim yolunda çağrılmıyor (`DR-62` yan tespiti) — hâlâ açık.

---

## 8. Araştırmaya özet soru listesi

1. Gerçek sevkiyatta kırılgan ürün payı? İstif sınırı taşıyan ürün payı?
2. Kırılganlık literatürde sütun geneli mi, doğrudan temas mı modelleniyor?
3. Kırılganlık kategorik mi olmalı yoksa dereceli taşıma dayanımı (`MaxWeightOnTop`) mı?
4. Kırılgan/istif-sınırlı yükte hangi yerleştirme şeması kazanıyor? (**layer building hariç**,
   `DR-12`)
5. Ağırlık dengesi CLP literatüründe nasıl optimize ediliyor — amaç fonksiyonu terimi mi, onarım
   geçişi mi, kısıt mı? Doluluğa bedeli ne?
6. Ağırlık kapasitesi bağlayıcı olduğunda kutu seçimi (knapsack) nasıl yapılıyor?
7. Ayrışım (segregation) kısıtı: ön eleme mi, yerleşim kuralı mı?
