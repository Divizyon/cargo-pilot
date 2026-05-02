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

        if (isActive.HasValue) {
            query = query.Where(v => v.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(v => v.VehicleName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Vehicle>(items, totalCount, page, pageSize);
    }
}
