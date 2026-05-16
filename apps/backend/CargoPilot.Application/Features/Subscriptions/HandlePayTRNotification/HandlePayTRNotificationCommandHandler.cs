using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Domain.Subscriptions;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.Subscriptions.HandlePayTRNotification;

internal sealed class HandlePayTRNotificationCommandHandler
    : IRequestHandler<HandlePayTRNotificationCommand, Result<bool>>
{
    private static readonly Action<ILogger, string, Exception?> LogNotificationReceived =
        LoggerMessage.Define<string>(LogLevel.Information, new EventId(3001, nameof(LogNotificationReceived)),
            "PayTR bildirimi alındı: {MerchantOid}");

    private static readonly Action<ILogger, string, Exception?> LogInvalidHash =
        LoggerMessage.Define<string>(LogLevel.Warning, new EventId(3002, nameof(LogInvalidHash)),
            "PayTR geçersiz hash: {MerchantOid}");

    private readonly IPayTRService _payTRService;
    private readonly ICompanyRepository _companyRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationService _notificationService;
    private readonly ILogger<HandlePayTRNotificationCommandHandler> _logger;

    public HandlePayTRNotificationCommandHandler(
        IPayTRService payTRService,
        ICompanyRepository companyRepository,
        IUserRepository userRepository,
        INotificationService notificationService,
        ILogger<HandlePayTRNotificationCommandHandler> logger)
    {
        _payTRService = payTRService;
        _companyRepository = companyRepository;
        _userRepository = userRepository;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        HandlePayTRNotificationCommand request,
        CancellationToken cancellationToken)
    {
        LogNotificationReceived(_logger, request.MerchantOid, null);

        if (!_payTRService.VerifyNotification(request.MerchantOid, request.Status, request.TotalAmount, request.Hash))
        {
            LogInvalidHash(_logger, request.MerchantOid, null);
            return Result<bool>.Failure(
                new Error(ErrorType.Validation, "SUB_INVALID_HASH", "Bildirim doğrulaması başarısız."));
        }

        // merchant_oid formatı: CP-{companyId:N}-{targetPlan}
        var parts = request.MerchantOid.Split('-');
        if (parts.Length < 3 || !Guid.TryParse(parts[1], out var companyId))
            return Result<bool>.Failure(
                new Error(ErrorType.Validation, "SUB_INVALID_OID", "Geçersiz sipariş kimliği."));

        var targetPlanStr = parts[2];

        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null)
            return Result<bool>.Success(true);

        var admin = await _userRepository.GetCompanyAdminAsync(companyId, cancellationToken);
        if (admin is null)
            return Result<bool>.Success(true);

        if (request.Status == "success")
        {
            if (Enum.TryParse<SubscriptionType>(targetPlanStr, ignoreCase: true, out var targetPlan) &&
                company.SubscriptionType != targetPlan)
            {
                var maxUserCount = SubscriptionLimits.GetMaxUserCount(targetPlan) ?? int.MaxValue;
                company.UpgradeSubscription(targetPlan, maxUserCount);
                await _companyRepository.SaveChangesAsync(cancellationToken);
            }

            await _notificationService.CreateAsync(
                admin.Id, companyId,
                NotificationType.PaymentSuccess,
                "Abonelik başarıyla başlatıldı",
                "Aboneliğiniz başarıyla başlatıldı. İyi kullanımlar!",
                "/settings?tab=abonelik",
                cancellationToken: cancellationToken);
        }
        else
        {
            await _notificationService.CreateAsync(
                admin.Id, companyId,
                NotificationType.PaymentFailed,
                "Ödeme başarısız",
                string.IsNullOrWhiteSpace(request.FailedReasonMsg)
                    ? "Abonelik ödemesi gerçekleştirilemedi. Lütfen kart bilgilerinizi kontrol edin."
                    : request.FailedReasonMsg,
                "/settings?tab=abonelik",
                cancellationToken: cancellationToken);
        }

        return Result<bool>.Success(true);
    }
}
