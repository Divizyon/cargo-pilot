# Mimari Karar Kayıtları (ADR)

**Son güncelleme:** 2026-08-17 · **Durum:** Aktif

Bu klasör, Cargo Pilot'ta geri alınması pahalı olan teknik kararların gerekçesini tutar.
Kod "ne yapıldığını" söyler; ADR "neden böyle yapıldığını" ve **hangi alternatiflerin
neden elendiğini** söyler.

---

## İndeks

| No | Karar | Durum | Tarih |
|----|-------|-------|-------|
| [ADR-0001](ADR-0001-erp-baglanti-mimarisi.md) | ERP bağlantı mimarisi | Kabul edildi | 2026-08-11 |
| [ADR-0002](ADR-0002-optimizasyon-motoru-modulerlestirme.md) | Optimizasyon motorunun Application katmanına taşınması ve modüllere bölünmesi | Kabul edildi | 2026-08-11 |
| [ADR-0003](ADR-0003-lifo-bolge-sert-kisiti.md) | LIFO bölge kısıtı: iki kademeli sert kısıt | Kabul edildi | 2026-08-15 |
| [ADR-0004](ADR-0004-denge-takasi-cift-yonlu-dogrulama.md) | Denge takasında çift yönlü doğrulama | Kabul edildi | 2026-08-15 |
| [ADR-0005](ADR-0005-modul-bayraklari-disa-kapali.md) | Modül bayraklarının API'ye ve arayüze açılmaması | Kabul edildi | 2026-08-11 |
| [ADR-0006](ADR-0006-uc-dalli-terfi-modeli.md) | Üç dallı terfi modeli ve Terfi workflow'u | Kabul edildi | 2026-08-03 |
| [ADR-0007](ADR-0007-docker-build-cache-asimetrisi.md) | Docker build cache asimetrisi: backend `mode=min`, frontend `mode=max` | Kabul edildi | 2026-08-15 |
| [ADR-0008](ADR-0008-sha-pinleme-surum-yukseltmeden-ayri.md) | SHA pinleme, sürüm yükseltmesinden ayrılır | Kabul edildi | 2026-08-15 |
| [ADR-0009](ADR-0009-otomatik-geri-alma-sessizce-basarili-donmez.md) | Otomatik geri alma sessizce başarılı dönmez | Kabul edildi | 2026-08-17 |

[ADR-0000](ADR-0000-sablon.md) numara değil, boş şablondur; indekste karar olarak sayılmaz.

---

## Ne zaman ADR yazılır

ADR, her PR için değil, **geri dönüşü pahalı** kararlar için yazılır. Aşağıdakilerden
en az biri geçerliyse ADR yazılır:

- Katman/klasör sınırı, bağımlılık yönü veya dağıtım topolojisi değişiyor.
- Bir davranış bilinçli olarak **yapılmıyor** ya da erteleniyor (ertelenen iş, ADR olmadan
  altı ay sonra "unutulmuş eksik" gibi görünür).
- Ölçülerek elenmiş bir alternatif var; ölçüm ADR'de saklanmazsa aynı alternatif tekrar önerilir.
- Karar, ilk bakışta "yanlış" görünen bilinçli bir tercih içeriyor (ör. daha yavaş ama daha
  doğru bir yol, ya da "düzgün mimari" görünen bir soyutlamanın kasten eklenmemesi).
- Bir kalibrasyon, katsayı ya da eşik değeri "neden bu sayı" sorusuna açık cevap gerektiriyor.

Yazılmaz: rutin hata düzeltmeleri, bağımlılık yükseltmeleri, tek dosyalık yeniden adlandırmalar,
kod okunarak bir dakikada anlaşılabilen tercihler.

## Numaralandırma

- Biçim `ADR-NNNN`, **dört hane**, sıfırdan doldurulur (`ADR-0007`, `ADR-0042`).
- Numaralar sıfırdan artan tek bir diziden verilir; boşluk bırakılmaz.
- **Bir numara asla geri kullanılmaz.** Reddedilen, terk edilen ya da yerini başkasına bırakan
  ADR'nin numarası da o ADR'de kalır; dosya silinmez.
- Dosya adı: `ADR-NNNN-kisa-slug.md` — kebab-case, Türkçe karakter kullanılmaz.
- Numara **paralel çalışmada önden ayrılabilir**: indekse `*(ayrılmış — konu)*` satırı eklenir,
  dosya sonradan gelir.

## Durum değerleri

| Durum | Anlamı |
|---|---|
| `Önerildi` | Tartışmaya açık; kod bu kararı henüz uygulamıyor. |
| `Kabul edildi` | Yürürlükte; kod bu kararı uyguluyor. |
| `Reddedildi` | Değerlendirildi ve uygulanmamasına karar verildi. Dosya, gerekçesi için durur. |
| `Yerini aldı: ADR-XXXX` | Yürürlükten kalktı; yerine geçen ADR'nin numarası yazılır. |

## Bir ADR nasıl değiştirilir

**Kabul edilmiş bir ADR'nin gövdesi düzenlenmez.** Karar değiştiyse:

1. Yeni bir ADR yazılır; `## Bağlam` bölümünde eski ADR'ye ve neyi değiştirdiğine atıf yapar.
2. Eski ADR'nin **yalnızca `Durum` satırı** `Yerini aldı: ADR-XXXX` olarak güncellenir.
3. Bu klasörün indeksi ve `SUMMARY.md` güncellenir.

İzin verilen tek gövde düzenlemesi: yazım/bağlantı düzeltmesi ve kararın anlamını değiştirmeyen
kanıt tazelemesi (ör. taşınmış bir dosya yolunun düzeltilmesi).

## Yapı

Yeni ADR [ADR-0000-sablon.md](ADR-0000-sablon.md) kopyalanarak açılır. Zorunlu bölümler:

- `# ADR-NNNN — <Konu>` başlığı
- **Durum / Tarih / Kapsam** metadata satırları
- `## Bağlam` — karar öncesi durum ve sorun
- `## Karar` — numaralı alt kararlar; **her alt karar `Gerekçe` ve `Sonuçları` içerir**
- `## Alternatifler` — tablo; **en az iki elenen alternatif** ve neden elendiği.
  Ölçülerek elendiyse ölçüm sayısı yazılır.
- `## Açık konular` — bilinçli olarak bu karara girmeyenler

Aralarına konuya özel bölümler eklenebilir.

## Kanıt disiplini

Her iddia `dosya:satır`, komut çıktısı, ölçüm ya da PR numarasıyla desteklenir. Ölçülmemiş bir
sayı "tahmin" olarak etiketlenir. Geriye dönük (kararın alınmasından sonra) yazılan ADR bunu
metninde açıkça belirtir ve `Tarih` alanına **kararın alındığı** tarihi yazar, yazıldığı tarihi değil.

---

## İlgili Dokümanlar

- [ADR Kuralı (konvansiyon)](../conventions/adr.md)
- [Doküman Haritası](../context/doc-map.md)
