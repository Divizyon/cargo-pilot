using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetVehicleSuggestions;

public sealed record GetVehicleSuggestionsQuery(IReadOnlyList<SuggestionItemRequest> Items)
    : IRequest<Result<IReadOnlyList<VehicleSuggestionDto>>>;
