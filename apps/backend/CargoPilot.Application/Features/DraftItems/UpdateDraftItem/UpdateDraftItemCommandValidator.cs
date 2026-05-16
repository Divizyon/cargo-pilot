using FluentValidation;

namespace CargoPilot.Application.Features.DraftItems.UpdateDraftItem;

public sealed class UpdateDraftItemCommandValidator : AbstractValidator<UpdateDraftItemCommand>
{
    public UpdateDraftItemCommandValidator()
    {
        RuleFor(x => x.Width)
            .GreaterThan(0)
                .WithErrorCode("DRAFT_VAL_WIDTH_POSITIVE")
                .WithMessage("Genişlik sıfırdan büyük olmalıdır.");

        RuleFor(x => x.Height)
            .GreaterThan(0)
                .WithErrorCode("DRAFT_VAL_HEIGHT_POSITIVE")
                .WithMessage("Yükseklik sıfırdan büyük olmalıdır.");

        RuleFor(x => x.Length)
            .GreaterThan(0)
                .WithErrorCode("DRAFT_VAL_LENGTH_POSITIVE")
                .WithMessage("Uzunluk sıfırdan büyük olmalıdır.");

        RuleFor(x => x.Weight)
            .GreaterThan(0)
                .WithErrorCode("DRAFT_VAL_WEIGHT_POSITIVE")
                .WithMessage("Ağırlık sıfırdan büyük olmalıdır.");

        RuleFor(x => x.MaxStackCount)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("DRAFT_VAL_MAXSTACKCOUNT_MIN")
                .WithMessage("Maksimum istif sayısı en az 1 olmalıdır.");
    }
}
