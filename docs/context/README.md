# Proje Bağlam Kütüphanesi (context)

**Son güncelleme:** 2026-08-15 · **Durum:** Aktif

Bu klasör, repodaki tüm dokümanların **özetlenmiş halini** tutar. Amaç: bir soruya cevap
vermek için **45** ayrı `.md` dosyasını baştan okumak zorunda kalmamak.
*(Sayım 2026-08-15, `git ls-files '*.md' | wc -l`. Önceki 37 değeri 2026-08-08'e aitti.)*

---

## Kullanım Kuralı

1. Önce `project-snapshot.md` okunur — teknik gerçekler, ortamlar, portlar, açık riskler.
2. Detay gerekiyorsa `doc-map.md`'den **hangi dosyanın** okunacağı bulunur, sadece o dosya açılır.
3. Branch / PR durumu için `branch-audit.md`.
4. Tarihsel öneriler ve yürürlükten kalkmış planlar `docs/archive/` altındadır.

## İçindekiler

| Dosya | İçerik | Ne zaman okunur |
|-------|--------|-----------------|
| [project-snapshot.md](project-snapshot.md) | Stack, ortamlar, portlar, CI/CD, açık riskler — tek sayfa | Her oturum başında |
| [doc-map.md](doc-map.md) | Repodaki 45 `.md` dosyasının haritası + özeti | "Bu bilgi nerede yazıyor?" sorusunda |
| [kod-taramasi-2026-08.md](kod-taramasi-2026-08.md) | 6 kategoride kod tabanı taraması: gerçek stack, algoritma analizi, doküman-kod çelişkileri, riskler | Kod gerçeği ile doküman iddiası çeliştiğinde; algoritma/test/devops durumu sorulduğunda |
| [branch-audit.md](branch-audit.md) | 30 remote branch + açık PR analizi, temizlik kararları | Branch/PR temizliği yaparken |

> Tarihsel öneriler (ör. trunk stratejisi önerisi) `docs/archive/` altında tutulur; bu tablo
> yalnızca yürürlükteki bağlam dosyalarını listeler.

## Güncelleme Sorumluluğu

| Tetikleyici | Güncellenecek dosya |
|-------------|---------------------|
| Yeni `.md` eklendi / silindi | `doc-map.md` |
| Ortam, port, servis, CI değişti | `project-snapshot.md` |
| Branch temizliği yapıldı | `branch-audit.md` (karar sütunu → uygulandı) |
| Branch stratejisi değişti | `docs/conventions/branching.md` (+ eski karar kaydı: `docs/archive/branching-proposal-2026-08.md`) |

> Bu klasör kaynak değil, **indeks**tir. Çelişki durumunda orijinal doküman geçerlidir;
> çelişki bulunursa bu klasör düzeltilir.
