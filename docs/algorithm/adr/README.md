# adr/ — mimari karar kayıtları

Bir ADR, **mimariyi değiştiren** bir kararı bağlamı ve gerekçesiyle birlikte dondurur. Küçük
kararlar buraya değil [02-kararlar.md](../02-kararlar.md)'ye (`DR-` kimliğiyle) yazılır.

| No | Karar | Durum |
|---|---|---|
| [0001](0001-yerlestirme-algoritmasi.md) | Yerleştirme algoritması: duvar örücü ve arama katmanı | Kabul edildi |

## Kurallar

- Dosya adı `NNNN-kisa-ad.md`, dört haneli sıra numarasıyla.
- **Yazıldıktan sonra değiştirilmez.** Karar terse dönerse eski ADR'yi düzenlemek yerine yeni bir
  ADR açılır ve eskisinin başına "→ ADR-NNNN ile değiştirildi" satırı eklenir.
  - Bu, ADR'nin *içindeki* bir kararın revize edilmesini engellemez: ADR-0001'de `Karar 1`
    (greedy'nin yanına yeni yerleştirici) `DR-39` ile bilinçli olarak tersine çevrildi ve ölçüm
    tablolarıyla birlikte aynı belgede kaydedildi. Kayıt **silinmez**, üzerine yazılır.
- Sayılar ADR'ye **karar anındaki hâliyle** girer. Güncel sayılar
  [05-basari-karnesi.md](../05-basari-karnesi.md)'dedir.
- Yukarıdaki tabloya satır eklemeyi unutma.
