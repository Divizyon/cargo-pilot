using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Units;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.UpdateItem;

public sealed class UpdateItemCommandHandler : IRequestHandler<UpdateItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IValidator<UpdateItemCommand> _validator;

    public UpdateItemCommandHandler(IItemRepository itemRepository, IValidator<UpdateItemCommand> validator)
    {
        _itemRepository = itemRepository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(UpdateItemCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();

            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var item = await _itemRepository.GetByIdAsync(request.Id, cancellationToken);
        if (item is null)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Item.NotFound", "Ürün bulunamadı."));
        }

        var skuNormalized = request.SKU.Trim();
        if (!string.Equals(item.SKU, skuNormalized, StringComparison.Ordinal))
        {
            var skuExists = await _itemRepository.ExistsBySkuAsync(skuNormalized, cancellationToken);
            if (skuExists)
            {
                return Result<Guid>.Failure(
                    new Error(ErrorType.Validation, "Item.SkuDuplicate", "Bu SKU ile başka bir ürün zaten mevcut."));
            }
        }

        var widthCm = UnitConverter.ToCentimeters(request.Width, request.WidthUnit);
        var heightCm = UnitConverter.ToCentimeters(request.Height, request.HeightUnit);
        var lengthCm = UnitConverter.ToCentimeters(request.Length, request.LengthUnit);
        var weightKg = UnitConverter.ToKilograms(request.Weight, request.WeightUnit);
        var volumeCm3 = widthCm * heightCm * lengthCm;

        item.Update(
            sku: skuNormalized,
            barcode: request.Barcode,
            name: request.Name.Trim(),
            productType: request.ProductType.Trim(),
            category: request.Category,
            widthOriginalValue: request.Width,
            widthUnit: request.WidthUnit,
            heightOriginalValue: request.Height,
            heightUnit: request.HeightUnit,
            lengthOriginalValue: request.Length,
            lengthUnit: request.LengthUnit,
            weightOriginalValue: request.Weight,
            weightUnit: request.WeightUnit,
            widthInCm: widthCm,
            heightInCm: heightCm,
            lengthInCm: lengthCm,
            weightInKg: weightKg,
            volumeInCm3: volumeCm3,
            diameter: request.Diameter,
            fragilityType: request.FragilityType,
            isStackable: request.IsStackable,
            maxStackCount: request.MaxStackCount,
            maxWeightOnTop: request.MaxWeightOnTop,
            allowedRotations: request.AllowedRotations,
            imageUrl: request.ImageUrl,
            stackGroup: request.StackGroup,
            specialNotes: request.SpecialNotes);

        await _itemRepository.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(item.Id);
    }
}

