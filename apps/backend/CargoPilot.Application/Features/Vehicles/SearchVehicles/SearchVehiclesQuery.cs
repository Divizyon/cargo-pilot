using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed record SearchVehiclesQuery(
    string? SearchTerm,
    VehicleType? VehicleType,
    bool? IsActive,
    bool? OnlyFavorites = null,
    int Page = 1,
    int PageSize = 20,
    bool IsExport = false,
    bool? IsDraft = null) : IRequest<Result<PagedResult<VehicleSummaryDto>>>;
