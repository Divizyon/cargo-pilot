# Katkı Sağlama

Bu doküman, Cargo Pilot'a katkı sağlarken izlenecek temel akışı özetler: kurulum, branch modeli, commit kuralları ve PR süreci. Detaylar için her bölümdeki bağlantılı dokümana bakın.

---

## Başlarken

Local geliştirme ortamını ayağa kaldırmak için [Local Setup](docs/setup/local-setup.md) dokümanını izleyin — ön koşullar, `.env` dosyasını hazırlama, stack'i başlatma (tam Docker veya Vite + Docker hibrit) ve sık karşılaşılan sorunlar orada anlatılır.

---

## Branch Modeli

Proje üç dallı terfi (promotion) modelini kullanır:

```
feat/US-142-x ──PR (squash)──► dev ──PR (merge)──► test ──PR (merge)──► main
```

- Tüm iş branch'leri (`feat/*`, `fix/*`, `chore/*`, `infra/*`) **`dev`'den** açılır ve **≤ 3 gün** ömürlüdür.
- `test`'e yalnızca `dev`'den, `main`'e yalnızca `test`'ten (veya `hotfix/*`'ten) PR açılabilir.
- `dev`, `test` ve `main`'e doğrudan push yapılmaz; ruleset bunu engeller.
- Branch adları `<tür>/<iş-kodu>-<kısa-açıklama>` biçimindedir, örn. `feat/US-142-login-form`.

Detaylı akış, isimlendirme kuralları, merge stratejisi ve hotfix süreci için bkz. [Branching Strategy](docs/conventions/branching.md).

---

## Commit Kuralları

Commit mesajları sade, açıklayıcı ve mümkünse Türkçe olmalıdır. **1 anlamlı değişiklik = 1 commit** kuralına uyun; "fix", "update", "son" gibi genel ifadelerden kaçının. PR açmadan önce anlamsız commit'leri temizleyin.

Detay için bkz. [Commit Kuralları](docs/conventions/commits.md).

---

## Kod Standartları

- Frontend değişiklikleri için kök `CLAUDE.md` ve ilgili sub-domain klasöründeki kuralları izleyin.
- Backend değişiklikleri için [Mimari Rehberi](apps/backend/docs/architecture.md) dokümanındaki katman ve konvansiyonlara uyun.

---

## PR Süreci

1. PR açarken [PR şablonunu](.github/pull_request_template.md) eksiksiz doldurun (özet, ilgili user story/issue, değişiklik tipi, test durumu, ekran görüntüleri, kontrol listesi).
2. En az **1 onaylayan review** gerekir; push sonrası eski onaylar düşer, yeniden review istenir. Tüm review thread'leri çözülmüş olmalıdır.
3. CI kapılarının geçmesi zorunludur:
   - **Frontend:** `tsc`, `eslint`, `vitest`, `build`
   - **Backend:** `dotnet build`
4. UI değişikliği içeren PR'larda öncesi/sonrası ekran görüntüsü zorunludur; 3D/algoritma değişikliklerinde öncesi–sonrası plan karşılaştırması eklenir.

---

## Doküman Güncelleme

Yeni bir `.md` dosyası eklediğinizde şunları da güncelleyin:

- `SUMMARY.md` — GitBook içindekiler tablosuna yeni dosyayı ekleyin.
- `docs/context/doc-map.md` — yeni dosyanın özetini ve satır sayısını haritaya işleyin.
