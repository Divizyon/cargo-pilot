using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Application.Features.Auth.Register;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RequestPasswordResetRequest> _requestResetValidator;
    private readonly IValidator<ResetPasswordRequest> _resetPasswordValidator;

    public AuthController(
        IMediator mediator,
        IAuthService authService,
        IValidator<LoginRequest> loginValidator,
        IValidator<RequestPasswordResetRequest> requestResetValidator,
        IValidator<ResetPasswordRequest> resetPasswordValidator)
    {
        _mediator = mediator;
        _authService = authService;
        _loginValidator = loginValidator;
        _requestResetValidator = requestResetValidator;
        _resetPasswordValidator = resetPasswordValidator;
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
    [EnableRateLimiting("register")]
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
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var validation = await _loginValidator.ValidateAsync(request, cancellationToken);
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

    /// <summary>
    /// Şifre sıfırlama e-postası gönderir. Hesap enumeration saldırılarını önlemek için
    /// e-posta kayıtlı olsun ya da olmasın aynı yanıt döner.
    /// </summary>
    /// <response code="200">İstek alındı; e-posta kayıtlıysa sıfırlama bağlantısı gönderildi.</response>
    /// <response code="400">E-posta formatı geçersiz.</response>
    [HttpPost("request-password-reset")]
    [AllowAnonymous]
    [EnableRateLimiting("password-reset")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RequestPasswordReset(
        [FromBody] RequestPasswordResetRequest request,
        CancellationToken cancellationToken)
    {
        var validation = await _requestResetValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            var validationError = new Error(
                ErrorType.Validation,
                "VALIDATION_FAILED",
                string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

            return HandleResult(Result<bool>.Failure(validationError));
        }

        var result = await _authService.RequestPasswordResetAsync(request.Email, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Şifre sıfırlama tokenı ile yeni şifre belirler. Başarı durumunda tüm aktif oturumlar iptal edilir.
    /// </summary>
    /// <response code="200">Şifre başarıyla güncellendi.</response>
    /// <response code="400">Doğrulama hatası (eksik alan, şifre kuralı ihlali vb.).</response>
    /// <response code="401">Token geçersiz veya süresi dolmuş.</response>
    /// <response code="422">Daha önce kullanılmış bir şifre girildi.</response>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("password-reset")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var validation = await _resetPasswordValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            var validationError = new Error(
                ErrorType.Validation,
                "VALIDATION_FAILED",
                string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

            return HandleResult(Result<bool>.Failure(validationError));
        }

        var result = await _authService.ResetPasswordAsync(request.Token, request.NewPassword, cancellationToken);
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