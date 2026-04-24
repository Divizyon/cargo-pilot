using FluentValidation;

namespace CargoPilot.Application.Features.Auth.Register;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand> {
    public RegisterCommandValidator() {
        RuleFor(x => x.FirstName)
            .NotEmpty()
                .WithErrorCode("AUTH_VAL_FIRSTNAME_REQUIRED")
                .WithMessage("Ad zorunludur.")
            .MaximumLength(100)
                .WithErrorCode("AUTH_VAL_FIRSTNAME_TOO_LONG")
                .WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.LastName)
            .NotEmpty()
                .WithErrorCode("AUTH_VAL_LASTNAME_REQUIRED")
                .WithMessage("Soyad zorunludur.")
            .MaximumLength(100)
                .WithErrorCode("AUTH_VAL_LASTNAME_TOO_LONG")
                .WithMessage("Soyad en fazla 100 karakter olabilir.");

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

        RuleFor(x => x.Password)
            .NotEmpty()
                .WithErrorCode("AUTH_VAL_PASSWORD_REQUIRED")
                .WithMessage("Şifre zorunludur.")
            .MinimumLength(8)
                .WithErrorCode("AUTH_VAL_PASSWORD_TOO_SHORT")
                .WithMessage("Şifre en az 8 karakter olmalıdır.")
            .MaximumLength(100)
                .WithErrorCode("AUTH_VAL_PASSWORD_TOO_LONG")
                .WithMessage("Şifre en fazla 100 karakter olabilir.");
    }
}
