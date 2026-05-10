using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.MarkNotificationRead;

public sealed record MarkNotificationReadCommand(Guid Id) : IRequest<Result<bool>>;
