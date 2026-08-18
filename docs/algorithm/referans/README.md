# referans/ — makine tarafından okunan ölçüm referansları

Bu klasördeki JSON dosyaları motorun doluluğunu **sabitler**.
[engine-bench.yml](../../../.github/workflows/engine-bench.yml) her koşuda bunlarla karşılaştırır
ve gerilemede durur.

| Referans | Yapılandırma | BR1-BR7 ortalaması |
|---|---|---|
| [`br-wallbuilder-static.json`](br-wallbuilder-static.json) | Duvar örücü · Static · Strict | %80,09 |

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
