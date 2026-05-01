using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed record SearchVehiclesQuery(
    string? SearchTerm,
    int Page = 1,
    int PageSize = 20,
    bool IsExport = false) : IRequest<Result<PagedResult<VehicleSummaryDto>>>;
