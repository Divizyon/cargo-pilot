using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Me.ChangePassword;
using CargoPilot.Application.Features.Me.ConfirmEmailChange;
using CargoPilot.Application.Features.Me.GetMyProfile;
using CargoPilot.Application.Features.Me.GetMySubscription;
using CargoPilot.Application.Features.Me.RequestEmailChange;
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

    /// <summary>Giriş yapmış kullanıcının şifresini değiştirir ve diğer tüm oturumları sonlandırır.</summary>
    [HttpPost("change-password")]
    [EnableRateLimiting("change-password")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangeMyPasswordCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Giriş yapmış kullanıcı için e-posta değişikliği isteği başlatır; mevcut e-postaya onay bağlantısı gönderir.</summary>
    [HttpPost("request-email-change")]
    [EnableRateLimiting("email-change-request")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RequestEmailChange(
        [FromBody] RequestEmailChangeCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>E-posta değişikliğini token ile onaylar. Anonim erişime açıktır (bağlantıya tıklama akışı).</summary>
    [HttpGet("confirm-email-change")]
    [AllowAnonymous]
    [EnableRateLimiting("confirm-email-change")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ConfirmEmailChange(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ConfirmEmailChangeCommand(token), cancellationToken);
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
