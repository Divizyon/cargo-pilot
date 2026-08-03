using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Settings.DeleteReportingLogo;
using CargoPilot.Application.Features.Settings.GetReportingSettings;
using CargoPilot.Application.Features.Settings.UpdateReportingSettings;
using CargoPilot.Application.Features.Settings.UploadReportingLogo;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

[Route("api/v1/settings")]
[Authorize(Policy = "CompanyMember")]
public sealed class SettingsController : BaseController
{
    private readonly IMediator _mediator;

    public SettingsController(IMediator mediator) => _mediator = mediator;

    /// <summary>Raporlama ayarlarını getirir.</summary>
    [HttpGet("reporting")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetReporting(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetReportingSettingsQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Raporlama ayarlarını günceller.</summary>
    [HttpPut("reporting")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateReporting(
        [FromBody] UpdateReportingSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Raporlama logosunu yükler.</summary>
    [HttpPost("reporting/logo")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(Result<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UploadLogo(
        IFormFile logo,
        CancellationToken cancellationToken = default)
    {
        if (logo is null || logo.Length == 0)
            return BadRequest(new { message = "Logo dosyası gereklidir." });

        using var ms = new MemoryStream();
        await logo.CopyToAsync(ms, cancellationToken);

        var command = new UploadReportingLogoCommand(ms.ToArray(), logo.ContentType, logo.FileName);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Raporlama logosunu kaldırır.</summary>
    [HttpDelete("reporting/logo")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteLogo(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new DeleteReportingLogoCommand(), cancellationToken);
        return HandleResult(result);
    }
}
