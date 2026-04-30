using CargoPilot.Application.Features.Auth.DTOs;
using FluentValidation;

namespace CargoPilot.Application.Features.Auth.Validators;

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest> {
    public ResetPasswordRequestValidator() {
        RuleFor(x => x.Token)
            .NotEmpty()
                .WithErrorCode("AUTH_VAL_TOKEN_REQUIRED")
                .WithMessage("Token zorunludur.")
            .MaximumLength(1000)
                .WithErrorCode("AUTH_VAL_TOKEN_TOO_LONG")
                .WithMessage("Token en fazla 1000 karakter olabilir.");

        RuleFor(x => x.NewPassword)
            .NotEmpty()
                .WithErrorCode("AUTH_VAL_PASSWORD_REQUIRED")
                .WithMessage("Şifre zorunludur.")
            .MinimumLength(8)
                .WithErrorCode("AUTH_VAL_PASSWORD_TOO_SHORT")
                .WithMessage("Şifre en az 8 karakter olmalıdır.")
            .MaximumLength(72)
                .WithErrorCode("AUTH_VAL_PASSWORD_TOO_LONG")
                .WithMessage("Şifre en fazla 72 karakter olabilir.")
            .Matches(@"[A-Z]")
                .WithErrorCode("AUTH_VAL_PASSWORD_NO_UPPERCASE")
                .WithMessage("Şifre en az bir büyük harf içermelidir.")
            .Matches(@"[0-9]")
                .WithErrorCode("AUTH_VAL_PASSWORD_NO_DIGIT")
                .WithMessage("Şifre en az bir rakam içermelidir.");
    }
}
