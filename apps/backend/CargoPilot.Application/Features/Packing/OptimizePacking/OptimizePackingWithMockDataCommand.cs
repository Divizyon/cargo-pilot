using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Packing.DTOs;
using CargoPilot.Domain.Packing;
using MediatR;

namespace CargoPilot.Application.Features.Packing.OptimizePacking;

public sealed record OptimizePackingWithMockDataCommand(
    bool LifoEnabled = false,
    decimal CgThresholdPercent = 15m
) : IRequest<Result<PackingResultDto>>;

public sealed class OptimizePackingWithMockDataCommandHandler
    : IRequestHandler<OptimizePackingWithMockDataCommand, Result<PackingResultDto>>
{
    private readonly IPackingEngine _packingEngine;
    private readonly IPackingMockDataProvider _mockDataProvider;

    public OptimizePackingWithMockDataCommandHandler(
        IPackingEngine packingEngine,
        IPackingMockDataProvider mockDataProvider)
    {
        _packingEngine = packingEngine;
        _mockDataProvider = mockDataProvider;
    }

    public Task<Result<PackingResultDto>> Handle(
        OptimizePackingWithMockDataCommand request,
        CancellationToken cancellationToken)
    {
        var container = _mockDataProvider.GetContainer();
        var items = _mockDataProvider.GetItems();
        var parameters = _mockDataProvider.GetParameters(request.LifoEnabled, request.CgThresholdPercent);

        var domainResult = _packingEngine.Optimize(container, items, parameters);

        var dto = new PackingResultDto(
            Placements: domainResult.Placements.Select(p => new PlacementDto(
                p.ItemId,
                p.ItemName,
                p.X,
                p.Y,
                p.Z,
                new RotationDto(p.Rotation.L, p.Rotation.W, p.Rotation.H)
            )).ToList(),
            CgFinal: new CgFinalDto(
                domainResult.CgFinalX,
                domainResult.CgFinalY,
                domainResult.CgFinalZ,
                Math.Round(domainResult.CgDeviationX, 2),
                Math.Round(domainResult.CgDeviationY, 2)),
            TotalWeight: domainResult.TotalWeight,
            FillRatePercent: domainResult.FillRatePercent,
            PlacedCount: domainResult.Placements.Count,
            UnplacedCount: domainResult.UnplacedItems.Count,
            Warnings: domainResult.Warnings.Select(w => new PackingWarningDto(
                w.ItemId, Math.Round(w.DeltaX, 2), Math.Round(w.DeltaY, 2), w.Message)).ToList(),
            UnplacedItems: domainResult.UnplacedItems.Select(u => new UnplacedItemDto(
                u.ItemId, u.ItemName, u.Reason)).ToList(),
            ElapsedMilliseconds: domainResult.ElapsedMilliseconds);

        return Task.FromResult(Result<PackingResultDto>.Success(dto));
    }
}
