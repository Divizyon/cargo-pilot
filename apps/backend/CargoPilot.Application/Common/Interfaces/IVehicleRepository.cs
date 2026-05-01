using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Interfaces;

public interface IVehicleRepository
{
    Task<Vehicle?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResult<Vehicle>> SearchAsync(
        string? searchTerm,
        VehicleType? vehicleType,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}