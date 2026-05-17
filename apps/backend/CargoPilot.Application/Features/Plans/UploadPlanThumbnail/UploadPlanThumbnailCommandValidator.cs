using FluentValidation;

namespace CargoPilot.Application.Features.Plans.UploadPlanThumbnail;

public sealed class UploadPlanThumbnailCommandValidator : AbstractValidator<UploadPlanThumbnailCommand>
{
    public UploadPlanThumbnailCommandValidator()
    {
        RuleFor(x => x.PlanId)
            .NotEmpty().WithErrorCode("Plan.IdRequired");

        RuleFor(x => x.ImageBase64)
            .NotEmpty().WithErrorCode("Thumbnail.ImageRequired")
            .Must(BeAValidBase64DataUrl).WithErrorCode("Thumbnail.InvalidFormat")
                .WithMessage("imageBase64 geçerli bir base64 data URL olmalıdır (data:image/...;base64,...).");
    }

    private static bool BeAValidBase64DataUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        if (!value.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)) return false;
        var commaIndex = value.IndexOf(',');
        if (commaIndex < 0) return false;
        var base64Part = value[(commaIndex + 1)..];
        try {
            Convert.FromBase64String(base64Part);
            return true;
        } catch {
            return false;
        }
    }
}
