namespace CargoPilot.Domain.Packing;

public sealed record UnplacedItemResult(
    string ItemId,
    string ItemName,
    string Reason);
