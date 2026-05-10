using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.BulkDeleteNotifications;

public sealed record BulkDeleteNotificationsCommand(IReadOnlyList<Guid> Ids) : IRequest<Result<bool>>;
