using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Units;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.CreateItem;

public sealed class CreateItemCommandHandler : IRequestHandler<CreateItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IValidator<CreateItemCommand> _validator;

    public CreateItemCommandHandler(IItemRepository itemRepository, IValidator<CreateItemCommand> validator)
    {
        _itemRepository = itemRepository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(CreateItemCommand request, CancellationToken cancellationToken)
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

        var skuNormalized = request.SKU.Trim();
        var skuExists = await _itemRepository.ExistsBySkuAsync(skuNormalized, cancellationToken);
        if (skuExists)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Item.SkuDuplicate", "Bu SKU ile başka bir ürün zaten mevcut."));
        }

        var widthCm = UnitConverter.ToCentimeters(request.Width, request.WidthUnit);
        var heightCm = UnitConverter.ToCentimeters(request.Height, request.HeightUnit);
        var lengthCm = UnitConverter.ToCentimeters(request.Length, request.LengthUnit);
        var weightKg = UnitConverter.ToKilograms(request.Weight, request.WeightUnit);
        var volumeCm3 = widthCm * heightCm * lengthCm;

        var item = new Item(
            id: Guid.NewGuid(),
            sku: skuNormalized,
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
            fragilityType: request.FragilityType,
            isStackable: request.IsStackable,
            maxStackCount: request.MaxStackCount,
            maxWeightOnTop: request.MaxWeightOnTop,
            allowedRotations: request.AllowedRotations,
            barcode: request.Barcode,
            diameter: request.Diameter,
            imageUrl: request.ImageUrl,
            stackGroup: request.StackGroup,
            specialNotes: request.SpecialNotes);

        _itemRepository.Add(item);
        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}

