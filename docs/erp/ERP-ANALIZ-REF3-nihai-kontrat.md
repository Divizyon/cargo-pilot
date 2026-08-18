# REF3 — Netsis (TBLSTSABIT) → DraftItems → Items → Frontend NİHAİ KONTRAT

Kaynak: `stoknetsis.accdb` içinden çıkarılan nihai karar tabloları
(`NIHAI_ALAN_ESLESME.csv` ana kontrat; destek: `TAM_ALAN_ESLESME.csv`, `KOLON_ESLESME.csv`,
`KOLON_SOZLUGU.csv`, `FRONTEND_ITEMS_ESLESME.csv`, `DRAFT_DOLUM_ESLEME.csv`).
Bu belge, kodun kontrata uyup uymadığını denetlemek için REFERANS olarak kullanılır.

Terimler:
- **Senkron / sync**: `SyncErpItemsCommandHandler` + ERP fetcher'ın TBLSTSABIT'ten DraftItems'a yazması.
- **Onay / aktarım**: Taslak ürünün onaylanıp Items'a basılması (`ItemFactory.CreateFromDraft` / `ApplyDraft` / `ApproveDraftItemCommandHandler`).
- **Normalize**: `ItemStacking.Normalize(isStackable, maxStackCount, maxWeightOnTop, weight)`.

---

## 1) TAM EŞLEŞME ZİNCİRİ (27 nihai satır)

Zincir: **Netsis TBLSTSABIT kolonu → DraftItems kolonu → Items kolonu → Frontend etiketi**
(DraftItems ve Items kolon adları EF entity özellikleriyle birebir aynıdır; 27 satırın tamamında kolon iki tabloda da aynı adla vardır — 25–27. satırlar hariç, onlar yalnızca DraftItems'tadır; `IsRuleAssigned` yalnızca Items'tadır ve nihai tabloda ayrı satır olarak yer almaz.)

