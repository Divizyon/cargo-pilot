using System.Collections.Concurrent;
using CargoPilot.Application.Abstractions.Persistence;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

public class InMemoryCargoRepository : ICargoRepository
{
    private readonly ConcurrentDictionary<Guid, Cargo> _storage = new();

    public Task AddAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        _storage[cargo.Id] = cargo;
        return Task.CompletedTask;
    }

    public Task<Cargo?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _storage.TryGetValue(id, out var cargo);
        return Task.FromResult<Cargo?>(cargo);
    }

    public Task<IReadOnlyList<Cargo>> ListAsync(CancellationToken cancellationToken = default)
    {
        var list = _storage.Values
            .OrderByDescending(c => c.Id)
            .ToList();

        return Task.FromResult<IReadOnlyList<Cargo>>(list);
    }

    public Task UpdateAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        _storage.AddOrUpdate(cargo.Id, cargo, (_, _) => cargo);
        return Task.CompletedTask;
    }
}

