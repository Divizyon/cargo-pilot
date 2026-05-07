# ERP Entegrasyon — Veri Modeli

## Integration
| Alan | Tip | Not |
|------|-----|-----|
| Id | Guid | |
| CompanyId | Guid | |
| SystemName | string | Logo, Netsis, WMS, CustomExcel |
| ApiEndpoint | string | |
| MappingTable | JSON | Dış sistem alanı ↔ CP alan eşleştirmesi |
| SyncInterval | int? | Dakika. Null ise sadece manuel tetiklenir |
| LastSyncDate | DateTime? | |
| AuthCredentials | JSON | IDataProtectionProvider ile şifreli |
| IsActive | bool | |

> Bir firma aynı anda birden fazla aktif entegrasyona sahip olabilir. (Örn: hem Logo hem Netsis)

## SyncLog
| Alan | Tip |
|------|-----|
| Id | Guid |
| IntegrationId | Guid |
| StartedAt | DateTime |
| CompletedAt | DateTime? |
| Status | Enum (Running, Success, PartialFailure, Failed) |
| SyncedRecordCount | int |
| ErrorMessage | string? |

## ErpUserMapping
| Alan | Tip | Not |
|------|-----|-----|
| Id | Guid | |
| IntegrationId | Guid | |
| CargoPilotUserId | Guid | Unique: (IntegrationId, CargoPilotUserId) |
| ErpUserId | string | |
| ErpUserEmail | string? | |
| Status | Enum | Active, Invalid |
| InvalidatedAt | DateTime? | |
| InvalidationReason | string? | |

## Mevcut Tablolara Eklenecek Alanlar

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
