namespace CargoPilot.Domain.Entities;

/// <summary>
/// Bir sync'in satir muhasebesi: kaynakta kac satir vardi, kaci cekildi, neden bazli
/// eleme kirilimi ve mutabakat farki. <c>Unaccounted</c> isaretlidir; pozitif deger
/// kaynaktaki satirlarin bir kisminin hicbir sayaca dusmedigini gosterir.
/// </summary>
public sealed record SyncAccounting(
    int SourceTotal,
    int FetchedCount,
    string? DroppedByReasonJson,
    int Unaccounted)
{
    public static SyncAccounting None { get; } = new(0, 0, null, 0);
}
