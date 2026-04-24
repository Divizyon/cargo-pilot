using CargoPilot.Application.Features.Auth.Register;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Kimlik doğrulama ve oturum yönetimi endpoint'leri.
/// </summary>
[Route("api/auth")]
public sealed class AuthController : BaseController {
    private readonly RegisterCommandHandler _registerHandler;

    public AuthController(RegisterCommandHandler registerHandler) {
        _registerHandler = registerHandler;
    }

    /// <summary>
    /// Yeni kullanıcı kaydı oluşturur.
    /// </summary>
    /// <remarks>
    /// Başarılı kayıt sonrası kullanıcı /auth/login sayfasına yönlendirilmelidir.
    /// Şifre sunucuda BCrypt ile hashlenir; düz metin asla saklanmaz.
    /// </remarks>
    /// <response code="200">Kayıt başarılı; userId, firstName, lastName, email döner.</response>
    /// <response code="400">Doğrulama hatası (eksik alan, hatalı e-posta formatı, kısa şifre vb.).</response>
    /// <response code="409">Bu e-posta adresi zaten kayıtlı.</response>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken cancellationToken) {
        var result = await _registerHandler.HandleAsync(command, cancellationToken);
        return HandleResult(result);
    }
}
