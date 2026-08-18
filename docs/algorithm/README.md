# Algoritma belgeleri

- [ADR — Yerleştirme Algoritması](adr-yerlestirme-algoritmasi.md) — kararlar, gerekçeler, başarı
  karnesi, roadmap uyumu ve reddedilen seçenekler
- [ALGORITMA-GELISTIRME-LOG.md](../../ALGORITMA-GELISTIRME-LOG.md) — ölçüm günlüğü, deneme deneme
- [ALGORITMA-RULEBOOK.md](../../ALGORITMA-RULEBOOK.md) — kural ve karar kaydı (`R-*`, `DR-*`)
- [ALGORITMA-YOL-HARITASI.md](../../ALGORITMA-YOL-HARITASI.md) — faz planı

## Motor doluluk referansları

`br-greedy-static.json` ve `br-wallbuilder-static.json`, yerleştirme motorunun BR1-BR7 üzerindeki
doluluğunu sabitler. [engine-bench.yml](../../.github/workflows/engine-bench.yml) her koşuda bu
dosyalarla karşılaştırır ve gerilemede durur.

| Referans | Yapılandırma | BR1-BR7 ortalaması |
|---|---|---|
| `br-greedy-static.json` | Greedy · Static · Strict | %75,23 |
| `br-wallbuilder-static.json` | WallBuilder · Static · Strict | %79,86 |

700 örnek (7 küme × 100), konteyner 587×233×220 cm. Veri ve biçim:
[apps/backend/CargoPilot.Engine.Bench/data](../../apps/backend/CargoPilot.Engine.Bench/data/README.md).

## Neden yalnızca statik sequencer

Arama katmanının bütçesi **duvar saatidir** (`SearchBudget.MaxDurationMs`). Yavaş bir koşucu daha
az iterasyon yapar ve sonuç makineye bağlı çıkar — kapı gürültüden kalırdı. Statik yol saf
hesaptır: aynı girdi her makinede bit birebir aynı sonucu verir, dolayısıyla **her düşüş gerçek
bir gerilemedir** ve tolerans (0,05 puan) yalnızca JSON yuvarlamasına karşıdır.

GRASP'ın ölçümü elle yapılır ve [ALGORITMA-GELISTIRME-LOG.md](../../ALGORITMA-GELISTIRME-LOG.md)
içinde kayıtlıdır.

## Referansı tazeleme

Kapı bir **iyileşmeyi** de bildirir ("referans tazelenmeli"). Kazanç kaydedilmezse yeni taban
oluşmaz ve bir sonraki gerileme geç fark edilir. Tazelemek için, depo kökünden:

```bash
dotnet run --project apps/backend/CargoPilot.Engine.Bench -- \
  br --strategy wallbuilder --report "$PWD/docs/algorithm/br-wallbuilder-static.json"

dotnet run --project apps/backend/CargoPilot.Engine.Bench -- \
  br --strategy greedy --report "$PWD/docs/algorithm/br-greedy-static.json"
```

`--report` ve `--baseline` yolları **mutlak** verilmelidir: `dotnet run --project` çalışma dizinini
proje klasörüne çeker, göreli yol beklenmedik bir yere düşer.

Tazeleme, doluluğun neden değiştiğini açıklayan bir günlük kaydıyla birlikte commit edilmelidir.
Sayı gerekçesiz değişirse referans bir kapı olmaktan çıkıp bir kayıt defterine döner.
