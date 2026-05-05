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
using Microsoft.AspNetCore.RateLimiting;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>OAuth login isteği — frontend ID token'ı POST eder.</summary>
/// <param name="IdToken">Google One Tap'tan alınan ID token.</param>
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
        var userAgent = Request.Headers.UserAgent.ToString();
        var result = await _authService.LoginAsync(request, ipAddress, userAgent, cancellationToken);

        if (result.IsSuccess)
            SetRefreshTokenCookie(result.Data!.RefreshToken, result.Data.RefreshTokenExpiresAt);

        return HandleResult(result);
    }

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
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString());

        var result = await _mediator.Send(command, cancellationToken);

        if (result.IsSuccess)
            SetRefreshTokenCookie(result.Data!.RefreshToken, result.Data.RefreshTokenExpiresAt);

        return HandleResult(result);
    }

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

    [HttpGet("secure-account")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SecureAccount(
        [FromQuery] string email,
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
            return BadRequest();

        var result = await _authService.SecureAccountAsync(email, token, cancellationToken);
        if (!result.IsSuccess)
            return HandleResult(result);

        return Redirect(result.Data!);
    }

    private void SetRefreshTokenCookie(string token, DateTime expiresAt)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = expiresAt,
            Path = "/api/v1/auth"
        });
    }
}