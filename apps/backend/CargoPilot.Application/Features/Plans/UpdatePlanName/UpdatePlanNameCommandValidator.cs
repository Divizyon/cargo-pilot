using FluentValidation;

namespace CargoPilot.Application.Features.Plans.UpdatePlanName;

public sealed class UpdatePlanNameCommandValidator : AbstractValidator<UpdatePlanNameCommand>
{
    public UpdatePlanNameCommandValidator()
    {
        RuleFor(x => x.PlanName)
            .NotEmpty().WithMessage("Plan adı boş olamaz.")
            .MaximumLength(100).WithMessage("Plan adı en fazla 100 karakter olabilir.");
    }
}
