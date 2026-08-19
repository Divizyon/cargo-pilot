# 05 · Başarı Karnesi

**Kalıcı dosya. Üzerine yazılır — geçmiş burada tutulmaz.** Bu dosya *bugün nerede olduğumuzu*
söyler. "Nasıl buraya geldik" [04-olcum-gunlugu.md](04-olcum-gunlugu.md)'de, "neden böyle karar
verdik" [02-kararlar.md](02-kararlar.md) ve [ADR-0010](../adr/ADR-0010-duvar-orucu-ve-arama-katmani.md)'de
durur.

Terimler için [00-sozluk.md](00-sozluk.md). Bir sayıyı buraya yazmadan önce hangi **yerleştirici ·
sıralayıcı · korpus · yönelim** ile ölçüldüğü belirtilmelidir; yoksa sayı kıyaslanamaz.

**Son güncelleme:** 19 Ağustos 2026 (paralel dal değerlendirme, `DR-64`) · dal `feat/algoritma-arama-katmani`

---

## Tek satırda

**Duvar örücü + ileri bakışlı ışın araması, BR1-BR7: %90,51.** Greedy'nin (%75,23) 12,5 puan üstünde, literatürün en
iyilerinin (~%94-95, ama örnek başına 240-320 saniyeyle) ~7 puan altında. Kayıp neredeyse eşit
bölünüyor: yarısı duvar kesitinde kalan **kenar şeritleri**, yarısı yığının üstündeki **ölü hava**.
Yığının içi masif.

## Doluluk

BR1-BR7, 700 örnek (GRASP satırları 175 örnek üzerinden). Yönelim eşlemesi `DR-42` ile birebir
oldu; tek resmî sayı var, eski `strict`/`free` ikiliği kaldırıldı.

| Yapılandırma | BR1-BR7 | Süre (medyan) |
|---|---|---|
| Greedy — *kaldırıldı, tarihsel* | %75,23 | ~65 ms |
| Duvar örücü, kule yok | %77,00 | 5-13 ms |
| Duvar örücü + static, yönelim eşlemesi hatalıyken | %80,09 | 2-5 ms |
| Duvar örücü + static, sözlükbilimsel aday seçimi | %82,61 | 1-2 ms |
| Duvar örücü + **static** | **%83,63** | 1-2 ms |
| Duvar örücü + GRASP, yönelim eşlemesi hatalıyken | %86,23 | 1,1-2,0 sn |
| Duvar örücü + GRASP, sözlükbilimsel aday seçimi | %87,73 | 1,3-2,0 sn |
| Duvar örücü + GRASP — *kıyas referansı* | %88,34 | 1,3-2,0 sn |
| Duvar örücü + **beam** — *üretim varsayılanı* | **%90,51** | 2,0 sn (anytime, paralel) |
| Literatürün en iyileri (CLTRS, ID-GLTS, BSG-VCS, mp-BRKGA) | ~%94-95 | örnek başına ~240-320 sn |

Literatür kıyası **eşit süreli değildir** — onlar örnek başına dakikalar harcıyor, biz 2 saniye.
Araştırma yanıtı 2 saniyelik bütçede gerçekçi hedefi **%90-92** olarak veriyor ve bunun bir
**varsayım** olduğunu söylüyor; yayımlanmış küçük bütçe eğrisi yok.

## Kümeye göre

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 |
|---|---|---|---|---|---|---|---|
| Kutu tipi sayısı | 3 | 5 | 8 | 10 | 12 | 15 | 20 |
| Static (CI referansı) | %82,47 | %83,35 | %83,68 | %83,40 | %83,59 | %83,17 | %83,17 |
| GRASP | %86,35 | %88,11 | %89,14 | %88,61 | %88,58 | %88,45 | %87,48 |
| **Beam** | %89,72 | %90,54 | %91,13 | %90,58 | %90,86 | %90,67 | %90,06 |

**Kümeler arası fark neredeyse kapandı.** VCS aday değerlendirmesi (`DR-52`) en çok heterojen
kümelerde kazandırdı; static'te yayılım 1,21 puana indi (önce 1,71). BR1 tek kaybeden (−0,31
static, −0,72 GRASP) ve artık en zayıf kümemiz o.

*Tarihsel not:* **BR1 uzun süre en kötü kümemizdi.** Yönelim eşlemesi düzeltilince en çok orası kazandı (+2,33) ve
sıra normale döndü: en zor küme artık BR7 (20 tip, en az tekrar) — literatürdeki sıralamayla aynı
yön. Bu, bir yılın en net teşhis düzeltmesi: "BR1'de neyi kaçırıyoruz" sorusunun cevabı
algoritmada değil, veri eşlemesindeydi.

## Plan kalitesi (GRASP, ölçülen)

| Ölçü | Değer | Yorum |
|---|---|---|
| Yığın yüksekliği | %87-91 | Kayıp buranın üstünde |
| İç boşluk | %0,1-0,9 | Yığın **masif** |
| Ölü hava | %8,6-13 | Kaybın tamamı |
| Ortalama destek | %98,7-100 | %80 eşiği **hiç bağlamıyor** (`DR-16`) |
| En düşük destek | %81,5-97,7 | Eşiği ihlal eden kutu **yok** |
| Kalan boşluk sayısı | 3-16 | Hacim gerçekten parçalanmış |

### Duvar (BR1, 20 örnek — `DR-44`, `DR-45`)

