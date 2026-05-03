using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed record SearchVehiclesQuery(
    string? SearchTerm,
    VehicleType? VehicleType,
    bool? IsActive,
    int Page = 1,
    int PageSize = 20,
    bool IsExport = false) : IRequest<Result<PagedResult<VehicleSummaryDto>>>;
