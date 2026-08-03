namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record ItemInPlanDto(
    Guid Id,
    string SKU,
    string Name,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    string? ImageUrl,
    string? ProductType);
