using CargoPilot.Application.Features.Shares.CreateShareLink;
using CargoPilot.Application.Features.Shares.GetSharePlanByToken;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IShareLinkRepository
{
    Task<ShareLink?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<SharePlanDto?> GetSharePlanByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<ShareLinkDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    void Add(ShareLink shareLink);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
