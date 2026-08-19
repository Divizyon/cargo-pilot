# Gerçek Yükleme Verisi Kaynakları — Cargo Pilot test korpusu için

**Tarih:** 19 Ağustos 2026 · **Amaç:** Sentetik BR korpusunun yanına, gerçek araç + gerçek ürün/ambalaj + gerçek sipariş listesi içeren test verisi koymak.
**Dürüstlük notu:** Aşağıda "doğrulandı" yazanlar bu oturumda indirilip/açılıp okundu; "pointer" yazanlar bulundu ama içeriği açılmadı; bulunamayanlar açıkça yazıldı. Uydurma ölçü yok.

---

## 1. Birincil öneri — ROADEF/EURO 2022 Renault kamyon yükleme verisi (DOĞRULANDI, indirildi)

Bu bulduğum en iyi kaynak: **gerçek Renault tedarik zinciri verisi** — gerçek kamyonlar, gerçek parça ambalajları (Renault parça kodlarıyla), gerçek ağırlıklar, istif/yönelim kısıtları, tedarikçi→fabrika yükleme sırası. 51 takımın yarıştığı, Hexaly/ORTEC/Fontan-Libralesso'nun çalıştığı veri.

- Kaynak: https://roadef.org/challenge/2022/en/instances.php → `datasetA.zip` (A), `dataset_B.zip`, `dataset_C_1..3.zip`, `dataset_X_1..5.zip`; kurallar `Rule_Challenge_2022.pdf`, `checker.zip`, `visualizer.zip` — hepsi https://github.com/renault-iaa/challenge-roadef-2022
- Format: her instance bir klasör, 3 CSV (`;` ayraç, ondalık virgül):
  - `input_trucks.csv`: kamyon id, **Length/Width/Height (mm), Max weight (kg), Max density, Max weight on the bottom item in stacks**, tedarikçi/dock/fabrika yükleme sırası, arrival time, maliyetler, aks/ağırlık katsayıları (`EMmm, EMmr, CM, CJfm, CJfc, CJfh, EM, EJhr, EJcr, EJeh` — aks yükü hesabı için)
  - `input_items.csv`: item id, tedarikçi, fabrika, **Product code, Package code, Number of items, Length/Width/Height (mm), Weight (kg), Nesting height, Stackability code, Forced orientation, Max stackability**, earliest/latest arrival, inventory cost
  - `input_parameters.csv`: maliyet katsayıları, time limit
- Ben datasetA'yı indirip özetledim (**30 instance, 118 farklı kamyon tipi satırı, 570 farklı ambalaj ölçüsü, 1,3 milyon parça**). Gerçek dağılım:
  - Kamyon iç ölçüleri: hemen hepsi **13.500 × 2.440 × 2.800–3.100 mm, 24.000–25.000 kg** (Avrupa mega/standart tenteli dorse)
  - En yaygın ambalajlar: **1200×1000×975 mm** (Euro/endüstriyel palet yükü), 1600×1200×930, 1200×1000×750, 780×570×478, 1206×1010×1085, 800×600×560, 1900×1200×750…
- Çıkardığım dosyalar (yanınızda): `roadef2022_ozet/kamyon_tipleri.csv`, `ambalaj_olculeri.csv` (ölçü + toplam adet + min/ort/max kg), `instance_ozeti.csv`, ve ham örnek `ornek_instance_SA/`.
- Cargo Pilot'a çevirme: `input_trucks.csv` → araç (iç ölçü, maks ağırlık, maks yoğunluk, alt kutu üzeri maks ağırlık = `MaxWeightOnTop`); `input_items.csv` → ürün (ölçü, ağırlık, adet, `Forced orientation` → `AllowedRotations`, `Max stackability` → `MaxStackCount`, stackability code → istif uyumu, plant dock order → LIFO grup). Tek kamyonluk CLP için: bir kamyonun item listesini al, "minimize kamyon sayısı" amacını "maksimum doluluk" olarak oku.
- Lisans: challenge verisi araştırma amaçlı açık; ticari ürün test korpusu olarak kullanmadan önce `Rule_Challenge_2022.pdf`'teki kullanım şartını okuyun.

## 2. Diğer gerçek veri setleri (araştırma kaynaklı)

