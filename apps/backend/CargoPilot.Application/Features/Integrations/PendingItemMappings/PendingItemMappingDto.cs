using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed record PendingItemMappingDto(
    Guid Id,
    Guid IntegrationId,
    string ErpId,
    string ErpSku,
    string ErpProductName,
    string ErpRawDataJson,
    Guid? CargoPilotItemId,
    PendingItemMappingStatus Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
