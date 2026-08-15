namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItems;

public sealed record ApproveDraftItemsResult(
    int Approved,
    int Skipped,
    IReadOnlyList<SkippedDraftItem> SkippedItems);

/// <summary>Toplu onayda atlanan taslak ve atlanma nedeni; UI ozeti bu listeden yazilir.</summary>
public sealed record SkippedDraftItem(Guid Id, string Sku, string Reason);
