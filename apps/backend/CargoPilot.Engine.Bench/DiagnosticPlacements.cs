using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Plan ciktisini motorun ic tipine cevirir, boylece teshisler motorun kendi
/// yuklemlerini (<see cref="PlacementValidator"/>) cagirabilir.
///
/// Tek yerde durur: iki teshis ayni cevrimi ayri ayri yazsaydi biri
/// guncellenip digeri unutuldugunda iki teshis ayni plani farkli okurdu.
/// </summary>
internal static class DiagnosticPlacements
{
    internal static List<PlacedBox> From(OptimizationInput input, OptimizationResult result)
    {
        var itemsById = input.Items.ToDictionary(i => i.ItemId);

        return
        [
            .. result.Placements
                .Where(p => itemsById.ContainsKey(p.ItemId))
                .Select(p =>
                {
                    var item = itemsById[p.ItemId];

                    return new PlacedBox(
                        p.ItemId, p.X, p.Y, p.Z, p.Width, p.Height, p.Length, p.Rotation, p.Weight,
                        item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop, item.FragilityType, item.UnloadingOrder);
                }),
        ];
    }
}
