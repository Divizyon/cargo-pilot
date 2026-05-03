Uzamsal alanlar **mm**; ağırlık toplamları **g** (gram).

Sayı tipleri (SQL / EF Core): Kayan nokta (`float` / `double`) kullanılmaz; **`decimal`** (Items / Vehicles ile uyum).

- Konum ve ağırlık merkezi (mm): **`decimal(18, 4)`**
- `TotalWeight` ve benzeri ağırlık (g): **`decimal(18, 3)`**
- `FillRate` (yüzde oranı): **`decimal(9, 4)`**

String uzunlukları (SQL `nvarchar` / EF `HasMaxLength`): Items / Company isimleriyle uyumlu öneri.

- `PlanName`: **200**
- `ErrorCode`: **64**
- `ErrorMessage`: **2000**
- Uyarı `Code`: **64**
- Uyarı `Message`: **1000**

İndeksler (`LoadingPlans`, v1): **`IX_LoadingPlans_CompanyId`** (`CompanyId`) ana filtre indeksidir. Ayrıca `VehicleId` FK'si için EF tarafında **`IX_LoadingPlans_VehicleId`** index'inin oluşması kabul edilir (araç bazlı sorgu performansı için).

LoadingPlans (Ana Tablo)
Id (Guid): Planın sistemdeki benzersiz kimliği.
PlanName (String, max 200): Kullanıcı tarafından verilen tanımlayıcı ad (Örn: "Sevk-2024-05-12").
VehicleId (Guid, FK): Plana atanan aracın benzersiz kimliği (Vehicles tablosu ile ilişkili).
OptimizationCriteria (Enum): Kullanılan hesaplama stratejisi;
0: LIFO (Last-In-First-Out Uygunluğu)
1: WeightBalance (Ağırlık Dengesi Odaklı)
2: VolumeFirst (Maksimum Hacim/Doluluk Odaklı)
OptimizationStatus (Enum): Planın güncel hesaplama durumu;
0: Draft (Taslak)
1: Calculated (Hesaplandı/Başarılı)
2: Failed (Hatalı)
ErrorCode (String?, max 64): Optimizasyon başarısız olduğunda dönen teknik hata kodu. Sadece OptimizationStatus = 2 ise doludur.
ErrorMessage (String?, max 2000): Kullanıcıya yönelik hata açıklaması. Sadece hatalı planda doludur.
TotalWeight (decimal(18,3)): Plana dahil edilen (yerleşen + yerleşemeyen değil, sadece araç içindeki) tüm yüklerin toplam net ağırlığı (gram).
FillRate (decimal(9,4)): Aracın hacimsel doluluk oranı (Örn: 85.5).
InputTotalQuantity (Int): Optimizasyon başlamadan önce girdi olarak verilen toplam parça adedi (başlangıç snapshot’ı). Hesaplama yarıda kalsa da bu değer korunur; tamamlandığında isteğe bağlı olarak `PlacedQuantity + UnplacedQuantity` ile çapraz doğrulanır.
PlacedQuantity (Int): Araç içine başarıyla yerleştirilen toplam kutu/parça adedi.
UnplacedQuantity (Int): Araç kapasitesi veya kurallar nedeniyle dışarıda kalan toplam parça adedi.
Tutarlılık: Aynı plan için `PlacedQuantity`, `LoadingPlanPlacements` tablosundaki satır sayısına eşit olmalıdır (her satır bir yerleştirilen parça varsayımı). `UnplacedQuantity`, `LoadingPlanUnplacedItems` içindeki aynı `LoadingPlanId` için `Quantity` alanlarının toplamına eşit olmalıdır.
CenterOfGravityX (decimal(18,4)?): Ağırlık merkezi X (mm), araç tabanı referansına göre — yerleşimlerle aynı eksen sözleşmesi.
CenterOfGravityY (decimal(18,4)?): Ağırlık merkezi Y (mm), yükseklik ekseni.
CenterOfGravityZ (decimal(18,4)?): Ağırlık merkezi Z (mm), derinlik ekseni.
CompanyId (Guid?, FK): Planın hangi firmaya (Tenant) ait olduğu bilgisi. `Vehicles.CompanyId` gibi nullable; bireysel kullanıcı / şirketsiz senaryoda null olabilir.
IsActive (Boolean): Planın geçerli olup olmadığını belirten aktif bayrağı.
IsDeleted (Boolean): Soft delete durumu.
DeletedAtUtc (DateTime?): Kaydın soft delete ile işaretlendiği zaman (UTC). Diğer `BaseEntity` türevleriyle uyum; silinmemiş kayıtta null.
CreatedAtUtc (DateTime): Planın oluşturulma zamanı.
CreatedBy (Guid?): Planı oluşturan kullanıcı; sistem veya özel senaryolarda null olabilir (`BaseEntity` ile uyum).
UpdatedAtUtc (DateTime?): Plan üzerindeki son güncelleme zamanı.
UpdatedBy (Guid?): Son güncellemeyi yapan kullanıcı.

