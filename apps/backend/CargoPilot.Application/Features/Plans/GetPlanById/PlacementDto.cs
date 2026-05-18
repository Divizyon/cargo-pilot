using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record PlacementDto(
    Guid Id,
    Guid ItemId,
    decimal PositionX,
    decimal PositionY,
    decimal PositionZ,
    LoadingPlanPlacementRotation Rotation,
    ItemInPlanDto Item,
    int StepIndex);
