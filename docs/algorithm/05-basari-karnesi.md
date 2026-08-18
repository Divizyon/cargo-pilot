# 05 · Başarı Karnesi

**Kalıcı dosya. Üzerine yazılır — geçmiş burada tutulmaz.** Bu dosya *bugün nerede olduğumuzu*
söyler. "Nasıl buraya geldik" [04-olcum-gunlugu.md](04-olcum-gunlugu.md)'de, "neden böyle karar
verdik" [02-kararlar.md](02-kararlar.md) ve [ADR-0010](../adr/ADR-0010-duvar-orucu-ve-arama-katmani.md)'de
durur.

Terimler için [00-sozluk.md](00-sozluk.md). Bir sayıyı buraya yazmadan önce hangi **yerleştirici ·
sıralayıcı · korpus · yönelim** ile ölçüldüğü belirtilmelidir; yoksa sayı kıyaslanamaz.

**Son güncelleme:** 18 Ağustos 2026 · dal `feat/algoritma-arama-katmani`

---

## Tek satırda

**Duvar örücü + GRASP, BR1-BR7, strict: %86,23.** Greedy'nin (%75,23) 11 puan üstünde,
literatürün en iyilerinin (~%92-93) 6 puan altında. Kaybın tamamına yakını yığının **üstündeki ölü
havada**; yığının içi masif.

## Doluluk

BR1-BR7, 700 örnek (GRASP satırları 175 örnek üzerinden).

| Yapılandırma | `strict` (alt sınır) | `free` (üst sınır) | Süre (medyan) |
|---|---|---|---|
| Greedy — *kaldırıldı, tarihsel* | %75,23 | — | ~65 ms |
| Duvar örücü, kule yok | %77,00 | — | 5-13 ms |
| Duvar örücü + **static** | **%80,09** | %82,77 | 2-5 ms |
| Duvar örücü + **GRASP** — *üretim varsayılanı* | **%86,23** | **%88,34** | 1,1-2,0 sn |
| Literatürün en iyileri (CLTRS, ID-GLTS, BSG-VCS, mp-BRKGA) | ~%92-93 | — | örnek başına ~240-320 sn |

Literatür kıyası **eşit süreli değildir** — onlar örnek başına dakikalar harcıyor, biz 2 saniye.

## Kümeye göre

| | BR1 | BR2 | BR3 | BR4 | BR5 | BR6 | BR7 |
|---|---|---|---|---|---|---|---|
| Kutu tipi sayısı | 3 | 5 | 8 | 10 | 12 | 15 | 20 |
| Static (CI referansı) | %79,32 | %80,32 | %80,72 | %80,78 | %80,41 | %79,52 | %79,59 |
| GRASP | %84,74 | %86,19 | %87,09 | %87,06 | %87,02 | %86,35 | %85,17 |

**BR1 hâlâ en kötü kümemiz** — literatürde ise en kolayı. Tekrarın en yüksek olduğu yerde en az
kazanıyoruz; **kalan en büyük algoritmik açık budur.** Muhtemel sebep: duvar kesitinin 2B olarak
tam doldurulmaması (bkz. [arastirma/2026-08-18-yanit-blok-arama.md](arastirma/2026-08-18-yanit-blok-arama.md)).

## Plan kalitesi (GRASP, ölçülen)

| Ölçü | Değer | Yorum |
|---|---|---|
| Yığın yüksekliği | %87-91 | Kayıp buranın üstünde |
| İç boşluk | %0,1-0,9 | Yığın **masif** |
| Ölü hava | %8,6-13 | Kaybın tamamı |
| Ortalama destek | %98,7-100 | %80 eşiği **hiç bağlamıyor** (`DR-16`) |
| En düşük destek | %81,5-97,7 | Eşiği ihlal eden kutu **yok** |
| Kalan boşluk sayısı | 4-16 | Hacim gerçekten parçalanmış |

## Güvence

| | Durum |
|---|---|
| Motor testleri (`CargoPilot.Engine.Tests`) | **109/109** |
| Altyapı testleri (`CargoPilot.Infrastructure.Tests`) | **32/32** |
| Uygulama testleri (`CargoPilot.Application.Tests`) | **228/228** |
| Test aracı (`apps/algorithm-test-ui`) | 201/201 |
| Golden snapshot | 17/17 bayt birebir |
| Duvar örücü değişmez kapsaması | Katalogdaki her senaryo, hem static hem GRASP |
| Determinizm (`R-C02`) | Aynı tohum → bit birebir aynı plan (static ve GRASP) |
| Gecelik kapı | BR1-BR7 static, [referans](referans/br-wallbuilder-static.json) ile kıyas |

## Ölçüm güvenilirliği

- **Gürültü bandı ±0,01 puan** (aynı yapılandırma 4 koşu). 0,1 puandan büyük fark gerçektir.
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
| — | **`011` yönelim kısıtı temsil edilemiyor** — `AllowedRotations` enum'u BR tiplerinin %37'sini birebir karşılamıyor | `strict`/`free` bandının sebebi |
| — | **Üretim gecikmesi ~2 sn** ve arayüzde bekleme göstergesi yok | Kullanıcı deneyimi; F5'te açık |
| — | İki ret sebebi hiç üretilmiyor (`NotStackable`, `GeometryConstraint`) | 12 Ağu 2026 raporundan devreden borç |