LoadingPlanPlacements (Yerleşim Detayları)
Araca başarıyla yerleşen her bir fiziksel objenin konum ve yönelim bilgilerini içerir.
Id (Guid): Satır benzersiz kimliği.
LoadingPlanId (Guid, FK): Bağlı olduğu ana planın ID'si.
ItemId (Guid, FK): Yerleştirilen katalog ürününün ID'si (Items tablosu ile ilişkili).
PositionX (decimal(18,4)): Aracın sol alt arka köşesi referans alınarak X koordinatı (mm).
PositionY (decimal(18,4)): Yükseklik koordinatı (mm).
PositionZ (decimal(18,4)): Derinlik/Boy koordinatı (mm).
Rotation (Enum): Ürünün kutu içindeki dönüş tipi;
0: NoRotation (Dönüş Yok)
1: Yaw (Dikey eksende dönüş)
2: Pitch (Yanal eksende dönüş)
3: Roll (Boyuna eksende dönüş)

LoadingPlanUnplacedItems (Yerleşemeyen Ürünler)
Araca sığmayan veya kısıtlamalar (ağırlık, istif kuralı vb.) nedeniyle dışarıda kalan ürünlerin özetidir.
Id (Guid): Satır benzersiz kimliği.
LoadingPlanId (Guid, FK): Bağlı olduğu ana planın ID'si.
ItemId (Guid, FK): Dışarıda kalan ürünün ID'si.
Quantity (Int): İlgili üründen kaç adet yerleştirilemediği bilgisi.
Reason (UnplacedReason, Enum): Yerleştirilememe nedeni. Backend ve frontend tek sözlük; `Items.FragilityType` gibi ürün özelliklerinden farklıdır (ürün etiketi değil, “bu adet neden yerleşmedi” sonuç kodu).
UnplacedReason (sözleşme):
0: Unknown (Bilinmiyor / genel)
1: InsufficientSpace (İç hacim / geometriye sığmıyor)
2: WeightLimitExceeded (Araç veya dingil toplam ağırlık limiti)
3: StackingNotAllowed (İstifleme / üst üste binme kuralı)
4: SegregationOrCompatibility (Kontaminasyon, yan yana gelmeme, stack group uyumsuzluğu)
5: FragilityOrHandlingConstraint (Kırılgan / hassas işleme; ürün `FragilityType` ile ilişkili olabilir, kod yine burada)
6: RotationOrGeometryConstraint (İzin verilen dönüş / boyut kombinasyonu yok)
7: Other (Diğer; gerekirse mesaj veya log ile detay)

LoadingPlanWarnings (Plan Uyarıları)
Plan başarılı olsa dahi, operasyonel risk teşkil eden (dingil yükü sınırı, hassas ürün üstüne yükleme yaklaşımı vb.) durumları içerir.
Id (Guid): Satır benzersiz kimliği.
LoadingPlanId (Guid, FK): Bağlı olduğu ana planın ID'si.
Code (String, max 64): Yazılım tarafında kontrol edilebilir uyarı kodu (Örn: "W-AXLE-001").
Message (String, max 1000): Kullanıcıya yönelik bilgilendirme mesajı.
RelatedItemId (Guid?): Uyarının spesifik bir ürünle ilgisi varsa ürün ID'si.
RelatedPlacementId (Guid?): Uyarının spesifik bir yerleşim satırıyla ilgisi varsa yerleşim ID'si.

---

Silme davranışı (soft delete, cascade)

`LoadingPlans` soft delete edildiğinde (`IsDeleted` / `DeletedAtUtc`), bu plana bağlı **`LoadingPlanPlacements`**, **`LoadingPlanUnplacedItems`** ve **`LoadingPlanWarnings`** satırları da aynı işlemde (veya tek bir uygulama use-case’inde, tercihen transaction içinde) soft delete edilir. Böylece plana zaten erişilmeyecekken alt kayıtlar “yaşayan” görünmez; doğrudan alt tabloya yapılan sorgularda da tutarlılık için bu tablolarda **`IsDeleted`**, **`DeletedAtUtc`** (gerekirse diğer audit alanları) tanımlanır ve liste sorgularında filtrelenir. Veritabanı FK tarafında fiziksel `DELETE` beklenmiyorsa `ON DELETE` genelde **Restrict** kalır; silme işareti uygulama katmanındadır.
