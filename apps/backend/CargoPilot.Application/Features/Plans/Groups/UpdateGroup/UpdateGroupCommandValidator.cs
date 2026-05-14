using FluentValidation;

namespace CargoPilot.Application.Features.Plans.Groups.UpdateGroup;

public sealed class UpdateGroupCommandValidator : AbstractValidator<UpdateGroupCommand>
{
    public UpdateGroupCommandValidator()
    {
        RuleFor(x => x.PlanId)
            .NotEmpty().WithMessage("Plan ID boş olamaz.");

        RuleFor(x => x.GroupId)
            .NotEmpty().WithMessage("Grup ID boş olamaz.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Grup adı boş olamaz.")
            .MaximumLength(100).WithMessage("Grup adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Color)
            .NotEmpty().WithMessage("Renk boş olamaz.")
            .MaximumLength(50).WithMessage("Renk en fazla 50 karakter olabilir.");

        RuleFor(x => x.UnloadingOrder)
            .GreaterThanOrEqualTo(0).WithMessage("Boşaltma sırası 0 veya daha büyük olmalıdır.");
    }
}
