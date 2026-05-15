namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record InputItemDto(Guid Id, Guid ItemId, int Quantity, ItemInPlanDto Item, Guid? GroupId = null);
