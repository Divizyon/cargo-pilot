using FluentValidation;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed class ApprovePendingItemMappingCommandValidator : AbstractValidator<ApprovePendingItemMappingCommand>
{
    public ApprovePendingItemMappingCommandValidator()
    {
        RuleFor(x => x.IntegrationId).NotEmpty();
        RuleFor(x => x.MappingId).NotEmpty();
        RuleFor(x => x.CargoPilotItemId).NotEmpty();
    }
}
