using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Notifications.BulkDeleteNotifications;
using CargoPilot.Application.Features.Notifications.DeleteNotification;
using CargoPilot.Application.Features.Notifications.GetNotifications;
using CargoPilot.Application.Features.Notifications.GetUnreadCount;
using CargoPilot.Application.Features.Notifications.MarkAllNotificationsRead;
using CargoPilot.Application.Features.Notifications.MarkNotificationRead;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>Kullanıcıya ait bildirim endpoint'leri.</summary>
[Route("api/v1/notifications")]
[Authorize]
public sealed class NotificationsController : BaseController
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator) => _mediator = mediator;

    /// <summary>Oturum açmış kullanıcının bildirimlerini cursor tabanlı sayfalama ile döndürür.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(Result<NotificationsPagedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] DateTime? cursor,
        [FromQuery] NotificationType? type,
        [FromQuery] NotificationSeverity? severity,
        [FromQuery] bool? isRead,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetNotificationsQuery(cursor, type, severity, isRead, search),
            cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Okunmamış bildirim sayısını döndürür (navigasyon rozeti için).</summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(Result<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetUnreadCountQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Tek bir bildirimi okundu olarak işaretler.</summary>
    [HttpPatch("{id:guid}/read")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new MarkNotificationReadCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler.</summary>
    [HttpPatch("read-all")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new MarkAllNotificationsReadCommand(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Tek bir bildirimi siler (soft delete, 90 gün saklanır).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteNotificationCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Birden fazla bildirimi toplu siler (soft delete).</summary>
    [HttpDelete("bulk")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> BulkDelete(
        [FromBody] BulkDeleteNotificationsCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
