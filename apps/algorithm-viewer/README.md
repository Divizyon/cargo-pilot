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
| **Altı bakış** | Kapıdan, uzak yüzden, soldan, sağdan, üstten, alttan — hepsi aynı anda, senkron |
| **Kesit dilimi** | Kaydırıcı bir düzlem seçer; o düzlemin **tam** kesiti çizilir |
| **Boşluklar** | Kap önce boşluk rengiyle boyanır, kutular üzerine çizilir. Kesit kipinde ekranda kırmızı kalan **her piksel gerçekten boş hacimdir** |
| **Yükleme animasyonu** | Kutular **yerleştirme sırasıyla** belirir — algoritmanın aracı gerçekte nasıl doldurduğu |
| **Senaryo listesi** | 700 senaryo; doluluğa veya yayılmaya göre sıralanır. En kötü on senaryoyu bulmak iki tıklama |
| **Git** | `#317` yaz, oraya atlar |

Kısayollar: <kbd>←</kbd> <kbd>→</kbd> senaryo değiştirir, <kbd>boşluk</kbd> animasyonu oynatır.

## Ölçümü yavaşlatmaz

`--viewer` verilmezse tek bir ek işlem yapılmaz — senaryo listesi hiç oluşturulmaz. Verilirse
maliyet yalnızca JSON yazımıdır (700 senaryo ≈ 3,8 MB).

## Koordinat sözleşmesi

`x` = genişlik, `y` = yükseklik, `z` = uzunluk; `z = 0` uzak yüz, `z = uzunluk` referans kapı.
Kutu konumu origin'e en yakın köşedir. Altı bakış bu sözleşmeden türetilmiştir —
[docs/COORDINATE_STANDARD.md](../../docs/COORDINATE_STANDARD.md).

## Neden `algorithm-test-ui` değil

O proje bir React/Vite uygulaması: kurulum, derleme, kimlik doğrulama, senaryo üreteci taşıyor ve
**test koşturmak** için var. Burada istenen şey koşuyu değil **çıktısını** görmek; tek dosyalık
statik bir sayfa hem daha hızlı açılıyor hem de bir daha bakım istemiyor.
