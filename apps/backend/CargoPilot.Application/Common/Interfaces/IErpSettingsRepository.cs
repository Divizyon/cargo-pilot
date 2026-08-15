using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IErpSettingsRepository
{
    Task<ErpSettings?> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken = default);
    void Add(ErpSettings settings);
    /// <summary>Kimlik bilgisi tasidigi icin kayit kalici olarak silinir.</summary>
    void Remove(ErpSettings settings);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
