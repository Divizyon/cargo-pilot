namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record UnplacedItemDto(
    string ItemId,
    string ItemName,
    string Reason);
