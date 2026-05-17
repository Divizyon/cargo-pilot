using FluentValidation;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed class CreatePlanCommandValidator : AbstractValidator<CreatePlanCommand>
{
    public CreatePlanCommandValidator()
    {
        RuleFor(x => x.PlanName)
            .NotEmpty().WithMessage("Plan adı boş olamaz.")
            .MaximumLength(100).WithMessage("Plan adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.VehicleIds)
            .NotEmpty().WithMessage("En az bir araç seçilmelidir.");

        RuleForEach(x => x.VehicleIds)
            .NotEmpty().WithMessage("Araç ID'si boş olamaz.");

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
