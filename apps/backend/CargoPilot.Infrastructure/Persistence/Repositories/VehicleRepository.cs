using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class VehicleRepository : IVehicleRepository {
    private readonly AppDbContext _context;

    public VehicleRepository(AppDbContext context) {
        _context = context;
    }

    public async Task<PagedResult<Vehicle>> SearchAsync(
        string? searchTerm,
        VehicleType? vehicleType,
        bool? isActive,
        bool? onlyFavorites,
        IReadOnlyList<Guid>? favoriteIds,
        int page,
        int pageSize,
        Guid? companyId,
        CancellationToken cancellationToken = default) {
        var query = _context.Vehicles.AsNoTracking()
            .Where(v => v.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(searchTerm)) {
            var term = searchTerm.Trim();
            query = query.Where(v =>
                v.VehicleName.Contains(term) ||
                v.PlateNumber.Contains(term));
        }

        if (vehicleType.HasValue) {
            query = query.Where(v => v.VehicleType == vehicleType.Value);
        }

        query = query.Where(v => v.IsActive == (isActive ?? true));

        if (onlyFavorites == true && favoriteIds is not null) {
            query = query.Where(v => favoriteIds.Contains(v.Id));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        IOrderedQueryable<Vehicle> orderedQuery = favoriteIds is { Count: > 0 }
            ? query
                .OrderByDescending(v => favoriteIds.Contains(v.Id))
                .ThenBy(v => v.VehicleName)
            : query.OrderBy(v => v.VehicleName);

        var items = await orderedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Vehicle>(items, totalCount, page, pageSize);
    }

    public async Task<Vehicle?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default) {
        return await _context.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId, cancellationToken);
    }

    public async Task<bool> ExistsByPlateNumberAsync(string? plateNumber, Guid? companyId, CancellationToken cancellationToken = default) {
        return await _context.Vehicles
            .AnyAsync(v => v.PlateNumber == plateNumber && v.CompanyId == companyId, cancellationToken);
    }

    public async Task<bool> ExistsByPlateNumberAsync(string? plateNumber, Guid? companyId, Guid excludeId, CancellationToken cancellationToken = default) {
        return await _context.Vehicles
            .AnyAsync(v => v.PlateNumber == plateNumber && v.CompanyId == companyId && v.Id != excludeId, cancellationToken);
    }

    public async Task<bool> IsUsedInActiveLoadingPlanAsync(Guid vehicleId, CancellationToken cancellationToken = default) {
        return await _context.LoadingPlans
            .AnyAsync(p => p.VehicleId == vehicleId && p.OptimizationStatus == LoadingPlanOptimizationStatus.Draft, cancellationToken);
    }

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => _context.Vehicles.CountAsync(v => v.CreatedBy == userId, cancellationToken);

    public Task<int> CountByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _context.Vehicles.CountAsync(v => v.CompanyId == companyId, cancellationToken);

    public void Add(Vehicle vehicle) {
        _context.Vehicles.Add(vehicle);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
