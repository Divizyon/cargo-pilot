using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Subscriptions.GetCurrentSubscription;
using CargoPilot.Application.Features.Subscriptions.GetPlans;
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
}
