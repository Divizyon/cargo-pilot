namespace CargoPilot.Application.Features.Shares.CreateShareLink;

public sealed record ShareLinkDto(
    Guid Id,
    Guid PlanId,
    string PlanName,
    string Token,
    string Validity,
    DateTime? ExpiresAt,
    DateTime CreatedAt,
    bool IsExpired,
    int ViewCount);
