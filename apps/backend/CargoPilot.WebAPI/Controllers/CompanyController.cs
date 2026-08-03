using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.CompanyManagement.CreateCompanyUser;
using CargoPilot.Application.Features.CompanyManagement.GetCompanyUsers;
using CargoPilot.Application.Features.CompanyManagement.UpdateCompanyUserStatus;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>CompanyAdmin kullanıcı yönetimi endpoint'leri.</summary>
[Route("api/v1/company")]
[Authorize(Policy = "CompanyAdmin")]
public sealed class CompanyController : BaseController
{
    private readonly IMediator _mediator;

    public CompanyController(IMediator mediator) => _mediator = mediator;

    /// <summary>Şirketteki kullanıcıları listeler.</summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(Result<IReadOnlyList<CompanyUserDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCompanyUsersQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Şirkete yeni kullanıcı ekler.</summary>
    [HttpPost("users")]
    [EnableRateLimiting("company-user-create")]
    [ProducesResponseType(typeof(Result<CompanyUserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateUser(
        [FromBody] CreateCompanyUserCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Kullanıcının aktif/pasif durumunu günceller.</summary>
    [HttpPatch("users/{userId:guid}/status")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserStatus(
        Guid userId,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (request.IsActive is null)
            return BadRequest();

        var result = await _mediator.Send(
            new UpdateCompanyUserStatusCommand(userId, request.IsActive.Value),
            cancellationToken);
        return HandleResult(result);
    }
}

/// <summary>Kullanıcı durum güncelleme isteği.</summary>
public sealed record UpdateUserStatusRequest(bool? IsActive);
