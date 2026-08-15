# Algoritma Test Arayüzü

Cargo Pilot yükleme motorunun **gerçek backend üzerinden** ölçüldüğü, üretim
frontend'inden bağımsız araç. Amaç motoru geliştirirken kapalı bir döngü kurmak:
koştur → ölç → gerilemeyi yakala → bozuk vakayı incele → düzelt → tekrar koştur.

Uygulama `apps/frontend`'den hiçbir şey import etmez ve kendi `package-lock.json`
dosyasına sahiptir. Kod tekrarı bilinçli olarak kabul edilmiştir.

## İki sayfa

| Sayfa | Soru | İçerik |
| --- | --- | --- |
| **Toplu Koşu** (açılış) | "Motor bir önceki sürüme göre ilerledi mi?" | Tohumlu senaryo seti, kapı kararı, toplamlar, eğilim, rapor JSON |
| **Senaryo İnceleme** | "Düşen senaryoda hangi kutu hangi kuralı kırdı?" | Form, 2D görüntüleyici, 13 kural denetimi, kriter karşılaştırması |

Motor deterministiktir (`DeterminizmTests.cs` bunu pinler), bu yüzden aynı
senaryoyu tekrar koşmak yeni bilgi üretmez. Anlamlı olan çok sayıda **farklı**
senaryoyu iki motor sürümüne karşı **birebir aynı** girdiyle koşmaktır. Araç bu
yüzden toplu koşuyla açılır; inceleme onun teşhis adımıdır.

## Ekranda ne var

### Toplu Koşu

Sayfa yukarıdan aşağı **kur → izle → karar → detay** sırasında dizilir. Paneller
koşudan önce de boş hâlleriyle durur; sonuç geldiğinde yalnızca sayılar dolar.

| Bant | Ne yapar |
| --- | --- |
| Kontrol | Tohum, senaryo sayısı, motor sürümü. Koşu varken tek satıra iner, girdiler `Ayarlar` altına kapanır |
| İlerleme | Tamamlanan/toplam iş, geçen ve tahmini kalan süre, o ana kadarki bozuk sayısı |
| Karar şeridi | Kapının tek kararı: GEÇTİ / KALDI, tek satır gerekçe, hangi kritere göre |
| Kriter toplamları | Üç kriterin ortalama/medyan/en kötü doluluğu, yerleşen oranı, sapma, LIFO taşması, ihlal ve hata sayısı — her ölçümün altında referansa göre fark |
| Kriter etkinliği | Kriter kendi işini yapıyor mu (koşunun tamamına bakar) |
| Bozuk senaryolar | Seçili kriterde ihlalli/hatalı satırlar; tıklayınca senaryo tohumdan yeniden kurulup İnceleme sayfasına taşınır |
| Eğilim | Saklanan karşılaştırılabilir koşularda ortalama dolulukun seyri |
| Kısıt kapsamı | 13 dalın kaçında ürün vardı — koşu varsa **koşu anındaki** katalog |

Kapı **seçili kritere göre**, kriter etkinliği **koşunun tamamına** göre
hesaplanır. İki farklı kapsam olduğu için ayrı kartlarda durur ve her biri
kapsamını yazar.

### Senaryo İnceleme

Geniş ekranda sayfa ekran yüksekliğine oturur; kaydırma sayfada değil kolonların
içindedir.

- **Sol kolon** — Form (araç ve ürün açılır kutudan seçilir; eklenen ürün adet ve
  grup numarasıyla listelenir) ve kural denetimi. Başarısız kurala tıklayınca o
  kuralın kutuları çizimde vurgulanır.
- **Sağ kolon** — Koşu özeti, yerleşim çizimi (üç ortografik projeksiyon, kalan
  yüksekliği doldurur) ve kriter kartları. Kriter kartına tıklayınca o kriterin
  yerleşimi çizime gelir.

Yerleşim gerçek backend motorundan gelir; araç plan üretmez, çağırır ve sonucu
denetler. Üretim uygulamasının göstermediği iki şey buradadır: aynı yükün üç
kriterdeki farkı ve motorun sert kısıtlarının sonuç üzerinde yeniden denetimi.

## Toplu koşuyu komut satırından çalıştırma

