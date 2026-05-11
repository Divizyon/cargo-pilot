using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class PendingVehicleMappingRepository : IPendingVehicleMappingRepository
{
    private readonly AppDbContext _context;

    public PendingVehicleMappingRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<PendingVehicleMapping>> GetByIntegrationIdAsync(
        Guid integrationId,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        return await _context.PendingVehicleMappings
            .AsNoTracking()
            .Where(x => x.IntegrationId == integrationId && x.CompanyId == companyId)
            .ToListAsync(cancellationToken);
    }

    public async Task<PendingVehicleMapping?> GetByIdAsync(
        Guid id,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        return await _context.PendingVehicleMappings
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);
    }

    public void Add(PendingVehicleMapping mapping)
    {
        _context.PendingVehicleMappings.Add(mapping);
    }

    public void Remove(PendingVehicleMapping mapping)
    {
        mapping.MarkAsDeleted();
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}