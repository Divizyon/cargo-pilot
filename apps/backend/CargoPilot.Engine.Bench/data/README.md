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

`AllowedRotations` enum'u "hangi ölçü dikey durabilir" kısıtını iki durumda birebir karşılıyor,
bir durumda karşılamıyor — ayrıntı ve gerekçe [BrCorpus.cs](../BrCorpus.cs) içinde. Bu yüzden
`br` komutu iki uç raporlar: `--orientation strict` alt sınır, `--orientation free` üst sınır.
Gerçek BR değeri ikisinin arasındadır ve **hangi ucun ölçüldüğü belirtilmeden sayı anlamsızdır**.
