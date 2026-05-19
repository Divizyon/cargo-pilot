using FluentValidation;

namespace CargoPilot.Application.Features.Plans.SaveDraftPlan;

public sealed class SaveDraftPlanCommandValidator : AbstractValidator<SaveDraftPlanCommand>
{
    public SaveDraftPlanCommandValidator()
    {
        RuleFor(x => x.PlanName)
            .MaximumLength(100).WithMessage("Plan adı en fazla 100 karakter olabilir.")
            .When(x => !string.IsNullOrWhiteSpace(x.PlanName));

        RuleFor(x => x.VehicleId)
            .NotEmpty().WithMessage("Araç ID'si boş olamaz.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("En az bir ürün gereklidir.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ItemId)
                .NotEmpty().WithMessage("Ürün ID'si boş olamaz.");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalıdır.");
        });
    }
}
