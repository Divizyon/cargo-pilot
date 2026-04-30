using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.CreateItem;

public sealed class CreateItemCommandHandler : IRequestHandler<CreateItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IValidator<CreateItemCommand> _validator;

    public CreateItemCommandHandler(
        IItemRepository itemRepository,
        IValidator<CreateItemCommand> validator)
    {
        _itemRepository = itemRepository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(
        CreateItemCommand request,
        CancellationToken cancellationToken)
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

        var skuExists = await _itemRepository.ExistsBySkuAsync(request.SKU, cancellationToken);
        if (skuExists)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Item.SkuAlreadyExists", "Bu SKU zaten kullanımda."));
        }

        var item = new Item(
            id: Guid.NewGuid(),
            sku: request.SKU,
            name: request.Name,
            productType: request.ProductType,
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
