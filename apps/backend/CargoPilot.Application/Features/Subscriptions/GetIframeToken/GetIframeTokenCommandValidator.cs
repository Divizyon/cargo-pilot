using FluentValidation;

namespace CargoPilot.Application.Features.Subscriptions.GetIframeToken;

public sealed class GetIframeTokenCommandValidator : AbstractValidator<GetIframeTokenCommand>
{
    private static readonly HashSet<string> ValidPlans = ["Free", "Pro"];
    private static readonly HashSet<string> ValidPeriods = ["Monthly", "Yearly"];

    public GetIframeTokenCommandValidator()
    {
        RuleFor(x => x.TargetPlanType)
            .NotEmpty().WithMessage("Plan tipi zorunludur.")
            .Must(p => ValidPlans.Contains(p))
            .WithMessage("Geçersiz plan tipi. 'Free' veya 'Pro' olmalıdır.");

        RuleFor(x => x.BillingPeriod)
            .NotEmpty().WithMessage("Fatura dönemi zorunludur.")
            .Must(p => ValidPeriods.Contains(p))
            .WithMessage("Geçersiz fatura dönemi. 'Monthly' veya 'Yearly' olmalıdır.");
    }
}
