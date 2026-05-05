using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record UnplacedItemDto(
    Guid Id,
    Guid ItemId,
    int Quantity,
    UnplacedReason Reason,
    ItemInPlanDto Item);
