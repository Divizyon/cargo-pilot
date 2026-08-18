# Cargo Pilot · Yükleme Algoritması Belgeleri

Yerleştirme motoruna dair her şey bu klasörde. Kök dizinde `ALGORITMA-*` dosyası **kalmadı**;
hepsi 18 Ağustos 2026'da buraya taşındı ve içerikleri birebir korundu.

## Nereden başlanır

| Ne öğrenmek istiyorsun | Oku |
|---|---|
| Raporlardaki terimler ne demek | [00-sozluk.md](00-sozluk.md) |
| Motor bugün nasıl çalışıyor, neye dokunulamaz | [01-kurallar.md](01-kurallar.md) |
| Bir şey neden böyle | [02-kararlar.md](02-kararlar.md) · [adr/](adr/) |
| Sırada ne var | [03-yol-haritasi.md](03-yol-haritasi.md) |
| Bu fikir denendi mi, kaç puan getirdi | [04-olcum-gunlugu.md](04-olcum-gunlugu.md) |
| Bugün ne kadar iyiyiz | [05-basari-karnesi.md](05-basari-karnesi.md) |

## Kalıcı dosyalar

Bu altı dosya **her zaman vardır** — algoritma geliştirilirken de, bittiğinde de. Silinmezler,
yeniden adlandırılmazlar; doldurulmaya devam edilir.

| Dosya | Ne tutar | Nasıl büyür |
|---|---|---|
| [00-sozluk.md](00-sozluk.md) | Terim tanımları | Yeni terim → yeni satır |
| [01-kurallar.md](01-kurallar.md) | Bağlayıcı sözleşme ve tasarım kuralları (`R-*`) | Yeni kural → yeni `R-` kimliği |
| [02-kararlar.md](02-kararlar.md) | Karar kaydı (`DR-*`), açık borç, ölçüm sınırları | Yeni karar → yeni `DR-` kimliği; borç kapanınca satırı güncelle |
| [03-yol-haritasi.md](03-yol-haritasi.md) | Faz planı, risk kaydı, kabul kriterleri | Faz bitince durumu güncelle |
| [04-olcum-gunlugu.md](04-olcum-gunlugu.md) | Her denemenin ölçümü — kabul edilen **ve reddedilen** | **Sona eklenir, geçmiş silinmez** |
| [05-basari-karnesi.md](05-basari-karnesi.md) | Güncel doluluk, test, açık liste | **Üzerine yazılır** — geçmiş 04'te |

## Klasörler

| Klasör | İçerik | Kural |
|---|---|---|
| [adr/](adr/) | Mimari karar kayıtları, numaralı | Bir karar yazıldıktan sonra **değiştirilmez**; ters karar yeni bir ADR açar |
| [arastirma/](arastirma/) | Dış araştırma brifingleri ve yanıtları, tarihli | Geldiği gibi durur, düzenlenmez |
| [arsiv/](arsiv/) | Dondurulmuş tarihsel belgeler | **Asla düzenlenmez.** Sayıları bayattır |
| [notlar/](notlar/) | Geçici, tek kullanımlık notlar | Serbest. Kalıcı olması gereken bilgi buradan yukarı taşınır |
| [referans/](referans/) | Makine tarafından okunan referans ölçümler | CI kapısı bunlarla kıyaslar |

## Bir şey öğrendiğinde nereye yazılır

```
Bir deneme yaptım, ölçtüm
  ├─ Kazandı mı, kaybetti mi → 04-olcum-gunlugu.md  (her hâlükârda; red de kayıttır)
  ├─ Kalıcı bir karara dönüştü mü → 02-kararlar.md  (yeni DR-)
  ├─ Bağlayıcı bir kural doğdu mu → 01-kurallar.md  (yeni R-)
  ├─ Güncel sayı değişti mi → 05-basari-karnesi.md  (üzerine yaz)
  ├─ Yeni terim kullandım mı → 00-sozluk.md
  └─ Mimariyi değiştiren büyük bir karar mı → adr/ altında yeni numaralı dosya
```

Kararsızsan: **04'e yaz.** Ölçüm günlüğü hiçbir zaman yanlış hedef değildir.

## Kod bu belgelere atıf verir

Kaynak dosyalardaki yorumlar kural ve karar kimliklerine (`R-C02`, `DR-39`, `OPT-15`) atıf verir.
Bir kimlik yeniden numaralandırılmaz — kayıt yanlışsa satırı düzelt, kimliği koru.

## İlgili belgeler

- [`docs/COORDINATE_STANDARD.md`](../COORDINATE_STANDARD.md) — koordinat sözleşmesi (çelişkide **bu kazanır**)
- [`apps/backend/CargoPilot.Engine.Bench/data/README.md`](../../apps/backend/CargoPilot.Engine.Bench/data/README.md) — BR veri biçimi
- [`apps/algorithm-test-ui/README.md`](../../apps/algorithm-test-ui/README.md) — test aracı
- [`.github/workflows/engine-bench.yml`](../../.github/workflows/engine-bench.yml) — gecelik doluluk kapısı
