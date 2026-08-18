# arastirma/ — dış araştırma girdileri ve yanıtları

Bir soruyu kendi ölçümümüzle çözemediğimizde literatüre soruyoruz. **Brifing** dışarıya
gönderdiğimiz girdi, **yanıt** geri gelen rapordur. İkisi de geldiği gibi durur — düzenlenmez,
çünkü sonradan hangi bilgiyle ne istediğimizi ancak orijinali gösterir.

| Belge | Tarih | Ne |
|---|---|---|
| [2026-08-17-brifing.md](2026-08-17-brifing.md) | 17 Ağu 2026 | Dışarıya verilen tek referans: ne denendi, ne ölçüldü, ne kaldı. 22 denemenin kütüğü, bağlayıcı kısıtlar, sorulan sorular |
| [2026-08-17-yanit-olu-hava.md](2026-08-17-yanit-olu-hava.md) | 17 Ağu 2026 | *"Üst yüzey ölü havası" darboğazı.* Üç hamle önerdi: yerel düzlük terimi, kule inşası, destek-farkında boşluk defteri. **Ayrıca korpusumuzun adaletsiz kolay olduğunu söyledi** — BR1-BR7'ye geçişin tetikleyicisi |
| [2026-08-18-yanit-blok-arama.md](2026-08-18-yanit-blok-arama.md) | 18 Ağu 2026 | *%86-88'den %90+'a.* Teşhis: **sıra araması doymuş**, kazanç arama şemasında. Öneri: random-key decoder'ı blok yerleştirme beam search / greedy-lookahead ile değiştir. BR1'deki açığın sebebi olarak duvar kesitinin 2B tam doldurulmamasını gösterir |
| [2026-08-19-yanit-kalan-uc-puan.md](2026-08-19-yanit-kalan-uc-puan.md) | 19 Ağu 2026 | *Kalan ~3 puanın kaynağı.* Beam üretime girdikten sonraki konum tespiti. Açığı üçe ayırıyor: aksiyon uzayı + **greedy taban zayıflığı** (BSG greedy ~%87, bizimki %83,4), post-optimizasyon eksikliği, tam-destek maliyeti. Somut hamle: VPD'nin **`L(b)` knapsack kayıp terimi**, iteratif ışın genişletme, space defragmentation |

## Bir yanıtın akıbeti nereye yazılır

Öneriler **buraya işlenmez.** Bir öneri denendiğinde sonucu — kabul de ret de —
[04-olcum-gunlugu.md](../04-olcum-gunlugu.md)'ye, kalıcı bir karara dönüştüyse
[02-kararlar.md](../02-kararlar.md)'ye yazılır.

Sebebi: bu klasör "dışarısı ne dedi"nin kaydı, "biz ne yaptık"ın değil. İkisi karışırsa reddedilen
bir öneri sonradan uygulanmış gibi okunur.

## Buraya bir şey eklerken

- Dosya adı `YYYY-AA-GG-brifing.md` veya `YYYY-AA-GG-yanit-<konu>.md`.
- Yukarıdaki tabloya bir satır ekle; **hangi somut kararı tetiklediğini** yaz.
