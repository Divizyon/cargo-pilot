# ADR-0006 — Üç dallı terfi modeli ve Terfi workflow'u

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-03 (model) · 2026-08-08 (`branching.md` güncellemesi) · terfi otomasyonu INFRA-01
- **Kapsam:** `docs/conventions/branching.md`, `.github/workflows/promote.yml`, `dev`/`test`/`main` ruleset'leri
- **Not:** Bu ADR geriye dönük yazılmıştır; karar 2026-08-03'te uygulanmaya başlamış, gerekçeleri
  o tarihten beri yalnızca `branching.md` ve `promote.yml` başlığındaki yorum bloğunda dağınık
  hâlde duruyordu.

## Bağlam

Cargo Pilot üç kalıcı dal kullanıyor: `dev` (günlük entegrasyon), `test` (QA/gösterim ortamı,
test sunucusuna deploy edilir), `main` (production'a hazır sürüm). İş dalları `dev`'den açılır,
`dev`'den `test`'e ve `test`'ten `main`'e **terfi** edilir (`docs/conventions/branching.md:14-25`).

Eski modelde 1000+ commit geride kalan iş dalları birikmiş, hiçbiri rebase edilememiş ve hepsi
silinmek zorunda kalmıştı (`branching.md:56-59`). Ayrıca bir kez `feat/*` dalı `dev`'i atlayıp
doğrudan `test`'e girmiş (#482) ve dalları ayrıştırmıştı; düzeltmek için `sync/test-to-dev`
yaması gerekti (`branching.md:186-189`).

Model kurulduktan sonra iki teknik tuzak ortaya çıktı ve bunlar birkaç kez "CI/ruleset arızası"
sanılarak yanlış teşhis edildi. Bu ADR'nin asıl amacı bu iki tuzağı kalıcı olarak kayda geçirmektir.

## Karar

### 1. Terfi zinciri tek yönlüdür: `dev → test → main`

Tüm iş dalları `dev`'den açılır. `test`'e yalnızca `dev`'den, `main`'e yalnızca `test`'ten veya
`hotfix/*`'ten PR açılabilir; CI ve ruleset bunu zorunlu kılar (`branching.md:28-34`).
`test` ve `main` üzerinde **hiç commit üretilmez** — içerikleri yalnızca terfi ile değişir
(`branching.md:36-39`).

Gerekçe:

- Test ortamında bulunan bir hata `test` dalında düzeltilirse dallar ayrışır; düzeltme `dev`'de
  açılıp yeniden terfi edilmelidir (`branching.md:177-190`).
- Sıra dışı bir terfi gerektiğinde `dev`'deki **her şey** birlikte gider; bu yüzden yarım kalan iş
  `dev`'e merge edilmez, feature flag kullanılır (`branching.md:61-65`).

Sonuçları:

- İş dalı ömrü ≤ 3 gün hedefi bir stil tercihi değil, "dev her an çıkılabilir olmalı"
  kuralının doğrudan sonucudur.
- Hotfix sonrası geri-merge (`main → test → dev`) zorunludur; atlanırsa bir sonraki terfi
  düzeltmeyi geri alır (`branching.md:203-211`).

### 2. `feat/*` → `dev` **squash**, terfiler **merge commit**

| PR | Yöntem |
|---|---|
| `feat/*`/`fix/*`/`chore/*`/`infra/*` → `dev` | Squash |
| `dev` → `test` | Merge commit |
| `test` → `main` | Merge commit |
| `hotfix/*` → `main` | Merge commit |

Gerekçe:

- İş dalında squash, iş başına tek okunabilir commit üretir.
- Terfide squash yapılırsa `test`, `dev`'de olmayan **yeni bir commit** alır ve dallar kalıcı
  olarak ayrışır (`branching.md:140-141`). Merge commit, commit kimliğini korur ve geri-merge'ü
  mümkün kılar.

Sonuçları:

- Ruleset her dalda yalnızca doğru merge yöntemini açık bırakır; yanlış seçim yapılamaz
  (`branching.md:224`).
- Bir sonraki maddedeki `BEHIND` görünümü bu tercihin doğrudan sonucudur.

### 3. Terfi PR'ları kalıcı olarak `BEHIND` görünür — bu bir arıza DEĞİLDİR

Merge-commit ile terfi eden bir PR'da hedef dal (`test`/`main`), kaynak dalda (`dev`/`test`)
bulunmayan bir merge commit içerir. Bu nedenle terfi PR'ının `mergeStateStatus` değeri **kalıcı
olarak `BEHIND`** kalır ve `gh pr merge`'ün **istemci tarafı** kontrolü merge'i reddeder:

```
X Pull request #928 is not mergeable: the head branch is not up to date with the base branch.
```

Gerekçe:

- Bu bir ruleset arızası değildir: üç ruleset'in hiçbirinde
  `strict_required_status_checks_policy` açık değildir (`branching.md:165-167`).
- Sorun yalnızca `gh pr merge`'ün istemci tarafı kontrolündedir. GitHub REST API'sinin merge uç
  noktası aynı kontrolü uygulamaz ve PR'ı sorunsuz merge eder (`promote.yml:5-12`).

Sonuçları:

- Terfi PR'ları **elle `gh pr merge` ile merge EDİLMEZ**. Doğru yol `Terfi` workflow'udur
  (`.github/workflows/promote.yml`); workflow kullanılamıyorsa REST API
  (`gh api repos/<org>/<repo>/pulls/<PR>/merge -X PUT -f merge_method=merge`) veya GitHub
  arayüzündeki "Merge pull request" düğmesi kullanılır.
- **Korumaları atlamak için `--admin` veya bypass kullanılmaz** (`branching.md:171-172`,
  `promote.yml:152-154`).
- `BEHIND` görünümünü "düzeltmek" için terfiyi squash'a çevirmek veya kaynak dalı hedefe rebase
  etmek modeli bozar; bu görünüm kabul edilmiş bir maliyettir.

### 4. Merge adımı `GITHUB_TOKEN` ile değil, `PROMOTION_PAT` ile yapılır

`Terfi` workflow'unda PR'ı bulan ve zorunlu kontrolleri bekleyen adımlar `GITHUB_TOKEN`
kullanır (`promote.yml:97`, `:131`); **merge adımı ise ayrı bir PAT secret'ı** (`PROMOTION_PAT`)
kullanır (`promote.yml:142`).

Gerekçe:

- GitHub'ın özyineleme koruması gereği, `GITHUB_TOKEN` ile yapılan bir merge'ün hedef dala
  ittiği merge commit `GITHUB_TOKEN` kaynaklı sayılır ve `test`/`main` üzerindeki
  **push tetikleyicili workflow'ları çalıştırmaz**: `test-deploy.yml` (test sunucusuna deploy)
  ve `release-tag.yml` (`main`'de `v0.<n>.0` sürüm etiketi) (`promote.yml:24-32`).
- Bu, terfiyi "başarılı" gösterip deploy ve sürüm otomasyonunu **sessizce** kırardı — en tehlikeli
  arıza biçimi, çünkü hiçbir job kırmızıya dönmez.

Sonuçları:

- Workflow'un ilk adımı PAT varlığını kontrol eder ve yoksa açık hata mesajıyla durur
  (`promote.yml:69-74`). PAT süresi dolarsa terfi başlamadan durur, yarım kalmaz.
- `PROMOTION_PAT` bir işletim ön koşuludur: `contents:write` + `pull-requests:write`
  (classic: `repo` scope; fine-grained: Contents RW, Pull requests RW).
- Merge adımı 3 denemeye kadar tekrar eder (`promote.yml:146-159`); başarısız olursa kök neden
  incelenir, bypass edilmez.

### 5. Terfi workflow'u PR **açmaz**, yalnız açık PR'ı merge eder

PR'ı insan `gh pr create --base test --head dev` ile açar; workflow yalnızca açık terfi PR'ını
bulur (`promote.yml:94-127`), zorunlu kontrollerin geçmesini bekler (`:129-138`) ve merge eder.

Gerekçe:

- Aynı özyineleme koruması: `GITHUB_TOKEN` ile açılan PR'lar `pull_request` tetiklenen job'ları
  çalıştırmaz. Workflow PR açsaydı zorunlu kontroller sonsuza kadar `pending` kalır ve merge
  hiç gerçekleşmezdi (`promote.yml:14-22`).
- Tasarım kararı alındığında repoda repo yazma yetkili bir PAT secret'ı da yoktu; sonradan
  eklenen `PROMOTION_PAT` yalnız merge adımı içindir ve PR açma tasarımını değiştirmez.

Sonuçları:

- Terfi iki adımlıdır: önce `gh pr create`, CI çalışmaya başladıktan sonra
  Actions → Terfi → Run workflow (hedef: `dev-test` ya da `test-main`).
- Workflow aynı yön için birden fazla açık PR bulursa hata verir ve `pr_numarasi` girdisiyle
  belirtilmesini ister (`promote.yml:118-122`) — yanlış PR'ı merge etme riski kapalıdır.

### 6. İzin verilen dal türleri sabittir

`feat/*`, `fix/*`, `chore/*`, `infra/*` (hepsi `dev`'den) ve `hotfix/*` (sürüm tag'inden)
(`branching.md:45-55`). İsimlendirme `<tür>/<iş-kodu>-<kısa-açıklama>`; `chore/` ve `infra/`
için iş kodu zorunlu değildir (`branching.md:99`).

Sonuçları:

- **`docs/*` diye bir dal türü YOKTUR.** Doküman işi `chore/*` altında açılır
  (`branching.md:52`: "chore — Doküman, bağımlılık, temizlik").
- Büyük harf, boşluk ve Türkçe karakter kullanılmaz (`branching.md:87-97`).

## Zorunlu kontroller ve ortam eşlemesi

| Hedef dal | Zorunlu kontroller |
|---|---|
| `dev` | `Frontend CI`, `Backend CI` |
| `test` | `Frontend CI`, `Backend CI`, `Terfi Zinciri Kontrolü`, `Pending Migration Kontrolü`, `Image Build`, `Deploy (Test)` |
| `main` | `Frontend CI`, `Backend CI`, `Terfi Zinciri Kontrolü`, `Pending Migration Kontrolü` |

`main`'de image build ve deploy koşmaz; içerik `test`'te zaten build edilip çalıştırılmıştır
(`branching.md:240-245`). `main`'e terfi bugün deploy tetiklemez, yalnızca sürüm etiketi üretir —
production ortamı henüz kurulmamıştır (`branching.md:265-275`).

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| Tek dal (trunk-based) + ortam etiketleri | QA'nın üzerinde çalıştığı içeriğin dondurulması gerekiyor; `test` sunucusu her `dev` commit'iyle değişemez |
| Terfilerde de squash | `test`, `dev`'de olmayan yeni commit alır; dallar kalıcı ayrışır ve geri-merge imkânsızlaşır (`branching.md:140-141`) |
| Terfi PR'larını `gh pr merge` ile elle merge etmek | Merge-commit modelinde PR kalıcı `BEHIND` görünür; `gh pr merge` istemci tarafı kontrolüyle reddeder (`promote.yml:5-12`) |
| `gh pr merge --admin` ile korumaları atlamak | Zorunlu kontroller devre dışı kalır; açıkça yasaklandı (`branching.md:171-172`) |
| Terfi workflow'unun PR'ı da açması | `GITHUB_TOKEN` ile açılan PR `pull_request` job'larını tetiklemez; zorunlu kontroller sonsuza kadar `pending` kalır (`promote.yml:14-22`) |
| Merge'ü `GITHUB_TOKEN` ile yapmak | `test`/`main` push tetikleyicileri (deploy, sürüm etiketi) çalışmaz; terfi yeşil görünürken otomasyon sessizce kırılır (`promote.yml:24-32`) |
| Kaynak dalı hedefe rebase/merge ederek `BEHIND`'ı gidermek | `dev`'e terfi kaynaklı commit sokar, tek yönlü zinciri bozar |

## Açık konular

- Production ortamı kurulunca `main → production` deploy'u `production` GitHub Environment'ı
  üzerinden zorunlu onaylayıcı ile çalışacak; `PROD_SSH_HOST`/`PROD_SSH_PRIVATE_KEY`,
  `.env.prod`, `prod-deploy.yml` eksikleri `docs/devops/devops-backlog.md` 2.1–2.3'te.
- `PROMOTION_PAT`'in süresi ve sahibi belgelenmedi; PAT bir kişiye bağlı olduğu sürece terfi o
  kişiye bağımlıdır. Fine-grained PAT'in yenilenme takvimi kararlaştırılmalı.
