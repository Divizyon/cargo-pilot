using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Models;

public sealed record OptimizationInput(
    decimal VehicleWidth,
    decimal VehicleHeight,
    decimal VehicleLength,
    decimal VehicleMaxWeight,
    IReadOnlyList<OptimizationItemInput> Items,
    LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.VolumeFirst);

public sealed record OptimizationItemInput(
    Guid ItemId,
    string SKU,
    string Name,
    string? ImageUrl,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    bool IsStackable,
    AllowedRotations AllowedRotations,
    int Quantity,
    Guid? GroupId = null,
    int? UnloadingOrder = null);
