using FluentValidation;

namespace CargoPilot.Application.Features.Me.UpdateTourCompleted;

public sealed class UpdateTourCompletedCommandValidator : AbstractValidator<UpdateTourCompletedCommand>
{
    public UpdateTourCompletedCommandValidator()
    {
        RuleFor(x => x.TourCompleted)
            .NotNull()
                .WithErrorCode("ME_VAL_TOURCOMPLETED_REQUIRED")
                .WithMessage("TourCompleted alanı zorunludur.");
    }
}
