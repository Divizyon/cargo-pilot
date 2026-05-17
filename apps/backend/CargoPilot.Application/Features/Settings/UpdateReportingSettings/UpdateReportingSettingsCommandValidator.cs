using FluentValidation;

namespace CargoPilot.Application.Features.Settings.UpdateReportingSettings;

public sealed class UpdateReportingSettingsCommandValidator
    : AbstractValidator<UpdateReportingSettingsCommand>
{
    public UpdateReportingSettingsCommandValidator()
    {
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Şirket adı boş olamaz.")
            .MaximumLength(200).WithMessage("Şirket adı en fazla 200 karakter olabilir.")
            .When(x => x.CompanyName is not null);

        RuleFor(x => x.Phone)
            .MaximumLength(100).WithMessage("Telefon en fazla 100 karakter olabilir.")
            .When(x => x.Phone is not null);

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.")
            .MaximumLength(200).WithMessage("E-posta en fazla 200 karakter olabilir.")
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Address)
            .MaximumLength(500).WithMessage("Adres en fazla 500 karakter olabilir.")
            .When(x => x.Address is not null);
    }
}
