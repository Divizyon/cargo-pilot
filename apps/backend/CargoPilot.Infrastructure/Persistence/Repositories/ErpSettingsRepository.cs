using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class ErpSettingsRepository : IErpSettingsRepository
{
    private readonly AppDbContext _context;

    public ErpSettingsRepository(AppDbContext context) => _context = context;

    public Task<ErpSettings?> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _context.ErpSettings.FirstOrDefaultAsync(e => e.CompanyId == companyId, cancellationToken);

    public void Add(ErpSettings settings) => _context.ErpSettings.Add(settings);

    public void Remove(ErpSettings settings) => _context.ErpSettings.Remove(settings);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);
}
