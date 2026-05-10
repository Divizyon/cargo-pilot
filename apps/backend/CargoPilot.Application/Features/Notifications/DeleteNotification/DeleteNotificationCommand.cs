using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.DeleteNotification;

public sealed record DeleteNotificationCommand(Guid Id) : IRequest<Result<bool>>;
