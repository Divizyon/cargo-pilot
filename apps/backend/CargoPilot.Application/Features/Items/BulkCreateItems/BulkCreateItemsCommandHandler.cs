using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.BulkCreateItems;

public sealed class BulkCreateItemsCommandHandler
    : IRequestHandler<BulkCreateItemsCommand, Result<BulkCreateItemsResponse>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IValidator<CreateItemCommand> _validator;

    public BulkCreateItemsCommandHandler(
        IItemRepository itemRepository,
        IValidator<CreateItemCommand> validator)
    {
        _itemRepository = itemRepository;
        _validator = validator;
    }

    public async Task<Result<BulkCreateItemsResponse>> Handle(
        BulkCreateItemsCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Items is null || request.Items.Count == 0)
            return Result<BulkCreateItemsResponse>.Failure(
                new Error(ErrorType.Validation, "BulkItem.EmptyList", "En az bir ürün gönderilmelidir."));

        var failures = new List<ValidationFailure>();

        // Field validation per row
        for (int i = 0; i < request.Items.Count; i++)
        {
            var result = await _validator.ValidateAsync(request.Items[i], cancellationToken);
            foreach (var e in result.Errors)
                failures.Add(new ValidationFailure($"[{i}].{e.PropertyName}", e.ErrorMessage));
        }

        // Within-batch SKU duplicates
        var skuToIndices = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < request.Items.Count; i++)
        {
            var sku = request.Items[i].SKU;
            if (!skuToIndices.TryGetValue(sku, out var list))
            {
                list = [];
                skuToIndices[sku] = list;
            }
            list.Add(i);
        }

        var batchDuplicates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (sku, indices) in skuToIndices.Where(kv => kv.Value.Count > 1))
        {
            batchDuplicates.Add(sku);
            foreach (var idx in indices)
                failures.Add(new ValidationFailure($"[{idx}].SKU", $"Bu SKU toplu işlemde birden fazla kez kullanıldı."));
        }

        // DB SKU conflicts (only for non-batch-duplicate SKUs)
        foreach (var (sku, indices) in skuToIndices.Where(kv => !batchDuplicates.Contains(kv.Key)))
        {
            if (await _itemRepository.ExistsBySkuAsync(sku, cancellationToken))
            {
                foreach (var idx in indices)
                    failures.Add(new ValidationFailure($"[{idx}].SKU", "Bu SKU zaten kullanımda."));
            }
        }

        if (failures.Count > 0)
            return Result<BulkCreateItemsResponse>.Failure(
                new Error(ErrorType.Validation, "BulkItem.ValidationFailed",
                    "Bir veya daha fazla satırda doğrulama hatası var.", failures));

        foreach (var cmd in request.Items)
        {
            _itemRepository.Add(new Item(
                id: Guid.NewGuid(),
                sku: cmd.SKU,
                name: cmd.Name,
                productType: cmd.ProductType,
                category: cmd.Category,
                width: cmd.Width,
                height: cmd.Height,
                length: cmd.Length,
                weight: cmd.Weight,
                fragilityType: cmd.FragilityType,
                isStackable: cmd.IsStackable,
                maxStackCount: cmd.MaxStackCount,
                maxWeightOnTop: cmd.MaxWeightOnTop,
                allowedRotations: cmd.AllowedRotations,
                barcode: cmd.Barcode,
                diameter: cmd.Diameter,
                imageUrl: cmd.ImageUrl,
                stackGroup: cmd.StackGroup,
                specialNotes: cmd.SpecialNotes));
        }

        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<BulkCreateItemsResponse>.Success(new BulkCreateItemsResponse(request.Items.Count));
    }
}
