using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Subscriptions.GetIframeToken;

public sealed record GetIframeTokenCommand(
    string TargetPlanType,
    string BillingPeriod,
    string UserIp) : IRequest<Result<IframeTokenResponse>>;
