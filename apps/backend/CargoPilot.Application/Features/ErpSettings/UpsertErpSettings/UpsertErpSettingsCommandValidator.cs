using FluentValidation;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

public sealed class UpsertErpSettingsCommandValidator : AbstractValidator<UpsertErpSettingsCommand>
{
    public UpsertErpSettingsCommandValidator()
    {
        RuleFor(x => x.ProviderType)
            .IsInEnum().WithMessage("Geçersiz ERP sağlayıcısı.");

        RuleFor(x => x.CompanyCode)
            .NotEmpty().WithMessage("Veritabanı adı boş olamaz.")
            .MaximumLength(100).WithMessage("Veritabanı adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Kullanıcı adı boş olamaz.")
            .MaximumLength(200).WithMessage("Kullanıcı adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.ServerAddress)
            .NotEmpty().WithMessage("Sunucu adresi boş olamaz.")
            .MaximumLength(500).WithMessage("Sunucu adresi en fazla 500 karakter olabilir.");
    }
}
