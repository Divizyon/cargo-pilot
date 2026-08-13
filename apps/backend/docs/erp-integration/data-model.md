# ERP Entegrasyon — Veri Modeli

> Bu doküman kodun bugünkü halini anlatır. Bağlantı mimarisi kararları için
> [adr-baglanti-mimarisi.md](./adr-baglanti-mimarisi.md) dosyasına bakın.

## Integration
| Alan | Tip | Not |
|------|-----|-----|
| Id | Guid | |
| CompanyId | Guid | |
| SystemName | string | ErpProviderType'ın metin karşılığı (Logo, Netsis) |
| ApiEndpoint | string | Doğrudan-DB modelinde SQL sunucu adresi |
| MappingTable | JSON? | Alan eşleştirmesi için ayrılmış; henüz kullanılmıyor |
| SyncInterval | int? | Dakika. Null ise sadece manuel tetiklenir |
| LastSyncDate | DateTime? | |
| SyncFrequency | Enum? | FourHours, Daily |
| NextScheduledSyncAt | DateTime? | |
| SyncStatus | Enum | Idle, Running, Failed |
| SyncStartedAtUtc | DateTime? | Eşzamanlı sync kilidi; zaman aşımıyla çözülür |
| IsActive | bool | BaseEntity |

> **Kimlik bilgisi burada tutulmaz.** Eski `AuthCredentials` düz metin alanı hiç
> doldurulmuyordu ve ERP-23 kapsamında şemadan kaldırıldı. Bağlantı bilgisinin tek
> kaynağı `ErpSettings`'tir.

> Şema birden fazla entegrasyona izin verir; bugünkü akış şirket başına tek ERP
> bağlantısı üzerinden ilerler.

## ErpSettings
Şirket başına tek kayıt (CompanyId unique). Bağlantı bilgisinin SSOT'u.

| Alan | Tip | Not |
|------|-----|-----|
| Id | Guid | |
| CompanyId | Guid | Unique |
| ProviderType | Enum | Logo = 1, Netsis = 2 |
| CompanyCode | string | Gerçekte ERP **veritabanı adı** (`Initial Catalog`) |
| Username | string | SQL login; salt-okunur hesap önerilir |
| PasswordEncrypted | string | `IDataProtectionProvider` ile şifreli (`IErpPasswordProtector`) |
| ServerAddress | string | SQL sunucu adresi (`Data Source`) |
| TrustServerCertificate | bool | Varsayılan true; false ise sunucu sertifikası doğrulanır |

## SyncLog
| Alan | Tip | Not |
|------|-----|-----|
| Id | Guid | |
| IntegrationId | Guid | |
| LoadingPlanId | Guid? | Plan dışa aktarım kayıtlarında dolar |
| StartedAt | DateTime | |
| CompletedAt | DateTime? | |
| Status | Enum | Running, Success, PartialFailure, Failed |
| SyncedRecordCount | int | |
| ErrorMessage | string? | |
| RowErrorsJson | string? | Satır bazlı hataların JSON listesi; kısmi başarıda dolar |
| SourceTotal | int | ERP kaynağında eleme öncesi bulunan satır sayısı |
| FetchedCount | int | Kaynaktan uygulamaya çekilen (işlenmeye aday) satır sayısı |
| DroppedByReasonJson | string? | Neden bazlı eleme sayıları (`ErpDropReason` adı → adet) |
| UnaccountedCount | int | Mutabakat farkı: SourceTotal − (yazılan + atlanan + elenen) |

> `PartialFailure` durumu uygulanmıştır: satır bazlı hata izolasyonu sonrası bazı
> satırlar yazılıp bazıları hata alırsa sync bu durumla kapanır ve `RowErrorsJson`
> doldurulur.

## DraftItem
ERP'den gelen ürünlerin onay kuyruğu; ERP verisiyle Item arasındaki tek ara tablodur.

| Alan | Tip | Not |
|------|-----|-----|
| Id | Guid | |
| CompanyId / IntegrationId | Guid | (IntegrationId, ErpId) unique |
| ErpId | string | ERP stok kodu |
| ErpRawDataJson | string | Kaynak satırın ham hali |
| Status | Enum | Pending, Approved, Rejected, UpdatePending, UpdateDismissed |
| SKU, Barcode, Name, ProductType, Category | | Onayda Item'a taşınır |
| Width / Height / Length / Diameter / Weight | decimal | |
| FragilityType, IsStackable, MaxStackCount, MaxWeightOnTop, AllowedRotations | | İstif kuralları |
| IncompatibleGroupsJson | string | Yük grupları; onayda Item'a birebir taşınır |
| MissingFieldsJson | string | Kaynakta eksik/sıfır gelen alan adları |

> Reddedilen taslak kalıcıdır: sonraki sync ERP verisini tazeler ama durumu Pending'e
> döndürmez; geri alma yalnızca kullanıcı aksiyonudur.

## Kaldırılan tablolar

| Tablo | Durum |
|-------|-------|
| ErpUserMapping | Hiç uygulanmadı; ölü kod temizliğinde (K1) tablo ve entity kaldırıldı |
| PendingItemMapping | DraftItem ile aynı işi yapıyordu; kaldırıldı, SSOT DraftItem'dır |

## Mevcut Tablolara Eklenen Alanlar

### Item
| Alan | Tip |
|------|-----|
| ErpId | string? |
| IntegrationId | Guid? |

### Vehicle
| Alan | Tip |
|------|-----|
| ErpId | string? |
| IntegrationId | Guid? |
