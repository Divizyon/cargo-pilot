using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.UpdateItem;

public sealed class UpdateItemCommandHandler : IRequestHandler<UpdateItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpdateItemCommand> _validator;

    public UpdateItemCommandHandler(
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        IValidator<UpdateItemCommand> validator)
    {
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(
        UpdateItemCommand request,
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

        var companyId = _currentUserService.CompanyId;

        var item = await _itemRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (item is null)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Item.NotFound", "Ürün bulunamadı."));
        }

        var skuExists = await _itemRepository.ExistsBySkuAsync(request.SKU, request.Id, companyId, cancellationToken);
        if (skuExists)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Item.SkuAlreadyExists", "Bu SKU zaten başka bir üründe kullanılıyor."));
        }

        item.Update(
            sku: request.SKU,
            barcode: request.Barcode,
            name: request.Name,
            productType: request.ProductType,
            category: request.Category,
            width: request.Width,
            height: request.Height,
            length: request.Length,
            diameter: request.Diameter,
            weight: request.Weight,
            fragilityType: request.FragilityType,
            isStackable: request.IsStackable,
            maxStackCount: request.MaxStackCount,
            maxWeightOnTop: request.MaxWeightOnTop,
            allowedRotations: request.AllowedRotations,
            imageUrl: request.ImageUrl,
            stackGroup: request.StackGroup,
            specialNotes: request.SpecialNotes,
            constraintIds: request.ConstraintIds);

        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}
