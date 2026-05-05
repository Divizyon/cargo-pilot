namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record WarningDto(
    Guid Id,
    string Code,
    string Message,
    Guid? RelatedItemId,
    Guid? RelatedPlacementId);
