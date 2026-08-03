# Proje Bağlam Kütüphanesi (context)

Bu klasör, repodaki tüm dokümanların **özetlenmiş halini** tutar. Amaç: bir soruya cevap
vermek için 25 ayrı `.md` dosyasını baştan okumak zorunda kalmamak.

## Kullanım Kuralı

1. Önce `project-snapshot.md` okunur — teknik gerçekler, ortamlar, portlar, açık riskler.
2. Detay gerekiyorsa `doc-map.md`'den **hangi dosyanın** okunacağı bulunur, sadece o dosya açılır.
3. Branch / PR durumu için `branch-audit.md`.
4. Branch stratejisi tartışması için `branching-proposal.md`.

## İçindekiler

| Dosya | İçerik | Ne zaman okunur |
|-------|--------|-----------------|
| [project-snapshot.md](project-snapshot.md) | Stack, ortamlar, portlar, CI/CD, açık riskler — tek sayfa | Her oturum başında |
| [doc-map.md](doc-map.md) | Repodaki 25 `.md` dosyasının haritası + özeti | "Bu bilgi nerede yazıyor?" sorusunda |
| [branch-audit.md](branch-audit.md) | 30 remote branch + açık PR analizi, temizlik kararları | Branch/PR temizliği yaparken |
| [branching-proposal.md](branching-proposal.md) | 5 kişilik ekip için önerilen branch stratejisi | Strateji kararı alınırken |

## Güncelleme Sorumluluğu

| Tetikleyici | Güncellenecek dosya |
|-------------|---------------------|
| Yeni `.md` eklendi / silindi | `doc-map.md` |
| Ortam, port, servis, CI değişti | `project-snapshot.md` |
| Branch temizliği yapıldı | `branch-audit.md` (karar sütunu → uygulandı) |
| Branch stratejisi değişti | `branching-proposal.md` + `docs/conventions/BRANCHING.md` |

> Bu klasör kaynak değil, **indeks**tir. Çelişki durumunda orijinal doküman geçerlidir;
> çelişki bulunursa bu klasör düzeltilir.
