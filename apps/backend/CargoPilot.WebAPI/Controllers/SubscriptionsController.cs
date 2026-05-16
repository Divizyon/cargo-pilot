using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Subscriptions.GetCurrentSubscription;
using CargoPilot.Application.Features.Subscriptions.GetIframeToken;
using CargoPilot.Application.Features.Subscriptions.GetPlans;
using CargoPilot.Application.Features.Subscriptions.HandlePayTRNotification;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Abonelik planları endpoint'leri.
/// </summary>
[Route("api/v1/subscriptions")]
[Tags("Subscriptions")]
public sealed class SubscriptionsController : BaseController
{
    private readonly IMediator _mediator;

    public SubscriptionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Mevcut tüm abonelik planlarını fiyat ve limit bilgileriyle döndürür.
    /// </summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(Result<IReadOnlyList<SubscriptionPlanDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetSubscriptionPlansQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Oturum açmış kullanıcının firmasının aktif abonelik planını döndürür.
    /// </summary>
    [HttpGet("current")]
    [Authorize(Policy = "CompanyMember")]
    [ProducesResponseType(typeof(Result<CurrentSubscriptionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCurrentSubscriptionQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Seçilen plan için PayTR iframe token'ı oluşturur.
    /// Frontend bu token ile PayTR ödeme iframe'ini embed eder.
    /// </summary>
    [HttpPost("iframe-token")]
    [Authorize(Policy = "CompanyMember")]
    [ProducesResponseType(typeof(Result<IframeTokenResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetIframeToken(
        [FromBody] GetIframeTokenRequest request,
        CancellationToken cancellationToken)
    {
        var userIp = HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "127.0.0.1";
        var command = new GetIframeTokenCommand(request.TargetPlanType, request.BillingPeriod, userIp);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    /// <summary>
    /// [SADECE MOCK MOD] Gerçek PayTR yokken ödeme bildirimini simüle eder.
    /// MerchantId boş olduğunda aktif, gerçek key gelince bu endpoint devre dışıdır.
    /// </summary>
    [HttpPost("simulate-payment")]
    [Authorize(Policy = "CompanyMember")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SimulatePayment(
        [FromBody] SimulatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        var command = new HandlePayTRNotificationCommand(
            request.MerchantOid,
            request.Status,
            "0",
            "MOCK-HASH",
            null);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}

public sealed record GetIframeTokenRequest(string TargetPlanType, string BillingPeriod);
public sealed record SimulatePaymentRequest(string MerchantOid, string Status);
