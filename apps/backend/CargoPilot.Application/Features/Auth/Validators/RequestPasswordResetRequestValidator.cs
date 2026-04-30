using CargoPilot.Application.Features.Auth.DTOs;
using FluentValidation;

namespace CargoPilot.Application.Features.Auth.Validators;

public sealed class RequestPasswordResetRequestValidator : AbstractValidator<RequestPasswordResetRequest> {
    public RequestPasswordResetRequestValidator() {
        RuleFor(x => x.Email)
            .NotEmpty()
                .WithErrorCode("AUTH_VAL_EMAIL_REQUIRED")
                .WithMessage("E-posta zorunludur.")
            .EmailAddress()
                .WithErrorCode("AUTH_VAL_EMAIL_FORMAT")
                .WithMessage("Geçerli bir e-posta adresi giriniz.")
            .MaximumLength(255)
                .WithErrorCode("AUTH_VAL_EMAIL_TOO_LONG")
                .WithMessage("E-posta en fazla 255 karakter olabilir.");
    }
}
