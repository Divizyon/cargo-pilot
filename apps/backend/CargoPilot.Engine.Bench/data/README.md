# BR1-BR7 kıyas verisi

`thpack1.txt` … `thpack7.txt`, Bischoff & Ratcliff'in 3B konteyner yükleme kıyas kümeleridir.
Her dosya 100 örnek taşır; konteyner tüm örneklerde 587 × 233 × 220 cm'dir.

| Dosya | Küme | Kutu tipi |
|---|---|---|
| thpack1.txt | BR1 | 3 |
| thpack2.txt | BR2 | 5 |
| thpack3.txt | BR3 | 8 |
| thpack4.txt | BR4 | 10 |
| thpack5.txt | BR5 | 12 |
| thpack6.txt | BR6 | 15 |
| thpack7.txt | BR7 | 20 |

## BR8-BR15 neden yok

Denendi, **OR-Library'de bulunmuyor**. `thpack10` ve `thpack11` adresleri `thpack1`'in birebir
kopyasını döndürüyor (sunucu benzer isimde belge sunuyor, md5 aynı). `thpack8` Loh & Nee kıyası,
`thpack9` ise bambaşka bir ölçekte (konteyner 10×6×16) ve ikisi de farklı başlık biçiminde —
örnek satırında tohum alanı yok. BR8-BR15 (Davies & Bischoff 1999) ayrı bir veri kümesidir ve bu
kaynakta yayınlanmamış.

**Kaynak:** OR-Library, J. E. Beasley —
`https://people.brunel.ac.uk/~mastjjb/jeb/orlib/files/thpack{1..7}.txt`

**Atıf:** E. E. Bischoff, M. S. W. Ratcliff, "Issues in the development of approaches to container
loading", *Omega* 23(4), 1995, 377-390.

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
