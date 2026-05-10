using CargoPilot.Application.Features.ErpSettings.GetErpSettings;
using CargoPilot.Application.Features.ErpSettings.TestErpConnection;
using CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Şirket bazlı ERP bağlantı ayarları endpoint'leri.
/// </summary>
[Route("api/v1/erp-settings")]
[Tags("ErpSettings")]
[Authorize(Policy = "CompanyMember")]
public sealed class ErpSettingsController : BaseController
{
    private readonly IMediator _mediator;

    public ErpSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Şirkete ait ERP bağlantı ayarlarını döndürür (şifre hariç).
    /// </summary>
    /// <response code="200">ERP ayarları döner.</response>
    /// <response code="404">Henüz ERP ayarı yapılandırılmamış.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetErpSettings(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetErpSettingsQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Şirkete ait ERP bağlantı ayarlarını oluşturur veya günceller.
    /// </summary>
    /// <response code="200">ERP ayarları güncellendi veya oluşturuldu; kayıt ID'si döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpsertErpSettings(
        [FromBody] UpsertErpSettingsCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Kaydedilmiş ERP ayarlarıyla bağlantı testi yapar.
    /// </summary>
    /// <response code="200">Bağlantı testi sonucu (başarılı/başarısız) ve mesaj döner.</response>
    /// <response code="404">Henüz ERP ayarı yapılandırılmamış.</response>
    [HttpPost("test-connection")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestConnection(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new TestErpConnectionCommand(), cancellationToken);
        return HandleResult(result);
    }
}
