using CargoPilot.Application.Features.ErpSettings.DeleteErpSettings;
using CargoPilot.Application.Features.ErpSettings.GetErpSettings;
using CargoPilot.Application.Features.ErpSettings.TestErpConnection;
using CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Şirkete ait ERP bağlantı ayarları endpoint'leri.
/// </summary>
[Route("api/v1/erp-settings")]
[Tags("ErpSettings")]
public sealed class ErpSettingsController : BaseController
{
    private readonly IMediator _mediator;

    public ErpSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Şirkete ait ERP bağlantı ayarlarını getirir. Şifre döndürülmez.
    /// </summary>
    /// <response code="200">ERP bağlantı ayarları döner.</response>
    /// <response code="404">Bağlantı ayarı bulunamadı.</response>
    [HttpGet]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetErpSettingsQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Şirkete ait ERP bağlantı ayarlarını oluşturur veya günceller.
    /// Şifre boş gönderilirse mevcut şifre korunur; ilk kayıtta şifre zorunludur.
    /// </summary>
    /// <response code="200">Güncel ayarlar döner (şifre hariç).</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpPut]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Upsert(
        [FromBody] UpsertErpSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Şirkete ait ERP bağlantısını kaldırır. Kimlik bilgileri silinir, entegrasyon kaydı
    /// pasifleşir; senkronizasyon geçmişi korunur.
    /// </summary>
    /// <response code="200">Bağlantı kaldırıldı.</response>
    /// <response code="404">Kaldırılacak bağlantı bulunamadı.</response>
    [HttpDelete]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new DeleteErpSettingsCommand(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// ERP sistemine bağlantıyı test eder.
    /// Başarı veya başarısızlık durumunu kullanıcı dostu mesajla döndürür.
    /// </summary>
    /// <response code="200">Bağlantı test sonucu döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpPost("test-connection")]
    [Authorize(Policy = "CompanyAdmin")]
    [EnableRateLimiting("erp-test-connection")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> TestConnection(
        [FromBody] TestErpConnectionCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
