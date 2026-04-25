using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Kimlik doğrulama işlemleri.
/// </summary>
[Route("api/v1/auth")]
[Tags("Auth")]
public sealed class AuthController : BaseController
{
    private readonly IAuthService _authService;
    private readonly IValidator<LoginRequest> _validator;

    public AuthController(IAuthService authService, IValidator<LoginRequest> validator)
    {
        _authService = authService;
        _validator = validator;
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
}
