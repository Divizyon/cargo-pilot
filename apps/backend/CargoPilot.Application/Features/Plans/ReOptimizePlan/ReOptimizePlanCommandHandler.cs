using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed class ReOptimizePlanCommandHandler : IRequestHandler<ReOptimizePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;

    public ReOptimizePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        INotificationService notificationService)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _groupRepository = groupRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
    }

    public async Task<Result<Guid>> Handle(ReOptimizePlanCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var plan = await _planRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

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
        var inputTotalQuantity = request.Items.Sum(i => i.Quantity);

        // Mevcut grupları sil — her reoptimize yeni grup satırları oluşturur, eskiler silinmezse birikirdi
        await _groupRepository.DeleteByPlanIdAsync(plan.Id, cancellationToken);

        // Inline grup tanımları varsa entity'leri oluştur ve DB kayıt izleyicisine ekle
        Dictionary<Guid, LoadingPlanItemGroup> inlineGroupMap = [];
        if (request.Groups is { Count: > 0 })
        {
            foreach (var gd in request.Groups)
            {
                var entity = new LoadingPlanItemGroup(Guid.NewGuid(), plan.Id, gd.Name, gd.Color, gd.UnloadingOrder);
                _groupRepository.Add(entity);
                inlineGroupMap[gd.ClientGroupId] = entity;
            }
        }

        var optimizationInput = BuildInput(vehicle, request.Items, itemMap, inlineGroupMap, request.OptimizationCriteria, request.ClusterGroups);

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
                    description: $"Plan yeniden optimize edilirken bir hata oluştu: {ex.Message}",
                    actionUrl: $"/loading-plans/{plan.Id}",
                    cancellationToken: cancellationToken);
            }
            throw;
        }

        var newInputItems = request.Items
            .Select(i =>
            {
                var inputItem = new LoadingPlanInputItem(Guid.NewGuid(), plan.Id, i.ItemId, i.Quantity);
                if (i.GroupId.HasValue && inlineGroupMap.TryGetValue(i.GroupId.Value, out var inlineGroup))
                    inputItem.AssignGroup(inlineGroup.Id);
                return inputItem;
            })
            .ToList();

        plan.Reoptimize(request.VehicleId, request.OptimizationCriteria, inputTotalQuantity);

        await _planRepository.ReOptimizeWithResultAsync(plan, newInputItems, result, cancellationToken);

        if (_currentUserService.UserId is { } userId)
        {
            await _notificationService.CreateAsync(
                userId: userId,
                companyId: companyId,
                type: NotificationType.OptimizationComplete,
                title: "Plan Yeniden Optimize Edildi",
                description: $"Plan başarıyla yeniden optimize edildi.",
                actionUrl: $"/loading-plans/{plan.Id}",
                cancellationToken: cancellationToken);
        }

        return Result<Guid>.Success(plan.Id);
    }

    private static OptimizationInput BuildInput(
        Vehicle vehicle,
        IReadOnlyList<ReOptimizePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap,
        Dictionary<Guid, LoadingPlanItemGroup> groupMap,
        LoadingPlanOptimizationCriteria criteria,
        bool clusterGroups)
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
            FillFromMaxX: LoadingCorner.FillFromMaxX(vehicle.Doors));
    }
}
