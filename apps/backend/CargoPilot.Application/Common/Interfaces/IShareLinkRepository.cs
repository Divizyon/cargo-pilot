using CargoPilot.Application.Features.Shares.CreateShareLink;
using CargoPilot.Application.Features.Shares.GetSharePlanByToken;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IShareLinkRepository
{
    Task<ShareLink?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<SharePlanDto?> GetSharePlanByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<ShareLinkDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Şirketin planlarına ait paylaşım bağlantılarını en yeniden eskiye döndürür.</summary>
    Task<IReadOnlyList<ShareLinkDto>> ListByCompanyAsync(Guid? companyId, CancellationToken cancellationToken = default);

    /// <summary>Bağlantıyı yalnızca şirketin planına aitse döndürür; aksi halde null.</summary>
    Task<ShareLink?> GetOwnedByCompanyAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);

    void Add(ShareLink shareLink);
    void Remove(ShareLink shareLink);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
