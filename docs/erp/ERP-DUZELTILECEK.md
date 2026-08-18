# ERP - Düzeltilecekler

Bu dosya, ERP (Netsis) entegrasyonu incelenirken kod üzerinden tespit edilen ve
düzeltilmesi/karar verilmesi gereken sorunları listeler.

---

## 1. Zamanlanmış ERP senkronunda `CreatedBy` / `UpdatedBy` hep NULL kalıyor

**Durum:** ÇÖZÜLDÜ — sabit sistem aktörü kimliği eklendi.

**Nerede:**
- `apps/backend/CargoPilot.Infrastructure/Persistence/AppDbContext.cs:79-99` (`ApplyAuditFields`)
- `apps/backend/CargoPilot.Infrastructure/Services/AnonymousCurrentUserService.cs`
- `apps/backend/CargoPilot.WebAPI/Services/JwtCurrentUserService.cs`
- `apps/backend/CargoPilot.Infrastructure/Jobs/ErpScheduledSyncJob.cs`

**Sorun:**
`DraftItem`/`Item` gibi `BaseEntity` türevlerinde `CreatedBy`/`UpdatedBy` alanları
`AppDbContext.ApplyAuditFields()` içinde `_currentUserService.UserId` okunarak
yazılıyor. Bu servis WebAPI'de `JwtCurrentUserService` ile geliyor ve değeri
`IHttpContextAccessor.HttpContext` üzerindeki JWT `sub` claim'inden okuyor.

`ErpScheduledSyncJob` (Hangfire, `*/15 * * * *` ile çalışıyor) bir HTTP isteği
içinde değil, arka plan işi olarak çalışıyor — yani `HttpContext` `null`.
Dolayısıyla `JwtCurrentUserService.UserId` de `null` dönüyor.

**Sonuç:**
- Kullanıcının manuel "şimdi senkronize et" tetiklemesiyle oluşan taslaklarda
  `CreatedBy`/`UpdatedBy` gerçek kullanıcı ID'sini taşır.
- Otomatik (zamanlanmış, 15 dakikada bir) senkronla oluşan/güncellenen
  taslaklarda ikisi de `NULL` kalır.
- `DraftItemConfiguration.cs`'te bu alanlar `IsRequired()` değil, DB tarafı da
  nullable'a izin veriyor; bu yüzden hata fırlatılmıyor, sessizce geçiyor.

**Etkisi:**
Audit/log tarafında "bu taslağı kim/ne oluşturdu" sorusuna `CreatedBy`
üzerinden cevap alınamıyor — otomatik sync ile hiç kimsenin dokunmadığı bir
kaydı ayırt etmenin yolu yok, ikisi de aynı görünüyor (`NULL`).

**Alınan karar ve uygulama:**
Sabit bir sistem aktörü kimliği tanımlandı:
`00000000-0000-0000-0000-000000000001`.

- `CargoPilot.Application/Abstractions/SystemActor.cs` (yeni) — kimlik sabiti ve
  `AsyncLocal` tabanlı `BeginScope()`. Kapsam `await` zinciri boyunca taşınır.
- `ErpScheduledSyncJob.RunAsync` tarama başında `SystemActor.BeginScope()` açar.
- `AppDbContext.ApplyAuditFields` artık `_currentUserService.UserId ?? SystemActor.CurrentId`
  okur. HTTP bağlamı olan isteklerde davranış değişmez.

`CreatedBy` üzerinde `Users` tablosuna yabancı anahtar yok; kimlik yalnızca
işarettir, kullanıcı kaydı gerektirmez. Artık "sistem oluşturdu" ile "kimse
dokunmadı" (`NULL`, eski kayıtlar) birbirinden ayrışıyor.

---

## 2. Var olan taslaklarda ölçü/ağırlık/kategori sonraki senkronlarda hiç güncellenmiyor

**Durum:** ÇÖZÜLDÜ — ERP tazelemesi artık ölçü/ağırlık/barkod/yük grubunu da yazıyor.

**Nerede:**
- `apps/backend/CargoPilot.Domain/Entities/DraftItem.cs` (`SetUpdatePending`, `UpdateFromErp`)
- `apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs:176-196`
- `apps/backend/CargoPilot.Application/Common/Items/ItemSpec.cs` (`FromDraft`)
- `apps/backend/CargoPilot.Application/Common/Items/ItemFactory.cs` (`ApplyDraft`)

**Sorun:**
Bir ERP ürünü için `DraftItem` zaten varsa (yeniden senkronda), kod iki yoldan
birini çağırıyor:

```csharp
existing.SetUpdatePending(product.Sku, product.Name, product.RawDataJson, missingFields); // Approved taslak
existing.UpdateFromErp(product.Sku, product.Name, product.RawDataJson, missingFields);     // diğer durumlar
```

