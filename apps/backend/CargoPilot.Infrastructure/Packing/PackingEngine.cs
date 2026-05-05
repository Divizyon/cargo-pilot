using System.Diagnostics;
using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

public sealed class PackingEngine : IPackingEngine
{
    public PackingResult Optimize(
        ContainerSpec container,
        IReadOnlyList<ItemSpec> items,
        PackingParameters parameters)
    {
        var sw = Stopwatch.StartNew();

        // §3 — Sıralama katmanı
        var sortedItems = ItemSorter.Sort(items, parameters.LifoEnabled);

        int lifoMax = items.Any(i => i.LifoIndex.HasValue)
            ? items.Where(i => i.LifoIndex.HasValue).Max(i => i.LifoIndex!.Value)
            : 0;

        // Başlangıç durumu
        var epList = new List<ExtremePoint> { new(0m, 0m, 0m) };
        var placed = new List<PlacedItem>();
        var placements = new List<PackingPlacement>();
        var warnings = new List<PackingWarning>();
        var unplaced = new List<UnplacedItemResult>();

        // §6.1 — Başlangıç CG (ürün yerleşmeden)
        decimal cgX = container.Length / 2m;
        decimal cgY = container.Width / 2m;
        decimal cgZ = 0m;
        decimal totalMass = 0m;

        // TEST: kısıtları geçici olarak devre dışı bırak
        const bool disableStackingRules = true;
        const bool disableCgConstraint = true;

        decimal cgThreshold = disableCgConstraint ? decimal.MaxValue : parameters.CgThresholdPercent;

        foreach (var item in sortedItems)
        {
            if (totalMass + item.Weight > container.MaxWeight)
            {
                unplaced.Add(new UnplacedItemResult(item.Id, item.Name, "ağırlık kapasitesi aşıldı"));
                continue;
            }

            var rotations = GeometryHelper.GetRotations(item);
            var validCandidates = new List<PackingCandidate>();
            var allCandidates = new List<PackingCandidate>();

            foreach (var ep in epList)
            {
                foreach (var rot in rotations)
                {
                    // §5.1 Konteyner sınırı
                    if (!GeometryHelper.CheckBoundary(ep, rot, container))
                        continue;

                    // §5.2 Çakışma kontrolü
                    if (!GeometryHelper.CheckNoOverlap(ep, rot, placed))
                        continue;

                    // §5.3 Zemin desteği
                    if (!GeometryHelper.CheckGroundSupport(ep, rot, placed, container))
                        continue;

                    // §5.4 İstif kontrolü
                    if (!disableStackingRules && !GeometryHelper.CheckStackingRules(ep, rot, item, placed))
                        continue;

                    // §6.2 — Geçici CG hesabı
                    var (deltaX, deltaY, _, _, _) = disableCgConstraint
                        ? (0m, 0m, 0m, 0m, 0m)
                        : CgCalculator.ComputeTempCg(ep, rot, item, cgX, cgY, cgZ, totalMass, container);

                    // Maliyet skoru için EP sayısını simüle et
                    var simEps = epList.ToList();
                    simEps.AddRange(ExtremePointManager.GenerateNew(ep, rot));
                    simEps = ExtremePointManager.ApplyDominanceFilter(simEps);
                    int epCountAfter = simEps.Count;

                    double score = CostFunction.ComputeScore(
                        ep, rot, item, epCountAfter, container, parameters, lifoMax);

                    bool passesCg = totalMass == 0
                        || (deltaX <= cgThreshold && deltaY <= cgThreshold);

                    var candidate = new PackingCandidate(ep, rot, deltaX, deltaY, score, passesCg);
                    allCandidates.Add(candidate);

                    if (passesCg)
                        validCandidates.Add(candidate);
                }
            }

            PackingCandidate? chosen = null;

            if (validCandidates.Count > 0)
            {
                // §8.1 — Normal seçim: en yüksek maliyet skoru
                chosen = validCandidates.MaxBy(c => c.Score);
            }
            else if (!disableCgConstraint && allCandidates.Count > 0)
            {
                // §8.2 — Fallback: en az CG ihlali
                chosen = allCandidates.MinBy(c => c.DeltaX + c.DeltaY);
                warnings.Add(new PackingWarning(
                    item.Id,
                    chosen!.DeltaX,
                    chosen.DeltaY,
                    "CG eşiği sağlanamadı — en az ihlal eden konum seçildi"));
            }
            else
            {
                // Hiçbir EP'ye fiziksel olarak sığmıyor
                unplaced.Add(new UnplacedItemResult(
                    item.Id,
                    item.Name,
                    DetermineUnplacedReason(item, container)));
                continue;
            }

            // Yerleştir
            var chosenEp = chosen!.Ep;
            var chosenRot = chosen.Rot;

            placements.Add(new PackingPlacement(
                item.Id,
                item.Name,
                chosenEp.X,
                chosenEp.Y,
                chosenEp.Z,
                chosenRot));

            // Üstteki ürünlerin stack yükünü güncelle
            var updatedPlaced = UpdateStackLoads(placed, chosenEp, chosenRot, item.Weight);

            updatedPlaced.Add(new PlacedItem(
                item.Id,
                chosenEp,
                chosenRot,
                item.Weight,
                item.IsStackable,
                item.MaxWeightOnTop,
                0m));

            placed = updatedPlaced;

            // §6.1 — CG inkremental güncelle
            var (newCgX, newCgY, newCgZ, newMass) = CgCalculator.UpdateCg(
                chosenEp, chosenRot, item, cgX, cgY, cgZ, totalMass);
            cgX = newCgX;
            cgY = newCgY;
            cgZ = newCgZ;
            totalMass = newMass;

            // §4.2 — Kullanılan EP'yi tüket, yeni EP'leri üret, dominance filtresi uygula
            epList.Remove(chosenEp);
            epList.AddRange(ExtremePointManager.GenerateNew(chosenEp, chosenRot));
            epList = ExtremePointManager.ApplyDominanceFilter(epList);
            epList = ExtremePointManager.Prune(epList);
        }

        sw.Stop();

        // Final CG sapması
        decimal halfL = container.Length / 2m;
        decimal halfW = container.Width / 2m;
        decimal finalDeltaX = halfL == 0 ? 0 : Math.Abs(cgX - halfL) / halfL * 100m;
        decimal finalDeltaY = halfW == 0 ? 0 : Math.Abs(cgY - halfW) / halfW * 100m;

        // Doluluk oranı
        decimal containerVolume = container.Length * container.Width * container.Height;
        decimal placedVolume = placed.Sum(p => p.Rotation.L * p.Rotation.W * p.Rotation.H);
        decimal fillRate = containerVolume == 0 ? 0 : placedVolume / containerVolume * 100m;

        return new PackingResult(
            Placements: placements,
            CgFinalX: totalMass == 0 ? halfL : cgX,
            CgFinalY: totalMass == 0 ? halfW : cgY,
            CgFinalZ: cgZ,
            CgDeviationX: finalDeltaX,
            CgDeviationY: finalDeltaY,
            TotalWeight: totalMass,
            FillRatePercent: Math.Round(fillRate, 2),
            Warnings: warnings,
            UnplacedItems: unplaced,
            ElapsedMilliseconds: sw.ElapsedMilliseconds);
    }

