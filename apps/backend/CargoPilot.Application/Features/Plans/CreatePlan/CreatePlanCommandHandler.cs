using System.Diagnostics;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed class CreatePlanCommandHandler : IRequestHandler<CreatePlanCommand, Result<PlanDetailDto>>
{
    private static readonly Action<ILogger, Guid, Exception?> LogDbSaveFailed =
        LoggerMessage.Define<Guid>(LogLevel.Error, new EventId(1, "DbSaveFailed"),
            "Plan {PlanId} DB'ye yazılamadı");

    private static readonly Action<ILogger, int, long, Exception?> LogOptimizationTiming =
        LoggerMessage.Define<int, long>(LogLevel.Information, new EventId(2, "OptimizationTiming"),
            "Optimizasyon tamamlandı — {ItemCount} item, {ElapsedMs} ms");

    private readonly ILogger<CreatePlanCommandHandler> _logger;

    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreatePlanCommand> _validator;
    private readonly IServiceScopeFactory _scopeFactory;

    public CreatePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        IValidator<CreatePlanCommand> validator,
        IServiceScopeFactory scopeFactory,
        ILogger<CreatePlanCommandHandler> logger)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _validator = validator;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<Result<PlanDetailDto>> Handle(CreatePlanCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PlanDetailDto>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, companyId, cancellationToken);
        if (vehicle is null)
            return Result<PlanDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        var requestedItemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var items = await _itemRepository.GetByIdsAsync(requestedItemIds, companyId, cancellationToken);

        var missingIds = requestedItemIds.Except(items.Select(i => i.Id)).ToList();
        if (missingIds.Count > 0)
        {
            var failures = missingIds
                .Select(id => new ValidationFailure("Items", $"Item bulunamadı: {id}"))
                .ToList();
            return Result<PlanDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Items.NotFound", "Bir veya daha fazla item bulunamadı.", failures));
        }

        var itemMap = items.ToDictionary(i => i.Id);

        var optimizationInput = BuildInput(vehicle, request.Items, itemMap);
        var sw = Stopwatch.StartNew();
        var result = _optimizationEngine.Run(optimizationInput);
        sw.Stop();
        LogOptimizationTiming(_logger, optimizationInput.Items.Sum(i => i.Quantity), sw.ElapsedMilliseconds, null);

        var planId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var inputTotalQuantity = request.Items.Sum(i => i.Quantity);

        // Response DTO'yu DB okumadan direkt inşa et
        var detail = BuildDetailDto(planId, request, vehicle, request.Items, itemMap, result, now, inputTotalQuantity);

        // DB kayıt — arka planda, response'u bekletmez
        var plan = new LoadingPlan(planId, request.PlanName, vehicle.Id, request.OptimizationCriteria, inputTotalQuantity, companyId);
        var inputItems = request.Items
            .Select(i => new LoadingPlanInputItem(Guid.NewGuid(), planId, i.ItemId, i.Quantity))
            .ToList();

        _ = Task.Run(async () =>
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var repo = scope.ServiceProvider.GetRequiredService<ILoadingPlanRepository>();
                await repo.SaveWithResultAsync(plan, inputItems, result, CancellationToken.None);
            }
            catch (Exception ex)
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<CreatePlanCommandHandler>>();
                LogDbSaveFailed(logger, plan.Id, ex);
            }
        });

        return Result<PlanDetailDto>.Success(detail);
    }

    private static OptimizationInput BuildInput(
        Vehicle vehicle,
        IReadOnlyList<CreatePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap)
    {
        var inputs = requestItems
            .Select(r =>
            {
                var item = itemMap[r.ItemId];
                return new OptimizationItemInput(
                    item.Id, item.SKU, item.Name, item.ImageUrl,
                    item.Width, item.Height, item.Length, item.Weight,
                    item.IsStackable, item.AllowedRotations, r.Quantity);
            })
            .ToList();

        return new OptimizationInput(
            vehicle.InternalWidth, vehicle.InternalHeight,
            vehicle.InternalLength, vehicle.MaxWeightCapacity,
            inputs);
    }

    private static PlanDetailDto BuildDetailDto(
        Guid planId,
        CreatePlanCommand request,
        Vehicle vehicle,
        IReadOnlyList<CreatePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap,
        OptimizationResult result,
        DateTime createdAt,
        int inputTotalQuantity)
    {
        var vehicleDto = new VehicleInPlanDto(
            vehicle.Id, vehicle.VehicleName, vehicle.PlateNumber, vehicle.VehicleType,
            vehicle.InternalWidth, vehicle.InternalHeight, vehicle.InternalLength,
            vehicle.MaxWeightCapacity);

        var placements = result.Placements
            .Select(p =>
            {
                var item = itemMap[p.ItemId];
                return new PlacementDto(
                    p.PlacementId, p.ItemId, p.X, p.Y, p.Z, p.Rotation,
                    new ItemInPlanDto(item.Id, item.SKU, item.Name, item.Width, item.Height, item.Length, item.Weight, item.ImageUrl));
            })
            .ToList();

        var unplacedItems = result.UnplacedItems
            .Select(u =>
            {
                var item = itemMap[u.ItemId];
                return new UnplacedItemDto(
                    Guid.NewGuid(), u.ItemId, u.Quantity, u.Reason,
                    new ItemInPlanDto(item.Id, item.SKU, item.Name, item.Width, item.Height, item.Length, item.Weight, item.ImageUrl));
            })
            .ToList();

        var inputItemDtos = requestItems
            .Select(r =>
            {
                var item = itemMap[r.ItemId];
                return new InputItemDto(
                    Guid.NewGuid(), r.ItemId, r.Quantity,
                    new ItemInPlanDto(item.Id, item.SKU, item.Name, item.Width, item.Height, item.Length, item.Weight, item.ImageUrl));
            })
            .ToList();

        return new PlanDetailDto(
            planId,
            request.PlanName,
            LoadingPlanOptimizationStatus.Calculated,
            request.OptimizationCriteria,
            null, null,
            result.TotalWeight,
            result.FillRate,
            inputTotalQuantity,
            result.Placements.Count,
            result.UnplacedItems.Sum(u => u.Quantity),
            result.CenterOfGravityX,
            result.CenterOfGravityY,
            result.CenterOfGravityZ,
            result.WeightBalanceOffsetX,
            result.WeightBalanceOffsetZ,
            createdAt,
            vehicleDto,
            placements,
            unplacedItems,
            [],
            inputItemDtos);
    }
}
