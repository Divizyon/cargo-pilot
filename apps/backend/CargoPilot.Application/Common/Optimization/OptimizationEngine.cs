using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Motorun tek giris noktasi. Govde yok, yalnizca dallanma: yerlestirme
/// <see cref="WallBuilder.WallBuilderPlacement"/>'a, sira secimi ise
/// <c>Search</c> altindaki sequencer'lara aittir.
///
/// Greedy yerlestirici KALDIRILDI (docs/algorithm/02-kararlar.md DR-39). Olcum duvar
/// orucunun gerceki yukte hem daha dolu hem statik yolda daha hizli oldugunu
/// gosterdi: BR1-BR7'de %75,23 → %80,09 (static) / %86,23 (GRASP), sure
/// ~65 ms → 2-5 ms (static). Kabul edilen bedel agirlik dengesidir; duvar
/// orucude denge optimizasyonu yok ve sapma greedy'nin ~3 kati.
/// </summary>
internal sealed class OptimizationEngine : IOptimizationEngine
{
    public OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        return input.Sequencer switch
        {
            SequencerKind.Gwca => Search.GwcaSequencer.Run(input, cancellationToken),
            SequencerKind.Ga => Search.GaSequencer.Run(input, cancellationToken),
            SequencerKind.Grasp => Search.GraspSequencer.Run(input, cancellationToken),
            SequencerKind.Beam => Search.BeamSequencer.Run(input, cancellationToken),
            _ => WallBuilder.WallBuilderPlacement.Run(input, cancellationToken),
        };
    }

    /// <summary>
    /// Artimli yerlestirme. Arama katmani CAGRILMAZ: eklenen birkac kutu icin
    /// iki saniyelik bir arama hem gereksiz hem de anlamsizdir — sabit kutular
    /// zaten oynatilamiyor, yani arama uzayi bir avuc konumdan ibaret.
    /// </summary>
    public OptimizationResult RunIncremental(
        OptimizationInput input,
        IReadOnlyList<FixedPlacement> fixedPlacements,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(fixedPlacements);

        var itemsById = input.Items.ToDictionary(i => i.ItemId);
        var boxes = new List<PlacedBox>(fixedPlacements.Count);

        foreach (var fixedPlacement in fixedPlacements)
        {
            if (!itemsById.TryGetValue(fixedPlacement.ItemId, out var item)) continue;

            var (width, height, length) = RotatedDimensions.Of(
                item.Width, item.Height, item.Length, fixedPlacement.Rotation);

            boxes.Add(new PlacedBox(
                item.ItemId,
                fixedPlacement.X, fixedPlacement.Y, fixedPlacement.Z,
                width, height, length,
                fixedPlacement.Rotation,
                item.Weight,
                item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop,
                item.FragilityType, item.UnloadingOrder));
        }

        return WallBuilder.WallBuilderPlacement.RunFrom(input, boxes, cancellationToken);
    }
}