```bash
export CARGO_PILOT_API_URL=https://test-sunucusu.example
export CARGO_PILOT_EMAIL=...
export CARGO_PILOT_PASSWORD=...

npm run suite -- --seed 1 --count 100 --engine-version "$(git rev-parse --short HEAD)"
```

Rapor `reports/suite-seed<tohum>-<sürüm>-<zaman>.json` olarak yazılır. Çıkış
kodu: `0` geçti, `1` kapı düştü, `2` kullanım/bağlantı hatası.

Bir sonraki koşuyu öncekiyle karşılaştırmak için raporu referans olarak verin:

```bash
npm run suite -- --seed 1 --count 100 --baseline reports/suite-seed1-abc1234-....json
```

Arayüzdeki **Toplu Koşu** sayfası aynı motoru (`suite/runSuite.ts`) kullanır;
ekranla rapor ayrışmaz. `npm run suite -- --help` tüm seçenekleri listeler.

### Karşılaştırma ne zaman geçerli?

Üç şey aynı olmalı: **tohum**, **katalog imzası**, **üretim sürümü**
(`GENERATOR_VERSION`). Biri değişirse üretilen senaryolar da değişir ve ölçülen
şey motorun gelişimi değil, girdinin farkı olur. Araç bunu sessizce yapmaz —
karşılaştırılabilir koşu bulunamazsa karşılaştırma hiç gösterilmez.

## Regresyon kapısı

Kapının iki tür kuralı var (`suite/regressionGate.ts`):

- **Mutlak** — geçmişe ihtiyaç duymaz: sert kural ihlali, koşulamayan senaryo,
  kriterin işini yapmaması. İlk koşu bile kalabilir.
- **Göreli** — referans koşu gerektirir: ortalama/en kötü doluluk düşüşü,
  yerleşen oranı düşüşü, önce temizken şimdi bozulan senaryo.

Eşikler `DEFAULT_GATE_THRESHOLDS`'ta; koşu başına `--` bayraklarıyla değil, kod
üzerinden değiştirilir ki bir eşik gevşetmesi kod incelemesinden geçsin.

## Kriter etkinliği

Doluluk ve denge toplamak motorun **bozulmadığını** gösterir, kriterin işini
yaptığını göstermez — üç kriter aynı sonucu üretse toplamlar yine makul
görünürdü. `suite/criteriaEffectiveness.ts` her kriterin hedefini iddiaya
çevirir:

- Hacim Önceliği → ortalama doluluğu en yüksek olan o olmalı
- Ağırlık Dengesi → denge sapması en düşük olan o olmalı
- LIFO → dikey boşaltma kuralı (sert kısıt) hiç bozulmamalı

Örneklem yetersizse iddia kurulmaz; "ölçülemedi" uydurma bir yargıdan iyidir.

## Kural denetimi ve motora sadakat

`verification/checks.ts` motorun sert kısıtlarının istemci aynasıdır; her kural
kaynak satırına referans verir (ör. `PlacementValidator.cs:120-142`). Bu aynanın
doğruluğu `verification/goldenCrossCheck.test.ts` ile kanıtlanır: test backend'in
`CargoPilot.Engine.Tests/Snapshots/*.json` fixture'larını okur ve denetleyicilerin
hepsinin `pass` ya da `skipped` vermesini bekler. Bir `fail` çıkarsa ya
denetleyici motoru yanlış aynalıyordur ya fixture gerçek bir motor hatası
pinliyordur — ikisi de bilinmelidir.

## Backend testleriyle iş bölümü

Bu araç **keşif** içindir; kalıcı regresyon koruması backend'in kendi
testlerindedir.

| Soru | Yer |
| --- | --- |
| Motor bu senaryoda ne üretiyor? | Burası (toplu koşu) |
| Bulunan bozuk vaka bir daha olmasın | `CargoPilot.Engine.Tests/Snapshots/` golden fixture |
| Motor içi süre / performans taban çizgisi | `PerformansTabanCizgisiTests.cs` |
| Determinizm | `DeterminizmTests.cs` |

Toplu koşunun ölçtüğü `durationMs` **uçtan uca istek süresidir**, motor süresi
değil: ağ ve plan kalıcılığı dahildir. Performans iddiaları için backend testi
kullanılmalıdır.

Döngünün kapanma noktası şudur: toplu koşu bozuk bir senaryo bulur → arayüzde
"İncele" ile tek senaryo formuna aktarılır → sebep anlaşılır → düzeltme sonrası
o vaka `Snapshots/`'a golden fixture olarak eklenir. Böylece her tur kalıcı
kazanca dönüşür.

