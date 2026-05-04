using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IUserVehicleFavoriteRepository {
    Task<UserVehicleFavorite?> GetByUserAndVehicleAsync(Guid userId, Guid vehicleId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetFavoriteVehicleIdsAsync(Guid userId, CancellationToken cancellationToken = default);
    void Add(UserVehicleFavorite favorite);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
