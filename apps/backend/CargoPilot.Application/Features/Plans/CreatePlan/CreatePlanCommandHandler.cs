using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed class CreatePlanCommandHandler : IRequestHandler<CreatePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ICompanyRepository _companyRepository;

    public CreatePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        ICompanyRepository companyRepository)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _groupRepository = groupRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _companyRepository = companyRepository;
    }

    public async Task<Result<Guid>> Handle(CreatePlanCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var quotaError = await EnforcePlanQuotaAsync(companyId, cancellationToken);
        if (quotaError is not null)
            return Result<Guid>.Failure(quotaError);

        var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, companyId, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        if (vehicle.IsDraft)
            return Result<Guid>.Failure(
                new Error(ErrorType.BusinessRule, "Vehicle.IsDraft", "Taslak araç ile plan oluşturulamaz."));

        var requestedItemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var items = await _itemRepository.GetByIdsAsync(requestedItemIds, companyId, cancellationToken);

        var missingIds = requestedItemIds.Except(items.Select(i => i.Id)).ToList();
        if (missingIds.Count > 0)
        {
            var failures = missingIds
                .Select(id => new ValidationFailure("Items", $"Item bulunamadı: {id}"))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Items.NotFound", "Bir veya daha fazla item bulunamadı.", failures));
        }

        var itemMap = items.ToDictionary(i => i.Id);

        // Inline grup clientGroupId'leri DB'de henüz yok — sadece DB kayıtlı grup ID'lerini sorgula
        var inlineClientIds = request.Groups?
            .Select(g => g.ClientGroupId)
            .ToHashSet() ?? [];

        var requestedGroupIds = request.Items
            .Where(i => i.GroupId.HasValue && !inlineClientIds.Contains(i.GroupId.Value))
            .Select(i => i.GroupId!.Value)
            .Distinct()
            .ToList();

        Dictionary<Guid, LoadingPlanItemGroup> groupMap = [];
        if (requestedGroupIds.Count > 0)
        {
            var groups = await _groupRepository.GetByIdsAsync(requestedGroupIds, companyId, cancellationToken);
            groupMap = groups.ToDictionary(g => g.Id);

            var missingGroupIds = requestedGroupIds.Except(groupMap.Keys).ToList();
            if (missingGroupIds.Count > 0)
            {
                var failures = missingGroupIds
                    .Select(id => new ValidationFailure("Items", $"Grup bulunamadı: {id}"))
                    .ToList();
                return Result<Guid>.Failure(
                    new Error(ErrorType.NotFound, "Groups.NotFound", "Bir veya daha fazla grup bulunamadı.", failures));
            }
        }

        var inactiveGroupIds = groupMap.Values
            .Where(g => !g.IsActive)
            .Select(g => g.Id)
            .ToHashSet();

        var activeItems = request.Items
            .Where(i => !i.GroupId.HasValue || !inactiveGroupIds.Contains(i.GroupId.Value))
            .ToList();

        var inputTotalQuantity = activeItems.Sum(i => i.Quantity);

        var planId = Guid.NewGuid();

        // Inline grup tanımları varsa entity'leri oluştur ve DB kayıt izleyicisine ekle
        Dictionary<Guid, LoadingPlanItemGroup> inlineGroupMap = [];
        if (request.Groups is { Count: > 0 })
        {
            foreach (var gd in request.Groups)
            {
                var entity = new LoadingPlanItemGroup(Guid.NewGuid(), planId, gd.Name, gd.Color, gd.UnloadingOrder);
                _groupRepository.Add(entity);
                inlineGroupMap[gd.ClientGroupId] = entity;
            }
        }

        // Birleşik harita: inline önce, DB sonra (backward compat)
        var combinedGroupMap = inlineGroupMap
            .Concat(groupMap.Where(kv => !inlineGroupMap.ContainsKey(kv.Key)))
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        var optimizationInput = BuildInput(vehicle, activeItems, itemMap, combinedGroupMap, request.OptimizationCriteria, request.ClusterGroups,
            request.Sequencer, request.Seed);

        // Kontaminasyon modülü de bir optimizasyon modülüdür; bayrağı motor
        // dışında, filtrenin gerçekten çağrıldığı yerde uygulanır.
        var contamination = OptimizationModules.Resolve(optimizationInput).UseContamination
            ? ContaminationFilter.Filter(optimizationInput.Items)
            : ContaminationFilter.Skipped(optimizationInput.Items);
        var finalInput = contamination.Contaminated.Count > 0
            ? optimizationInput with { Items = contamination.Passed }
            : optimizationInput;

        OptimizationResult result;
        try
        {
            var engineResult = _optimizationEngine.Run(finalInput, cancellationToken);
            result = contamination.Contaminated.Count > 0
                ? engineResult with { UnplacedItems = [.. engineResult.UnplacedItems, .. contamination.Contaminated] }
                : engineResult;
        }
        // İstemci vazgeçtiğinde kullanıcıya "başarısız" bildirimi gönderilmez.
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            if (_currentUserService.UserId is { } failedUserId)
            {
                await _notificationService.CreateAsync(
                    userId: failedUserId,
                    companyId: companyId,
                    type: NotificationType.OptimizationFailed,
                    title: "Plan Optimizasyonu Başarısız",
                    description: $"\"{request.PlanName}\" planı oluşturulurken bir hata oluştu: {ex.Message}",
                    cancellationToken: cancellationToken);
            }
            throw;
        }

        var plan = new LoadingPlan(planId, request.PlanName, vehicle.Id, request.OptimizationCriteria, inputTotalQuantity, companyId);
        var inputItems = activeItems
            .Select(i =>
            {
                var inputItem = new LoadingPlanInputItem(Guid.NewGuid(), planId, i.ItemId, i.Quantity);
                if (i.GroupId.HasValue)
                {
                    // Inline map'te ClientGroupId olarak gelebilir; gerçek DB ID'ye çevir
                    Guid? resolvedId;
                    if (inlineGroupMap.TryGetValue(i.GroupId.Value, out var inlineGroup))
                        resolvedId = inlineGroup.Id;
                    else
                        resolvedId = groupMap.ContainsKey(i.GroupId.Value) ? i.GroupId : null;
                    inputItem.AssignGroup(resolvedId);
                }
                return inputItem;
            })
            .ToList();


        // Planin nasil uretildigi sonucun kendisi kadar onemli: determinizm
        // sozlesmesi (R-C02) ancak yerlestirici, sequencer ve tohum kayitliysa
        // kullanilabilir.
        plan.RecordOptimizationRun(
            finalInput.Sequencer,
            finalInput.Seed,
            result.SearchStats?.Iterations,
            result.SearchStats?.Evaluations,
            result.SearchStats?.SearchImproved,
            result.SearchStats?.DurationMs);

        await _planRepository.SaveWithResultAsync(plan, inputItems, result, cancellationToken);

        if (_currentUserService.UserId is { } userId)
        {
            await _notificationService.CreateAsync(
                userId: userId,
                companyId: companyId,
                type: NotificationType.OptimizationComplete,
                title: "Plan Optimizasyonu Tamamlandı",
                description: $"\"{request.PlanName}\" planı başarıyla oluşturuldu.",
                actionUrl: $"/loading-plans/{planId}",
                cancellationToken: cancellationToken);
        }

        return Result<Guid>.Success(planId);
    }

    /// <summary>
    /// Plan kotasını kullanıcının gerçek abonelik tipine göre uygular.
    /// Kota aşıldıysa hata döner, aşılmadıysa null döner.
    /// </summary>
    private async Task<Error?> EnforcePlanQuotaAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        var userType = _currentUserService.UserType;
        if (!IsQuotaEnforced(userType) || _currentUserService.UserId is not { } planUserId)
            return null;

        var subscriptionType = await ResolveSubscriptionTypeAsync(companyId, cancellationToken);
        var maxCount = SubscriptionLimits.GetMaxLoadingPlanCount(subscriptionType);

        // Bireysel kullanıcının kotası kendi planlarıyla, kurumsal kullanıcınınki
        // şirketin tüm planlarıyla ölçülür; abonelik de şirkete bağlı olduğu için
        // koltuk paylaşan çalışanlar tek kotayı tüketir (GetMySubscription ile aynı).
        var currentCount = userType == UserType.Individual || companyId is not { } quotaCompanyId
            ? await _planRepository.CountByUserAsync(planUserId, cancellationToken)
            : await _planRepository.CountByCompanyAsync(quotaCompanyId, cancellationToken);

        if (currentCount >= maxCount)
        {
            await _notificationService.CreateAsync(
                userId: planUserId,
                companyId: companyId,
                type: NotificationType.UsageLimitReached,
                title: "Plan Kotası Doldu",
                description: $"Maksimum yükleme planı sayısına ({maxCount}) ulaştınız. Daha fazla plan oluşturmak için planınızı yükseltin.",
                cancellationToken: cancellationToken);
            return new Error(ErrorType.BusinessRule, "Plan.LimitExceeded",
                "Abonelik planı kapsamındaki maksimum yükleme planı sayısına ulaşıldı.");
        }

        var warningThreshold = (int)(maxCount * 0.8);
        if (currentCount + 1 >= warningThreshold && currentCount + 1 < maxCount)
        {
            await _notificationService.CreateAsync(
                userId: planUserId,
                companyId: companyId,
                type: NotificationType.UsageLimitWarning,
                title: "Plan Kotası Dolmak Üzere",
                description: $"Yükleme planı kotanızın %80'ine ulaştınız ({currentCount + 1}/{maxCount}). Kota dolmadan önce planınızı yükseltmeyi düşünün.",
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

    private static OptimizationInput BuildInput(
        Vehicle vehicle,
        IReadOnlyList<CreatePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap,
        Dictionary<Guid, LoadingPlanItemGroup> groupMap,
        LoadingPlanOptimizationCriteria criteria,
        bool clusterGroups,
        SequencerKind? sequencer,
        int seed)
    {
        var inputs = requestItems
            .Select(r =>
            {
                var item = itemMap[r.ItemId];
                var group = r.GroupId.HasValue && groupMap.TryGetValue(r.GroupId.Value, out var g) ? g : null;
                return new OptimizationItemInput(
                    item.Id, item.SKU, item.Name,
                    item.Width, item.Height, item.Length, item.Weight,
                    item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop,
                    item.AllowedRotations, r.Quantity,
                    group?.Id, group?.UnloadingOrder,
                    item.StackGroup, item.GetIncompatibleGroups(),
                    item.FragilityType);
            })
            .ToList();

        return new OptimizationInput(
            vehicle.InternalWidth.GetValueOrDefault(),
            vehicle.InternalHeight.GetValueOrDefault(),
            vehicle.InternalLength.GetValueOrDefault(),
            vehicle.MaxWeightCapacity.GetValueOrDefault(),
            inputs, criteria, vehicle.LoadingType, clusterGroups,
            Modules: null,
            // Yukleme kapinin oldugu yuzden baslamaz; baslangic kosesi kapi
            // listesinden turetilir.
            FillFromMaxX: LoadingCorner.FillFromMaxX(vehicle.Doors),
            Sequencer: SequencerSelection.Resolve(sequencer),
            Seed: seed);
    }
}
