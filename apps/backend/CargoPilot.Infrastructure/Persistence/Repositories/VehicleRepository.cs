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
        int page,
        int pageSize,
        CancellationToken cancellationToken = default) {
        var query = _context.Vehicles.AsNoTracking();

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

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(v => v.VehicleName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Vehicle>(items, totalCount, page, pageSize);
    }

    public async Task<Vehicle?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) {
        return await _context.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsByPlateNumberAsync(string plateNumber, Guid? companyId, CancellationToken cancellationToken = default) {
        return await _context.Vehicles
            .AnyAsync(v => v.PlateNumber == plateNumber && v.CompanyId == companyId, cancellationToken);
    }

    public async Task<bool> ExistsByPlateNumberAsync(string plateNumber, Guid? companyId, Guid excludeId, CancellationToken cancellationToken = default) {
        return await _context.Vehicles
            .AnyAsync(v => v.PlateNumber == plateNumber && v.CompanyId == companyId && v.Id != excludeId, cancellationToken);
    }

    public void Add(Vehicle vehicle) {
        _context.Vehicles.Add(vehicle);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
