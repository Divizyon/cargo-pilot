using FluentValidation;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

public sealed class TestErpConnectionCommandValidator : AbstractValidator<TestErpConnectionCommand>
{
    public TestErpConnectionCommandValidator()
    {
        RuleFor(x => x.ProviderType)
            .IsInEnum().WithMessage("Geçersiz ERP sağlayıcısı.");

        RuleFor(x => x.ServerAddress)
            .NotEmpty().WithMessage("Sunucu adresi boş olamaz.")
            .MaximumLength(500).WithMessage("Sunucu adresi en fazla 500 karakter olabilir.");

        RuleFor(x => x.CompanyCode)
            .NotEmpty().WithMessage("Veritabanı adı boş olamaz.")
            .MaximumLength(100).WithMessage("Veritabanı adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Kullanıcı adı boş olamaz.")
            .MaximumLength(200).WithMessage("Kullanıcı adı en fazla 200 karakter olabilir.");
        // Sifre bos birakilabilir: kayitli bir baglanti varsa saklanan sifreyle test edilir.
    }
}