| Kaynak | Gerçeklik | Ne var | Erişim |
|---|---|---|---|
| **Metasolver NMFTA setleri** (`problems/clp/benchs/NMFTA`, 11 set × 100 instance) | Gerçek NMFTA (ABD freight sınıflandırma) emtia verisinden üretilmiş — gerçek yoğunluk/ölçü dağılımları, ağırlık ve kâr ile | Kutu ölçü + ağırlık + profit; BRwp formatı | Zaten klonladığınız repo: https://github.com/rilianx/Metasolver (extras/nmfta_generator'da kaynak tablo var) |
| **Ceschia & Schaerf 2013** real-world multi-drop multi-container | "Real-world instances provided by our industrial partner" | Çoklu konteyner, multi-drop, rotasyon, yük taşıma, kırılganlık | https://link.springer.com/article/10.1007/s10732-011-9162-6 — veri yazarlardan/EasyLocal++ sitesinden istenmeli (pointer) |
| **LRTOD — Taobao supermarket warehouse** (Duan vd. 2018) | Gerçek e-ticaret sipariş + kalem ölçüleri (83,6% sipariş <10 kalem) | BIN8/10/12 setleri, 150k eğitim + 150k test | arXiv:1804.06896 (Alibaba/Cainiao); indirme linki makalede dipnot — pointer, doğrulanmadı |
| **RoboBPP** (arXiv:2512.04415) | Gerçek lojistik/ofis kalemi kayıtları (16.767 zaman sıralı kayıt; 6.849 ofis ürünü; "long board" seti) | ölçü + kütle + zaman | Eğitim kısmı açık, test kısmı gizli — pointer |
| **Paquay vd. 2016/2018** hava kargo ULD | Gerçek hava kargo uygulamasından türetilmiş (ULD şekilleri, ağırlık/denge) | 3D MBSBPP + taşıma kısıtları | ITOR 23(1-2), EJOR 267(1) — instance'lar yazarlarda |
| OR-Library `thpack9` (Ivancic, Mathur, Mohanty 1989 — 47 problem) ve `thpack8` (Loh & Nee 1992 — 15 problem) | **Gerçek olduğu doğrulanamadı**; küçük (2-5 tip, 47-181 kutu), konteynerler örnek başına farklı | kutu ölçü + adet | https://people.brunel.ac.uk/~mastjjb/jeb/orlib/thpackinfo.html |

Bulamadığım: Türk lojistik firmalarının (Ekol, Mars, Borusan, Omsan…) yayımlanmış gerçek yükleme planı/yük listesi; DHL/Schenker/Dachser'in indirilebilir gerçek plan verisi. Bunlar yayımlanmıyor — vaka çalışması görselleri var, ham veri yok. Türkçe tezlerde (YÖK) "konteyner yükleme vaka çalışması" gerçek firma verisi içerebilir; bu oturumda taranmadı.

## 3. Gerçek araç iç ölçüleri (koda girilebilir)

### 3a. Avrupa/Türkiye yarı römork — üretici teknik föyleri (Krone, DOĞRULANDI)

| Araç | İç uzunluk | İç genişlik | İç yükseklik | Not / kaynak |
|---|---|---|---|---|
| Krone **Profi Liner** (standart tenteli, 3P-CS) | 13.620 mm | 2.480 mm | ~2.600–2.700 mm (yan yükleme yüksekliği 2.480) | https://www.krone-trailer.com/fileadmin/media/downloads/EN/Pritschensattelauflieger/Datenblaetter/Profi_Liner/Profi_Liner_3P-CS_GB.pdf ; toplam yük ~36–38 t |
| Krone **Mega Liner** (4-CS) | 13.620 mm | 2.480 mm | **3.000 mm** (otomotiv kasaları için) | https://www.krone-trailer.com/fileadmin/media/downloads/EN/Pritschensattelauflieger/Datenblaetter/Mega_Liner/Mega_Liner_4-CS_GB.pdf ; payload ~32,5 t |
| Krone **Paper Liner Ultra** | 13.620 mm | 2.480 mm | 2.700 mm | payload ~33 t |
| Krone **Dry Liner** (kutu/kapalı kasa) | 13.620 mm | 2.480 mm | 2.655 mm (arka geçiş 2.600) | https://www.krone-trailer.com/fileadmin/media/downloads/EN/Trockenfracht-Sattelauflieger/Datenblaetter/Dry_Liner_City/Dry_Liner41_13m_City-STG_EN.pdf |
| Piyasadaki kullanılmış Profi Liner'lar | 13.620–13.700 | 2.480 | 2.665–2.795 | TruckScout24 ilan verileri; payload 29,4–29,7 t / 36 t toplam |

