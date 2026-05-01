using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class VehicleRepository : IVehicleRepository
{
    private readonly AppDbContext _dbContext;

    public VehicleRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<Vehicle>> SearchAsync(
        string? searchTerm,
        int page,
        int pageSize,
        bool isExport,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Vehicles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(v => v.VehicleName.Contains(term) || v.PlateNumber.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        IQueryable<Vehicle> ordered = query.OrderBy(v => v.VehicleName);

        List<Vehicle> vehicles;
        if (isExport)
        {
            vehicles = await ordered.ToListAsync(cancellationToken);
            return new PagedResult<Vehicle>(vehicles, totalCount, 1, totalCount == 0 ? 1 : totalCount);
        }

        vehicles = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Vehicle>(vehicles, totalCount, page, pageSize);
    }
}