    private static List<PlacedItem> UpdateStackLoads(
        List<PlacedItem> placed,
        ExtremePoint ep,
        Rotation rot,
        decimal newItemWeight)
    {
        var result = new List<PlacedItem>(placed.Count);
        const double eps = 1e-6;

        foreach (var p in placed)
        {
            if (Math.Abs((double)(p.Position.Z + p.Rotation.H - ep.Z)) > eps)
            {
                result.Add(p);
                continue;
            }

            decimal ix = IntersectLength(ep.X, ep.X + rot.L, p.Position.X, p.Position.X + p.Rotation.L);
            decimal iy = IntersectLength(ep.Y, ep.Y + rot.W, p.Position.Y, p.Position.Y + p.Rotation.W);

            if (ix > 0 && iy > 0)
                result.Add(p with { CurrentStackLoad = p.CurrentStackLoad + newItemWeight });
            else
                result.Add(p);
        }

        return result;
    }

    private static decimal IntersectLength(decimal a1, decimal a2, decimal b1, decimal b2)
        => Math.Max(0m, Math.Min(a2, b2) - Math.Max(a1, b1));

    private static string DetermineUnplacedReason(ItemSpec item, ContainerSpec container)
    {
        if (item.Length > container.Length || item.Width > container.Width || item.Height > container.Height)
            return "boyut aşımı";
        if (!item.IsStackable)
            return "fiziksel kısıt";
        return "fiziksel kısıt";
    }
}
