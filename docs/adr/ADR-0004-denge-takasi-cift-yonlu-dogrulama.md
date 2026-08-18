# ADR-0004 — Denge Takasında Çift Yönlü Doğrulama

- **Durum:** Yerini aldı: [ADR-0010](ADR-0010-duvar-orucu-ve-arama-katmani.md) *(2026-08-18 — `BalanceScoring` silindi; yalnız `ViolatesLoadAbove` sekizinci sert kapı olarak yaşıyor)*
- **Tarih:** 2026-08-15 *(karar tarihi; ADR 2026-08-17'de geriye dönük yazıldı)*
- **Kapsam:** OPT-01 · PR #989 (`72e9fdfa`) · **Sonradan sınandı:** PR #997 (`62be448f`)
- **Etkilediği kod:** `CargoPilot.Application/Common/Optimization/BalanceScoring.cs`,
  `.../PlacementValidator.cs`

> **Geriye dönük kayıt.** Karar 2026-08-15'te alınıp uygulandı; bu ADR sonradan yazıldı.
> Ölçümler gerçek `dotnet test` koşularından alınmıştır (.NET 8.0.419, izole çalışma kopyası).

## Bağlam

`WeightBalance` kriterinde greedy faz bittikten sonra ikinci bir geçiş çalışır: kutu çiftleri
takas edilerek ağırlık merkezi sapması azaltılır (`BalanceScoring.ImproveBalance`). Her aday
takas `SwapIsValid` ile fiziksel kısıtlara karşı doğrulanır.

`SwapIsValid` içindeki üst-kutu destek doğrulaması tek bir `if`'in içine hapsedilmişti
(düzeltme öncesi `BalanceScoring.cs:178`):

```csharp
if (a.H != b.H)
{
    var oldATopY = b.Y + a.H;
    var oldBTopY = a.Y + b.H;
    foreach (var c in others) { … HasSupportFor(c, …) … }
}
```

**Koşul yanlıştı.** Destek kaybının koşulu yükseklik farkı değil, **taban alanı farkıdır.**
İki kutu aynı yükseklikte ama farklı genişlikte olduğunda takas sonrası eski üst yüzeyler aynı
Y'de kalır; buna rağmen o seviyede duran kutunun **altındaki destek alanı** değişir.
`a.H == b.H` durumunda döngü hiç çalışmıyor, destek kontrolü tamamen atlanıyordu → havada kutu.

İki ek kör nokta aynı fonksiyondaydı:

1. `others` listesi `k != i && k != j` ile kuruluyordu, yani **a ve b birbirine karşı hiçbir
   kısıtta test edilmiyordu** — ne çakışma, ne destek, ne istif, ne kırılganlık.
2. `ViolatesStackability` / `StackCount` / `StackWeight` / `Fragility` yalnızca **aşağı**
   bakıyordu. Takas bir kutuyu mevcut bir yığının **altına** taşıdığında o kutunun kendi
   `IsStackable` / `FragilityType` / `MaxStackCount` / `MaxWeightOnTop` kısıtları hiçbir yerde
   değerlendirilmiyordu.

Hata sentetik değildi. 500 kutuluk gerçekçi `WeightBalance` yükünde taban çizgisinde
**1 kutu havada** kalıyordu:

```
[Buyuk500_WeightBalance] 1 kutu havada (gereken destek 0.80):
318. kutu destek oranı 0.6667 — …@(180,110,415) 60x35x50
```

## Karar

### 1. Yükseklik koşulu kaldırıldı; destek doğrulaması her takasta çalışır

`if (a.H != b.H)` koşulu ve süslü parantezleri silindi. İki eski üst yüzey seviyesi
(`oldATopY`, `oldBTopY`) her takasta taranır.

Gerekçe koda yazıldı (`BalanceScoring.cs:189-190`):
*"…yükseklikler eşit olsa bile kontrol atlanamaz çünkü kutuların taban ALANI birbirinden farklı
olabilir."*

Sonuçları:

- Bu, kararın **maliyet üreten** tek maddesidir: eşit yükseklikli çiftlerde daha önce atlanan
  destek taraması artık her çiftte koşuyor (ölçüm aşağıda).
- Üst kutu destek döngüsü indeks tabanlı yazıldı (`BalanceScoring.cs:194-202`,
  `placements.Where((_, m) => m != k)`), böylece eski ifadedeki `record` değer-eşitliği
  bağımlılığı ortadan kalktı — aynı boyut/ağırlıktaki iki kutu artık birbirine karışmıyor.

### 2. `others` ikiye bölündü: `othersA` / `othersB`

`BalanceScoring.cs:152-153`:

```csharp
var othersA = placements.Where((_, k) => k != i).ToList();   // b'yi YENİ konumunda içerir
var othersB = placements.Where((_, k) => k != j).ToList();   // a'yı YENİ konumunda içerir
```

16 kısıt çağrısının argümanı yönüne göre `othersA`/`othersB` olarak değiştirildi
(`BalanceScoring.cs:157-177`).

Gerekçe:

- Tek değişiklikle a↔b kör noktası **altı kısıtın tamamında** aynı anda kapanır; kısıt başına
  ayrı bir özel durum yazmaya gerek kalmaz.

Sonuçları:

- Daha önce sessizce kabul edilen bazı takaslar artık reddediliyor. Denge kalitesindeki kayıp
  **ölçülemedi**: mevcut snapshot korpusu tek tip 100×100×100 küplerden ibaret olduğu için
  reddedilme koşulları o geometride tetiklenmiyor. 500 kutuluk senaryoda doluluk değişmedi
  (%58,4) — iyiye işaret, ama tek gözlem.

### 3. `ViolatesLoadAbove` eklendi

`PlacementValidator.cs:226` — kutunun **üstündeki** yükü kutunun kendi kısıtlarına karşı soran
tek geçişli O(n) fonksiyon. `BalanceScoring.cs:182-183`'te her iki yön için çağrılıyor.

Gerekçe:

- Mevcut dört kısıt fonksiyonunun hepsi aşağı bakıyordu; yukarı bakan aynası yoktu. Takas bir
  kutuyu yığının altına taşıyabildiği için bu ayna zorunluydu.
- Semantik, aşağı bakan aynalarıyla birebir hizalandı: istiflenebilirlik tam temasla,
  kırılganlık/istif adedi/üst ağırlık sütun geneliyle değerlendirilir; örtüşme formülü aynıdır.

Sonuçları:

- Kısıtsız kutuda erken çıkışla maliyet sıfırdır (`IsStackable && !Fragile && MaxStackCount <= 0
  && MaxWeightOnTop <= 0m` → `false`).
- Fonksiyonun **doğrudan birim testi yok**; dolaylı olarak `InvariantTests` ve
  `KirilganlikTests` kapsıyor. Kalan boşluk.

### 4. %43 yavaşlama bilinçli olarak kabul edildi

500 kutu, aynı makine, izole çalışma kopyası:

| Kriter | Öncesi | Sonrası | Oran |
|---|---|---|---|
| VolumeFirst | 9 785 ms | 10 017 ms | 1,02× (gürültü) |
| **WeightBalance** | **20 562 ms** | **29 453 ms** | **1,43×** |
| Lifo | 9 662 ms | 9 771 ms | 1,01× (gürültü) |

Gerekçe:

- Yavaşlamanın kaynağı doğrudan kararın 1. maddesidir; ucuzlatmanın tek yolu atlanan kontrolü
  geri koymaktır, yani hatayı geri getirmektir.
- Yalnızca `WeightBalance` etkilenir; `ImproveBalance` diğer iki kriterde hiç çağrılmıyor.
- En yavaş kriter 29,5 sn ile `PerformansTabanCizgisiTests`'in **120 000 ms** üst sınırının çok
  altında; sınır değiştirilmedi ve zorlanmadı.
- Yerleşen kutu, dışarıda kalan ve doluluk üç kriterde de değişmedi (`yerlesen=500 disarida=0
  doluluk=%58,4`). Bedel süredir, plan kalitesi değil.

Sonuçları:

- Tek tip paletli gerçek yüklerde artış daha büyük olabilir; performans testi bu yükü temsil
  etmiyor. **Tahmin — ölçülmedi.**
- Motorun bu bölgesine dokunacak bir sonraki iş (ör. yerinde takas + delta ceza) bu maliyetin
  üstüne gelir; süre bütçesi oradan yeniden değerlendirilmelidir.

### 5. Bu ADR olmasaydı düzeltme geri gelirdi — ve neredeyse geldi

PR #997 (`fix/koordinat-z-ekseni`) `dev`'in 9 commit gerisinden dallanmıştı ve OPT-01'i
görmüyordu. Kendi dalında `BalanceScoring.SwapIsValid`'in **eski** hâlini taşıyordu: tek `others`
listesi ve `if (a.Height != b.Height)` kapısı — yani düzeltmenin kaldırdığı koşul, yalnızca
ölçü alanları yeniden adlandırılmış (`.W/.H/.D` → `.Width/.Height/.Length`) hâliyle.

Git bu iki değişikliği çakışmasız birleştirebiliyordu. Kapı, yeni alan adlarıyla ve
"koordinat standardı uyumu" başlığı altında, davranışsal bir geri alma olarak görünmeden geri
gelebilirdi. Birleştirmede bilinçli olarak `dev` tarafı korundu, #997 tarafı atıldı ve yalnız
alan adları çevrildi.

Doğrulama (`dev` @ `628c55d4`):

- `grep -c 'a.H != b.H' BalanceScoring.cs` → `0`
- `grep -c 'a.Height != b.Height' BalanceScoring.cs` → `0`
- `ViolatesLoadAbove` çağrıları yerinde: `BalanceScoring.cs:182-183`

**Bu ADR'nin varlık sebebi budur.** Yazılı bir karar kaydı olsaydı, o hunk'ın ne olduğu
birleştirmeyi yapan kişiye tartışmasız görünürdü. Bundan sonra bu dosyanın destek doğrulama
bölgesine dokunan her PR, bu ADR'ye atıf yapmadan yükseklik tabanlı bir kapı geri getiremez.

## Kanıt — kırmızıdan yeşile

| Ölçüm | Düzeltme ÖNCESİ | Düzeltme SONRASI |
|---|---|---|
| Toplam test | 59 | 59 |
| Geçen | 57 | **59** |
| Kırmızı | **2** | **0** |
| Golden-master (6 VolumeFirst + 5 Lifo + 5 WeightBalance) | — | **16/16 yeşil** |
| Değişen snapshot dosyası | — | **0** (`git status --porcelain .../Snapshots` → boş) |

Kırmızıdan yeşile dönen iki test:

1. `BalanceSwapSupportTests.WeightBalance_EsitYukseklikteFarkliTabanliTakas_UsttekiKutuyuHavadaBirakmaz`
   — araç 200×200×100; A (0,0,0) 100×50×100, B (100,0,0) 50×50×100, C (0,50,0) 100×50×100.
   `A.H == B.H == 50` olduğu için eski kapı bloğu atlanıyor; takas sonrası C'nin altında yalnız B
   kalıyor → örtüşme 50×100 = 5 000, taban 100×100 = 10 000 → **destek oranı 0,50 < 0,80**.
   Denge cezası 0,4375 → 0,3125 düştüğü için takas kabul ediliyordu.
2. `InvariantTests.Motor_UretilenPlan_FizikselDegismezleriKorur(senaryo: "Buyuk500_WeightBalance")`
   — 500 kutuluk gerçekçi yükte 1 kutu havada (destek oranı 0,6667).

Üretim kodu değişikliği **2 dosya** (`BalanceScoring.cs` +51/−38, `PlacementValidator.cs` +53/−0).

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| **Koşulu `a.H != b.H` yerine `a.Width != b.Width \|\| a.Length != b.Length` yapmak** | Aynı hatanın daha dar hâli. Taban alanı eşit ama **konumu** farklı iki kutuda da destek değişir; koşul yine yanlış negatif üretirdi. Doğru koşul yoktur — kontrol her takasta çalışmalıdır. |
| **Plan geneli ihlal sayacı** (`CountViolations` + `baselineViolations`, "yeni ihlal yok" kapısı) | Takas başına O(n²) tam tarama demektir; ikinci geçiş zaten O(n²) ve 3 tur çalışıyor. Ölçülen %43 yerine kat kat daha büyük bir maliyet üretirdi. Ayrıca "önceden var olan ihlali koru" semantiği, hatayı gizlemenin başka bir biçimidir. |
| **İkinci geçişi (`ImproveBalance`) tamamen kapatmak** | Hatayı kesin olarak ortadan kaldırırdı ama `WeightBalance` kriterinin tek ağırlık merkezi iyileştirme mekanizması odur; kriter işlevsiz kalırdı. Beş `WeightBalance` golden-master'ının tamamı bu geçişin çıktısını kilitliyor. |
| **Yavaşlamayı önlemek için kontrolü örnekleme ile yapmak** (her N takasta bir) | Fiziksel geçerlilik olasılıksal olamaz: tek bir kaçak takas havada kutu üretir ve bu üretimde operatörün karşısına çıkar. Ölçülen 29,5 sn zaten 120 sn sınırının altında. |

## Açık konular

- **Denge kalitesi bedeli ölçülemedi.** Snapshot korpusu tek tip küplerden ibaret; reddedilen
  takasların ağırlık merkezine etkisi mevcut testlerle görünmüyor. Farklı taban alanlı kutulardan
  oluşan bir `WeightBalance` senaryosu eklenmeli.
- **`ViolatesLoadAbove` doğrudan test edilmiyor.** Kırılganlık ve `MaxWeightOnTop` odaklı iki
  takas testi yazılmadı.
- **Kapsam sınırı:** bu karar yalnız takasın *yeni* ihlal yaratmasını engeller. Greedy fazın
  ürettiği yerleşimde önceden var olan bir ihlal varsa düzeltmez. Bilinçli.
- **Gerçek yük profili ölçülmedi.** Tek tip paletli yüklerde eşit yükseklikli çift oranı çok daha
  yüksek olacağı için yavaşlama 1,43×'in üzerine çıkabilir (**tahmin**).
