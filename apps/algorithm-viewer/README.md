# algorithm-viewer — koşunun içine bakmak

Tek bir HTML dosyası. Derleme yok, bağımlılık yok, sunucu yok: `index.html`'i çift tıkla,
koşu çıktısını üzerine bırak.

Var oluş sebebi: özet tablo *"yedi yüz örnekte ortalama %84,26"* der ve o ortalamanın arkasındaki
**tek bir planın** neye benzediğini söylemez. Bir gerilemenin ya da kazancın sebebini görmek için
plana bakmak gerekiyordu; bugüne kadar bunun tek yolu elle senaryo kurup API'ye göndermekti.

## Kullanım

> **`--viewer` yolu MUTLAK olmalı.** `dotnet run --project` çalışma dizinini proje klasörüne
> çeker; göreli yol verirsen çıktı `apps/backend/CargoPilot.Engine.Bench/…` altına düşer.
> Aşağıdaki örnekler `$PWD` kullanıyor ve depo kökünden koşulur.

```bash
# BÜYÜK SUİT, üretim yapılandırması — bakılması gereken bu.
# 2160 senaryo: hacim · lifo · kırılganlık · istif — dört sekme, ~90 dk
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --corpus suite --sequencer beam --viewer "$PWD/apps/algorithm-viewer/suite-beam.json"

# Aynısı statik yolla — saniyeler sürer ama ÜRETİM YOLU DEĞİLDİR.
# Kapı içindir; plan kalitesine bakarken kullanma (`DR-69`)
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --corpus suite --viewer "$PWD/apps/algorithm-viewer/suite-static.json"

# Tek aile: --set 0 hacim · 2..6 LIFO grubu · 105/110/120/133 kırılgan pay · 201..204 istif
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --corpus suite --sequencer beam --set 120 --viewer "$PWD/apps/algorithm-viewer/kir20.json"

# BR korpusu, kısmi yük rejimi
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --load-ratio 0.25 --viewer "$PWD/apps/algorithm-viewer/ceyrek.json"
```

Sonra `index.html` → dosyayı sürükle.

## Ne gösteriyor

| | |
|---|---|
| **3B sahne** | three.js · yörünge kamerası, `InstancedMesh`, kapı tarafından bakış. **Tembel yüklenir** — "Sahneyi başlat" demeden three.js indirilmez |
| **Beş bakış** | Kapıdan, uzak yüzden, soldan, sağdan, üstten — hepsi aynı anda, senkron |
| **Kesit dilimi** | Kaydırıcı bir düzlem seçer; o düzlemin **tam** kesiti çizilir |
| **Boşluklar** | 2B'de kap önce boşluk rengiyle boyanır, kutular üzerine çizilir — kesit kipinde kırmızı kalan **her piksel gerçekten boş hacimdir**. 3B'de kullanılmayan uzunluk saydam kırmızı bir dilim olarak görünür |
| **Yükleme animasyonu** | Kutular **yerleştirme sırasıyla** belirir — algoritmanın aracı gerçekte nasıl doldurduğu |
| **Test aileleri** | Sol üstte sekme şeridi: **Tümü · hacim · istif · kirilganlik · lifo**. Aileler veriden türer (`scenario.suite`), koda gömülü liste yok — yeni bir aile eklendiğinde şerit kendiliğinden büyür. Tek aileli eski dosyalarda şerit hiç görünmez |
| **Senaryo listesi** | Doluluğa veya yayılmaya göre sıralanır; her satırın altında etiketi (*"çok farklı · 8 tip · 4 grup"*). Arama hem kimlikte hem etikette çalışır |
| **Git** | `#317` yaz, oraya atlar |

Kısayollar: <kbd>←</kbd> <kbd>→</kbd> senaryo değiştirir (**listede görünen** sırada — sıralama ve
aile filtresi hesaba katılır), <kbd>boşluk</kbd> animasyonu oynatır.

## Suit ne içeriyor

`--corpus suite` dört aile üretir ve dördü de tek dosyaya girer:

| Aile | Kademe | Senaryo |
|---|---|---|
| **hacim** | aynı yük (1 tip) · az farklı (3) · çok farklı (8) · tamamen farklı (20) | 4 × 150 = **600** |
| **lifo** | aynı dört kademe × **2, 3, 4, 5, 6 boşaltma grubu** | 5 × 4 × 30 = **600** |
| **kirilganlik** | aynı dört kademe × **%5, %10, %20, %33 kırılgan** | 4 × 4 × 30 = **480** |
| **istif** | aynı dört kademe × dört varyant: `IST2` (her ürün ≤2) · `ISTKAR` (sınır seyrek ve ürüne özgü) · `USTAGR` (üst ağırlık sınırı) · `ISTMEZ` (%20 istiflenemez) | 4 × 4 × 30 = **480** |

Kırılgan pay **birim** düzeyindedir, ürün tipi düzeyinde değil: aynı üründen bazı kutular kırılgan,
bazıları değil. Tip düzeyinde atama "%5 kırılgan" rejimini ifade edemiyordu (`F9-0`).

Araç ölçüleri gerçek ROADEF/EURO 2022 tablosundan; yük yarı gerçek (`GR-*`) yarı rastgele (`RS-*`).
LIFO gruplarının kutuları ürün **tipinin içinden** bölünür — gerçek multi-drop'ta bir boşaltma
noktası karışık yük alır.

## Ölçümü yavaşlatmaz

`--viewer` verilmezse tek bir ek işlem yapılmaz — senaryo listesi hiç oluşturulmaz. Verilirse
maliyet yalnızca JSON yazımıdır (700 senaryo ≈ 3,8 MB; 2160'lık suit ≈ 22 MB).

## Koordinat sözleşmesi

`x` = genişlik, `y` = yükseklik, `z` = uzunluk; `z = 0` uzak yüz, `z = uzunluk` referans kapı.
Kutu konumu origin'e en yakın köşedir; 3B'de mesh merkezi `konum + ölçü / 2`'dir.
Three.js de sağ elli ve Y yukarıdır, dolayısıyla **aynalama ya da telafi dönüşümü yoktur**.
Bakışlar bu sözleşmeden türetilmiştir —
[docs/COORDINATE_STANDARD.md](../../docs/COORDINATE_STANDARD.md).

## Neden `algorithm-test-ui` değil

O proje bir React/Vite uygulaması: kurulum, derleme, kimlik doğrulama, senaryo üreteci taşıyor ve
**test koşturmak** için var. Burada istenen şey koşuyu değil **çıktısını** görmek; tek dosyalık
statik bir sayfa hem daha hızlı açılıyor hem de bir daha bakım istemiyor.
