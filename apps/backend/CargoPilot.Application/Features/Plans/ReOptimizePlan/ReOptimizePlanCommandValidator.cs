using FluentValidation;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed class ReOptimizePlanCommandValidator : AbstractValidator<ReOptimizePlanCommand>
{
    public ReOptimizePlanCommandValidator()
    {
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

        When(x => x.Groups is { Count: > 0 }, () =>
        {
            RuleForEach(x => x.Groups).ChildRules(g =>
            {
                g.RuleFor(i => i.ClientGroupId)
                    .NotEmpty().WithMessage("Grup ClientGroupId boş olamaz.");

                g.RuleFor(i => i.Name)
                    .NotEmpty().WithMessage("Grup adı boş olamaz.")
                    .MaximumLength(100).WithMessage("Grup adı en fazla 100 karakter olabilir.");

                g.RuleFor(i => i.Color)
                    .NotEmpty().WithMessage("Grup rengi boş olamaz.")
                    .MaximumLength(50).WithMessage("Grup rengi en fazla 50 karakter olabilir.");

                g.RuleFor(i => i.UnloadingOrder)
                    .GreaterThan(0).WithMessage("Boşaltma sırası 0'dan büyük olmalıdır.");
            });

            RuleFor(x => x.Groups!)
                .Must(groups => groups.Select(g => g.ClientGroupId).Distinct().Count() == groups.Count)
                .WithMessage("Grup ClientGroupId değerleri benzersiz olmalıdır.");

            RuleFor(x => x.Groups!)
                .Must(groups => groups.Select(g => g.UnloadingOrder).Distinct().Count() == groups.Count)
                .WithMessage("Boşaltma sırası değerleri benzersiz olmalıdır.");
        });
    }
}
