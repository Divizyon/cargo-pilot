using CargoPilot.Application.Features.Vehicles;

namespace CargoPilot.Application.Features.Shares.GetSharePlanByToken;

/// <remarks>
/// <c>Doors</c> tekil yon alaninin yerini alir: paylasilan sayfa kapiyi dogru
/// yuzde cizmek ve yukleme sirasini dogru yonde gostermek icin hem kapi tipini
/// hem yuzunu bilmek zorunda (docs/COORDINATE_STANDARD.md §4).
/// </remarks>
public sealed record ShareVehicleDataDto(
    decimal? Width,
    decimal? Height,
    decimal? Length,
    IReadOnlyList<VehicleDoorDto> Doors,
    string? VehicleType);

public sealed record SharePlacementDetailDto(
    Guid ItemId,
    decimal PositionX,
    decimal PositionY,
    decimal PositionZ,
    decimal Width,
    decimal Height,
    decimal Length,
    int OrientationIndex,
    int Layer,
    bool IsViolation,
    string? Color,
    decimal Weight,
    string? ProductName,
    string? ProductSku,
    string? ProductType);

public sealed record SharePlanDto(
    string PlanName,
    string PlanCode,
    string VehicleName,
    string? VehiclePlate,
    DateTime CreatedAt,
    DateTime? PlannedAt,
    string Status,
    int ProductCount,
    decimal TotalWeightKg,
    decimal? VehicleCapacityKg,
    decimal FillPercentage,
    bool IsExpired,
    ShareVehicleDataDto? VehicleData,
    IReadOnlyList<SharePlacementDetailDto>? Placements);
