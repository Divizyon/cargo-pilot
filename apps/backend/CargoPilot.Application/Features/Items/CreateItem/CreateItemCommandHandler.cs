using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Items.CreateItem;

public sealed class CreateItemCommandHandler : IRequestHandler<CreateItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;

    public CreateItemCommandHandler(
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        INotificationService notificationService)
    {
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
    }

    public async Task<Result<Guid>> Handle(
        CreateItemCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        if (_currentUserService.UserType == UserType.Individual && _currentUserService.UserId is { } userId)
        {
            var currentCount = await _itemRepository.CountByUserAsync(userId, cancellationToken);
            var maxCount = SubscriptionLimits.GetMaxItemCount(SubscriptionType.Free);
            if (currentCount >= maxCount)
            {
                await _notificationService.CreateAsync(
                    userId: userId,
                    companyId: companyId,
                    type: NotificationType.UsageLimitReached,
                    title: "Ürün Kotası Doldu",
                    description: $"Maksimum ürün sayısına ({maxCount}) ulaştınız. Daha fazla ürün eklemek için planınızı yükseltin.",
                    cancellationToken: cancellationToken);
                return Result<Guid>.Failure(
                    new Error(ErrorType.BusinessRule, "Item.LimitExceeded",
                        "Abonelik planı kapsamındaki maksimum ürün sayısına ulaşıldı."));
            }

            var warningThreshold = (int)(maxCount * 0.8);
            if (currentCount + 1 >= warningThreshold && currentCount + 1 < maxCount)
            {
                await _notificationService.CreateAsync(
                    userId: userId,
                    companyId: companyId,
                    type: NotificationType.UsageLimitWarning,
                    title: "Ürün Kotası Dolmak Üzere",
                    description: $"Ürün kotanızın %80'ine ulaştınız ({currentCount + 1}/{maxCount}). Kota dolmadan önce planınızı yükseltmeyi düşünün.",
                    cancellationToken: cancellationToken);
            }
        }

        var skuExists = await _itemRepository.ExistsBySkuAsync(request.SKU, companyId, cancellationToken);
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
            incompatibleGroups: request.IncompatibleGroups,
            specialNotes: request.SpecialNotes,
            constraintIds: request.ConstraintIds,
            companyId: companyId);

        _itemRepository.Add(item);
        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}
