# ADR-0008 — SHA pinleme, sürüm yükseltmesinden ayrılır

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-15 (PR #1008)
- **Kapsam:** `.github/workflows/test-deploy.yml` (e2e job'u), `.github/dependabot.yml`,
  `docs/devops/denetim-raporu-2026-08-13.md`
- **Not:** Bu ADR geriye dönük yazılmıştır. Karar PR #1008 ile uygulandı; gerekçesi hiçbir yerde
  yazılı olmadığı için sonradan D-13(a) olarak **"borç"** biçiminde raporlandı (bkz. Karar 3).

## Bağlam

Denetim raporunun ilk turu GitHub Actions referanslarının tamamının SHA'ya pinli olduğunu
söylüyordu ("28/28", panoramada "32/32 ✅"). İkinci turda ölçüldüğünde gerçek durum farklı çıktı:

`.github/workflows/*.yml` içindeki **45 `uses:` referansının 38'i** 40 haneli SHA'ya pinliydi;
kalan **7'si mutable tag'deydi ve hepsi `test-deploy.yml`'in e2e job'undaydı**
(`docs/devops/denetim-raporu-2026-08-13.md:39-45`):

| Action | Eski hâl | Konum |
|---|---|---|
| `actions/checkout` | `@v4` | `:314` |
| `docker/setup-buildx-action` | `@v3` | `:317` |
| `docker/login-action` | `@v3` | `:320` |
| `docker/build-push-action` | `@v5` | `:327`, `:340` |
| `actions/setup-node` | `@v4` | `:354` |
| `actions/upload-artifact` | `@v4` | `:397` |

Rapordaki eski sayılar, e2e job'u eklenmeden önceki duruma aitti — job sonradan geldi ve
pinleme disiplini o job'a uygulanmadı.

Mutable tag riski: `@v4` gibi bir tag hareket ettirilebilir. Tag'in işaret ettiği commit
değiştiğinde workflow, hiçbir PR açılmadan, farklı kod çalıştırmaya başlar (tedarik zinciri
saldırı yüzeyi).

## Karar

### 1. Yedi action SHA'ya pinlendi, sürümleri **yükseltilmedi**

PR #1008 yalnızca referans biçimini değiştirdi: `@v4` → `@11d5960a…  # v4.4.0`. Diff **7 ekleme /
7 silme**, tek dosya. Hiçbir action'ın davranışı değişmedi.

Gerekçe:

- Pinleme bir **güvenlik/tekrarlanabilirlik** işidir; yükseltme bir **davranış değişikliği**dir.
  Aynı PR'a sıkıştırıldıklarında, CI davranışı değişirse hangisinin sebep olduğu belirsizleşir.
- Ayrışma küçük değil, üç majöre varıyor: `docker/build-push-action` e2e'de v5.4.0 iken
  `ci.yml`'de **v7.3.0** (`ci.yml:220`, `:232`); `actions/checkout` v4.4.0'a karşı **v7.0.1**
  (`ci.yml:72`); `setup-buildx-action` v3.12.0'a karşı **v4.2.0** (`ci.yml:210`);
  `login-action` v3.7.0'a karşı **v4.6.0** (`ci.yml:213`).
- Bu ölçekte bir yükseltmenin kırma potansiyeli yüksektir ve e2e job'u zaten Playwright +
  compose + sahte ERP MSSQL'e bağlı, gürültülü bir job'dur. Kırıldığında pinleme PR'ı geri
  alınırsa güvenlik kazancı da geri alınır.

Sonuçları:

- Pinleme sonrası ölçüm: 45 `uses:` referansının **45'i** SHA'ya pinli
  (`grep -rhn "uses:" .github/workflows/*.yml | grep -cE "@[0-9a-f]{40}"` → 45).
- e2e job'u bilinçli olarak eski ama **sabit** sürümlerde bırakıldı. "Sabit ve eski",
  "hareketli ve yeni"den daha güvenlidir.

### 2. Yükseltmeyi Dependabot devralır

Pinleme `@<sha> # vX.Y.Z` biçiminde yapıldı — SHA'nın yanında sürümü belirten yorum satırı var.

Gerekçe:

- Dependabot bu biçimi tanır: yorumdaki sürümü okur, yeni sürümün SHA'sını bulur ve **SHA + yorum
  çiftini birlikte** güncelleyen bir PR açar. Yani pinleme, yükseltmeyi engellemez — yükseltmeyi
  otomatikleştirir.
- `.github/dependabot.yml:117-125` `github-actions` ekosistemini `dev` hedef dalıyla, haftalık
  (pazartesi) olarak zaten tanımlı tutuyor.

Sonuçları:

- Sürüm hizalaması ayrı, gözden geçirilebilir, tek tek geri alınabilir PR'lar hâlinde gelir.
- Elle yükseltme turu gerekirse, o da ayrı bir PR olarak açılır — pinleme PR'ına eklenmez.

### 3. Bu ayrım borç değildir; "düzeltme" girişimi pinlemeyi bozar

Bu karar sonradan denetim bulgusu **D-13(a)** olarak "e2e job'unun action'ları geride kalmış"
biçiminde raporlandı ve borç listesine alındı. Bu etiket yanlıştır.

Sonuçları:

- Biri bu "borcu" pinleme PR'ının kapsamına geri sokarak kapatmaya kalkarsa, pinlemenin tek
  değerli özelliği — **hangi commit'in tam olarak ne çalıştırdığının doğrulanabilir olması** —
  bozulur; diff artık "biçim değişikliği" olmaktan çıkıp "üç majör atlayan davranış
  değişikliği"ne dönüşür ve geri alınabilirliği kaybeder.
- D-13(a) "borç" değil, **"bilinçli · pinleme sonrası sürüm hizalama turu"** olarak
  etiketlenmelidir; şiddeti düşürülmeli ve kapsamı backlog'da yazdığı gibi 2 satır değil,
  **7 action** olarak düzeltilmelidir (backlog satırı yalnız `:327` ve `:340`'ı gösteriyor).
- Yükseltme turu yapıldığında ayrı bir PR açılır ve bu ADR'ye ek karar olarak işlenir.

### 4. Yeni eklenen her job pinleme disiplinine tabidir

e2e job'u pinlenmemiş olarak eklenebildiği için denetim raporu iki tur boyunca yanlış sayı
taşıdı.

Sonuçları:

- Doğrulama komutu tektir ve tekrarlanabilir:
  `grep -rn "uses: " .github/workflows/*.yml | grep -v "@[0-9a-f]\{40\}"` → **0 satır** dönmelidir.
- Pinleme oranı iddiası, ölçülmeden dokümana yazılmaz.

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| Pinleme + yükseltmeyi aynı PR'da yapmak | Üç majör atlayan bir yükseltme davranışı değiştirirse, sebebin pinleme mi yükseltme mi olduğu ayırt edilemez; PR geri alınırsa güvenlik kazancı da geri alınır |
| Mutable tag'de bırakıp yalnızca yükseltmek (`@v5` → `@v7`) | Tedarik zinciri riski sürer: tag hareket ettirildiğinde workflow hiçbir PR açılmadan farklı kod çalıştırır |
| SHA'yı sürüm yorumu olmadan pinlemek (`@11d5960a…`) | Dependabot yükseltmeyi öneremez ve insan da hangi sürümde olduğunu okuyamaz; pin kalıcı olarak donar |
| Repo genelinde tek seferde hem pinleyip hem tüm sürümleri hizalamak | Aynı belirsizlik, daha geniş yüzeyde; e2e job'u compose + Playwright + sahte ERP MSSQL'e bağlı ve zaten gürültülü |
| Pinlemeyi hiç yapmayıp yalnızca Dependabot'a bırakmak | Dependabot mutable tag'i de günceller ama tag'in hareket etmesine karşı koruma sağlamaz; pinleme ön koşuldur |

## Açık konular

- Sürüm hizalama turu henüz yapılmadı. Dependabot'un `github-actions` PR'ları geldikçe
  e2e job'u kendiliğinden hizalanacak; hizalanmazsa ayrı bir `chore/*` PR'ı açılır.
- Dependabot'un `@sha # vX.Y.Z` biçimini bu repoda fiilen güncellediği bir PR henüz
  gözlenmedi — beklenen davranış, ölçülmüş değil.
