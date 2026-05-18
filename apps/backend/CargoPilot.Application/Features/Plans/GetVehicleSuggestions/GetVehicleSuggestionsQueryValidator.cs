using FluentValidation;

namespace CargoPilot.Application.Features.Plans.GetVehicleSuggestions;

public sealed class GetVehicleSuggestionsQueryValidator : AbstractValidator<GetVehicleSuggestionsQuery>
{
    public GetVehicleSuggestionsQueryValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("İtem listesi boş olamaz.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ItemId)
                .NotEmpty().WithMessage("İtem ID'si boş olamaz.");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalıdır.");
        });
    }
}