## Katalog bağımlılığı

Ürün kısıtları bu arayüzden düzenlenemez: `CreatePlanCommand` yalnızca
`itemId/quantity/groupId` taşır, kısıtlar `Item` kaydından gelir. Motorun bir
dalını test edebilmek katalogda o kısıtı taşıyan bir ürün bulunmasına bağlıdır.

Toplu koşu sayfasındaki **Kısıt kapsamı** paneli bunu görünür kılar
("kırılganlık dalı test edilemiyor, katalogda `FragilityType=1` ürün yok") ve
aynı kapsama her koşu kaydına yazılır. Panel koşu varsa **kaydın** sayılarını
gösterir, yoksa güncel kataloğu: üç ay önceki bir koşuyu bugünkü katalogla
yorumlamak sonucu yanlış okutur. Senaryo üreticisi de kısıtlı ürünleri kasten
senaryolara sokar (`CONSTRAINED_SCENARIO_PERCENT`); aksi hâlde kısıtlı ürün
azınlıktayken kritik dallar neredeyse hiç koşulmuyordu.

## CI / CD

İki ayrı iş var ve ayrımın sebebi maliyet:

| İş | Ne zaman | Neye ihtiyaç duyar | Süre |
| --- | --- | --- | --- |
| `algorithm-test-ui-ci` (ci.yml) | her push / PR | yok — tamamen offline | ~1 dk |
| `Algoritma Regresyon Koşusu` (algorithm-suite.yml) | gecelik + elle | canlı test ortamı + kimlik | ~10-30 dk |

**Push kapısı** tsc + iki build + Vitest koşar; JUnit çıktısı artefakt olarak
yüklenir. `goldenCrossCheck.test.ts` backend'in `Snapshots/*.json` dosyalarını
okuduğu için denetleyicilerin motordan sapması burada yakalanır.

**Regresyon koşusu** gerçek motora karşı koşar ve çıkış koduna göre işi düşürür:
`0` geçti, `1` kapı düştü, `2` bağlantı/kullanım hatası. Referans (baseline)
GitHub cache'inde tutulur ve **yalnızca geçen koşudan sonra** güncellenir —
gerileyen bir koşuyu referans yapmak, gerilemeyi yeni normal hâline getirirdi.
Sonuç, koşu özet ekranına Markdown tablo olarak yazılır; ayrıntı için rapor JSON'u
90 gün artefakt olarak durur.

Gereken secret'lar: `ALGO_SUITE_API_URL`, `ALGO_SUITE_EMAIL`,
`ALGO_SUITE_PASSWORD`. Tanımlı değilse iş sessizce ve başarılı biter —
yapılandırılmamış bir zamanlanmış iş her gece kırmızı yanmamalı.

## Motor olgunlaştıkça yapılabilecekler

Aşağıdakiler eksik değil, **bilinçli olarak ertelenmiş**. Her biri motorun
gelişimiyle değer kazanır; sıra kabaca budur.

| Fırsat | Ne gerekir | Ne kazandırır |
| --- | --- | --- |
| Motor sürümü otomatik damgalansın | Backend'de sürüm/commit bildiren bir uç | Elle giriş kalkar; "hangi motora karşı koştuk" rapordan kesin okunur |
| Determinizm koşusu CI'a girsin | Aynı tohumu iki kez koşup tüm deltaların sıfır olmasını doğrulayan iş | Motora gizlice giren paralellik ya da tohumsuz rastgelelik anında yakalanır — bu bozulursa aracın tüm ölçümü gürültüye döner |
| Motorun kendi uyarıları okunsun | Backend `WarningDto`'yu doldurursa | İstemci aynası ile motorun beyanı karşılaştırılır; aynanın kayması ikinci kaynaktan da görünür |
| Kapı eşikleri sıkılaşsın | `DEFAULT_GATE_THRESHOLDS` (bugün 0,5 puan doluluk, 1 puan en kötü senaryo) | Motor oturdukça daha küçük gerilemeler yakalanır |
| Korpus zenginleşsin | `suiteGenerator` + `GENERATOR_VERSION` artışı | Kısıtlı senaryo oranı, araç çeşitliliği, grup dağılımı ayarlanır. Bedeli: seri kopar, eski koşularla karşılaştırma biter |
| Büyük korpuslar CI'a taşınsın | Arayüzde üst sınır 200 senaryo; CLI'da sınır yok | Tarayıcı belleği ve 10 koşuluk yerel arşiv sınırlıyor; gece koşusu binlerce senaryoyu artefakt olarak saklayabilir |
| Motorun saf süresi ölçülsün | Backend'in çalışma süresini yanıtta bildirmesi | Bugünkü `durationMs` uçtan uca gecikmedir; performans regresyonu ancak saf süreyle kapıya bağlanabilir |
| Yeni kriter eklenirse etkinlik ölçütü de eklensin | `criteria.ts` + `criteriaEffectiveness.ts` | Ölçütü olmayan bir kriter sessizce hiçbir şey optimize etmeyebilir |

