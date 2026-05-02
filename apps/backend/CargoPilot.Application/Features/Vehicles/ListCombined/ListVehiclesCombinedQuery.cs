using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.ListCombined;

public sealed record ListVehiclesCombinedQuery(
    string? SearchTerm,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<VehicleCombinedItemDto>>>;
