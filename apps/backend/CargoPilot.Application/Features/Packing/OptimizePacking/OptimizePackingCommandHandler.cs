using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Packing.DTOs;
using CargoPilot.Domain.Packing;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Packing.OptimizePacking;

public sealed class OptimizePackingCommandHandler
    : IRequestHandler<OptimizePackingCommand, Result<PackingResultDto>>
{
    private readonly IPackingEngine _packingEngine;
    private readonly IValidator<OptimizePackingCommand> _validator;

    public OptimizePackingCommandHandler(
        IPackingEngine packingEngine,
        IValidator<OptimizePackingCommand> validator)
    {
        _packingEngine = packingEngine;
        _validator = validator;
    }

    public async Task<Result<PackingResultDto>> Handle(
        OptimizePackingCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PackingResultDto>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        // LIFO aktif ama hiçbir ürünün lifo_index'i yok → uyarı logla, devam et
        bool lifoEnabled = request.Parameters.LifoEnabled;
        if (lifoEnabled && !request.Items.Any(i => i.LifoIndex.HasValue))
        {
            // Soft uyarı: LIFO modu açık ama ürünlerde lifo_index yok, LIFO devre dışı bırakılıyor
            lifoEnabled = false;
        }

        var container = MapContainer(request.Container);
        var items = request.Items.Select(MapItem).ToList();
        var parameters = new PackingParameters(lifoEnabled, request.Parameters.CgThresholdPercent);

        var domainResult = _packingEngine.Optimize(container, items, parameters);

        return Result<PackingResultDto>.Success(MapToDto(domainResult));
    }

    private static ContainerSpec MapContainer(ContainerSpecDto dto) =>
        new(dto.Length, dto.Width, dto.Height, dto.MaxWeight);

    private static ItemSpec MapItem(ItemSpecDto dto) =>
        new(dto.Id, dto.Name, dto.Length, dto.Width, dto.Height,
            dto.Weight, dto.IsStackable, dto.MaxWeightOnTop, dto.LifoIndex);

    private static PackingResultDto MapToDto(PackingResult result) => new(
        Placements: result.Placements.Select(p => new PlacementDto(
            p.ItemId,
            p.ItemName,
            p.X,
            p.Y,
            p.Z,
            new RotationDto(p.Rotation.L, p.Rotation.W, p.Rotation.H)
        )).ToList(),
        CgFinal: new CgFinalDto(
            result.CgFinalX,
            result.CgFinalY,
            result.CgFinalZ,
            Math.Round(result.CgDeviationX, 2),
            Math.Round(result.CgDeviationY, 2)),
        TotalWeight: result.TotalWeight,
        FillRatePercent: result.FillRatePercent,
        PlacedCount: result.Placements.Count,
        UnplacedCount: result.UnplacedItems.Count,
        Warnings: result.Warnings.Select(w => new PackingWarningDto(
            w.ItemId, Math.Round(w.DeltaX, 2), Math.Round(w.DeltaY, 2), w.Message)).ToList(),
        UnplacedItems: result.UnplacedItems.Select(u => new UnplacedItemDto(
            u.ItemId, u.ItemName, u.Reason)).ToList(),
        ElapsedMilliseconds: result.ElapsedMilliseconds);
}
