using FluentValidation;

namespace CargoPilot.Application.Features.Settings.UploadReportingLogo;

public sealed class UploadReportingLogoCommandValidator
    : AbstractValidator<UploadReportingLogoCommand>
{
    private static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const int MaxFileSizeBytes = 2 * 1024 * 1024; // 2 MB

    public UploadReportingLogoCommandValidator()
    {
        RuleFor(x => x.FileBytes)
            .NotEmpty().WithErrorCode("Logo.FileRequired")
            .Must(b => b.Length <= MaxFileSizeBytes)
                .WithErrorCode("Logo.FileTooLarge")
                .WithMessage("Logo dosyası 2 MB'dan büyük olamaz.");

        RuleFor(x => x.ContentType)
            .NotEmpty().WithErrorCode("Logo.ContentTypeRequired")
            .Must(ct => AllowedContentTypes.Contains(ct.ToLowerInvariant()))
                .WithErrorCode("Logo.InvalidContentType")
                .WithMessage("Logo yalnızca JPEG, PNG veya WebP formatında olabilir.");
    }
}
