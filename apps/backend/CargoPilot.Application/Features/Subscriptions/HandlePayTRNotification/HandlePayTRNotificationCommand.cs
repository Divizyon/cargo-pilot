using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Subscriptions.HandlePayTRNotification;

public sealed record HandlePayTRNotificationCommand(
    string MerchantOid,
    string Status,
    string TotalAmount,
    string Hash,
    string? FailedReasonMsg) : IRequest<Result<bool>>;
