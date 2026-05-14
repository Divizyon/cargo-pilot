using FluentValidation;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed class DeletePendingItemMappingCommandValidator : AbstractValidator<DeletePendingItemMappingCommand>
{
    public DeletePendingItemMappingCommandValidator()
    {
        RuleFor(x => x.IntegrationId).NotEmpty();
        RuleFor(x => x.MappingId).NotEmpty();
    }
}
