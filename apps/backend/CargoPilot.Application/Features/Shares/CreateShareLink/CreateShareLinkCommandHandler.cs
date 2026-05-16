using System.Security.Cryptography;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using MediatR;

namespace CargoPilot.Application.Features.Shares.CreateShareLink;

internal sealed class CreateShareLinkCommandHandler : IRequestHandler<CreateShareLinkCommand, Result<ShareLinkDto>>
{
    private static readonly string[] ValidValidities = ["24h", "7d", "unlimited"];

    private readonly IShareLinkRepository _shareRepository;
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;

    public CreateShareLinkCommandHandler(
        IShareLinkRepository shareRepository,
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService)
    {
        _shareRepository = shareRepository;
        _planRepository = planRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ShareLinkDto>> Handle(CreateShareLinkCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
            return Result<ShareLinkDto>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        if (!ValidValidities.Contains(request.Validity))
            return Result<ShareLinkDto>.Failure(
                new Error(ErrorType.Validation, "SHARE_INVALID_VALIDITY", "Geçerlilik süresi '24h', '7d' veya 'unlimited' olmalıdır."));

        var plan = await _planRepository.GetByIdAsync(request.PlanId, _currentUserService.CompanyId, cancellationToken);
        if (plan is null)
            return Result<ShareLinkDto>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var token = Convert.ToBase64String(rawBytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

        DateTime? expiresAt = request.Validity switch
        {
            "24h" => DateTime.UtcNow.AddHours(24),
            "7d"  => DateTime.UtcNow.AddDays(7),
            _     => null
        };

        var shareLink = new ShareLink(Guid.NewGuid(), request.PlanId, userId, token, request.Validity, expiresAt);
        _shareRepository.Add(shareLink);
        await _shareRepository.SaveChangesAsync(cancellationToken);

        return Result<ShareLinkDto>.Success(new ShareLinkDto(
            shareLink.Id,
            shareLink.PlanId,
            plan.PlanName,
            shareLink.Token,
            shareLink.Validity,
            shareLink.ExpiresAt,
            shareLink.CreatedAtUtc,
            shareLink.IsExpired,
            shareLink.ViewCount));
    }
}