Bu iki metodun imzasında yalnızca `SKU`, `Name`, `ErpRawDataJson`, `MissingFieldsJson`
var. `Width`, `Height`, `Length`, `Weight`, `Category`, `Barcode`, `ProductType`
gibi asıl ürün alanları **bu metodlarda hiç güncellenmiyor**.

`ErpRawDataJson` bu yeni ölçüleri JSON olarak taşısa da, hiçbir yerde geri
parse edilmiyor ([bkz. ilgili soru/cevap: ErpRawDataJson'ın hiç okunmadığı]).
Kullanıcı `UpdatePending` taslağı onayladığında `ApproveDraftItemCommandHandler`
şunu çağırıyor:

```csharp
ItemFactory.ApplyDraft(existingItem, draft); // -> ItemSpec.FromDraft(draft)
```

`ItemSpec.FromDraft` doğrudan `draft.Width`/`draft.Height`/`draft.Weight`/...
entity alanlarını okuyor — bunlar taslağın **ilk oluşturulduğu andaki** değerler,
ERP'deki güncel değerler değil.

**Sonuç:**
- Netsis'te bir ürünün ölçüsü/ağırlığı/kategorisi değişse bile, bu değişiklik
  taslağın yapısal alanlarına hiç yansımıyor; yalnızca `ErpRawDataJson` içine
  gömülüyor ve orada kimse okumuyor.
- Kullanıcı ekranda "bu ürün güncellendi" (`UpdatePending`) bildirimini görüp
  onayladığında aslında **eski ölçüler yeniden Item'a yazılıyor** — ERP'deki
  güncel veri hiç uygulanmamış oluyor.
- Ne ekranda ne API'de "neyin değiştiği" gösteren bir diff/karşılaştırma yok;
  `UpdatePending` durumu sadece "bir şey değişti" sinyali veriyor, içeriği
  göstermiyor.

**Alınan karar ve uygulama:**
İki metodun dört parametreli imzası, tek bir `DraftItem.ErpRefresh` kaydıyla
değiştirildi (`SKU`, `Name`, `ErpRawDataJson`, `Width`, `Height`, `Length`,
`Weight`, `Barcode`, `StackGroup`, `IncompatibleGroups`, `MissingFields`).
Ortak `ApplyErpRefresh` metodu şu kuralla yazıyor:

- Ölçü/ağırlık **yalnızca ERP değeri sıfırdan büyükse** yazılır. ERP `0`
  gönderirse mevcut değer korunur — kullanıcının elle doldurduğu eksik ölçü
  her senkronda silinmez.
- Barkod yalnızca dolu gelirse yazılır.
- Yük grubu yalnızca `GRUP_KODU` gerçekten bir gruba işaret ediyorsa yazılır
  (bkz. #4); varsayılana ("Genel") düşen kod kullanıcının seçimini ezmez.
  Yük grubu yazıldığında `IncompatibleGroupsJson` de birlikte güncellenir.
- Yazımdan sonra `PruneFilledMissingFields()` çalışır.

**Tip (`Category`) bilinçli olarak tazelemeye dahil edilmedi:** #4 kararıyla
Tip'in ERP'de bir kaynağı yok, sabit "Koli" varsayılanı taşıyor. Sabiti her
senkronda yeniden yazmak, kullanıcının aktarım ızgarasında yaptığı Tip
seçimini (ör. "Varil") silerdi.

Onay ekranındaki "ERP'den gelen yeni değer vs. mevcut taslak değeri" diff'i
kapsam dışı bırakıldı; ayrı bir iş kalemi.

**Yan not (`MissingFieldsJson` tutarsızlığı) kapandı:** `ApplyErpRefresh`
sonunda `PruneFilledMissingFields()` çağrıldığı için, taslakta kullanılabilir
bir değer varken ERP "eksik" dese bile rozet yanmıyor; ters durumda ERP dolu
değer gönderince hem alan hem rozet birlikte güncelleniyor.

**Yan not — `MissingFieldsJson` rozeti de aynı kökten tutarsız olabiliyor:**
`SetUpdatePending`/`UpdateFromErp`, `MissingFieldsJson`'ı yeniden senkronda
**yeni** ERP verisinden hesaplayıp yazıyor, ama `Width`/`Height`/`Length`/`Weight`
alanlarının kendisi güncellenmiyor. İki tutarsız durum oluşabiliyor:
- Taslak `EN=50` ile geçerliyken Netsis'te `EN=0` olursa, senkron "Genişlik
  eksik" rozetini yakar ama `draft.Width` hâlâ eski (dolu) değeri gösterir.
- Tersi de olur: taslak `EN=0` ile eksikken Netsis düzeltilirse, rozet
  kaybolur ama `draft.Width` hâlâ `0`'da donmuş kalır.
- İkinci durumda veri kaybı olmuyor — `ItemSpecValidatorBase`'deki
  `Width/Height/Length/Weight > 0` kuralı onay anında bağımsız çalışıp
  gerçek `0` değerini zaten reddediyor. Ama kullanıcı önce "eksik yok"
  görüp sonra beklenmedik bir doğrulama hatasıyla karşılaşıyor.
- Bu ayrı bir kök neden değil; #2 düzeltildiğinde (ölçüler her senkronda
  gerçekten güncellenirse) bu tutarsızlık da kendiliğinden ortadan kalkar.

---

## 3. `Item.IsRuleAssigned` — yarım kalmış özellikten geriye kalan ölü alan

**Durum:** ÇÖZÜLDÜ — alan ve sayaçlar koddan ve veritabanından kaldırıldı.

**Nerede:**
- `apps/backend/CargoPilot.Domain/Entities/Item.cs:30` (varsayılan `true`), `:94` (`SetRuleAssigned`)
- `apps/backend/CargoPilot.Application/Common/Items/ItemFactory.cs` (`CreateFromDraft` → hep `SetRuleAssigned(true)`)
- `apps/backend/CargoPilot.Infrastructure/Persistence/Configurations/ItemConfiguration.cs:105`
- `apps/backend/CargoPilot.Domain/Entities/SyncLog.cs` (`RuleAssignedCount`, `RuleNotAssignedCount`)

**Geçmişi:**
`git log -S "IsRuleAssigned"` ile bulundu. Alan, commit `b3d13f9b`
("ERP kısıt → kural eşleştirme servisi ve IsRuleAssigned alanı eklendi",
US-VY-37) ile geldi. Orijinal tasarımda `IErpConstraintMappingService`,
ERP'den gelen metinsel kısıtları (örn. `"DikTasinacak"`) Cargo Pilot kural
alanlarına (`AllowedRotations` vb.) çeviriyordu; eşleştirme başarısız olursa
veya veri eksikse `IsRuleAssigned = false` yazılacaktı.

Bu servis daha sonra commit `0b8af64a` ("ölü erp eşleme zinciri backendden
kaldırıldı") ile tamamen silindi — `IErpConstraintMappingService`,
`MappingTableConfig`, `ErpConstraintResolutionResult` artık kod tabanında
yok. Ama `Item.IsRuleAssigned` alanı silinirken geride kaldı.

**Şu anki durum:**
- Varsayılan değer hep `true` (`Item.cs:30`).
- `ItemFactory.CreateFromDraft`, onayda hep `SetRuleAssigned(true)` çağırıyor.
- Kod tabanında `false` yazan tek bir satır yok — pratikte sabit `true`.
- Hiçbir DTO/controller bu alanı dışarı vermiyor, frontend'de hiç kullanılmıyor.
- `DraftItem`'da bu alanın karşılığı yok — tutarsızlık değil, zaten hiçbir
  zaman gerçek bir hesaplama yapılmadığı için taslak tarafında hiç var
  olmamış.
- Aynı commit'ten kalan `SyncLog.RuleAssignedCount`/`RuleNotAssignedCount`
  sayaçları da senkron kodunda hiç doldurulmuyor, her zaman `0`.

**Alınan karar ve uygulama:**
Üçü de tamamen kaldırıldı — `Item.IsRuleAssigned`, `Item.SetRuleAssigned`,
`ItemConfiguration` eşlemesi, `ItemFactory.CreateFromDraft`'taki çağrı,
`SyncLog.RuleAssignedCount` / `RuleNotAssignedCount`, bunların
`SyncLogConfiguration` eşlemeleri ve `Complete`/`PartialFail` imzalarındaki
opsiyonel parametreleri. Kolonlar
`20260812204438_DropDeadItemAndSyncLogColumns` migration'ıyla düşürüldü.
`docs/erp-integration/data-model.md` de güncellendi.

"Kural atama" kavramı gerçekten gerekirse, silinen alana bağlanmak yerine
yeni bir mekanizma olarak tasarlanmalı.

---

## 4. Tasarım kararı: "Tip" ve "Yük Grubu" ERP eşlemesi (ÖNEMLİ)

**Durum:** UYGULANDI. Aşağıdaki analiz ve karar metni olduğu gibi korunmuştur;
uygulamanın özeti bölümün sonundadır.

**Önce iki kavramı birbirinden ayırmak gerekiyor, çünkü kodda karışıyorlar:**

| Kavram | Ne anlama gelir | DB kolonu | Bugünkü ERP kaynağı |
|---|---|---|---|
| **Tip** | Ürünün fiziksel kabı: koli / varil / palet | `Category` (`ItemCategory` enum: `Package=0, Pallet=1, Box=2, Drum=3`) | `TBLSTSABIT.GRUP_KODU` → `ParseCategory` (yanlış, aşağıda) |
| **Yük Grubu** | Ürünün hangi yük gruplarıyla bir arada taşınamayacağı: Kimya/Tehlikeli Madde/Gıda/Elektronik/Tekstil/Genel | `StackGroup` / `IncompatibleGroupsJson` | Yok — hep boş |

**Neden `Category` (Tip), `GRUP_KODU`'na değil sabit değere bağlı kalmalı:**

Tip ve Yük Grubu birbirinden bağımsız iki eksen, biri diğerini belirlemiyor:

- **Tip gerçek geometri hesabına giriyor — fiziksel bir özellik.**
  `ProductPreview3D.tsx:217-230`, `itemMappers.ts:213`, `export-utils.ts:149`
  ve `BulkImportDialog.tsx:100`'de aynı desen tekrarlanıyor: ürün "palet"
  (`Category = Pallet`) ise kaydedilen yükseklik = ürünün kendi yüksekliği +
  `PALLET_HEIGHT_CM` (14 cm) palet tabanı; 3D önizlemede bu taban ayrı bir
  blok olarak çiziliyor; ürün listesinde koli/varil/palet **filtre sekmesi**
  var (`ProductTable.tsx:359`). Yani Tip, 3D sahnede neyin nasıl render
  edileceğini ve yükseklik hesabını doğrudan etkiliyor.
- **Yük Grubu ise tamamen ayrı bir kural motorunu besliyor — uyumsuzluk
  kuralı.** `itemMappers.ts:14-21`'deki `INCOMPATIBLE_BY_GROUP` sözlüğü,
  hangi grubun hangi gruplarla yan yana istiflenemeyeceğini tutuyor (Kimya ↔
  Gıda/Elektronik/Tekstil gibi). Geometriyle ilgisi yok, saf yerleşim kısıtı.
- **Bir ürünün fiziksel biçimi, iş kategorisinden bağımsız.** Bir gıda ürünü
  (`GRUP_KODU` = Gıda grubu) koli de olabilir, varil de, palet de; aynı
  şekilde bir kimyasal da varil de olabilir koli de. `GRUP_KODU`'yu
  `Category`'ye bağlarsan bu iki bağımsız bilgiyi tek alana sıkıştırmış
  olursun — ya "gıda ürünü" bilgisini kaybedersin ya da "varil, dik durmalı"
  bilgisini; ikisine aynı anda ihtiyaç var.
- **Pratik olarak da imkânsız:** `GRUP_KODU` gibi bir iş kodu
  (örn. `"098-GIDA-XXX"`) ürünün fiziksel biçimi hakkında hiçbir şey
  söylemiyor — kodun içinde "gıda" geçmesi o ürünün koli mi varil mi
  olduğunu anlatmıyor. `GRUP_KODU`'dan Tip türetmek baştan mümkün değil;
  ama Yük Grubu türetmek için tam ihtiyaç duyulan bilgi bu.

Bu yüzden karar: `GRUP_KODU` → **Yük Grubu**'na (`StackGroup`) bağlanacak,
`Category`/Tip ise `GRUP_KODU`'dan bağımsız, ERP kaynaklı kayıtlarda sabit
"Koli" (`Category = Box`) olacak.

**Bugünkü kodun hatası — `GRUP_KODU` yanlış hedefe bağlanmış, üstelik çalışmıyor:**

`NetsisProductFetcher.cs`, `GRUP_KODU`'yu `ErpProductDto.Category`'ye yazıyor;
`SyncErpItemsCommandHandler.ParseCategory` da bunu doğrudan `ItemCategory`
enum adlarıyla (`"Package"`/`"Pallet"`/`"Box"`/`"Drum"`) eşleştirmeye çalışıyor:

```csharp
private static ItemCategory ParseCategory(string? category)
{
    if (string.IsNullOrWhiteSpace(category))
        return ItemCategory.Package;
    return Enum.TryParse<ItemCategory>(category, ignoreCase: true, out var parsed)
        ? parsed : ItemCategory.Package;
}
```

Gerçek bir Netsis grup kodu (örn. `"098-GIDA-XXX"`, `"XX_ICECEK_004"`) bu enum
adlarından biriyle asla eşleşmez — yani bu satır `GRUP_KODU` dolu gelse bile
her zaman `Package`'a düşer. Hem **yanlış hedef alana** (Tip'e) bağlanmış hem
de **kendi mantığı içinde de işlevsiz** (gerçek kodlarla hiç eşleşmiyor).
Frontend da `Package`'ı `fromCategory()` ile "varil" olarak gösterdiği için
(bkz. önceki tartışma), sonuç ERP'den gelen her ürünün sessizce "varil"
görünmesiydi — bu yüzden frontend `ProductType == "General"` kontrolüyle
Tip'i şimdilik boşa düşürüp kullanıcıya elle seçtiriyor.

**Alınan karar:**

1. **Tip** — Netsis'te ürünün fiziksel kabını taşıyan bir kolon yok, aranmasına
   gerek yok. ERP kaynaklı taslak/ürünlerde Tip **sabit "Koli" (`Category =
   Box`)** olarak varsayılan atanacak. Şu anki `Package` varsayılanı
   kaldırılacak — `Package`'ın frontend'de "varil" görünmesi yanıltıcıydı ve
   zaten anlamsız bir varsayılandı.
2. **Yük Grubu** — `TBLSTSABIT.GRUP_KODU`'dan **anahtar kelime eşleştirmesiyle**
   türetilecek. Örnek: kod içinde `GIDA` geçiyorsa → `Gıda`; `KIMYA` geçiyorsa
   → `Kimya`; frontend'deki `LOAD_GROUPS` sabitindeki (`Kimya`, `Tehlikeli
   Madde`, `Gıda`, `Elektronik`, `Tekstil`, `Genel` —
   `item-import-columns.ts:9-16`) diğer grupları için benzer desenler
   tanımlanacak. **Hiçbir desenle eşleşmeyen veya boş gelen `GRUP_KODU` →
   varsayılan olarak `Genel`.**
3. `GRUP_KODU`, `ParseCategory` üzerinden `Category`'ye değil, bu yeni anahtar
   kelime eşleştirmesi üzerinden `StackGroup`'a bağlanacak. `ParseCategory`
   fonksiyonu bu haliyle kaldırılmalı/yeniden amaçlandırılmalı.

**Kesinleşen kapsam — tam olarak bu, fazlası yok:**

- `GRUP_KODU` parse edilir → eşleşen değer varsa o (Kimya/Gıda/...), yoksa
  **"Genel"** → **doğrudan `DraftItem.StackGroup`'a yazılır.**
- Aynı anda, `StackGroup`'a karşılık gelen `IncompatibleGroupsJson` da
  **otomatik hesaplanıp aynı taslağa yazılır** — kullanıcı Ürün Aktar'ı hiç
  açmasa, hiç dokunmasa bile taslak zaten bu ikisiyle dolu durur. Türetme,
  onay ekranına havale edilmez; taslak Netsis'ten çekilir çekilmez sonuç
  budur.
- Tip aynı anda **sabit "Koli"** ile gelir, `GRUP_KODU`'dan bağımsız.
- Kullanıcı "Item Aktar" ekranında hem `StackGroup`'u hem `Tip`'i
  değiştirebilir; `StackGroup` değişince `IncompatibleGroupsJson` yine
  otomatik güncellenir.
- **Bunun ötesinde başka bir mekanizmaya gerek yok** — ayrı bir onay adımı,
  ayrı bir eşleştirme ekranı, ayrı bir servis yok. Tek iş, taslağın Netsis'ten
  gelirken doğru başlangıç değerleriyle oluşması.

**Önemli — frontend'de ek iş yok, davranış zaten hazır:**

"Item Aktar" ekranı (`BulkImportDialog.tsx`) bu davranışı **halihazırda**
destekliyor, hiçbir değişiklik gerekmiyor:
- `:894-899` — her satırda `StackGroup` seçici var, değiştirildiğinde
  `incompatibleGroups: deriveIncompatibleGroups(group)` ile otomatik
  güncelleniyor.
- `:813` — her satırda `Tip` seçici var.

Yani eksik olan **yalnızca backend'in taslağı ilk oluştururken doğru
`StackGroup`/`IncompatibleGroupsJson`/`Category` değerleriyle yazması.**
Frontend zaten "kullanıcı değiştirsin, bağımlı alan otomatik güncellensin"
akışını uyguluyor.

**Nerede değişecek (yalnızca backend):**
- `apps/backend/CargoPilot.Domain/Entities/DraftItem.cs` — constructor'da
  `StackGroup`/`IncompatibleGroupsJson` parametresi **yok**, eklenmesi
  gerekiyor (şu an yalnızca `UpdateUserFields`'te var, yani taslak ilk
  oluşurken bu alanlar hiçbir şekilde set edilemiyor).
- `apps/backend/CargoPilot.Infrastructure/Services/Erp/NetsisProductFetcher.cs`
  — `GRUP_KODU` okuma ve `ErpProductDto` doldurma mantığı.
- `apps/backend/CargoPilot.Application/Features/Integrations/SyncErpItems/SyncErpItemsCommandHandler.cs`
  — `ParseCategory` kaldırılacak/değişecek; `GRUP_KODU`'yu Yük Grubu'na
  çeviren ve aynı anda uyumsuz grupları hesaplayan bir fonksiyon eklenecek
  (backend'de `INCOMPATIBLE_BY_GROUP`'un bir karşılığı olmalı —
  `itemMappers.ts:14-21`'deki sözlükle birebir aynı grup adları ve
  eşleşmeleri kullanılmalı, iki taraf ayrışmamalı).

**Uygulama özeti:**

- `CargoPilot.Application/Common/Items/LoadGroups.cs` (yeni) — grup adı
  sabitleri ve `INCOMPATIBLE_BY_GROUP` karşılığı `IncompatibleWith(group)`.
  `itemMappers.ts:15-22` ile birebir aynı adlar ve eşleşmeler.
- `CargoPilot.Application/Common/Erp/ErpLoadGroupResolver.cs` (yeni) —
  `Resolve(groupCode)` anahtar kelime eşleştirmesi, `CarriesGroupInfo(groupCode)`
  ise kodun gerçekten bilgi taşıyıp taşımadığını söyler (yeniden senkronda
  kullanıcı seçimini korumak için, bkz. #2). Karşılaştırma büyük/küçük harf ve
  Türkçe karakter duyarsız, "içeriyor" mantığıyla, ilk eşleşen kazanır:
  - **Kimya:** `KIMYA`, `CHEM`, `ASIT`, `BOYA`, `SOLVENT`
  - **Tehlikeli Madde:** `TEHLIKELI`, `ADR`, `PARLAYICI`, `YANICI`, `PATLAYICI`
  - **Gıda:** `GIDA`, `FOOD`, `ICECEK`, `MEYVE`, `SUT`
  - **Elektronik:** `ELEKTRONIK`, `ELEKTRIK`, `ELECTRO`, `BEYAZESYA`
  - **Tekstil:** `TEKSTIL`, `TEXTILE`, `KUMAS`, `KONFEKSIYON`, `GIYIM`
  - Eşleşme yok / boş → **Genel**
- `ErpProductDto.Category` → `GroupCode` olarak yeniden adlandırıldı; alan artık
  Tip'e değil yük grubuna gittiği için ad yanıltıcıydı. `NetsisProductFetcher`
  `GRUP_KODU`'yu bu alana yazıyor.
- `SyncErpItemsCommandHandler.ParseCategory` **kaldırıldı**. Yeni taslak
  `ItemCategory.Box` ile açılıyor; `StackGroup` ve `IncompatibleGroupsJson`
  aynı anda dolduruluyor.
- `DraftItem` constructor'ına `stackGroup` ve `incompatibleGroups` parametreleri
  eklendi (daha önce yalnızca `UpdateUserFields`'te vardı).

**Frontend'de tek bir değişiklik gerekti** (belgede beklenenden bir sapma):
`draftItemToRow.ts`'teki `hasRealType` koruması kaldırıldı. Bu koruma,
`Category` çöp veri taşıdığı için eklenmişti ve Tip hücresini boşa düşürüyordu;
`Category` artık güvenilir olduğundan `tip` doğrudan `fromCategory(item.category)`
ile okunuyor. Aksi halde "Tip sabit Koli gelir" kararı ekrana yansımazdı.
`BulkImportDialog`'da değişiklik yok.

**Var olan taslaklar için veri düzeltmesi:** `DraftItems.Category = 0` yalnızca
kaldırılan `ParseCategory` varsayılanından gelebileceği için (aktarım ızgarası
`Package` üretmez), aynı migration içinde
`UPDATE DraftItems SET Category = 2 WHERE Category = 0` çalıştırılıyor.

**Dikkat edilmesi gereken yan etki:**
`DraftItemApprovalValidator`'da `IncompatibleGroups` `NotEmpty` kuralı var.
Yukarıdaki akış zaten bunu karşılıyor — "Genel" dahi olsa `IncompatibleGroupsJson`
boş gelmeyecek (`INCOMPATIBLE_BY_GROUP` içindeki her grup, `Genel` dahil,
boş olmayan bir dizi döndürüyor). Yani kullanıcı hiç dokunmadan onaylasa bile
doğrulama geçecek — ayrıca bir karara gerek yok, kapsam bununla kapanıyor.

---

## 5. `Diameter` (Varil) davranışı ve `ImageUrl`'in tamamen kaldırılması

**Durum:** 5.a doğrulandı (ek iş yok). 5.b UYGULANDI — `ImageUrl` projeden
tamamen kaldırıldı.

### 5.a `Diameter` — Varil seçildiğinde davranış zaten mevcut, ek iş gerekmiyor

Karar: `Diameter`, kullanıcı "Item Aktar" ızgarasında Tip'i elle "Varil"
olarak değiştirdiğinde, Ürün tablosundaki (Items) varil mantığıyla **birebir
aynı** şekilde çalışmalı.

Kontrol edildi — bu davranış **zaten var**, hem manuel ürün formunda hem
ERP taslaklarının da geçtiği aynı "Item Aktar" ızgarasında
(`BulkImportDialog.tsx` — Excel içe aktarma ve ERP taslak onayı **aynı
bileşeni** kullanıyor, bkz. `draftItemToRow.ts`'nin ürettiği `EditableRow`
tipi bu dosyadan geliyor):

- `BulkImportDialog.tsx:854-860` — Tip=Varil olduğunda "Derinlik" hücresi
  devre dışı bırakılıp `Width` (çap) değerini gösteriyor; kullanıcı ayrıca
  girmiyor.
- `BulkImportDialog.tsx:103` — kayıt anında `diameter: isVaril ? width :
  null`.
- `ProductForm.tsx:773` — manuel üründe de aynı kural: Tip=Varil iken
  "Genişlik" alanının etiketi "Çap" olarak değişiyor, `length` alanı
  otomatik `width`'e eşitleniyor.

**Sonuç: yeni geliştirme gerekmiyor.** Bu madde, #4 uygulanırken (Tip
varsayılanı "Koli" olacak, kullanıcı gridde "Varil"e çevirebilecek) bu
mevcut kuralın bozulmadığından emin olmak için kayıt altına alınıyor —
Tip "Koli"dan "Varil"e değiştirildiğinde `Diameter` otomatik dolmalı,
tıpkı Excel/manuel akışlarda olduğu gibi.

### 5.b `ImageUrl` — projeden tamamen kaldırılacak

**Karar:** `ImageUrl` alanı, `Item` ve `DraftItem`'dan başlayarak projenin
her katmanından kaldırılacak.

**Gerekçe:** Daha önce tespit edildi — alan hem `Item` hem `DraftItem`
entity'sinde var, EF konfigürasyonlarında var, ilgili her DTO/komutta
taşınıyor, hatta optimizasyon motorunun girdi/çıktı modellerine
(`OptimizationInput`, `ItemInPlanDto`) kadar sızmış — ama **hiçbir frontend
bileşeni bunu render etmiyor** (`<img src=...>` kullanan tek bir yer yok).
Yani uçtan uca taşınan, hiç gösterilmeyen, tamamen ölü bir alan.

**Kapsam — backend (30 dosya, üretim kodu + testler):**
- `CargoPilot.Domain/Entities/Item.cs`, `DraftItem.cs` — alanın kendisi
- `CargoPilot.Infrastructure/Persistence/Configurations/ItemConfiguration.cs`,
  `DraftItemConfiguration.cs` — EF eşlemesi; kaldırma için yeni bir
  **drop-column migration**'a ihtiyaç var
- `CargoPilot.Application/Common/Items/IItemSpec.cs`, `ItemSpec.cs`,
  `ItemFactory.cs`, `ItemSpecValidatorBase.cs` — ortak ürün alan kümesi
- `CargoPilot.Application/Common/Models/OptimizationInput.cs` — optimizasyon
  motoru girdisi
- `CargoPilot.Application/Features/Items/**` (`CreateItem`, `UpdateItem`,
  `BulkUpdateItems`, `GetItemById`, `SearchItems`) — komut/DTO'lar
- `CargoPilot.Application/Features/DraftItems/**` (`GetDraftItems`,
  `UpdateDraftItem`) — komut/DTO'lar
- `CargoPilot.Application/Features/Plans/**` (`CreatePlan`, `ReOptimizePlan`,
  `GetPlanById/ItemInPlanDto`) — plan/optimizasyon çıktı modelleri
- `CargoPilot.WebAPI/Controllers/DraftItemsController.cs`
- İlgili test dosyaları (`Engine.Tests`, `Infrastructure.Tests`,
  `Application.Tests`) — bu alanı set eden test fixture'ları

**Kapsam — frontend (5 dosya):**
- `lib/api/itemMappers.ts`, `useDraftItems.ts`, `useLoadingPlans.ts`,
  `useReports.ts`, `loadingPlanMappers.ts` — tüm Zod şemalarından ve
  TypeScript tiplerinden `imageUrl` alanı çıkarılacak.

**Not (#5b):** Kaldırma sırası önemli — önce backend'in `ImageUrl`'i istemeyen/
göndermeyen hale gelmesi, sonra migration ile kolonun düşürülmesi, en son
frontend tiplerinin temizlenmesi güvenli sıralama olur (ara adımda API
hâlâ alanı dönerse frontend'in `.optional()` şeması zaten kırılmadan
tolere eder).

**Uygulama:** Yukarıdaki kapsamın tamamı uygulandı. Kolonlar (`Items.ImageUrl`,
`DraftItems.ImageUrl`) `20260812204438_DropDeadItemAndSyncLogColumns`
migration'ıyla düşürüldü. Frontend'de `snapshotImageUrl` (plan görseli) ayrı
bir alandır ve **korundu**; yalnızca ürün `imageUrl` alanları çıkarıldı.

---

## 6. Onaylanmış her ürün her senkronda "güncellendi" işaretleniyordu

**Durum:** ÇÖZÜLDÜ — senkron artık ERP verisinin gerçekten değişip değişmediğine
bakıyor.

**Nasıl bulundu:** Kullanıcı 23 ürünü aktardıktan (onayladıktan) sonra tek bir
senkron attı ve 23 ürünün tamamı `UpdatePending`'e düştü.

**Sorun:**
`SyncErpItemsCommandHandler`, var olan bir taslak bulduğunda hiçbir karşılaştırma
yapmadan `SetUpdatePending`/`UpdateFromErp` çağırıyordu:

```csharp
if (existing.Status == DraftItemStatus.Approved)
{
    existing.SetUpdatePending(refresh);   // once "degismis mi?" diye sorulmuyor
    updated++;
}
```

Netsis `TBLSTSABIT`'te satır bazlı değişiklik damgası olmadığı için her senkron
tam tablo taraması. Kod "bu satırı gördüm" ile "bu satır değişti"yi ayırt
etmediğinden, onaylanmış ne varsa her taramada yeniden karar bekler duruma
düşüyordu. Kullanıcı içi boş bildirim yığınıyla karşılaşıyor, gerçek
değişiklikler de bu gürültünün içinde kayboluyordu.

Bu davranış #2'den önce de vardı; eski dört parametreli `SetUpdatePending` de
aynı yerde koşulsuz çağrılıyordu.

**Uygulanan çözüm:**

- `DraftItem.MatchesErpSnapshot(json)` (yeni) — taslakta duran `ErpRawDataJson`
  ile yeni çekilen ham veriyi karşılaştırır. Karşılaştırma bilerek **ERP
  tarafına** bakar, taslağa değil: kullanıcının taslak üzerinde yaptığı
  düzenlemeler `ErpRawDataJson`'a dokunmadığı için soru "ERP değişti mi",
  "taslak değişti mi" değil.
- Handler, eşleşen satırda taslağa hiç dokunmadan `unchanged++` yapıp geçiyor.
  Bu, statüsü ne olursa olsun (Approved/Pending/Rejected/UpdateDismissed) tüm
  taslaklar için geçerli; gereksiz yazma da ortadan kalkıyor.
- `NetsisProductFetcher` ham veri anlık görüntüsüne **`BARKOD1`** eklendi.
  Çekilen ama anlık görüntüye girmeyen bir kolonun değişimi fark edilmezdi.
- `missingFieldCount` artık yalnızca gerçekten yazılan satırları sayıyor;
  atlanan satırın eksik alanı kullanıcı tarafından çoktan doldurulmuş olabilir.

**Muhasebe:** Atlanan satırın sayılacak bir yeri olmalıydı, aksi halde her
senkron sıfırdan farklı bir `unaccounted` üretip uyarı loglardı. Yeni invariant:

```
SourceTotal == added + updated + unchanged + skipped + ΣDropped
```

`Unchanged`, `SyncAccounting` → `SyncLog.UnchangedCount` (migration
`20260813123245_AddSyncLogUnchangedCount`) ve `SyncErpItemsResult` üzerinden
uçtan uca taşınıyor. **`ErpDropReason`'a eklenmedi**: frontend
(`erpDropReasons.ts:61-62`) eleme nedenlerini "kullanıcı filtresi" ve "sorunlu
eleme" diye ikiye ayırıyor ve `Unchanged` ikisi de değil — sorun olarak
raporlanması yanıltıcı olurdu.

Toast mesajı da ayrı raporluyor: *"ERP'de 29 satır bulundu — 0 eklendi,
2 güncellendi, 25 değişmedi"*.

**Tek seferlik yan etki:** `BARKOD1` anlık görüntüye eklendiği için, bu değişiklik
devreye girdikten sonraki **ilk** senkronda var olan tüm taslakların depolanmış
JSON'u yeni şekle uymaz ve hepsi bir kez "güncellendi" işaretlenir. İkinci
senkrondan itibaren davranış oturur. Test ortamında doğrulandı: 1. senkron
27 updated → 2. ve 3. senkron 27 unchanged / 0 updated.

**Hâlâ açık — ızgara barkodu taşımıyor:**
`BulkImportDialog` satır modelinde barkod alanı yok, bu yüzden `UpdateDraftItem`
onay öncesi taslağın barkodunu `null`'a çekiyor ve ürüne `NULL` yazılıyor.
Senkron ise ERP barkodunu taslağa geri yazıyor. Sonuçta 24 taslağın 19'unda
taslak ile ürün arasında kalıcı bir barkod farkı oluşuyor. Bu #6'nın kapsamı
dışında bırakıldı; iki seçenek var ve karar verilmesi gerekiyor:
onayda barkodu ürüne taşımak, ya da senkronun onaylanmış taslakta barkoda hiç
dokunmaması.

---
