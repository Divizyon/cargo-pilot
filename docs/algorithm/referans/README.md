# referans/ — makine tarafından okunan ölçüm referansları

Bu klasördeki JSON dosyaları motorun doluluğunu **sabitler**.
[engine-bench.yml](../../../.github/workflows/engine-bench.yml) her koşuda bunlarla karşılaştırır
ve gerilemede durur.

| Referans | Yapılandırma | BR1-BR7 | Yayılma |
|---|---|---|---|
| [`br-wallbuilder-static.json`](br-wallbuilder-static.json) | Duvar örücü · Static · Strict · tam yük | %83,63 | ×1,182 |
| [`br-wallbuilder-static-yuk0.75.json`](br-wallbuilder-static-yuk0.75.json) | … · **yük %75** | %74,18 | ×1,287 |
| [`br-wallbuilder-static-yuk0.50.json`](br-wallbuilder-static-yuk0.50.json) | … · **yük %50** | %49,62 | ×1,457 |
| [`br-wallbuilder-static-yuk0.25.json`](br-wallbuilder-static-yuk0.25.json) | … · **yük %25** | %24,75 | ×1,812 |

Kısmi yük referanslarında **doluluk sütunu bir kalite ölçüsü değildir** — yükün büyüklüğüdür.
Orada kaliteyi yayılma (kullanılan / ideal uzunluk) ve dilim doluluğu ölçer; ikisi de `F8-0`'da
eklendi ve yayılma ayrı bir eşikle (±0,01) kapıya girer. Yük oranı yapılandırmanın parçasıdır:
%25 koşusu tam yük referansıyla kıyaslanamaz.

700 örnek (7 küme × 100), konteyner 587×233×220 cm. Veri ve biçim:
[`CargoPilot.Engine.Bench/data`](../../../apps/backend/CargoPilot.Engine.Bench/data/README.md).

## Neden yalnızca static sequencer

Arama katmanının bütçesi **duvar saatidir** (`SearchBudget.MaxDurationMs`). Yavaş bir koşucu daha
az iterasyon yapar ve sonuç makineye bağlı çıkar — kapı gürültüden kalırdı. Static yol saf
hesaptır: aynı girdi her makinede bit birebir aynı sonucu verir, dolayısıyla **her düşüş gerçek bir
gerilemedir** ve tolerans (0,05 puan) yalnızca JSON yuvarlamasına karşıdır.

GRASP'ın ölçümü elle yapılır ve [04-olcum-gunlugu.md](../04-olcum-gunlugu.md) içinde kayıtlıdır.

## Referansı tazeleme

Kapı bir **iyileşmeyi** de bildirir ("referans tazelenmeli"). Kazanç kaydedilmezse yeni taban
oluşmaz ve bir sonraki gerileme geç fark edilir. Tazelemek için, depo kökünden:

```bash
dotnet run --project apps/backend/CargoPilot.Engine.Bench -- \
  br --report "$PWD/docs/algorithm/referans/br-wallbuilder-static.json"
```

`--report` ve `--baseline` yolları **mutlak** verilmelidir: `dotnet run --project` çalışma dizinini
proje klasörüne çeker, göreli yol beklenmedik bir yere düşer.

Tazeleme, doluluğun neden değiştiğini açıklayan bir
[günlük kaydıyla](../04-olcum-gunlugu.md) birlikte commit edilmelidir. Sayı gerekçesiz değişirse
referans bir kapı olmaktan çıkıp kayıt defterine döner.
