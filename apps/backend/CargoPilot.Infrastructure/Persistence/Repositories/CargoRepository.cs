using CargoPilot.Application.Abstractions.Persistence;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

public class CargoRepository : ICargoRepository
{
    private readonly AppDbContext _dbContext;

    public CargoRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        await _dbContext.Cargos.AddAsync(cargo, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Cargo?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Cargos
            .AsNoTracking()
            .FirstOrDefaultAsync(cargo => cargo.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Cargo>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Cargos
            .AsNoTracking()
            .OrderByDescending(cargo => cargo.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task UpdateAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        _dbContext.Cargos.Update(cargo);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
