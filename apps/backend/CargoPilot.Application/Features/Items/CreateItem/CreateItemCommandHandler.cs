using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Items;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Items.CreateItem;

public sealed class CreateItemCommandHandler : IRequestHandler<CreateItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ICompanyRepository _companyRepository;

    public CreateItemCommandHandler(
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        ICompanyRepository companyRepository)
    {
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _companyRepository = companyRepository;
    }

    public async Task<Result<Guid>> Handle(
        CreateItemCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var quotaError = await EnforceItemQuotaAsync(companyId, cancellationToken);
        if (quotaError is not null)
            return Result<Guid>.Failure(quotaError);

        var skuExists = await _itemRepository.ExistsBySkuAsync(request.SKU, companyId, cancellationToken);
        if (skuExists)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Item.SkuAlreadyExists", "Bu SKU zaten kullanımda."));
        }

        var item = ItemFactory.Create(request.SKU, request.Name, request, companyId);

        _itemRepository.Add(item);
        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }

    /// <summary>
    /// Ürün kotasını kullanıcının gerçek abonelik tipine göre uygular.
    /// Kota aşıldıysa hata döner, aşılmadıysa null döner.
    /// </summary>
    private async Task<Error?> EnforceItemQuotaAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        var userType = _currentUserService.UserType;
        if (!IsQuotaEnforced(userType) || _currentUserService.UserId is not { } userId)
            return null;

        var subscriptionType = await ResolveSubscriptionTypeAsync(companyId, cancellationToken);
        var maxCount = SubscriptionLimits.GetMaxItemCount(subscriptionType);

        // Bireysel kullanıcının kotası kendi ürünleriyle, kurumsal kullanıcınınki
        // şirketin tüm ürünleriyle ölçülür (GetMySubscription ile aynı).
        var currentCount = userType == UserType.Individual || companyId is not { } quotaCompanyId
            ? await _itemRepository.CountByUserAsync(userId, cancellationToken)
            : await _itemRepository.CountByCompanyAsync(quotaCompanyId, cancellationToken);

        if (currentCount >= maxCount)
        {
            await _notificationService.CreateAsync(
                userId: userId,
                companyId: companyId,
                type: NotificationType.UsageLimitReached,
                title: "Ürün Kotası Doldu",
                description: $"Maksimum ürün sayısına ({maxCount}) ulaştınız. Daha fazla ürün eklemek için planınızı yükseltin.",
                cancellationToken: cancellationToken);
            return new Error(ErrorType.BusinessRule, "Item.LimitExceeded",
                "Abonelik planı kapsamındaki maksimum ürün sayısına ulaşıldı.");
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

        return null;
    }

    /// <summary>SuperAdmin platform rolüdür; müşteri kotasına tabi değildir.</summary>
    private static bool IsQuotaEnforced(UserType? userType) =>
        userType is UserType.Individual or UserType.CompanyAdmin or UserType.CompanyWorker;

    /// <summary>Abonelik tipi şirket kaydında tutulur; kayıt yoksa güvenli varsayılan Free'dir.</summary>
    private async Task<SubscriptionType> ResolveSubscriptionTypeAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        if (companyId is not { } id)
            return SubscriptionType.Free;

        var company = await _companyRepository.GetByIdAsync(id, cancellationToken);
        return company?.SubscriptionType ?? SubscriptionType.Free;
    }
}
