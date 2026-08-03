namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record PlanGroupDto(
    Guid Id,
    string Name,
    string Color,
    int UnloadingOrder,
    bool IsActive,
    IReadOnlyList<InputItemDto> Items);
