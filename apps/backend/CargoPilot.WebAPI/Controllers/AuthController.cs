using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Application.Features.Auth.OAuthLogin;
using CargoPilot.Application.Features.Auth.Register;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>OAuth login isteği — frontend ID token'ı POST eder.</summary>
/// <param name="IdToken">Google One Tap / MSAL'dan alınan ID token.</param>
public sealed record OAuthLoginRequest(string IdToken);

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
    /// Kullanıcı girişi yapar. Başarılı girişte JWT access token ve refresh token döner.
    /// </summary>
    /// <response code="200">Giriş başarılı — token çifti döndü.</response>
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
        return HandleResult(result);
    }

    /// <summary>
    /// Google ID token ile giriş / kayıt.
    /// Frontend, Google One Tap'tan aldığı credential'ı bu endpoint'e POST eder.
    /// </summary>
    /// <response code="200">Başarılı — JWT access + refresh token döner.</response>
    /// <response code="401">Geçersiz veya süresi dolmuş Google token.</response>
    [HttpPost("google")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GoogleLogin(
        [FromBody] OAuthLoginRequest request,
        CancellationToken cancellationToken)
    {
        var command = new OAuthLoginCommand(
            request.IdToken,
            AuthProvider.Google,
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Microsoft ID token ile giriş / kayıt.
    /// Frontend, MSAL'dan aldığı token'ı bu endpoint'e POST eder.
    /// </summary>
    /// <response code="200">Başarılı — JWT access + refresh token döner.</response>
    /// <response code="401">Geçersiz veya süresi dolmuş Microsoft token.</response>
    [HttpPost("microsoft")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<LoginResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MicrosoftLogin(
        [FromBody] OAuthLoginRequest request,
        CancellationToken cancellationToken)
    {
        var command = new OAuthLoginCommand(
            request.IdToken,
            AuthProvider.Microsoft,
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}