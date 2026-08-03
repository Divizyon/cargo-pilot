using FluentValidation;

namespace CargoPilot.Application.Features.Plans.Groups.AssignItemToGroup;

public sealed class AssignItemToGroupCommandValidator : AbstractValidator<AssignItemToGroupCommand>
{
    public AssignItemToGroupCommandValidator()
    {
        RuleFor(x => x.PlanId)
            .NotEmpty().WithMessage("Plan ID boş olamaz.");

        RuleFor(x => x.InputItemId)
            .NotEmpty().WithMessage("InputItem ID boş olamaz.");
    }
}
