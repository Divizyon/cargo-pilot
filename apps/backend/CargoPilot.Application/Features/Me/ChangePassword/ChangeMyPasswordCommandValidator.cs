using FluentValidation;

namespace CargoPilot.Application.Features.Me.ChangePassword;

public sealed class ChangeMyPasswordCommandValidator : AbstractValidator<ChangeMyPasswordCommand>
{
    public ChangeMyPasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty()
                .WithErrorCode("ME_VAL_CURRENT_PASSWORD_REQUIRED")
                .WithMessage("Mevcut şifre zorunludur.");

        RuleFor(x => x.NewPassword)
            .NotEmpty()
                .WithErrorCode("ME_VAL_NEW_PASSWORD_REQUIRED")
                .WithMessage("Yeni şifre zorunludur.")
            .MinimumLength(8)
                .WithErrorCode("ME_VAL_NEW_PASSWORD_TOO_SHORT")
                .WithMessage("Yeni şifre en az 8 karakter olmalıdır.")
            .MaximumLength(72)
                .WithErrorCode("ME_VAL_NEW_PASSWORD_TOO_LONG")
                .WithMessage("Yeni şifre en fazla 72 karakter olabilir.")
            .Matches("[A-Z]")
                .WithErrorCode("ME_VAL_NEW_PASSWORD_NO_UPPERCASE")
                .WithMessage("Yeni şifre en az bir büyük harf içermelidir.")
            .Matches("[0-9]")
                .WithErrorCode("ME_VAL_NEW_PASSWORD_NO_DIGIT")
                .WithMessage("Yeni şifre en az bir rakam içermelidir.");
    }
}
