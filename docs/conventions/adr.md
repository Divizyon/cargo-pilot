# ADR Kuralı

**Son güncelleme:** 2026-08-17 · **Durum:** Aktif

Geri alınması pahalı teknik kararlar `docs/adr/` altında ADR (Architecture Decision Record)
olarak kayıt altına alınır. Bu sayfa kuralın özetidir; **tek yetkili kaynak**
[`docs/adr/README.md`](../adr/README.md)'dir — indeks, şablon ve ayrıntılı yordam oradadır.

---

## Kural

1. **ADR yazılır** eğer: katman/bağımlılık sınırı değişiyorsa, bir şey bilinçli olarak
   *yapılmıyor* ya da erteleniyorsa, ölçülerek elenmiş bir alternatif varsa, karar ilk bakışta
   yanlış görünen bilinçli bir tercih içeriyorsa, ya da bir katsayı/eşik "neden bu sayı"
   sorusunu doğuruyorsa. Rutin hata düzeltmesi, bağımlılık yükseltmesi ve tek dosyalık yeniden
   adlandırma için yazılmaz.
2. **Numaralandırma** `ADR-NNNN` biçimindedir; dört hane, sıfırdan doldurulur, sıfırdan artan
   tek diziden verilir. **Bir numara asla geri kullanılmaz** — reddedilen ya da yerini bırakan
   ADR'nin dosyası silinmez, numarası boşa çıkmaz.
3. **Durum** dört değerden biridir: `Önerildi`, `Kabul edildi`, `Reddedildi`,
   `Yerini aldı: ADR-XXXX`.
4. **Kabul edilmiş ADR'nin gövdesi düzenlenmez.** Karar değiştiyse yeni ADR yazılır, eskisinin
   yalnızca `Durum` satırı `Yerini aldı: ADR-XXXX` olarak güncellenir. İzin verilen tek istisna
   yazım/bağlantı düzeltmesidir.
5. **Alternatifler bölümü zorunludur:** en az iki elenen alternatif ve neden elendiği.
   Ölçülerek elendiyse ölçüm sayısı yazılır.
6. **Kanıt disiplini:** her iddia `dosya:satır`, komut çıktısı, ölçüm ya da PR numarasıyla
   desteklenir; ölçülmemiş sayı "tahmin" olarak etiketlenir.
7. Yeni ADR [`docs/adr/ADR-0000-sablon.md`](../adr/ADR-0000-sablon.md) kopyalanarak açılır ve
   `docs/adr/README.md` indeksi ile `SUMMARY.md` aynı PR'da güncellenir.

---

## İlgili Dokümanlar

{% content-ref url="../adr/README.md" %}
[ADR İndeksi ve Kuralları](../adr/README.md)
{% endcontent-ref %}

{% content-ref url="commits.md" %}
[Commit Kuralları](commits.md)
{% endcontent-ref %}
