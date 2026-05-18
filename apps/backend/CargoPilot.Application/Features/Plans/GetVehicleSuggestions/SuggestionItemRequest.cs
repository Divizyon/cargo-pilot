namespace CargoPilot.Application.Features.Plans.GetVehicleSuggestions;

public sealed record SuggestionItemRequest(Guid ItemId, int Quantity);
