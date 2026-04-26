using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
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

        var skuNormalized = request.SKU.Trim().ToUpperInvariant();
        var skuTaken = await _itemRepository.ExistsBySkuExcludingAsync(skuNormalized, request.Id, cancellationToken);
        if (skuTaken)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Item.SkuAlreadyExists", "Bu SKU kodu zaten kullanımda."));
        }

        item.Update(
            sku: skuNormalized,
            name: request.Name.Trim(),
            productType: request.ProductType.Trim(),
            category: request.Category,
            width: request.Width,
            height: request.Height,
            length: request.Length,
            weight: request.Weight,
            fragilityType: request.FragilityType,
            isStackable: request.IsStackable,
            maxStackCount: request.MaxStackCount,
            maxWeightOnTop: request.MaxWeightOnTop,
            allowedRotations: request.AllowedRotations,
            barcode: request.Barcode?.Trim(),
            diameter: request.Diameter,
            imageUrl: request.ImageUrl?.Trim(),
            stackGroup: request.StackGroup?.Trim(),
            specialNotes: request.SpecialNotes?.Trim());

        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}