| # | Netsis (TBLSTSABIT) | DraftItems | Items | Frontend etiketi | Frontend ilişkisi |
|---|---|---|---|---|---|
| 1 | STOK_KODU | SKU | SKU | SKU | Doğrudan |
| 2 | STOK_ADI (boşsa STOK_KODU) | Name | Name | Ürün Adı | Doğrudan |
| 3 | **EN** | Width | Width | Genişlik | Doğrudan (birim çevrimli) |
| 4 | **GENISLIK** | Height | Height | Yükseklik | Türetilmiş (+14 cm paletse) |
| 5 | **BOY** | Length | Length | Derinlik | Doğrudan / varilde türetilmiş |
| 6 | — (ERP karşılığı yok) | Diameter | Diameter | Çap (varilde "Genişlik" yeniden etiketlenir) | Türetilmiş |
| 7 | BIRIM_AGIRLIK | Weight | Weight | Ağırlık | Doğrudan (birim çevrimli) |
| 8 | — (sabit) | ProductType | ProductType | Ürün Tipi (Koli/Varil/Paletli Ürün) | Doğrudan (string) |
| 9 | — (sabit; kullanıcı Item Aktar'da değiştirir) | Category | Category | Ürün Tipi (Koli/Varil/Paletli Ürün) | Türetilmiş (enum çevrimi) |
| 10 | GRUP_KODU (anahtar kelime eşleşmesi) | StackGroup | StackGroup | Yük Grubu | Doğrudan |
| 11 | — (StackGroup'tan türer) | IncompatibleGroupsJson | IncompatibleGroupsJson | (formda yok — Yük Grubu'ndan türer) | Sabit/Hesaplanmış |
| 12 | — (kısıt kavramı taşınmıyor) | ConstraintIdsJson | ConstraintIdsJson | Yük Kısıtları (çoklu seçim) | Doğrudan (dizi) |
| 13 | — (sabit) | FragilityType | FragilityType | Yük Kısıtları (seçimin en yükseği) | Türetilmiş (tekil değer) |
| 14 | — (Normalize sonucu) | IsStackable | IsStackable | İstifleme İzni | Doğrudan |
| 15 | — (Normalize sonucu) | MaxStackCount | MaxStackCount | Maksimum İstif Sayısı | Doğrudan |
| 16 | — (Normalize sonucu) | MaxWeightOnTop | MaxWeightOnTop | (formda yok — otomatik hesaplanır) | Sabit/Hesaplanmış |
| 17 | — (sabit All) | AllowedRotations | AllowedRotations | X/Y/Z Ekseni (3 ayrı switch) | Türetilmiş (3 boolean → 1 enum) |
| 18 | BARKOD1 (bu veri setinde 0/100 dolu) | Barcode | Barcode | (formda yok — yalnızca ERP'den) | Yok |
| 19 | — (ERP karşılığı yok) | SpecialNotes | SpecialNotes | Taşıma Notu | Doğrudan |
| 20 | STOK_KODU | ErpId | ErpId | (formda yok) | Yok |
| 21 | — (entegrasyon kimliği) | IntegrationId | IntegrationId | (formda yok) | Yok |
| 22 | — (oturum/parametre) | CompanyId | CompanyId | (formda yok) | Sistem |
| 23 | — (Guid.NewGuid) | Id | Id | (formda yok — sistem üretir) | Sistem |
| 24 | 8 kolon JSON (StokKodu, StokAdi, En, Boy, Genislik, BirimAgirlik, GrupKodu, DepoKodu) | ErpRawDataJson | **YOK** | — | Yok |
| 25 | EN/BOY/GENISLIK/BIRIM_AGIRLIK kontrolü | MissingFieldsJson | **YOK** | — | Yok |
| 26 | — (sistem) | Status | **YOK** | — | Yok |
| 27 | — (denetim) | CreatedAtUtc / UpdatedAtUtc / DeletedAtUtc / IsDeleted / IsActive / CreatedBy / UpdatedBy | (aynı adlarla var) | (formda yok) | Sistem |

Ek notlar (nihai tablo dışı ama destek tablolarda kayıtlı):
- **ImageUrl**: her iki tabloda var, ERP'den hiç gelmez, hiçbir UI göstermiyor; **projeden tamamen kaldırılması kararlaştırıldı** (kaldırılana kadar onayda aynen kopyalanır).
- **IsRuleAssigned**: yalnızca Items'ta; ölü alan — onayda sabit `true` yazılır (silinen eşleştirme servisinden kalıntı).

---

## 2) ALAN BAZINDA BEKLENEN DAVRANIŞ

Sınıflar: **[SENKRON]** her senkronda ERP'den güncellenir · **[SABİT]** sync sabit değer yazar ·
**[BOŞ]** sync boş bırakır · **[SİSTEM]** sistem üretir · **[TAŞINMAZ]** taslaktan Item'a hiç geçmez.

| Alan | Sınıf | Beklenen davranış |
|---|---|---|
| SKU | SENKRON | Her senkronda STOK_KODU'dan güncellenir |
| Name | SENKRON | Her senkronda STOK_ADI'dan; STOK_ADI boşsa STOK_KODU yazılır |
| Width | SENKRON | Her senkronda EN'den güncellenir |
| Height | SENKRON | Her senkronda GENISLIK'ten güncellenir (bkz. Bölüm 4 uyarısı) |
| Length | SENKRON | Her senkronda BOY'dan güncellenir |
| Weight | SENKRON | Her senkronda BIRIM_AGIRLIK'tan güncellenir |
| Barcode | SENKRON | Her senkronda BARKOD1'den; bu veri setinde kaynak 0/100 dolu → NULL kalır (kod yine de okumalı) |
| StackGroup | SENKRON (türetilmiş) | GRUP_KODU anahtar kelime eşleşmesiyle otomatik dolar; eşleşme yoksa **"Genel"** |
| IncompatibleGroupsJson | SENKRON (türetilmiş) | StackGroup dolduğu anda aynı kural tablosundan otomatik hesaplanır |
| ErpRawDataJson | SENKRON, TAŞINMAZ | Her senkronda 8 kolonluk JSON güncellenir; Item'a hiç geçmez |
| MissingFieldsJson | SENKRON, TAŞINMAZ | Her senkronda ölçü+ağırlık (EN/BOY/GENISLIK/BIRIM_AGIRLIK > 0) kontrolüyle yeniden hesaplanır; Item'a geçmez |
| ProductType | SABİT | Sync sabit `"General"` yazar (ERP'de fiziksel biçim verisi yok) |
| Category | SABİT | Sync sabit `Koli` (Box) yazar; kullanıcı Item Aktar'da elle değiştirir. (Eski davranış: GRUP_KODU→ParseCategory→Package; karar #4 ile terk edildi) |
| FragilityType | SABİT | Sync sabit `NonFragile` yazar |
| AllowedRotations | SABİT | Sync sabit `All` yazar |
| IsStackable | SABİT (Normalize) | Sync: `Normalize(true, 1, 0, ağırlık)` sonucu. Onayda **DEĞİŞEBİLİR** — Normalize yeniden çalışır |
| MaxStackCount | SABİT (Normalize) | Aynı Normalize sonucu; onayda yeniden Normalize |
| MaxWeightOnTop | SABİT (Normalize) | Aynı Normalize sonucu; onayda yeniden Normalize; formda alan yok |
| ConstraintIdsJson | BOŞ | ERP'de kısıt kavramı taşınmaz; `"[]"` kalır |
| SpecialNotes | BOŞ | ERP karşılığı yok; NULL kalır |
| Diameter | BOŞ (sync'te) | Fetcher her zaman null yazar; yalnızca Item Aktar'da Tip=Varil seçilince Width'ten türer (kullanıcı eylemi) |
| ImageUrl | BOŞ | ERP'den gelmez; kaldırılacak alan |
| ErpId | SİSTEM/SENKRON | STOK_KODU'dan dolar; yeni Item'da `SetErpSource` ile taşınır, güncellemede dokunulmaz |
| IntegrationId | SİSTEM | Entegrasyon kaydının kimliği; yeni Item'da taşınır, güncellemede dokunulmaz |
| CompanyId | SİSTEM | Taslaktaki değil, **oturumdaki** şirket kimliği yazılır |
| Id | SİSTEM | Taslakta Guid.NewGuid(); onayda Item için **yeni** Guid üretilir (taslak Id taşınmaz) |
| Status | SİSTEM, TAŞINMAZ | Yeni taslak `Pending`; onayda taslak `Approved` olur; Item'da karşılığı yok |
| Denetim alanları (CreatedAtUtc, UpdatedAtUtc, DeletedAtUtc, IsDeleted, IsActive, CreatedBy, UpdatedBy) | SİSTEM | `AppDbContext.ApplyAuditFields()` SaveChanges anında yazar; taslaktan taşınmaz. Bilinen kısıt: Hangfire zamanlanmış senkronda CreatedBy/UpdatedBy NULL kalır |
| IsRuleAssigned (yalnız Items) | SİSTEM (ölü) | Onayda sabit `true` |

Onayda "aynen kopyalanır" alanlar: SKU, Name, Width, Height, Length, Diameter, Weight, ProductType, Category, StackGroup, IncompatibleGroupsJson, ConstraintIdsJson, FragilityType, AllowedRotations, Barcode, SpecialNotes, ImageUrl.
Onayda "yeniden hesaplanır" alanlar: IsStackable, MaxStackCount, MaxWeightOnTop (Normalize).

---

## 3) BİRİM ÇEVRİMİ GEREKEN ALANLAR

| Netsis kolonu | Hedef alan | Hedef birim | Beklenen çevrim |
|---|---|---|---|
| EN | Width | **cm** | Sistem sözleşmesi santimetredir (scene contract: cm). Frontend'de manuel girişte `toCentimeters(value, dimensionUnit)` uygulanır |
| GENISLIK | Height | **cm** | Aynı — cm hedefi |
| BOY | Length | **cm** | Aynı — cm hedefi |
| BIRIM_AGIRLIK | Weight | **kg** | Frontend'de `toKilograms(value, weightUnit)`; sistem birimi kilogramdır |

**BELİRSİZLİK NOTU:** CSV tabloları çevrimin *gerekli olduğunu* işaretliyor ("Doğrudan (birim çevrimli)") ama Netsis tarafındaki kaynak birimi (mm/cm/m, gr/kg) açıkça belirtmiyor. Denetimde ERP fetcher'da EN/GENISLIK/BOY/BIRIM_AGIRLIK değerlerine bir çarpan uygulanıp uygulanmadığı ve bunun hangi kaynak birimi varsaydığı tespit edilip **BELIRSIZ** yerine somut karara bağlanmalıdır. Frontend çevrimleri (`toCentimeters`/`toKilograms`) manuel ürün formu içindir; ERP senkronu kendi çevrimini (gerekiyorsa) backend'de yapmalıdır.

---

## 4) ⚠️ DİKKAT — EN / GENISLIK / BOY EŞLEŞMESİ TERS GÖRÜNÜYOR

Nihai tabloda **bilinçli olarak** şu eşleşme yazılıdır:

- `Width  ← EN` (Genişlik ← "EN")
- `Height ← GENISLIK` (**Yükseklik ← "GENISLIK"!**)
- `Length ← BOY` (Derinlik ← "BOY")

**Türkçe kolon adları yanıltıcıdır: "GENISLIK" adlı Netsis kolonu Height'a (yükseklik) gider; Width'i besleyen kolon "EN"dir.** İlk bakışta `GENISLIK → Width` beklenir; kontrat bunun tersini söylüyor.

İki ihtimal de açık bırakılmalıdır:
1. **Bilinçli karar olabilir:** Netsis'te firmanın veri girişi bu anlamla yapılmış olabilir (EN=genişlik, GENISLIK=yükseklik olarak kullanılmış saha alışkanlığı). Nihai tablo ve TAM tablo aynı eşleşmeyi tutarlı biçimde tekrarlıyor — yani tablo kendi içinde çelişmiyor.
2. **Tabloda hata olabilir:** GENISLIK↔EN veya GENISLIK↔Height ataması Access tarafında yanlış kaydedilmiş olabilir; bu durumda Height yanlış kaynaktan dolar ve 3D sahnede ürün boyutları ters görünür.

**Kodda nasıl denetlenir:**
- ERP fetcher / DTO eşlemesinde (`ErpProductDto`, sync handler) hangi Netsis kolonunun hangi özelliğe atandığını satır satır oku: beklenen kontrat `Width=EN`, `Height=GENISLIK`, `Length=BOY`. Kod bunun dışına çıkıyorsa **SAPMA**; kod kontratla aynıysa **UYUYOR** yazılır, ancak eşleşmenin fiziksel doğruluğu ayrıca veriyle test edilmelidir:
- Örnek doğrulama: bilinen bir ürünün gerçek ölçülerini (mezura) Netsis'teki EN/GENISLIK/BOY değerleriyle karşılaştır; hangi kolonun gerçekte hangi boyutu tuttuğu ancak böyle kesinleşir.
- `ErpRawDataJson` içindeki ham `En/Genislik/Boy` değerleri ile DraftItems'ın `Width/Height/Length` değerlerini çapraz kontrol et: JSON'daki `Genislik` değeri DraftItems.Height'a eşitse kod kontrata uyuyordur.
- Bu terslik kontrat düzeyinde **BELIRSIZ (ihtimal 1 veya 2)** olarak işaretlenmeli, kod denetimi ise yalnızca "kod = tablo" karşılaştırması yapmalıdır.

---

## 5) TÜRETİLEN ALANLAR VE TÜRETME KURALLARI

| Alan | Türetme kuralı |
|---|---|
| **Diameter** | ERP'de karşılığı yok, sync'te NULL. Item Aktar ekranında Tip = "Varil" seçilince **Width'ten otomatik türer** (`isVaril ? width : null`). Ayrı Çap input'u yoktur; varilde "Genişlik" alanı çapı temsil eder. Varilde ayrıca `Length = Width` (çap) olur |
| **StackGroup** | GRUP_KODU üzerinde **anahtar kelime eşleşmesi**; eşleşme yoksa **"Genel"** yazılır |
| **IncompatibleGroupsJson** | StackGroup dolduğu anda **aynı kural tablosundan** (frontend'de `INCOMPATIBLE_BY_GROUP` sözlüğü) otomatik hesaplanır; StackGroup boşsa `"[]"` |
| **IsStackable / MaxStackCount / MaxWeightOnTop** | `ItemStacking.Normalize(true, 1, 0, ağırlık)` — sync bu sonucu yazar; taslak onayında Normalize kullanıcı değerleriyle **yeniden çalışır**. İstiflenemezse MaxStackCount=0'a sabitlenir; MaxWeightOnTop `toMaxWeightOnTop(weight, isStackable, maxStackCount)` mantığıyla hesaplanır, kullanıcı girmez |
| **Height (manuel formda)** | Paletli üründe kaydedilen Height = girilen yükseklik + **14 cm** (`PALLET_HEIGHT_CM`); formda yalnızca ürün yüksekliği görünür (ERP senkronunda bu ekleme yoktur — sync doğrudan GENISLIK yazar) |
| **AllowedRotations (manuel formda)** | 3 boolean switch → 1 enum (`toAllowedRotations()`); 8 kombinasyondan 6'sının birebir karşılığı var, kalan 2'si Yaw'a daraltılır. Sync'te sabit `All` |
| **FragilityType (manuel formda)** | Seçili kısıt ID'lerinin **en büyüğü** (`toFragilityValue()`). Sync'te sabit NonFragile |
| **Category (manuel formda)** | `toCategory()`: palet→Pallet, koli→Box, varil→Drum. Sync'te sabit Koli (Box) |

---

## 6) SABİT DEĞER YAZILAN ALANLAR (ERP senkronunda)

| Alan | Sabit değer |
|---|---|
| ProductType | `"General"` (string) |
| Category | `Koli` / `Box` (enum) — eski ParseCategory/Package davranışı terk edildi |
| FragilityType | `NonFragile` |
| AllowedRotations | `All` |
| ConstraintIdsJson | `"[]"` (boş JSON dizi) |
| IsStackable / MaxStackCount / MaxWeightOnTop | `Normalize(true, 1, 0, ağırlık)` sonucu (sabit girdili hesap) |

---

## 7) YALNIZCA DraftItems'TA OLAN VE Item'A TAŞINMAMASI GEREKEN ALANLAR

| Alan | Davranış |
|---|---|
| **ErpRawDataJson** | Ham ERP verisi (8 kolon: StokKodu, StokAdi, En, Boy, Genislik, BirimAgirlik, GrupKodu, DepoKodu) JSON olarak yalnızca taslakta tutulur. **Item'a hiç geçmez.** Her senkronda güncellenir |
| **MissingFieldsJson** | Eksik alan bayrakları (ölçü + ağırlık kontrolü). **Item'a hiç geçmez.** Her senkronda yeniden hesaplanır |
| **Status** | Taslak durumu. Yeni taslak `Pending`; onayda `Approved` yapılır. **Item'da karşılığı yoktur** |

Ters yön: **IsRuleAssigned** yalnızca Items'ta vardır (taslakta karşılığı yok); onayda sabit `true` yazılır — ölü alan.

---

## 8) MADDE MADDE KONTROL LİSTESİ

Her madde tek başına **UYUYOR / SAPMA / BELIRSIZ** olarak işaretlenecek. "Sync" = ERP senkron kodu; "Onay" = taslak→Item aktarım kodu.

**A. ERP → DraftItems (senkron)**

- [ ] **K01** — Sync, DraftItems.SKU'yu her senkronda STOK_KODU'dan yazıyor.
- [ ] **K02** — Sync, DraftItems.Name'i STOK_ADI'dan yazıyor; STOK_ADI boş/NULL ise STOK_KODU'yu yazıyor.
- [ ] **K03** — Sync, DraftItems.Width'i **EN** kolonundan yazıyor.
- [ ] **K04** — Sync, DraftItems.Height'ı **GENISLIK** kolonundan yazıyor (⚠️ Bölüm 4: GENISLIK → Height, Width değil).
- [ ] **K05** — Sync, DraftItems.Length'i **BOY** kolonundan yazıyor.
- [ ] **K06** — Sync, DraftItems.Weight'i **BIRIM_AGIRLIK** kolonundan yazıyor.
- [ ] **K07** — Ölçü/ağırlık değerlerine uygulanan birim çevrimi (varsa) belgelenmiş bir kaynak birim varsayımına dayanıyor; hedef birimler cm ve kg (Bölüm 3'teki belirsizlik çözülmeden bu madde en fazla BELIRSIZ işaretlenebilir).
- [ ] **K08** — Sync, DraftItems.Barcode'u BARKOD1'den okuyor (kaynak boş olsa da okuma kodu mevcut; boşsa NULL yazılıyor).
- [ ] **K09** — Sync, StackGroup'u GRUP_KODU üzerinde anahtar kelime eşleşmesiyle dolduruyor.
- [ ] **K10** — GRUP_KODU eşleşmesi bulunamadığında StackGroup'a **"Genel"** yazılıyor (NULL/boş bırakılmıyor).
- [ ] **K11** — StackGroup dolduğu anda IncompatibleGroupsJson aynı kural tablosundan otomatik hesaplanıp taslağa yazılıyor.
- [ ] **K12** — Sync, ProductType'a sabit `"General"` yazıyor.
- [ ] **K13** — Sync, Category'ye sabit `Koli` (Box) yazıyor; GRUP_KODU'dan ParseCategory ile Category türetme (eski Package davranışı) artık yapılmıyor.
- [ ] **K14** — Sync, FragilityType'a sabit `NonFragile` yazıyor.
- [ ] **K15** — Sync, AllowedRotations'a sabit `All` yazıyor.
- [ ] **K16** — Sync, IsStackable/MaxStackCount/MaxWeightOnTop'ı `ItemStacking.Normalize(true, 1, 0, ağırlık)` sonucuyla yazıyor.
- [ ] **K17** — Sync, ConstraintIdsJson'a `"[]"` yazıyor / boş bırakıyor; ERP'den kısıt okumuyor.
- [ ] **K18** — Sync, Diameter'a her zaman NULL yazıyor (ERP'den çap türetme girişimi yok).
- [ ] **K19** — Sync, SpecialNotes'u boş (NULL) bırakıyor.
- [ ] **K20** — Sync, ErpId'yi STOK_KODU'ndan, IntegrationId'yi entegrasyon kaydından dolduruyor.
- [ ] **K21** — Sync, ErpRawDataJson'a 8 kolonluk (StokKodu, StokAdi, En, Boy, Genislik, BirimAgirlik, GrupKodu, DepoKodu) ham JSON'u her senkronda yazıyor/güncelliyor.
- [ ] **K22** — Sync, MissingFieldsJson'u EN/BOY/GENISLIK/BIRIM_AGIRLIK pozitiflik kontrolüyle her senkronda yeniden hesaplıyor.
- [ ] **K23** — Yeni taslak Status = `Pending` olarak oluşturuluyor.
- [ ] **K24** — Mevcut taslak güncellenirken ErpId/IntegrationId'ye dokunulmuyor (yalnızca yeni kayıtta set ediliyor).

**B. DraftItems → Items (onay/aktarım)**

- [ ] **K25** — Onayda Item.Id için **yeni** Guid üretiliyor; taslağın Id'si taşınmıyor.
- [ ] **K26** — Onayda Item.CompanyId'ye taslaktaki değil **oturumdaki** şirket kimliği yazılıyor.
- [ ] **K27** — SKU, Name, Width, Height, Length, Diameter, Weight taslaktan Item'a **aynen** kopyalanıyor (yeniden çevrim/ekleme yok).
- [ ] **K28** — ProductType, Category, StackGroup, IncompatibleGroupsJson, ConstraintIdsJson, FragilityType, AllowedRotations, Barcode, SpecialNotes taslaktan aynen kopyalanıyor.
- [ ] **K29** — Onayda IsStackable/MaxStackCount/MaxWeightOnTop için Normalize **yeniden çalışıyor** (kullanıcının taslakta değiştirdiği değerlerle).
- [ ] **K30** — ErpRawDataJson Item'a **taşınmıyor** (Items'ta böyle bir kolon/özellik yok ve aktarım kodu kopyalamıyor).
- [ ] **K31** — MissingFieldsJson Item'a **taşınmıyor**.
- [ ] **K32** — Status Item'a taşınmıyor; onay sonunda taslağın Status'u `Approved` yapılıyor.
- [ ] **K33** — ErpId ve IntegrationId yeni Item'a `SetErpSource` ile taşınıyor; mevcut Item güncellemesinde bu ikisine dokunulmuyor.
- [ ] **K34** — Denetim alanları (CreatedAtUtc, UpdatedAtUtc, DeletedAtUtc, IsDeleted, IsActive, CreatedBy, UpdatedBy) taslaktan kopyalanmıyor; `ApplyAuditFields()` SaveChanges'te baştan üretiyor.
- [ ] **K35** — Onayda IsRuleAssigned sabit `true` yazılıyor (ölü alan; başka mantık bağlanmamış).

**C. Frontend / Item Aktar davranışı**

- [ ] **K36** — Item Aktar'da Tip = "Varil" seçilince Diameter Width'ten otomatik türüyor (`isVaril ? width : null`) ve Length = Width oluyor; ayrı Çap input'u yok.
- [ ] **K37** — Manuel formda paletli üründe kaydedilen Height'a `PALLET_HEIGHT_CM` (14 cm) ekleniyor; ERP senkronunda böyle bir ekleme **yapılmıyor**.
- [ ] **K38** — Manuel formda AllowedRotations 3 switch'ten enum'a `toAllowedRotations()` ile çevriliyor (desteklenmeyen 2 kombinasyon Yaw'a daraltılıyor); FragilityType seçili kısıt ID'lerinin en büyüğü.
- [ ] **K39** — ImageUrl hiçbir UI'da gösterilmiyor; alan kaldırma kararı uygulanana kadar aktarımda aynen kopyalanıyor (yeni kullanım eklenmemiş).
- [ ] **K40** — DraftItems.Width/Height/Length değerleri, aynı taslağın ErpRawDataJson içindeki `En/Genislik/Boy` değerleriyle çapraz kontrol edildiğinde `Width=En`, `Height=Genislik`, `Length=Boy` eşleşmesi tutuyor (Bölüm 4 denetimi; fiziksel doğruluk ayrıca saha verisiyle doğrulanmadıysa BELIRSIZ bırakılabilir).

---

*Bu kontrat 2026-08-13 tarihinde scratchpad'deki nihai karar CSV'lerinden derlenmiştir. Kod denetiminde sapma bulunursa önce bu belge ile CSV'ler karşılaştırılmalı, fark CSV'lerden kaynaklanıyorsa Access tarafı güncellenmelidir.*