ROADEF verisindeki 13.500 × 2.440 × 2.800–3.100 mm de bunu doğruluyor (Renault biraz tolerans düşüyor). Türk üreticilerin (Tırsan, Kässbohrer) sayfalarında iç ölçüler metin olarak çıkmadı; Tırsan/Kässbohrer teknik föy PDF'lerinden alınmalı — standart Avrupa ölçüleriyle aynı (13,6 × 2,48 × 2,70/3,00).

### 3b. Türkiye karayolu yasal sınırlar (Karayolları Trafik Yönetmeliği / AB 96/53/EC — yerleşik)
Azami genişlik 2,55 m (frigo 2,60), yükseklik 4,00 m, yarı römorklu araç 16,50 m, katarlar 18,75 m; azami toplam ağırlık 5 akslı 40 t (intermodal 44 t); tek aks 10 t, tahrikli aks 11,5 t. Güncel metin için mevzuat.gov.tr'den doğrulayın.

### 3c. ISO 668 deniz konteynerleri (standart, yerleşik — üretici varyansı ±2 cm)

| Tip | İç U × G × Y (mm, tipik) | Kapı G × Y | Hacim | Maks payload (tipik) |
|---|---|---|---|---|
| 20' DV | 5.898 × 2.352 × 2.393 | 2.340 × 2.280 | ~33,2 m³ | ~28,2 t |
| 40' DV | 12.032 × 2.352 × 2.393 | 2.340 × 2.280 | ~67,7 m³ | ~26,7 t |
| 40' HC | 12.032 × 2.352 × 2.698 | 2.340 × 2.585 | ~76,4 m³ | ~26,5 t |
| 45' HC (pallet-wide) | 13.556 × 2.444 × 2.698 | 2.416 × 2.585 | ~89 m³ | ~27,7 t |

Kesin değerler hat bazında değişir; Hapag-Lloyd "Container Specification" PDF'i en iyi tek kaynak.

## 4. Gerçek ambalaj/palet standartları
- EPAL Euro palet 1.200 × 800 × 144 mm, ~25 kg; endüstriyel 1.200 × 1.000; (ROADEF'te gerçek palet yükleri 1200×1000×750–1185 mm, 1600×1200×750–930 mm)
- VDA 4500 KLT (otomotiv): 300×200, 400×300, 600×400 mm taban — ROADEF'teki 780×570×478, 800×600×560, 1206×1010 gibi ölçüler bunların palet/GLT üst yapıları
- E-ticaret koli dağılımı için LRTOD/RoboBPP; kargo firmalarının desi/koli limitleri (Yurtiçi/Aras/MNG) sitelerinde tablo hâlinde var (bu oturumda çekilmedi)

## 5. Önerilen "gerçek korpus" kurgusu
1. **Ana set:** ROADEF datasetA (+B/C) → Cargo Pilot dönüştürücü; kamyon başına bir senaryo. Tam yük ve kısmi yük rejimlerinin ikisini de içerir (kamyon başına parça hacmi değişken) — G-2/G-4 için birebir.
2. **Kısıt seti:** aynı veriden `Forced orientation`, `Max stackability`, `MaxWeightOnTop`, dock yükleme sırası (LIFO) — DR-38'in "kısıt korpusu yok" açığını gerçek veriyle kapatır.
3. **Heterojen e-ticaret seti:** LRTOD (doğrulanırsa) → küçük koli, çok tip.
4. **Ağırlık/denge seti:** Metasolver NMFTA (gerçek yoğunluklar) → CoG/aks senaryoları.
5. Araç kataloğu: §3'teki Krone/ISO değerleri `Vehicle` seed'i olarak.

Sıradaki somut iş: ROADEF → Cargo Pilot senaryo dönüştürücü (CSV → `CreatePlanCommand` JSON). İstersen bunu yazayım; `ornek_instance_SA` ile ilk 100 kamyonu üretmek yarım saatlik iş.
