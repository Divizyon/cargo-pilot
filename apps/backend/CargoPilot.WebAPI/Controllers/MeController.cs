using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Me.GetMyProfile;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
}
