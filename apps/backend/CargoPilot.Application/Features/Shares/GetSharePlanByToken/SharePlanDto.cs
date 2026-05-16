namespace CargoPilot.Application.Features.Shares.GetSharePlanByToken;

public sealed record ShareVehicleDataDto(
    decimal Width,
    decimal Height,
    decimal Length,
    string DoorDirection,
    string? VehicleType);

public sealed record SharePlacementDetailDto(
    Guid ItemId,
    decimal PositionX,
    decimal PositionY,
    decimal PositionZ,
    decimal Width,
    decimal Height,
    decimal Depth,
    int OrientationIndex,
    int Layer,
    bool IsViolation,
    string? Color,
    decimal Weight);

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
    decimal VehicleCapacityKg,
    decimal FillPercentage,
    bool IsExpired,
    ShareVehicleDataDto? VehicleData,
    IReadOnlyList<SharePlacementDetailDto>? Placements);
