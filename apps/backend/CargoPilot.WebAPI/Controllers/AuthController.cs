using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Application.Features.Auth.Register;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Kimlik doğrulama ve oturum yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/auth")]
[Tags("Auth")]
public sealed class AuthController : BaseController
{
    private readonly IMediator _mediator;
    private readonly IAuthService _authService;
    private readonly IValidator<LoginRequest> _validator;

    public AuthController(
        IMediator mediator,
        IAuthService authService,
        IValidator<LoginRequest> validator)
    {
        _mediator = mediator;
        _authService = authService;
        _validator = validator;
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
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);

        return HandleResult(result);
    }

    /// <summary>
    /// Kullanıcı girişi yapar. Başarılı girişte JWT access token döner;
    /// refresh token güvenli HttpOnly Cookie olarak tarayıcıya yazılır.
    /// </summary>
    /// <response code="200">Giriş başarılı — access token döndü, refresh token Cookie'de.</response>
    /// <response code="400">Model doğrulama hatası (eksik email veya şifre).</response>
    /// <response code="401">Email veya şifre hatalı / hesap kilitli.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            var validationError = new Error(
                ErrorType.Validation,
                "VALIDATION_FAILED",
                string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

            return HandleResult(Result<LoginResponse>.Failure(validationError));
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _authService.LoginAsync(request, ipAddress, cancellationToken);

        if (result.IsSuccess)
            SetRefreshTokenCookie(result.Data!.RefreshToken, result.Data.RefreshTokenExpiresAt);

        return HandleResult(result);
    }

    /// <summary>
    /// Geçerli refresh token ile yeni bir access token üretir (Token Rotation).
    /// Refresh token HttpOnly Cookie olarak okunur ve güncellenir.
    /// </summary>
    /// <response code="200">Yeni access token döndü; güncellenmiş refresh token Cookie'de.</response>
    /// <response code="401">Refresh token eksik, geçersiz, süresi dolmuş veya daha önce kullanılmış.</response>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(Result<RefreshResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized();

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _authService.RefreshTokenAsync(refreshToken, ipAddress, cancellationToken);

        if (result.IsSuccess)
            SetRefreshTokenCookie(result.Data!.RefreshToken, result.Data.RefreshTokenExpiresAt);

        return HandleResult(result);
    }

    // ─── Yardımcılar ────────────────────────────────────────────────────────────

    /// <summary>
    /// Refresh token'ı tarayıcının JavaScript kodunun erişemeyeceği güvenli HttpOnly Cookie olarak yazar.
    /// </summary>
    private void SetRefreshTokenCookie(string token, DateTime expiresAt)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly  = true,           // JS erişemez (XSS koruması)
            Secure    = true,           // Yalnızca HTTPS üzerinden gönderilir
            SameSite  = SameSiteMode.None, // Cross-origin isteklere izin ver (SPA + API ayrı origin)
            Expires   = expiresAt,
            Path      = "/api/v1/auth" // Cookie sadece auth endpoint'lerine gönderilir
        });
    }
}