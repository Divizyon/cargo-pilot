using FluentValidation;

namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

public sealed class SyncErpItemsCommandValidator : AbstractValidator<SyncErpItemsCommand>
{
    public SyncErpItemsCommandValidator()
    {
        RuleFor(x => x.IntegrationId)
            .NotEmpty();

        RuleFor(x => x.CategoryFilter)
            .MaximumLength(200)
            .When(x => x.CategoryFilter is not null);

        RuleFor(x => x.WarehouseFilter)
            .MaximumLength(200)
            .When(x => x.WarehouseFilter is not null);
    }
}
