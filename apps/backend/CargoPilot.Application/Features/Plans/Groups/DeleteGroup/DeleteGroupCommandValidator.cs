using FluentValidation;

namespace CargoPilot.Application.Features.Plans.Groups.DeleteGroup;

public sealed class DeleteGroupCommandValidator : AbstractValidator<DeleteGroupCommand>
{
    public DeleteGroupCommandValidator()
    {
        RuleFor(x => x.PlanId)
            .NotEmpty().WithMessage("Plan ID boş olamaz.");

        RuleFor(x => x.GroupId)
            .NotEmpty().WithMessage("Grup ID boş olamaz.");
    }
}
