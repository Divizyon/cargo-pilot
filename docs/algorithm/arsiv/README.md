# arsiv/ — dondurulmuş belgeler

Buradaki dosyalar **düzenlenmez.** Yazıldıkları tarihteki gerçeği anlatırlar ve sayıları
bayattır — sonradan düzeltilmeleri, oldukları şey olmaktan (tarihsel kayıt) çıkarır.

Güncel hâl için [01-kurallar.md](../01-kurallar.md) ve
[05-basari-karnesi.md](../05-basari-karnesi.md)'ye bakın.

| Belge | Tarih | Ne anlatır | Bugünkü değeri |
|---|---|---|---|
| [2026-08-04-sistem-mimarisi.md](2026-08-04-sistem-mimarisi.md) | 4 Ağu 2026 | Planlanan packing mimarisi ve gereksinimler | **Uygulanmadı** — `PackingEngine` sınıfı hiç yazılmadı; gerçek motor `Application/Common/Optimization/` altında |
| [2026-08-04-matematiksel-model.md](2026-08-04-matematiksel-model.md) | 4 Ağu 2026 | Bin packing matematiksel modeli: extreme point, dominance, maliyet fonksiyonu | Kod bazı yerde ileride, bazı yerde geride. Model dili hâlâ ortak zemin |
| [2026-08-04-uygulama-faz-plani.md](2026-08-04-uygulama-faz-plani.md) | 4 Ağu 2026 | Uygulama faz planı | Güncel implementasyonla birebir değil; yalnız tarihçe |
| [2026-08-11-motor-anlatimi.html](2026-08-11-motor-anlatimi.html) | 11 Ağu 2026 | Motorun 12 bölümlük anlatımı: koordinatlar, sıralama, extreme-point, rotasyonlar, kısıtlar, maliyet fonksiyonu | Modülerleştirme **öncesi** greedy motoru anlatır. Beş kısıt der (bugün sekiz), takas geçişini anlatır (bugün yok) |
| [2026-08-12-mimari-raporu.md](2026-08-12-mimari-raporu.md) | 12 Ağu 2026 | 583 satırlık tek dosyanın altı modüle ayrılması (PR #935 → #936 → #937) | **Bugünkü klasör mimarisinin kaynağı.** [ADR-0001](../adr/0001-yerlestirme-algoritmasi.md) buna atıf verir |
| [2026-08-15-adli-inceleme.md](2026-08-15-adli-inceleme.md) | 15 Ağu 2026 | `OPT-01` / `OPT-02` kök neden analizi — kutu havada, yük ters | İki hata da kapandı; teşhis yöntemi hâlâ örnek |
| [2026-08-16-temel-rapor.md](2026-08-16-temel-rapor.md) | 16 Ağu 2026 | Rulebook'un temel raporu: motorun o günkü hâli, test süreci, açık borç, karar noktaları | Karar noktaları [02-kararlar.md §E2](../02-kararlar.md)'de cevaplandı |

2026-08-04 tarihli üçlü, `feature/3D_Packing_Algorithm` dalından PR #888 ile kurtarıldı;
2026-08-18'de `docs/archive/algoritma-tasarimi/` altından buraya alındı.

## Neden bunlar duruyor

İkisi hâlâ aktif olarak atıf alıyor: mimari raporu bugünkü klasör yapısının, adli inceleme iki
kapanmış hatanın kaynağıdır. Kalan beşi "o gün ne biliyorduk" sorusunun cevabı — bir kararın
neden o şekilde alındığını ancak o günkü bilgi durumu açıklıyor.

## Buraya bir şey eklerken

- Dosya adı `YYYY-AA-GG-kisa-ad.uzanti` biçiminde olur.
- Başına, belgeyi **dondurulmuş** ilan eden ve güncel karşılığını gösteren bir alıntı bloğu konur.
- Bu tablodaki satırı eklemeyi unutma; listelenmemiş arşiv belgesi kayıp belgedir.
