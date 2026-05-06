using FluentValidation;

namespace CargoPilot.Application.Features.BusinessRules.CreateBusinessRule;

public sealed class CreateBusinessRuleCommandValidator : AbstractValidator<CreateBusinessRuleCommand>
{
    public CreateBusinessRuleCommandValidator()
    {
        RuleFor(x => x.RuleName)
            .NotEmpty().WithMessage("Kural adı zorunludur.")
            .MaximumLength(200).WithMessage("Kural adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Kural açıklaması zorunludur.")
            .MaximumLength(1000).WithMessage("Açıklama en fazla 1000 karakter olabilir.");

        RuleFor(x => x.RuleType)
            .IsInEnum().WithMessage("Geçersiz kural tipi.");

        RuleFor(x => x.LimitValue)
            .GreaterThanOrEqualTo(0).WithMessage("Limit değeri sıfır veya daha büyük olmalıdır.");

        RuleFor(x => x.PriorityLevel)
            .InclusiveBetween(1, 5).WithMessage("Öncelik seviyesi 1 (en yüksek) ile 5 (en düşük) arasında olmalıdır.");
    }
}
