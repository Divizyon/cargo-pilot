using FluentValidation;

namespace CargoPilot.Application.Features.Plans.GetVehicleSuggestions;

public sealed class GetVehicleSuggestionsQueryValidator : AbstractValidator<GetVehicleSuggestionsQuery>
{
    public GetVehicleSuggestionsQueryValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("En az bir ürün belirtilmelidir.");

        RuleForEach(x => x.Items)
            .ChildRules(item =>
            {
                item.RuleFor(i => i.ItemId).NotEmpty();
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalıdır.");
            });
    }
}
