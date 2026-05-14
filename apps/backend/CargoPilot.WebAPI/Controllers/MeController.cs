using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Me.GetMyProfile;
using CargoPilot.Application.Features.Me.GetMySubscription;
using CargoPilot.Application.Features.Me.UpdateMyProfile;
using CargoPilot.Application.Features.Me.UpdateTourCompleted;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>Giriş yapmış kullanıcıya ait profil endpoint'leri.</summary>
[Route("api/v1/me")]
[Authorize]
public sealed class MeController : BaseController
{
    private readonly IMediator _mediator;

    public MeController(IMediator mediator) => _mediator = mediator;

    /// <summary>Giriş yapmış kullanıcının profil bilgilerini döndürür.</summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(Result<GetMyProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetMyProfileQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Giriş yapmış kullanıcının profil bilgilerini günceller.</summary>
    [HttpPut("profile")]
    [EnableRateLimiting("profile-update")]
    [ProducesResponseType(typeof(Result<GetMyProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateMyProfileCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Giriş yapmış kullanıcının abonelik bilgilerini ve kalan limitlerini döndürür.</summary>
    [HttpGet("subscription")]
    [ProducesResponseType(typeof(Result<MySubscriptionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSubscription(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetMySubscriptionQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Giriş yapmış kullanıcının tur tamamlama durumunu günceller.</summary>
    [HttpPatch("tour-completed")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateTourCompleted(
        [FromBody] UpdateTourCompletedCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
