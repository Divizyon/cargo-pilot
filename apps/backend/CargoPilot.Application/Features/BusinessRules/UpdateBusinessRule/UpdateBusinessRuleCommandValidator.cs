using FluentValidation;

namespace CargoPilot.Application.Features.BusinessRules.UpdateBusinessRule;

public sealed class UpdateBusinessRuleCommandValidator : AbstractValidator<UpdateBusinessRuleCommand>
{
    public UpdateBusinessRuleCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("Kural ID'si zorunludur.");

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
            .InclusiveBetween(1, 5).WithMessage("Öncelik seviyesi 1 ile 5 arasında olmalıdır.");
    }
}
