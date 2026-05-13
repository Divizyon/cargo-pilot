using FluentValidation;

namespace CargoPilot.Application.Features.Plans.ApprovePlan;

public sealed class ApprovePlanCommandValidator : AbstractValidator<ApprovePlanCommand>
{
    public ApprovePlanCommandValidator()
    {
        RuleFor(x => x.PlanId)
            .NotEmpty().WithMessage("Plan ID boş olamaz.");
    }
}
