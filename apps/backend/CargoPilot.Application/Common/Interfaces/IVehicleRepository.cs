using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IVehicleRepository {
    Task<PagedResult<Vehicle>> SearchAsync(
        string? searchTerm,
        VehicleType? vehicleType,
        bool? isActive,
        bool? onlyFavorites,
        IReadOnlyList<Guid>? favoriteIds,
        int page,
        int pageSize,
        Guid? companyId,
        CancellationToken cancellationToken = default);

    Task<Vehicle?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);

    Task<bool> ExistsByPlateNumberAsync(string plateNumber, Guid? companyId, CancellationToken cancellationToken = default);

    Task<bool> ExistsByPlateNumberAsync(string plateNumber, Guid? companyId, Guid excludeId, CancellationToken cancellationToken = default);

    Task<bool> IsUsedInActiveLoadingPlanAsync(Guid vehicleId, CancellationToken cancellationToken = default);

    void Add(Vehicle vehicle);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
