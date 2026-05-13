using FluentValidation;

namespace CargoPilot.Application.Features.Me.RequestEmailChange;

public sealed class RequestEmailChangeCommandValidator : AbstractValidator<RequestEmailChangeCommand>
{
    public RequestEmailChangeCommandValidator()
    {
        RuleFor(x => x.NewEmail)
            .NotEmpty()
                .WithErrorCode("ME_VAL_NEW_EMAIL_REQUIRED")
                .WithMessage("Yeni e-posta adresi zorunludur.")
            .EmailAddress()
                .WithErrorCode("ME_VAL_NEW_EMAIL_FORMAT")
                .WithMessage("Geçerli bir e-posta adresi giriniz.")
            .MaximumLength(255)
                .WithErrorCode("ME_VAL_NEW_EMAIL_TOO_LONG")
                .WithMessage("E-posta adresi en fazla 255 karakter olabilir.");
    }
}
