using CargoPilot.Application.Features.Auth.Register;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Kimlik doğrulama ve oturum yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/auth")]
public sealed class AuthController : BaseController
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Yeni kullanıcı kaydı oluşturur.
    /// </summary>
    /// <remarks>
    /// Başarılı kayıt sonrası kullanıcı /auth/login sayfasına yönlendirilmelidir.
    /// Şifre sunucuda BCrypt ile hashlenir; düz metin asla saklanmaz.
    /// </remarks>
    /// <response code="201">Kayıt başarılı; userId, firstName, lastName, email döner.</response>
    /// <response code="400">Doğrulama hatası (eksik alan, hatalı e-posta formatı, kısa şifre vb.).</response>
    /// <response code="409">Bu e-posta adresi zaten kayıtlı.</response>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken cancellationToken)
    {
        // Rate limiting: AddRateLimiter ile auth policy eklenecek (ayrı task)
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);
        return HandleResult(result);
    }
}
