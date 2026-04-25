using FluentValidation;

namespace CargoPilot.Application.Features.Items.UpdateItem;

public sealed class UpdateItemCommandValidator : AbstractValidator<UpdateItemCommand> {
    public UpdateItemCommandValidator() {
        RuleFor(x => x.Id)
            .NotEqual(Guid.Empty)
                .WithErrorCode("ITEM_VAL_ID_REQUIRED")
                .WithMessage("Item id zorunludur.");

        RuleFor(x => x.SKU)
            .NotEmpty()
                .WithErrorCode("ITEM_VAL_SKU_REQUIRED")
                .WithMessage("SKU zorunludur.")
            .MaximumLength(100)
                .WithErrorCode("ITEM_VAL_SKU_TOO_LONG")
                .WithMessage("SKU en fazla 100 karakter olabilir.");

        RuleFor(x => x.Barcode)
            .MaximumLength(100)
                .WithErrorCode("ITEM_VAL_BARCODE_TOO_LONG")
                .WithMessage("Barcode en fazla 100 karakter olabilir.");

        RuleFor(x => x.Name)
            .NotEmpty()
                .WithErrorCode("ITEM_VAL_NAME_REQUIRED")
                .WithMessage("Urun adi zorunludur.")
            .MaximumLength(200)
                .WithErrorCode("ITEM_VAL_NAME_TOO_LONG")
                .WithMessage("Urun adi en fazla 200 karakter olabilir.");

        RuleFor(x => x.ProductType)
            .NotEmpty()
                .WithErrorCode("ITEM_VAL_PRODUCTTYPE_REQUIRED")
                .WithMessage("Urun tipi zorunludur.")
            .Must(value => !string.IsNullOrWhiteSpace(value))
                .WithErrorCode("ITEM_VAL_PRODUCTTYPE_WHITESPACE")
                .WithMessage("Urun tipi bosluk olamaz.")
            .MaximumLength(100)
                .WithErrorCode("ITEM_VAL_PRODUCTTYPE_TOO_LONG")
                .WithMessage("Urun tipi en fazla 100 karakter olabilir.");

        RuleFor(x => x.Category)
            .IsInEnum()
                .WithErrorCode("ITEM_VAL_CATEGORY_INVALID")
                .WithMessage("Gecersiz urun kategorisi.");

        RuleFor(x => x.Width)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_WIDTH_POSITIVE")
                .WithMessage("Genislik 0'dan buyuk olmali.");

        RuleFor(x => x.Height)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_HEIGHT_POSITIVE")
                .WithMessage("Yukseklik 0'dan buyuk olmali.");

        RuleFor(x => x.Length)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_LENGTH_POSITIVE")
                .WithMessage("Uzunluk 0'dan buyuk olmali.");

        RuleFor(x => x.Diameter)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_DIAMETER_POSITIVE")
                .WithMessage("Cap degeri 0'dan buyuk olmali.")
            .When(x => x.Diameter.HasValue);

        RuleFor(x => x.Weight)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_WEIGHT_POSITIVE")
                .WithMessage("Agirlik 0'dan buyuk olmali.");

        RuleFor(x => x.FragilityType)
            .IsInEnum()
                .WithErrorCode("ITEM_VAL_FRAGILITY_INVALID")
                .WithMessage("Gecersiz fragility tipi.");

        RuleFor(x => x.MaxStackCount)
            .GreaterThanOrEqualTo(0)
                .WithErrorCode("ITEM_VAL_MAXSTACKCOUNT_MIN")
                .WithMessage("Maksimum istif adedi negatif olamaz.");

        RuleFor(x => x.MaxWeightOnTop)
            .GreaterThanOrEqualTo(0)
                .WithErrorCode("ITEM_VAL_MAXWEIGHTONTOP_MIN")
                .WithMessage("Uzerine binecek agirlik limiti negatif olamaz.");

        RuleFor(x => x.AllowedRotations)
            .IsInEnum()
                .WithErrorCode("ITEM_VAL_ALLOWEDROTATIONS_INVALID")
                .WithMessage("Gecersiz donus tipi.");

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500)
                .WithErrorCode("ITEM_VAL_IMAGEURL_TOO_LONG")
                .WithMessage("Gorsel linki en fazla 500 karakter olabilir.");

        RuleFor(x => x.StackGroup)
            .MaximumLength(100)
                .WithErrorCode("ITEM_VAL_STACKGROUP_TOO_LONG")
                .WithMessage("Stack group en fazla 100 karakter olabilir.");

        RuleFor(x => x.SpecialNotes)
            .MaximumLength(1000)
                .WithErrorCode("ITEM_VAL_SPECIALNOTES_TOO_LONG")
                .WithMessage("Ozel notlar en fazla 1000 karakter olabilir.");

        RuleFor(x => x.MaxStackCount)
            .Equal(0)
                .WithErrorCode("ITEM_VAL_MAXSTACKCOUNT_WHEN_NOT_STACKABLE")
                .WithMessage("Istiflenemez urunde maksimum istif adedi 0 olmali.")
            .When(x => !x.IsStackable);

        RuleFor(x => x.MaxWeightOnTop)
            .Equal(0)
                .WithErrorCode("ITEM_VAL_MAXWEIGHTONTOP_WHEN_NOT_STACKABLE")
                .WithMessage("Istiflenemez urunde ust agirlik limiti 0 olmali.")
            .When(x => !x.IsStackable);

        RuleFor(x => x.MaxStackCount)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_MAXSTACKCOUNT_WHEN_STACKABLE")
                .WithMessage("Istiflenebilir urunde maksimum istif adedi 0'dan buyuk olmali.")
            .When(x => x.IsStackable);

        RuleFor(x => x.MaxWeightOnTop)
            .GreaterThan(0)
                .WithErrorCode("ITEM_VAL_MAXWEIGHTONTOP_WHEN_STACKABLE")
                .WithMessage("Istiflenebilir urunde ust agirlik limiti 0'dan buyuk olmali.")
            .When(x => x.IsStackable);
    }
}
