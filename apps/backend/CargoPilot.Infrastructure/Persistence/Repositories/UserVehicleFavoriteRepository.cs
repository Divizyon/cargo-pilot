using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class UserVehicleFavoriteRepository : IUserVehicleFavoriteRepository {
    private readonly AppDbContext _context;

    public UserVehicleFavoriteRepository(AppDbContext context) {
        _context = context;
    }

    public async Task<UserVehicleFavorite?> GetByUserAndVehicleAsync(
        Guid userId,
        Guid vehicleId,
        CancellationToken cancellationToken = default) {
        return await _context.UserVehicleFavorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.VehicleId == vehicleId, cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> GetFavoriteVehicleIdsAsync(
        Guid userId,
        CancellationToken cancellationToken = default) {
        return await _context.UserVehicleFavorites
            .Where(f => f.UserId == userId)
            .Select(f => f.VehicleId)
            .ToListAsync(cancellationToken);
    }

    public void Add(UserVehicleFavorite favorite) {
        _context.UserVehicleFavorites.Add(favorite);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
