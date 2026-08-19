# ROADEF/EURO 2022 `datasetA` — çıkarılmış özet

[2026-08-19-gercek-yukleme-verisi-kaynaklari.md](../2026-08-19-gercek-yukleme-verisi-kaynaklari.md)
araştırmasının veri eki. Renault tedarik zinciri verisinden (30 instance, 1,3 milyon parça)
çıkarılmış dağılım tabloları.

**Bunlar ölçüm referansı değildir.** Kapıya giren JSON tabanlar
[`referans/`](../../referans/) altındadır; buradaki CSV'ler ham girdi dağılımıdır ve henüz hiçbir
korpusa dönüştürülmemiştir.

| Dosya | Satır | İçerik |
|---|---|---|
| `kamyon_tipleri.csv` | 118 | Araç iç ölçüsü (mm), azami ağırlık, azami yoğunluk, kaç satırda geçtiği |
| `ambalaj_olculeri.csv` | 570 | Ambalaj ölçüsü (mm), toplam adet, min/ortalama/azami ağırlık |
| `instance_ozeti.csv` | 30 | Instance başına kamyon sayısı, item satırı, toplam parça |

Öne çıkan gerçek dağılım:

- Araçların neredeyse tamamı **13.500 × 2.440 × 2.800-3.100 mm, 24.000-25.000 kg** — Avrupa
  mega/standart tenteli dorse. Bizim BR konteynerimiz (587 × 233 × 220 cm) bunun **yarısından kısa**.
- En yaygın ambalaj **1200 × 1000 × 975 mm**, 385 bin adet. BR kutularının tipik ölçüsünden çok
  daha büyük ve palet tabanlı.

Yani gerçek yük, BR korpusundan hem **daha uzun araçta** hem **daha az çeşitli ve daha iri
ambalajla** taşınıyor. Korpusa çevrildiğinde ölçtüğümüz sayıların değişmesi beklenmelidir.

Kaynak ve dönüştürme notları araştırma belgesindedir; ham `input_trucks.csv` /
`input_items.csv` biçimi ve lisans şartı da orada.