Listede olmayan bir şey var: **aracın kendi arayüzünü büyütmek**. Değer motorun
ölçülmesinde; arayüz büyüdükçe bakım maliyeti artar ve üretim uygulamasının
işini tekrarlamaya başlar. Yeni panel eklemeden önce sorulacak soru: bu, motorun
bir sürümünü diğerinden ayırmaya yarıyor mu?

### Motor değişirse ne bozulur

| Motorda değişen | Araçta yapılacak | Uyarır mı? |
| --- | --- | --- |
| Mevcut bir kuralın eşiği/mantığı | `verification/checks.ts` | **Evet** — golden çapraz kontrol kırmızı yanar |
| Yeni sert kısıt eklendi | `CHECK_IDS` + `checkLabels.ts` + `checks.ts` + `runChecks` | **Hayır** — elle takip gerekir |
| Ürün üzerinde yeni kısıt alanı | `catalogCoverage.ts` tanımları + `Item` tipi | Kısmen — dal kapsamda görünmez |
| Yeni optimizasyon kriteri | `criteria.ts` + `suiteStorage` şeması | **Evet** — şema reddeder |
| Plan API'sinin gövdesi | `loadingPlanMappers.ts` | **Evet** — satır `error`'a düşer |
| Koşu kaydına yeni alan | `SUITE_RUN_VERSION` + `suiteRunSchema` | **Evet** — eski kayıt atlanır |
| Yerleşim iyileşti/kötüleşti | hiçbir şey — ölçmek istediğimiz şey bu | **Evet** — kapı |

İki uç durum:

- **Determinizm kaybolursa araç anlamını yitirir.** Yeni sürümde ilk kontrol bu
  olmalı: aynı tohumu iki kez koş, tüm deltalar sıfır çıkmalı.
- **Kasıtlı büyük değişiklikte referansı sıfırlayın.** Yeni bir yerleştirme
  stratejisi profili tümüyle değiştirir; eski referansa karşı ölçmek "gerileme"
  gürültüsü üretir. Workflow'daki `ignore_baseline` girdisi ya da `--baseline`
  vermemek temiz başlangıç sağlar.

## Bilerek yok olanlar

Araç kasten dar tutuluyor; aşağıdakiler denendi ve kaldırıldı:

- **Senaryo incelemesi için ayrı ölçüm serisi ve referans-koşu farkı.** Aynı soruyu
  ("sürümler arası ne değişti") toplu koşudan daha zayıf biçimde cevaplıyordu ve
  üç ayrı `localStorage` anahtarı taşıyordu. Cevap tek yerde: toplu koşu.
- **Senaryo dosyası dışa/içe aktarma.** Bozuk vakaya dönüş yolu artık raporun
  içinde ("İncele"); tohum + sıra numarası senaryoyu birebir yeniden kuruyor.
- **Senaryo önizleme.** Koşmadan liste görmek karar değiştirmiyordu.
- **Kullanılmayan model alanları** (araç envanter alanları, ürün ERP/kategori
  alanları). Motor okumuyor; tip katmanında tutmak olmayan bir kapsama iddiası
  yaratıyordu.

## Komutlar

```bash
npm run dev          # arayüz (port 3002, /api Vite proxy'siyle backend'e gider)
npm run build        # tsc + Vite üretim derlemesi
npm run test         # Vitest (schema, util, denetleyici, koşu motoru)
npm run build:suite  # komut satırı aracını derle
npm run suite        # derle + koştur
```
