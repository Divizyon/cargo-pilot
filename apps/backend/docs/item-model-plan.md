# Item Model Plan (Company Bagimsiz)

Bu dokuman, Item (Urun) modeli icin netlestirilen kararlarin implementasyon oncesi teknik planidir.
Bu asamada kod veya migration degisikligi yoktur.

---

## 1) Netlestirilen Kararlar

- `CompanyId` alani OLMAYACAK.
- Prefix zorunlulugu OLMAYACAK.
- `SKU` sistemler arasi eslesme icin unique olacak.
- `SKU` zorunlu olacak, unique index ile korunacak.
- `Barcode` nullable olacak, ilk fazda unique olmayacak.
- Urunun is/operasyon tipini tasimak icin `ProductType` alani eklenecek.
- `Item` entity'si mevcut standartla uyumlu sekilde `BaseEntity`'den tureyecek.

---

## 2) Nihai Alan Sozlesmesi (v1)

- `Id: Guid`
- `SKU: string` (zorunlu)
- `Barcode: string?`
- `Name: string` (zorunlu)
- `ProductType: string` (zorunlu)
- `Category: ItemCategory` (`Package=0`, `Pallet=1`, `Box=2`)
- `Width: decimal`
- `Height: decimal`
- `Length: decimal`
- `Diameter: decimal?`
- `Weight: decimal`
- `FragilityType: FragilityType` (`NonFragile=0`, `Fragile=1`, `LiquidChemical=2`, `Flammable=3`, `Oxidizing=4`)
- `IsStackable: bool`
- `MaxStackCount: int`
- `MaxWeightOnTop: decimal`
- `AllowedRotations: AllowedRotations` (`All=0`, `NoVertical=1`, `Fixed=2`)
- `ImageUrl: string?`
- `StackGroup: string?`
- `SpecialNotes: string?`
- `BaseEntity` alanlari: `CreatedAtUtc`, `UpdatedAtUtc`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `IsActive`

---

## 3) DB / EF Kurallari

### String uzunluklari
- `SKU(100)`
- `Barcode(100)`
- `Name(200)`
- `ProductType(100)`
- `ImageUrl(500)`
- `StackGroup(100)`
- `SpecialNotes(1000)`

### Sayisal kolonlar
- Olcu ve agirlik alanlari icin `decimal(12,3)` kullan.

### Index/constraint
- `SKU` icin unique index.
- `Barcode` icin ilk fazda unique index yok.
- `Barcode` icin unique constraint tanimlanmayacak.

### Soft delete
- Mevcut global query filter standardi (`IsDeleted`) korunacak.

---

## 4) Application Validation Kurallari

- `Width`, `Height`, `Length`, `Weight` degerleri `> 0` olmali.
- `ProductType` bos veya sadece whitespace olamaz; kaydetmeden once `Trim()` ile normalize edilmeli.
- `Diameter` varsa `> 0` olmali.
- `MaxStackCount >= 0`
- `MaxWeightOnTop >= 0`
- `IsStackable = false` ise stack alanlari (`MaxStackCount`, `MaxWeightOnTop`) ile tutarlilik kontrolu yapilmali.

---

## 5) Implementasyon Task Listesi

- [ ] Domain'e `Item` entity'sini ekle (`BaseEntity` turevi)
- [ ] Domain'e `ItemCategory`, `FragilityType`, `AllowedRotations` enum'larini ekle
- [ ] Infrastructure'da `ItemConfiguration` olustur (max length, decimal precision, indexler)
- [ ] `AppDbContext` icine `DbSet<Item>` ve configuration kaydini ekle
- [ ] Application katmaninda Item create/update validation kurallarini ekle
- [ ] Migration stratejisini ayri adimda netlestir ve sonra migration olustur

---

## 6) Kapsam Disi (Bu Fazda Yok)

- Company bazli ownership
- Prefix tabanli SKU kurali
- Seed data
- Varyant/kategori iliski modeli (ayri tablolar)

