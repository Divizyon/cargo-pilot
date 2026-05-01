using CargoPilot.Application.Common.Interfaces;
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

    public Task<Vehicle?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return _dbContext.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
    }
}