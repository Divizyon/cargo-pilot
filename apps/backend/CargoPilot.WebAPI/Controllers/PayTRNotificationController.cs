using CargoPilot.Application.Features.Subscriptions.HandlePayTRNotification;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// PayTR ödeme bildirimi endpoint'i.
/// PayTR, ödeme sonucunu bu adrese form-encoded POST olarak iletir.
/// </summary>
[ApiController]
[Route("api/v1/paytr")]
[Tags("PayTR")]
public sealed class PayTRNotificationController : ControllerBase
{
    private readonly IMediator _mediator;

    public PayTRNotificationController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// PayTR'dan gelen ödeme bildirimini işler.
    /// Hash doğrulaması başarısız olursa FAILED döner.
    /// Başarılı işlemlerde abonelik aktifleştirilir.
    /// PayTR'ın beklediği response: düz metin "OK".
    /// </summary>
    [HttpPost("notification")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public async Task<IActionResult> Notification(
        [FromForm(Name = "merchant_oid")]     string merchantOid,
        [FromForm(Name = "status")]           string status,
        [FromForm(Name = "total_amount")]     string totalAmount,
        [FromForm(Name = "hash")]             string hash,
        [FromForm(Name = "failed_reason_msg")] string? failedReasonMsg,
        CancellationToken cancellationToken)
    {
        var command = new HandlePayTRNotificationCommand(
            merchantOid, status, totalAmount, hash, failedReasonMsg);

        var result = await _mediator.Send(command, cancellationToken);

        // PayTR "OK" cevabı bekler; aksi hâlde bildirimi tekrar gönderir.
        return result.IsSuccess ? Content("OK") : Content("FAILED");
    }
}
