using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

internal static class ExtremePointManager
{
    private const int MaxEpCount = 30;

    // §4.2 — 3 yeni EP üret
    internal static IEnumerable<ExtremePoint> GenerateNew(ExtremePoint ep, Rotation rot)
    {
        yield return new ExtremePoint(ep.X + rot.L, ep.Y, ep.Z);
        yield return new ExtremePoint(ep.X, ep.Y + rot.W, ep.Z);
        yield return new ExtremePoint(ep.X, ep.Y, ep.Z + rot.H);
    }

    // §4.3 — Dominance filtresi: eps[j] orijine daha yakınsa (tüm eksenlerde ≤) eps[i] gereksizdir.
    // Kural: eps[j].X ≤ eps[i].X && eps[j].Y ≤ eps[i].Y && eps[j].Z ≤ eps[i].Z ise eps[i] kaldırılır.
    // (Önceki hata: >= idi, bu orijine yakın erişilebilir EP'leri yanlışlıkla kaldırıyordu.)
    internal static List<ExtremePoint> ApplyDominanceFilter(List<ExtremePoint> eps)
    {
        var result = new List<ExtremePoint>(eps.Count);
        for (int i = 0; i < eps.Count; i++)
        {
            bool dominated = false;
            for (int j = 0; j < eps.Count; j++)
            {
                if (i == j) continue;
                if (eps[j].X <= eps[i].X && eps[j].Y <= eps[i].Y && eps[j].Z <= eps[i].Z)
                {
                    dominated = true;
                    break;
                }
            }
            if (!dominated)
                result.Add(eps[i]);
        }
        return result;
    }

    // EP listesi 30'u geçerse en yüksek koordinat toplamına sahip EP'leri temizle
    internal static List<ExtremePoint> Prune(List<ExtremePoint> eps)
    {
        if (eps.Count <= MaxEpCount)
            return eps;

        return eps
            .OrderBy(ep => (double)ep.X + (double)ep.Y + (double)ep.Z)
            .Take(MaxEpCount)
            .ToList();
    }
}
