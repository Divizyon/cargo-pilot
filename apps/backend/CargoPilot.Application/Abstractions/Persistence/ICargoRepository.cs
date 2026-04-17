using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Abstractions.Persistence;

public interface ICargoRepository
{
    Task AddAsync(Cargo cargo, CancellationToken cancellationToken = default);
    Task<Cargo?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Cargo>> ListAsync(CancellationToken cancellationToken = default);
    Task UpdateAsync(Cargo cargo, CancellationToken cancellationToken = default);
}
