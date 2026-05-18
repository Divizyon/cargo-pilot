using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed class ReOptimizePlanCommandHandler : IRequestHandler<ReOptimizePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<ReOptimizePlanCommand> _validator;

    public ReOptimizePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        IValidator<ReOptimizePlanCommand> validator)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(ReOptimizePlanCommand request, CancellationToken cancellationToken)
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

        var plan = await _planRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        var distinctVehicleIds = request.VehicleIds.Distinct().ToList();
        var vehicles = await _vehicleRepository.GetByIdsAsync(distinctVehicleIds, companyId, cancellationToken);

        var missingVehicleIds = distinctVehicleIds.Except(vehicles.Select(v => v.Id)).ToList();
        if (missingVehicleIds.Count > 0)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Bir veya daha fazla araç bulunamadı."));

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

        var vehicleMap = vehicles.ToDictionary(v => v.Id);
        var sortedVehicles = distinctVehicleIds
            .Select((id, index) => (Vehicle: vehicleMap[id], SortOrder: index))
            .ToList();

        var (vehiclePlacements, finalUnplaced, aggregateStats) =
            RunWaterfallOptimization(sortedVehicles, request.Items, itemMap, request.OptimizationCriteria);

        plan.Reoptimize(request.OptimizationCriteria, inputTotalQuantity);
        plan.ApplyOptimizationResult(
            LoadingPlanOptimizationStatus.Calculated,
            aggregateStats.TotalWeight,
            aggregateStats.FillRate,
            aggregateStats.PlacedCount,
            finalUnplaced.Sum(u => u.Quantity),
            aggregateStats.CogX,
            aggregateStats.CogY,
            aggregateStats.CogZ);

        var newPlanVehicles = sortedVehicles
            .Select(sv => new LoadingPlanVehicle(plan.Id, sv.Vehicle.Id, sv.SortOrder))
            .ToList();

        var newInputItems = request.Items
            .Select(i => new LoadingPlanInputItem(Guid.NewGuid(), plan.Id, i.ItemId, i.Quantity))
            .ToList();

        await _planRepository.ReOptimizeWithResultAsync(plan, newPlanVehicles, newInputItems, vehiclePlacements, finalUnplaced, cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }

    private (
        IReadOnlyList<(Guid VehicleId, IReadOnlyList<PlacedItemResult> Placements)> VehiclePlacements,
        IReadOnlyList<UnplacedItemResult> FinalUnplaced,
        (decimal TotalWeight, decimal FillRate, int PlacedCount, decimal? CogX, decimal? CogY, decimal? CogZ) Stats)
    RunWaterfallOptimization(
        List<(Vehicle Vehicle, int SortOrder)> sortedVehicles,
        IReadOnlyList<ReOptimizePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap,
        LoadingPlanOptimizationCriteria criteria)
    {
        var vehiclePlacements = new List<(Guid VehicleId, IReadOnlyList<PlacedItemResult> Placements)>();
        var currentItems = BuildOptimizationItems(requestItems, itemMap);

        decimal totalWeight = 0;
        decimal totalVehicleVolume = 0;
        decimal totalPlacedVolume = 0;
        int totalPlacedCount = 0;
        decimal? primaryCogX = null, primaryCogY = null, primaryCogZ = null;
        bool isFirst = true;

        IReadOnlyList<UnplacedItemResult> lastUnplaced = [];

        foreach (var (vehicle, _) in sortedVehicles)
        {
            if (currentItems.Count == 0) break;

            var input = new OptimizationInput(
                vehicle.InternalWidth, vehicle.InternalHeight,
                vehicle.InternalLength, vehicle.MaxWeightCapacity,
                currentItems, criteria);

            var result = _optimizationEngine.Run(input);

            vehiclePlacements.Add((vehicle.Id, result.Placements));
            totalWeight += result.TotalWeight;
            totalPlacedCount += result.Placements.Count;

            var vehicleVolume = vehicle.InternalWidth * vehicle.InternalHeight * vehicle.InternalLength;
            totalVehicleVolume += vehicleVolume;
            totalPlacedVolume += vehicleVolume * result.FillRate / 100m;

            if (isFirst)
            {
                // CoG yalnızca birincil araçtan alınır; çoklu araç senaryosunda yaklaşık değerdir.
                primaryCogX = result.CenterOfGravityX;
                primaryCogY = result.CenterOfGravityY;
                primaryCogZ = result.CenterOfGravityZ;
                isFirst = false;
            }

            lastUnplaced = result.UnplacedItems;
            currentItems = RebuildItemsFromUnplaced(result.UnplacedItems, itemMap);
        }

        var aggregateFillRate = totalVehicleVolume > 0
            ? Math.Round(totalPlacedVolume / totalVehicleVolume * 100m, 4)
            : 0m;

        return (vehiclePlacements, lastUnplaced,
            (totalWeight, aggregateFillRate, totalPlacedCount, primaryCogX, primaryCogY, primaryCogZ));
    }

    private static List<OptimizationItemInput> BuildOptimizationItems(
        IReadOnlyList<ReOptimizePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap)
    {
        return requestItems
            .Select(r =>
            {
                var item = itemMap[r.ItemId];
                return new OptimizationItemInput(
                    item.Id, item.SKU, item.Name, item.ImageUrl,
                    item.Width, item.Height, item.Length, item.Weight,
                    item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop,
                    item.AllowedRotations, r.Quantity,
                    StackGroup: item.StackGroup);
            })
            .ToList();
    }

    private static List<OptimizationItemInput> RebuildItemsFromUnplaced(
        IReadOnlyList<UnplacedItemResult> unplacedItems,
        Dictionary<Guid, Item> itemMap)
    {
        return unplacedItems
            .Where(u => u.Quantity > 0)
            .Select(u =>
            {
                var item = itemMap[u.ItemId];
                return new OptimizationItemInput(
                    item.Id, item.SKU, item.Name, item.ImageUrl,
                    item.Width, item.Height, item.Length, item.Weight,
                    item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop,
                    item.AllowedRotations, u.Quantity,
                    StackGroup: item.StackGroup);
            })
            .ToList();
    }
}
