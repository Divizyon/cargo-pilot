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

> **20 Ağu akşamı güncellendi.** Aşağıdaki tablonun ilk hâli **static** yolun sayılarını taşıyordu
> ve sistemin durumu diye okunuyordu. Kararlar üretim yolunda (beam) verilir; ikisi ayrı ayrı
> yazıldı (`DR-69`).

**Üretim yolu — beam, gerçek korpus (ROADEF dağılımı, 100 senaryo):**

| | Kısıtsız | LIFO | Maliyet |
|---|---|---|---|
| Doluluk | %91,90 | **%88,11** | **−3,79** |
| Yayılma | ×1,086 | **×1,123** | |
| %25 yük | %24,61 · ×1,161 | %24,61 · ×1,306 | ~0 |

**Kapı yolu — static (deterministik, karar için değil):**

| | Kısıtsız | LIFO | Maliyet |
|---|---|---|---|
| Gerçek korpus | %86,60 | %81,94 | −4,66 |
| BR1-BR7 | %84,48 | %76,45 | −8,03 |

Boşaltma yolu ihlali: **sıfır**, her rejimde ve her sequencer'da. Gecelik kapı
`br --constraints all` ile koruyor (referans `referans/br-wallbuilder-static-kisitli.json`,
doluluk %50,50, üç sayaç sıfır).

## 3. Denenmiş ve reddedilmiş olanlar — tekrar önerilmesin

| Deneme | Sonuç |
|---|---|
| **Eşit bölme** (bant) | 5.148 kutu çıkarılamaz hâlde; terk edildi |
| **Hacme orantılı bölme** (`R-C13`'ün eski hâli) | %82,82 · **12.487** ihlal. Bant tam hacim kadar olunca paketleme verimi (~%85) yüzünden grup kendi bandına sığmıyor |
| **Dinamik `zWall`** | Muhafız ama zayıf: grubu kısıtlamıyor, kolay senaryolarda hiçbir şey yapmıyor |
| **`DepthSlack` + LIFO** | İki kez ölçüldü (`DR-57`, `L-4`), iki kez reddedildi: bütçe yükü öne toplarken grupları üst üste bindiriyor (yarım yükte ihlal 0 → 1.774) |
| **Grupsuz = en son iner** | Gerçek korpusta −4,92 puan; müşteri "serbest" dedi (`DR-68`) |

## 4. Açık borç

- ~~**Ölü kod.**~~ **Kapandı (20 Ağu).** Bölge plumbing'i tamamen kaldırıldı:
  `ComputeGroupZones`, `IsInsideZone`, `zoneStart`/`zoneEnd`, `bestInZone` kademesi,
  `Attempt.InZone` ve `TopUp`'taki bölge kontrolü. −262 satır. Her iki kapı da bayt bayt
  aynı sonucu verdi (BR %84,26 · kısıtlı %50,44) — değişiklik davranış-nötrdü, beklendiği gibi:
  sözlük zaten boştu, dolayısıyla `IsInsideZone` her zaman `true` dönüyordu.
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

---

## 6. Araştırma yanıtı geldi — önerilerin akıbeti

Yanıtın tam metni: [arastirma/2026-08-20-yanit-lifo-multidrop.md](../arastirma/2026-08-20-yanit-lifo-multidrop.md)

| Öneri | Durum |
|---|---|
| **Ö1** — erişilebilirlik cezası | Uygulandı, sonra **geri alındı** (`DR-69`): kabul static yolda ölçülmüştü, üretimde −1,66 |
| **Ö2** — stack-first mimarisi | **Gerekçesiz** — araştırmanın kendi eşiği (*kayıp ≤ −4 → tam yatırım yapma*) karşılandı |
| **Ö3** — onarım geç-geçişi | Açık, ama şartı (*yalnız 1-2 yetersizse*) sağlanmıyor |
| **Ö4** — reachability gevşetmesi | **Ölçüldü**, karar iş biriminde (aşağıda) |
| **Ö5** — tek yönlü kural | **Uygulanmadı, doğru olan bu** — araştırma bizi yanlış okudu; gevşetme değil eksik uygulama olurdu (145 ihlal) |

### Eşiklerin bugünkü durumu (20 Ağu akşamı, `DR-69` sonrası)

| Araştırmanın eşiği | Bugün | Sonuç |
|---|---|---|
| Kayıp ≤ −4 → stack-first'e **tam yatırım yapma** | **−3,79** (beam) | ✅ eşiğin altında → tam yatırım **gerekçesiz** |
| Kayıp > −5 → stack-first **gerekçelenir** | −3,79 | ❌ tetiklenmiyor |
| Yayılma < ×1,18 değilse **compactness terimi ekle** | **×1,123** (beam) | ✅ eşiğin altında → terim **gerekçesiz** |

Eşikleri tetikleyen `−5,68`/`×1,236` sayıları **static** yola aitti; Öneri 1'in kendisi de o yolda
ölçülüp yanlış kabul edilmişti. Ceza geri alınınca üretim yolunda her iki eşik de karşılandı.

### Öneri 4 ölçüldü — karar iş biriminin, sayı hazır

`--lifo-visibility-only` bayrağıyla, kural ERİŞİLEBİLİRLİK yerine GÖRÜNÜRLÜK'e gevşetildi:
yalnızca yüzü **tamamen kapatan** bir kutu engel sayılıyor. Uygulama İYİMSER — iki kutunun
birlikte kapattığı yüzü açık sayıyor — yani ölçülen şey gevşetmenin **üst sınırı**.

| Gerçek korpus | Doluluk | Yayılma | Katı kurala göre ihlal |
|---|---|---|---|
| Static · erişilebilirlik | %81,94 | ×1,219 | 0 |
| Static · görünürlük | %83,93 | ×1,187 | **2.036** |
| **Beam · erişilebilirlik (bugün)** | **%88,11** | ×1,123 | **0** |
| **Beam · görünürlük** | **%90,22** | ×1,106 | **14.619** |

**Kazanç üretimde +2,11 puan** — LIFO maliyeti −3,79 → −1,69. Gerçek görünürlük uygulaması
(birleşim kapsaması) bundan **daha az** kazandırır; bu bir tavan.

**Bedeli:** beam 100 senaryoda 25.200 kutu yerleştiriyor ve bunların **14.619'u** (≈%58) düz
çekişle çıkarılamaz hâle geliyor — operatörün kaydırması ya da çevirmesi gerekiyor. Static'te oran
çok daha düşük (%9) çünkü static zaten seyrek paketliyor; beam boşluğu bulunca sonuna kadar
kullanıyor.

> **İş birimine soru:** *"2,11 puan doluluk karşılığında, boşaltmada kutuların yarıdan fazlasının
> düz çekilemeyip kaydırılması/çevrilmesi kabul edilebilir mi?"*
>
> Kabul edilmezse Öneri 4 kapanır ve LIFO tarafında yapılacak iş kalmaz. Kabul edilirse
> **iyimser yaklaşım yeterli değildir**: gerçek görünürlük (birleşim kapsaması) uygulanmalı,
> aksi hâlde kural "hiçbir tek kutu beni tamamen kapatmasın" gibi savunulamaz bir şeye döner.

**Öneri 3** (onarım geç-geçişi) açık ama araştırmanın kendi şartı sağlanmıyor: *"yalnız 1-2
yetersizse"* deniyor, yetersiz değil.
