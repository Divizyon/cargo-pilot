using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.UpdateItem;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.BulkUpdateItems;

public sealed class BulkUpdateItemsCommandHandler
    : IRequestHandler<BulkUpdateItemsCommand, Result<BulkUpdateItemsResponse>>
{
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpdateItemCommand> _validator;

    public BulkUpdateItemsCommandHandler(
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        IValidator<UpdateItemCommand> validator)
    {
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<BulkUpdateItemsResponse>> Handle(
        BulkUpdateItemsCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Items is null || request.Items.Count == 0)
            return Result<BulkUpdateItemsResponse>.Failure(
                new Error(ErrorType.Validation, "BulkUpdateItem.EmptyList", "En az bir ürün gönderilmelidir."));

        if (request.Items.Count > 500)
            return Result<BulkUpdateItemsResponse>.Failure(
                new Error(ErrorType.Validation, "BulkUpdateItem.TooManyItems", "En fazla 500 ürün gönderilebilir."));

        var companyId = _currentUserService.CompanyId;
        var failures = new List<ValidationFailure>();

        // Per-row field validation
        for (int i = 0; i < request.Items.Count; i++)
        {
            var result = await _validator.ValidateAsync(request.Items[i], cancellationToken);
            foreach (var e in result.Errors)
                failures.Add(new ValidationFailure($"[{i}].{e.PropertyName}", e.ErrorMessage));
        }

        // Within-batch duplicate ID check
        var idToIndices = new Dictionary<Guid, List<int>>();
        for (int i = 0; i < request.Items.Count; i++)
        {
            var id = request.Items[i].Id;
            if (!idToIndices.TryGetValue(id, out var list))
            {
                list = [];
                idToIndices[id] = list;
            }
            list.Add(i);
        }

        foreach (var (_, indices) in idToIndices.Where(kv => kv.Value.Count > 1))
            foreach (var idx in indices)
                failures.Add(new ValidationFailure($"[{idx}].Id", "Bu ID toplu işlemde birden fazla kez kullanıldı."));

        // Within-batch duplicate SKU check (different IDs → same target SKU)
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

        var batchDuplicateSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (sku, indices) in skuToIndices.Where(kv => kv.Value.Count > 1))
        {
            batchDuplicateSkus.Add(sku);
            foreach (var idx in indices)
                failures.Add(new ValidationFailure($"[{idx}].SKU", "Bu SKU toplu işlemde birden fazla kez kullanıldı."));
        }

        if (failures.Count > 0)
            return Result<BulkUpdateItemsResponse>.Failure(
                new Error(ErrorType.Validation, "BulkUpdateItem.ValidationFailed",
                    "Bir veya daha fazla satırda doğrulama hatası var.", failures));

        // Fetch all items in a single query
        var allIds = request.Items.Select(x => x.Id).ToList();
        var existingItems = await _itemRepository.GetByIdsAsync(allIds, companyId, cancellationToken);
        var existingById = existingItems.ToDictionary(x => x.Id);

        // Not-found check
        var notFoundFailures = new List<ValidationFailure>();
        for (int i = 0; i < request.Items.Count; i++)
        {
            if (!existingById.ContainsKey(request.Items[i].Id))
                notFoundFailures.Add(new ValidationFailure($"[{i}].Id", "Ürün bulunamadı."));
        }

        if (notFoundFailures.Count > 0)
            return Result<BulkUpdateItemsResponse>.Failure(
                new Error(ErrorType.NotFound, "BulkUpdateItem.NotFound",
                    "Bir veya daha fazla ürün bulunamadı.", notFoundFailures));

        // DB SKU conflict: find SKUs claimed by items outside this batch
        var targetSkus = request.Items
            .Where(x => !batchDuplicateSkus.Contains(x.SKU))
            .Select(x => x.SKU)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (targetSkus.Count > 0)
        {
            var itemsWithThoseSkus = await _itemRepository.GetBySkusAsync(targetSkus, companyId, cancellationToken);
            var batchIdSet = new HashSet<Guid>(allIds);
            var conflictSkus = new HashSet<string>(
                itemsWithThoseSkus.Where(x => !batchIdSet.Contains(x.Id)).Select(x => x.SKU),
                StringComparer.OrdinalIgnoreCase);

            if (conflictSkus.Count > 0)
            {
                var conflictFailures = new List<ValidationFailure>();
                for (int i = 0; i < request.Items.Count; i++)
                    if (conflictSkus.Contains(request.Items[i].SKU))
                        conflictFailures.Add(new ValidationFailure($"[{i}].SKU", "Bu SKU başka bir üründe zaten kullanılıyor."));

                return Result<BulkUpdateItemsResponse>.Failure(
                    new Error(ErrorType.Conflict, "BulkUpdateItem.SkuConflict",
                        "Bir veya daha fazla SKU başka bir üründe zaten kullanılıyor.", conflictFailures));
            }
        }

        // Apply all updates
        foreach (var cmd in request.Items)
        {
            var item = existingById[cmd.Id];
            item.Update(
                sku: cmd.SKU,
                barcode: cmd.Barcode,
                name: cmd.Name,
                productType: cmd.ProductType,
                category: cmd.Category,
                width: cmd.Width,
                height: cmd.Height,
                length: cmd.Length,
                diameter: cmd.Diameter,
                weight: cmd.Weight,
                fragilityType: cmd.FragilityType,
                isStackable: cmd.IsStackable,
                maxStackCount: cmd.MaxStackCount,
                maxWeightOnTop: cmd.MaxWeightOnTop,
                allowedRotations: cmd.AllowedRotations,
                imageUrl: cmd.ImageUrl,
                stackGroup: cmd.StackGroup,
                specialNotes: cmd.SpecialNotes,
                constraintIds: cmd.ConstraintIds);
        }

        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<BulkUpdateItemsResponse>.Success(new BulkUpdateItemsResponse(existingById.Count));
    }
}
