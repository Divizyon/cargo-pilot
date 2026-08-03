using FluentValidation;

namespace CargoPilot.Application.Features.Me.UpdateMyProfile;

public sealed class UpdateMyProfileCommandValidator : AbstractValidator<UpdateMyProfileCommand>
{
    public UpdateMyProfileCommandValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty()
                .WithErrorCode("ME_VAL_FIRSTNAME_REQUIRED")
                .WithMessage("Ad zorunludur.")
            .MaximumLength(100)
                .WithErrorCode("ME_VAL_FIRSTNAME_TOO_LONG")
                .WithMessage("Ad en fazla 100 karakter olabilir.");

        RuleFor(x => x.LastName)
            .NotEmpty()
                .WithErrorCode("ME_VAL_LASTNAME_REQUIRED")
                .WithMessage("Soyad zorunludur.")
            .MaximumLength(100)
                .WithErrorCode("ME_VAL_LASTNAME_TOO_LONG")
                .WithMessage("Soyad en fazla 100 karakter olabilir.");

        RuleFor(x => x.CompanyName)
            .MaximumLength(200)
                .WithErrorCode("ME_VAL_COMPANY_NAME_TOO_LONG")
                .WithMessage("Firma adı en fazla 200 karakter olabilir.")
            .When(x => x.CompanyName is not null);
    }
}
