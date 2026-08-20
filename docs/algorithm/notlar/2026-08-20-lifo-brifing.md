# LIFO — bugünkü durum *(araştırma brifingi)*

**Geçici dosya, 20 Ağustos 2026.** Kalıcı kayıtlar `01-kurallar.md` §A6 / `R-C13`, `02-kararlar.md`
`DR-67`/`DR-68` ve `04-olcum-gunlugu.md`'dedir. Bu dosya onları **tek yerde özetler** ve dışarıya
araştırma sorusu sormak için yazılmıştır.

> **Uyarı:** bu dosyanın 20 Ağustos öğleden önceki sürümü bant (bölge) modelini anlatıyordu ve
> artık geçersizdir. Kural o gün değişti.

---

## 1. LIFO üç ayrı mekanizmadır

| # | Mekanizma | Kod | Ne yapar |
|---|---|---|---|
| **M1** | Sıralama | `ItemOrdering.ApplyCriteriaSort` | Grupları `UnloadingOrder` DESC yükler: en son inecek grup **önce** yüklenir. Yalnız `ClusterGroups` açıkken gruplar bitişik kalır (`R-C19`) |
| **M2** | Dikey istif | `PlacementValidator.ViolatesStackability` | Geç inecek kutu, erken inecek kutunun **üstüne** konamaz |
| **M3** | Çıkarılabilirlik | `PlacementValidator.ViolatesUnloadPath` | Kutu, kendi iniş sırası geldiğinde hâlâ araçta olan hiçbir kutuyu oynatmadan kapıya çıkabilmeli |

`M3` **sert kapıdır** ve üç yerde uygulanır: aday seçimi, blok yükseltme, bileşik blok.
Yol = kutunun ayak izinin `+z` yönünde süpürdüğü koridor. Kural **iki yönlüdür**.

**Gruplar uzayda iç içe geçebilir.** Bant/bölge kavramı yoktur (`DR-67`).
Boşaltma sırası atanmamış ürün **serbesttir** — ne kısıtlanır ne kısıtlar (`DR-68`).

## 2. Bugünkü sayılar

Gerçek korpus (ROADEF dağılımı, 100 senaryo) ve BR1-BR7:

| | Kısıtsız | LIFO | Maliyet |
|---|---|---|---|
| Gerçek korpus | %86,60 | **%80,92** | −5,68 |
| BR1-BR7 (175 örnek) | %84,48 | **%76,45** | −8,03 |

Boşaltma yolu ihlali: **sıfır**, her rejimde. Gecelik kapı `br --constraints all` ile koruyor
(referans `referans/br-wallbuilder-static-kisitli.json`, doluluk %50,50, üç sayaç sıfır).

Yayılma LIFO'yla bozuluyor: gerçek korpus ×1,151 → ×1,236.

## 3. Denenmiş ve reddedilmiş olanlar — tekrar önerilmesin

| Deneme | Sonuç |
|---|---|
| **Eşit bölme** (bant) | 5.148 kutu çıkarılamaz hâlde; terk edildi |
| **Hacme orantılı bölme** (`R-C13`'ün eski hâli) | %82,82 · **12.487** ihlal. Bant tam hacim kadar olunca paketleme verimi (~%85) yüzünden grup kendi bandına sığmıyor |
| **Dinamik `zWall`** | Muhafız ama zayıf: grubu kısıtlamıyor, kolay senaryolarda hiçbir şey yapmıyor |
| **`DepthSlack` + LIFO** | İki kez ölçüldü (`DR-57`, `L-4`), iki kez reddedildi: bütçe yükü öne toplarken grupları üst üste bindiriyor (yarım yükte ihlal 0 → 1.774) |
| **Grupsuz = en son iner** | Gerçek korpusta −4,92 puan; müşteri "serbest" dedi (`DR-68`) |

## 4. Açık borç

- **Ölü kod.** `LifoPlacement.ComputeGroupZones` ve `IsInsideZone` üretimde çağrılmıyor ama
  plumbing duruyor (`zoneStart`/`zoneEnd` parametreleri, `bestInZone` kademesi, `TopUp`'taki bölge
  kontrolü). Temizlenmeli.
- **Çok katmanlı LIFO** korpusta hâlâ zayıf temsil ediliyor; `03-yol-haritasi.md` `SC-17` bunu
  tarif ediyor ama korpusa girmedi.

## 5. Araştırmaya sorulabilecek sorular

1. **LIFO'nun 5-8 puanlık maliyeti literatürde ne kadar?** Bizim kayıp gerçek korpusta −5,68.
   Multi-drop CLP yayınlarında (Junqueira vd., Ceschia & Schaerf) bu maliyet raporlanıyor mu,
   hangi mertebede?
2. **Çıkarılabilirlik kısıtını yerleştirme sırasında değil sıralamada çözen yaklaşım var mı?**
   Bizde kural bir sert kapı — aday reddediliyor. Sıra düzeyinde çözülse kayıp düşer mi?
3. **Grup başına ayrılan hacmi önceden kestirmenin bir yolu var mı?** Bant modelleri
   (eşit / orantılı) paketleme verimini hesaba katmadığı için başarısız oldu. Literatürde
   verim-farkında bir bölme var mı?
4. **Multi-drop'ta yükleme sırası ile araç rotası birlikte optimize ediliyor mu?** Bizde rota
   girdi, sıra ondan türüyor. Birlikte optimizasyonun kazancı ölçülmüş mü?
5. **Yayılma:** LIFO açıkken yük ×1,236'ya yayılıyor, kapalıyken ×1,151. Bu kaçınılmaz mı,
   yoksa yoğunlaştırma ile boşaltma sırası uzlaştırılabilir mi? (Bizde `DepthSlack` iki kez
   çakıştı ve iki kez geri alındı.)
