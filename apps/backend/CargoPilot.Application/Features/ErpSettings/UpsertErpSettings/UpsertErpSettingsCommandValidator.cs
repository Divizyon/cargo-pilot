using FluentValidation;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

public sealed class UpsertErpSettingsCommandValidator : AbstractValidator<UpsertErpSettingsCommand>
{
    public UpsertErpSettingsCommandValidator()
    {
        RuleFor(x => x.CompanyCode)
            .NotEmpty().WithMessage("Şirket kodu boş olamaz.")
            .MaximumLength(100).WithMessage("Şirket kodu en fazla 100 karakter olabilir.");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Kullanıcı adı boş olamaz.")
            .MaximumLength(200).WithMessage("Kullanıcı adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.ServerAddress)
            .NotEmpty().WithMessage("Sunucu adresi boş olamaz.")
            .MaximumLength(500).WithMessage("Sunucu adresi en fazla 500 karakter olabilir.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş olamaz.")
            .MaximumLength(500).WithMessage("Şifre en fazla 500 karakter olabilir.");

        RuleFor(x => x.Provider)
            .IsInEnum().WithMessage("Geçersiz ERP sağlayıcı tipi.");
    }
}
