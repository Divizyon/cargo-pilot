using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

public sealed class ErpSettingsRepository : IErpSettingsRepository
{
    private readonly AppDbContext _context;

    public ErpSettingsRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<ErpSettings?> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _context.ErpSettings
            .FirstOrDefaultAsync(e => e.CompanyId == companyId, cancellationToken);

    public void Add(ErpSettings erpSettings) => _context.ErpSettings.Add(erpSettings);

    public void Update(ErpSettings erpSettings) => _context.ErpSettings.Update(erpSettings);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);
}
