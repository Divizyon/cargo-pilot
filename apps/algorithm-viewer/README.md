# algorithm-viewer — koşunun içine bakmak

Tek bir HTML dosyası. Derleme yok, bağımlılık yok, sunucu yok: `index.html`'i çift tıkla,
koşu çıktısını üzerine bırak.

Var oluş sebebi: özet tablo *"yedi yüz örnekte ortalama %84,26"* der ve o ortalamanın arkasındaki
**tek bir planın** neye benzediğini söylemez. Bir gerilemenin ya da kazancın sebebini görmek için
plana bakmak gerekiyordu; bugüne kadar bunun tek yolu elle senaryo kurup API'ye göndermekti.

## Kullanım

```bash
# Koşu + görünüm çıktısı (bayrak verilmezse hiçbir ek işlem yapılmaz)
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --viewer apps/algorithm-viewer/kosu.json

# Üretim yapılandırması (beam) — örnek başına 2 sn, sabırlı ol
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --sequencer beam --max-scenarios 10 --viewer apps/algorithm-viewer/beam.json

# Kısmi yük rejimi
dotnet run --project apps/backend/CargoPilot.Engine.Bench -c Release -- \
    br --load-ratio 0.25 --viewer apps/algorithm-viewer/ceyrek.json
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
| **Test aileleri** | Sol üstte sekme şeridi: **Tümü · hacim · lifo**. Aileler veriden türer (`scenario.suite`), koda gömülü liste yok — yarın kırılganlık ailesi eklendiğinde şerit kendiliğinden büyür. Tek aileli eski dosyalarda şerit hiç görünmez |
| **Senaryo listesi** | Doluluğa veya yayılmaya göre sıralanır; her satırın altında etiketi (*"çok farklı · 8 tip · 4 grup"*). Arama hem kimlikte hem etikette çalışır |
| **Git** | `#317` yaz, oraya atlar |

Kısayollar: <kbd>←</kbd> <kbd>→</kbd> senaryo değiştirir (**listede görünen** sırada — sıralama ve
aile filtresi hesaba katılır), <kbd>boşluk</kbd> animasyonu oynatır.

## Suit ne içeriyor

`--corpus suite` iki eksende tarar ve ikisi de tek dosyaya girer:

| | Kademe | Senaryo |
|---|---|---|
| **hacim** | aynı yük (1 tip) · az farklı (3) · çok farklı (8) · tamamen farklı (20) | 4 × 150 = **600** |
| **lifo** | aynı dört kademe × **2, 3, 4, 5, 6 boşaltma grubu** | 5 × 4 × 30 = **600** |

Araç ölçüleri gerçek ROADEF/EURO 2022 tablosundan; yük yarı gerçek (`GR-*`) yarı rastgele (`RS-*`).
LIFO gruplarının kutuları ürün **tipinin içinden** bölünür — gerçek multi-drop'ta bir boşaltma
noktası karışık yük alır.

## Ölçümü yavaşlatmaz

`--viewer` verilmezse tek bir ek işlem yapılmaz — senaryo listesi hiç oluşturulmaz. Verilirse
maliyet yalnızca JSON yazımıdır (700 senaryo ≈ 3,8 MB; 1200'lük suit ≈ 11 MB).

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
