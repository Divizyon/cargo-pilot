using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IVehicleRepository {
    Task<PagedResult<Vehicle>> SearchAsync(
        string? searchTerm,
        VehicleType? vehicleType,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}
