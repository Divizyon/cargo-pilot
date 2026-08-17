# ClickUp — ALG-01…07'yi üst görev + subtask yapısına taşıma

**Durum:** BEKLİYOR — ClickUp rate limit. 2026-08-15 ~16:40 itibarıyla 1390 dk kaldı
(`retryAfter: 83359 sn`). Okuma da yazma da kapalı. Tahmini açılış: **2026-08-16 ~15:50**.

**Workspace:** `9018951661` · **Liste:** `901820298418` (Ürünleştirme & Sürüm)
**Atanan:** `176577183` (Doğan Can YILDIZ) · **Statü:** `completed` · **Due:** `2026-08-13`

---

## Neden yeniden oluşturma gerekiyor

`clickup_update_task` bir task'ın **üst görevini değiştiremiyor** (şemada `parent` alanı yok).
`clickup_merge_tasks` ise kaynak task'ları **yok ediyor** ve subtask yapısı üretmiyor.
Dolayısıyla tek yol: içeriği oku → subtask olarak yeniden oluştur → orijinali sil.

⚠️ **Sıra kritik:** önce OKU, sonra oluştur, en son sil. Okumadan silme.

---

## Adım 1 — Açıklamaları çek (limit açılınca İLK bunu yap)

Yedisinin de tam `markdown_description`'ı gerekiyor:

```
clickup_get_task(task_id=<id>, workspace_id=9018951661, include=["description"])
```

| Kod | task_id | Başlık | Öncelik | Etiketler |
|---|---|---|---|---|
| ALG-01 | `86eykmdbb` | Golden-master test altyapısı (CargoPilot.Engine.Tests) | urgent | algoritma, backend |
| ALG-02 | `86eykmegx` | Optimizasyon motorunu Application katmanına taşı | urgent | algoritma, backend |
| ALG-03 | `86eykmj9w` | PlacementValidator.cs — sert kısıtları ayır, kopyaları tek kaynağa indir | urgent | algoritma |
| ALG-04 | `86eykmmwx` | LifoPlacement.cs — bölge mantığını ayır | high | algoritma |
| ALG-05 | `86eykmqr2` | ItemOrdering + BalanceScoring + VolumeScoring, skor terim toplamına dönüşsün | high | algoritma |
| ALG-06 | `86eykmrv2` | OptimizationModules bayrakları (dışa açılmaz) | normal | algoritma |
| ALG-07 | `86eykmt1d` | Kırılganlığı (FragilityType) uçtan uca bağla | high | algoritma |

Çekilen açıklamaları **birebir** koru — bunlar tarihsel kayıt, özetleme.

## Adım 2 — Üst görevi aç

**Ad:** `Optimizasyon motoru modülerleştirme (7 adımlı geçiş)`
**Etiket:** algoritma, backend · **Öncelik:** urgent · **Statü:** completed · **Due:** 2026-08-13

**Açıklama taslağı:**

> 583 satırlık tek dosya, biri kapatılamaz altı modüle ayrıldı ve Infrastructure'dan Application
> katmanına taşındı. Bölme biçimi arayüz/plugin değil, motorun doğrudan çağırdığı statik
> fonksiyonlar — sıcak döngüye tek bir dolaylı çağrı bile eklenmedi.
>
> Bölmeden **önce** mevcut davranışı kilitleyen 16 anlık görüntü testi yazıldı. Yedi adımın
> hiçbirinde bu görüntülerin biri bile kaymadı.
>
> Kaynak: [Optimizasyon Motoru Modül Mimarisi](https://claude.ai/code/artifact/786ee87f-0656-4634-b326-74c41b0d9174)
> · [Algoritma Mimarisi Heyet Kararı](https://claude.ai/code/artifact/45f5bb25-12d1-4c05-ab45-73e05eb0a7c2)
>
> **PR:** #935 → #936 → #937 · **Motor testi:** 0 → 33
>
> Devamı: bu turda bulunan iki fizik hatası ayrı üst görevde
> (Motor fizik hataları — denge takası ve LIFO bölge kısıtı, `86eyn1pdt`).

## Adım 3 — Yedisini subtask olarak yeniden oluştur

`clickup_create_task(parent=<üst görev id>, ...)` — başlık, öncelik, statü, atanan, due aynı;
açıklama Adım 1'de çekilen metin. **Etiket subtask'ta gerekmiyorsa atlanabilir** (bu turda
açtığım subtask'larda etiket kullanılmadı, üst görevde toplandı).

## Adım 4 — Orijinal 7 task'ı sil

Yalnız Adım 3'ün 7/7 başarılı olduğu doğrulandıktan SONRA:
`86eykmdbb`, `86eykmegx`, `86eykmj9w`, `86eykmmwx`, `86eykmqr2`, `86eykmrv2`, `86eykmt1d`

---

## Aynı fırsatta bitirilecek yarım iş

Bu turda düz açılan 8 kopyanın 4'ü silindi, **4'ü duruyor** (içerikleri zaten subtask olarak var,
listede çift görünüyorlar). Limit açılınca bunlar da silinmeli:

- `86eyn1gbr` — INFRA-03
- `86eyn1gc7` — INFRA-04
- `86eyn1gfg` — DOC-01
- `86eyn1gfr` — Texture temizliği

## Ayrıca önerilen (kullanıcı onayı bekliyor)

- **F0-01** (`86eyjm8c3`, kapı yönü hataları — backend) + **F0-04** (`86eyk7hb6`, frontend kapı yönü
  enum eşlemesi): aynı kusurun iki katmanı, tek üst görev altında toplanabilir.
- **Birleştirilmemesi önerilen:** F0-03 (fantom bölge cezası) ile ALG-09 (LIFO bölge sert kısıtı) —
  aynı konuya bakıyor ama farklı zamanlarda, farklı PR'larda çözülmüş iki ayrı hata.

---

## Bu turda tamamlanan yapı (referans)

| Üst görev | id | Subtask'lar |
|---|---|---|
| Motor fizik hataları — denge takası ve LIFO bölge kısıtı | `86eyn1pdt` | ALG-08 `86eyn1pek` · ALG-09 `86eyn1pfb` · ALG-10 `86eyn1pgc` |
| DevOps sertleştirme turu — port, cache, rollback | `86eyn1pgu` | INFRA-02 `86eyn1pj1` · INFRA-03 `86eyn1pka` · INFRA-04 `86eyn1pmv` |
| Dokümantasyon tazeleme ve depo bakımı | `86eyn1pnu` | DOC-01 `86eyn1ppv` · Texture `86eyn1pr8` |
</content>