Duvar sınırları yerleştiricinin kendisinden okunuyor (`OptimizationResult.Walls`), tahmin değil.

| Ölçü | Static | GRASP |
|---|---|---|
| **Duvar dışı kutu** | **%0,0** | **%45,0** ⚠ |
| Duvar sayısı | 6,7 | 3,8 |
| Ortalama duvar derinliği | 86 cm | 47 cm |
| **Duvar yüzü kaplama, ortalama** | **%86,2** | %48,9 |
| %95 eşiğinin altındaki duvar | **%91** | %46 |
| Ölü hava · kenar şeridi | %8,5 | %3,0 |
| Ölü hava · tavan artığı | %6,7 | %3,4 |

İki ayrı sorun: **kesit tam döşenmiyor** (static'te duvarların %91'i eşik altında) ve **arama
duvar disiplininden vazgeçiyor** (GRASP'ta kutuların %45'i hiçbir duvarda değil).

## Güvence

| | Durum |
|---|---|
| Motor testleri (`CargoPilot.Engine.Tests`) | **173/173** |
| Altyapı testleri (`CargoPilot.Infrastructure.Tests`) | **36/36** |
| Uygulama testleri (`CargoPilot.Application.Tests`) | **228/228** |
| Test aracı (`apps/algorithm-test-ui`) | 201/201 |
| Golden snapshot | 17/17 bayt birebir |
| Duvar örücü değişmez kapsaması | Katalogdaki her senaryo, hem static hem GRASP |
| Determinizm (`R-C02`) | Aynı tohum → bit birebir aynı plan (static ve GRASP) |
| Gecelik kapı | BR1-BR7 static, [referans](referans/br-wallbuilder-static.json) ile kıyas |

## Ölçüm güvenilirliği

- **Static gürültüsüzdür** — saf hesap, aynı girdi bit birebir aynı sonuç. Her fark gerçektir.
- **Beam'in gürültü bandı ~±0,05 puan** (`DR-61`). Bütçesi duvar saati olduğu için saniyede kaç dal
  değerlendirildiği makine yüküne bağlı; aynı kod farklı zamanlarda %89,97-%90,04 verdi. **Beam'de
  0,1 puandan küçük farklar gürültü sayılır.**
- Static yol **saf hesaptır**; her makinede bit birebir aynı. CI kapısı bu yüzden yalnız static
  ölçer, toleransı (0,05 puan) yalnızca JSON yuvarlamasına karşıdır.
- GRASP'ın bütçesi **duvar saatidir**; sonucu makineye bağlıdır, elle ölçülür ve
  [04-olcum-gunlugu.md](04-olcum-gunlugu.md)'ye yazılır.

## Kapatılan motor hataları

| | Ne | Durum |
|---|---|---|
| `OPT-01` / `OPT-02` | Kutu havada, yük ters — fiziksel olarak geçersiz planlar | **Kapandı** (15 Ağu 2026, [adli inceleme](arsiv/2026-08-15-adli-inceleme.md)) |
| `OPT-15` | Ana döngü yalnız aşağı bakıyordu; köprü altındaki cebe kırılgan kutu yerleşiyordu | **Kapandı** — sekizinci sert kapı üç yere eklendi, 17 snapshot değişmedi |

## Bilinen açıklar

| | Ne | Etki |
|---|---|---|
| `DR-38` | **Kısıt tarafında kıyas kapsaması yok.** Hiçbir korpusta LIFO / kırılganlık / ağırlık senaryosu yok; `R-C14` metrikleri (`WallCount`, `AvgWallFlushness`, `ZoneViolations`) hiç üretilmiyor | `DR-09`/`DR-10`/`DR-11` doğrulanamıyor |
| — | **Ağırlık dengesi duvar örücüde optimize edilmiyor.** Greedy'nin `BalanceScoring`'i kalktı; denge yalnız GRASP uygunluğunda, sıra düzeyinde | Bilerek kabul edilen gerileme (~3× kötü) |
| `DR-64` | **Eşzamanlılık ölçülmedi** — beam her istekte bütün çekirdekleri istiyor; eşzamanlı istekler doluluğu düşürebilir | Ölçüm tek istek üzerinden yapıldı |
| — | **Üretim gecikmesi ~4 sn** ve arayüzde bekleme göstergesi yok. Ölçüldü: yarısı motor değil, **API/DB yükü** (static de 2,09 sn) | İki ayrı iş: arayüz göstergesi ve kalıcılık maliyeti |
| — | İki ret sebebi hiç üretilmiyor (`NotStackable`, `GeometryConstraint`) | 12 Ağu 2026 raporundan devreden borç |
| `DR-53` | **VCS ince ayarında puan kalmadı** — 25 yapılandırma tarandı, kazanan bölge %83,35-83,40'ta düz | Kalan kazanç ileri bakışta (F7-4) |
| `DR-43` | **Sıra araması doymuş** — 30 kat bütçe +0,04 puan getiriyor | Kalan açık sıralayıcıda değil; blok karar uzayında (F6-4) |
| `DR-44` | **Duvar kesiti tam döşenmiyor** — static'te duvarların %91'i %95 kaplamanın altında | F6-3'ün gerekçesi |
| `DR-45` ⚠ | **GRASP kutuların %45'ini hiçbir duvara koymuyor** | Açık **ürün** kararı: sahadaki ekip bu planı yükleyebiliyor mu? |
