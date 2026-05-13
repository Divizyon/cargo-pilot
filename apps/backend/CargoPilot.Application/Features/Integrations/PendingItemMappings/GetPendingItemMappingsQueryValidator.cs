using FluentValidation;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed class GetPendingItemMappingsQueryValidator : AbstractValidator<GetPendingItemMappingsQuery>
{
    public GetPendingItemMappingsQueryValidator()
    {
        RuleFor(x => x.IntegrationId).NotEmpty();
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
    }
}
