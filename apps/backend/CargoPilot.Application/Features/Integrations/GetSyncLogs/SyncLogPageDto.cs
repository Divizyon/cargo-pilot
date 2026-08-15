namespace CargoPilot.Application.Features.Integrations.GetSyncLogs;

/// <summary>
/// Sayfali sync gecmisi zarfi. <c>FailedCount</c> entegrasyonun tamamindaki basarisiz
/// ve kismi basarisiz kayit sayisidir; sayfa boyutundan bagimsiz oldugu icin arayuzdeki
/// hata rozeti yalnizca goruntulenen sayfaya bakarak yaniltici sayi gostermez.
/// </summary>
public sealed record SyncLogPageDto(
    IReadOnlyList<SyncLogDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int FailedCount);
