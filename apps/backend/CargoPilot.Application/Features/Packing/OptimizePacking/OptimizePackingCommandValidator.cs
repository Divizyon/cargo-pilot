using FluentValidation;

namespace CargoPilot.Application.Features.Packing.OptimizePacking;

public sealed class OptimizePackingCommandValidator : AbstractValidator<OptimizePackingCommand>
{
    public OptimizePackingCommandValidator()
    {
        RuleFor(x => x.Container).NotNull().WithMessage("Konteyner tanımı zorunludur.");

        When(x => x.Container != null, () =>
        {
            RuleFor(x => x.Container.Length).GreaterThan(0).WithMessage("Konteyner uzunluğu pozitif olmalıdır.");
            RuleFor(x => x.Container.Width).GreaterThan(0).WithMessage("Konteyner genişliği pozitif olmalıdır.");
            RuleFor(x => x.Container.Height).GreaterThan(0).WithMessage("Konteyner yüksekliği pozitif olmalıdır.");
            RuleFor(x => x.Container.MaxWeight).GreaterThan(0).WithMessage("Maksimum ağırlık kapasitesi pozitif olmalıdır.");
        });

        RuleFor(x => x.Items)
            .NotNull()
            .NotEmpty()
            .WithMessage("En az bir ürün gereklidir.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Length).GreaterThan(0).WithMessage("Ürün uzunluğu pozitif olmalıdır.");
            item.RuleFor(i => i.Width).GreaterThan(0).WithMessage("Ürün genişliği pozitif olmalıdır.");
            item.RuleFor(i => i.Height).GreaterThan(0).WithMessage("Ürün yüksekliği pozitif olmalıdır.");
            item.RuleFor(i => i.Weight).GreaterThan(0).WithMessage("Ürün ağırlığı pozitif olmalıdır.");
        });

        RuleFor(x => x.Parameters.CgThresholdPercent)
            .InclusiveBetween(1m, 50m)
            .When(x => x.Parameters != null)
            .WithMessage("CG eşiği 1-50 arasında olmalıdır.");
    }

}
