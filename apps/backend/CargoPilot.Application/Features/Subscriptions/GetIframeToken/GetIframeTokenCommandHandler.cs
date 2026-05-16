using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Features.Subscriptions.GetIframeToken;

internal sealed class GetIframeTokenCommandHandler
    : IRequestHandler<GetIframeTokenCommand, Result<IframeTokenResponse>>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserRepository _userRepository;
    private readonly IPayTRService _payTRService;
    private readonly SubscriptionPlanSettings _planSettings;
    private readonly IValidator<GetIframeTokenCommand> _validator;

    public GetIframeTokenCommandHandler(
        ICurrentUserService currentUserService,
        IUserRepository userRepository,
        IPayTRService payTRService,
        IOptions<SubscriptionPlanSettings> planSettings,
        IValidator<GetIframeTokenCommand> validator)
    {
        _currentUserService = currentUserService;
        _userRepository = userRepository;
        _payTRService = payTRService;
        _planSettings = planSettings.Value;
        _validator = validator;
    }

    public async Task<Result<IframeTokenResponse>> Handle(
        GetIframeTokenCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<IframeTokenResponse>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        if (_currentUserService.UserId is not { } userId)
            return Result<IframeTokenResponse>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        if (_currentUserService.CompanyId is not { } companyId)
            return Result<IframeTokenResponse>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        if (!Enum.TryParse<SubscriptionType>(request.TargetPlanType, ignoreCase: true, out var targetPlan))
            return Result<IframeTokenResponse>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Geçersiz plan tipi."));

        var (planName, amount) = ResolvePrice(targetPlan, request.BillingPeriod);
        if (amount <= 0)
            return Result<IframeTokenResponse>.Failure(
                new Error(ErrorType.BusinessRule, "SUB_ENTERPRISE_CONTACT", "Kurumsal plan için satış ekibiyle iletişime geçin."));

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<IframeTokenResponse>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı."));

        // merchant_oid formatı: CP-{companyId:N}-{targetPlan}
        // Webhook'ta bu format parse edilerek companyId ve plan çözümlenir.
        var merchantOid = $"CP-{companyId:N}-{request.TargetPlanType}";
        var amountInKurus = (long)(amount * 100);

        var iframeToken = await _payTRService.GetIframeTokenAsync(
            merchantOid, user.Email, request.UserIp, amountInKurus, planName, cancellationToken);

        return Result<IframeTokenResponse>.Success(new IframeTokenResponse(
            iframeToken, merchantOid, planName, amount, request.BillingPeriod));
    }

    private (string PlanName, decimal Amount) ResolvePrice(SubscriptionType plan, string billingPeriod)
    {
        var isYearly = billingPeriod == "Yearly";

        return plan switch
        {
            SubscriptionType.Free => (
                "Başlangıç",
                isYearly ? _planSettings.Baslangic.YearlyMonthlyPrice : _planSettings.Baslangic.MonthlyPrice),
            SubscriptionType.Pro => (
                "Büyüme",
                isYearly ? _planSettings.Buyume.YearlyMonthlyPrice : _planSettings.Buyume.MonthlyPrice),
            _ => ("", 0)
        };
    }
}
