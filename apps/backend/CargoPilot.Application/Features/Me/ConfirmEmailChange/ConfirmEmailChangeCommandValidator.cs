using FluentValidation;

namespace CargoPilot.Application.Features.Me.ConfirmEmailChange;

public sealed class ConfirmEmailChangeCommandValidator : AbstractValidator<ConfirmEmailChangeCommand>
{
    public ConfirmEmailChangeCommandValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty()
                .WithErrorCode("ME_VAL_EMAIL_CHANGE_TOKEN_REQUIRED")
                .WithMessage("Onay token'ı zorunludur.");
    }
}
