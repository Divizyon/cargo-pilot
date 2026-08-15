using CargoPilot.Application.Common.Items;
using FluentValidation;

namespace CargoPilot.Application.Features.Items.CreateItem;

/// <summary>Ortak Item kural setine (bkz. <see cref="ItemSpecValidatorBase{T}"/>) kimlik alanlarini ekler.</summary>
public sealed class CreateItemCommandValidator : ItemSpecValidatorBase<CreateItemCommand> {
    public CreateItemCommandValidator() {
        RuleFor(x => x.SKU)
            .NotEmpty()
                .WithErrorCode("ITEM_VAL_SKU_REQUIRED")
                .WithMessage("SKU zorunludur.")
            .MaximumLength(100)
                .WithErrorCode("ITEM_VAL_SKU_TOO_LONG")
                .WithMessage("SKU en fazla 100 karakter olabilir.");

        RuleFor(x => x.Name)
            .NotEmpty()
                .WithErrorCode("ITEM_VAL_NAME_REQUIRED")
                .WithMessage("Urun adi zorunludur.")
            .MaximumLength(200)
                .WithErrorCode("ITEM_VAL_NAME_TOO_LONG")
                .WithMessage("Urun adi en fazla 200 karakter olabilir.");
    }
}
