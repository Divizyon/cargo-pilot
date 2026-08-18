# BR0-BR15 kıyas verisi

Bischoff & Ratcliff (BR0-BR7) ve Davies & Bischoff (BR8-BR15) 3B konteyner yükleme kıyas
kümeleri. Her dosya 100 örnek taşır; konteyner tüm örneklerde 587 × 233 × 220 cm'dir.

| Dosya | Küme | Kutu tipi | Varsayılan koşuda |
|---|---|---|---|
| br0.txt | BR0 | 1 | hayır |
| br1.txt … br7.txt | BR1-BR7 | 3 · 5 · 8 · 10 · 12 · 15 · 20 | **evet** |
| br8.txt … br15.txt | BR8-BR15 | 30 · 40 · 50 · 60 · 70 · 80 · 90 · 100 | hayır |

`br` komutu bayraksız çalıştırıldığında **yalnız BR1-BR7** koşar. Sebep: literatürle kıyaslanan
sayı budur ve gecelik kapı bu sayıyı sabitler. BR0 ve BR8-BR15 `--set N` ile tek tek ölçülür;
varsayılan koşuya katmak baş sayıyı hem kıyaslanamaz hem de sekiz kat yavaş yapardı.

## Dosya adları neden `br{n}` — ve `thpack8/9` tuzağı

Dosyalar 18 Ağustos 2026'da `thpack{n}.txt` → `br{n}.txt` olarak yeniden adlandırıldı. **İçerik
değişmedi** (yalnız satır sonu; ölçüm bit birebir aynı kaldı, %82,61).

Sebep bir tuzak: OR-Library'deki `thpack8` ve `thpack9` **BR8/BR9 DEĞİLDİR** — sırasıyla Loh & Nee
tek konteyner ve Ivancic çoklu konteyner problemleridir, farklı ölçek ve farklı başlık biçimiyle.
`thpack10`/`thpack11` adresleri ise `thpack1`'in birebir kopyasını döndürüyor (md5 aynı). İki
adlandırma şeması bir arada durursa bu karışıklık er geç birinin ölçümüne girer; tek şema bunu
kalıcı olarak kapatır.

## Kaynak

BR0-BR15'in tamamı `rilianx/Metasolver` deposundaki `problems/clp/benchs/BR/` dizininden alındı
(18 Ağu 2026). BR1-BR7 dosyalarının OR-Library'den indirdiğimiz `thpack1-7` ile **satır sonu
dışında birebir aynı** olduğu doğrulandı; bu yüzden o yedi dosya değiştirilmedi, yalnız adları
değişti.

BR8-BR15 uzun süre bizde yoktu ve `DR-38` bunu açık borç olarak taşıyordu: OR-Library'de
yayınlanmamış, Nottingham'dan Sam Allen'ın yeniden ürettiği `br.zip` içindeler.

**Atıflar:**
- E. E. Bischoff, M. S. W. Ratcliff, "Issues in the development of approaches to container
  loading", *Omega* 23(4), 1995, 377-390. *(BR0-BR7)*
- E. K. Davies, E. E. Bischoff, "Weight distribution considerations in container loading",
  *EJOR* 114, 1999, 509-527. *(BR8-BR15)*

## Biçim

```
<örnek sayısı>
<örnek no> <üreteç tohumu>
<uzunluk> <genişlik> <yükseklik>
<kutu tipi sayısı>
<tip no> <ölçü1> <dikey1> <ölçü2> <dikey2> <ölçü3> <dikey3> <adet>
...
```

`<dikeyN>` = 1 ise o ölçü dikey eksende durabilir. Veride yalnızca üç düzen geçiyor: `001`
(%17), `011` (%37), `111` (%46).

## Bizim modelimize eşleme

`AllowedRotations` enum'u "hangi ölçü dikey durabilir" kısıtını **üç düzende de birebir**
karşılıyor — ayrıntı ve gerekçe [BrCorpus.cs](../BrCorpus.cs) içinde. `011` düzeni için
`NoVerticalWidth` değeri eklendi (`DR-42`); öncesinde `PitchOnly`'ye düşürülüyor ve dört yasal
yönelimin ikisi kayboluyordu.

Eşleme birebir olduğu için tek bir sayı vardır. Eski `--orientation strict | free` bayrağı
kaldırıldı: `free` ucu artık fiziksel olarak yasak yerleşimleri sayardı.
