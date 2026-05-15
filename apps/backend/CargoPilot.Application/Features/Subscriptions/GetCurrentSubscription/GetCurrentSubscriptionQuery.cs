using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Subscriptions.GetCurrentSubscription;

public sealed record GetCurrentSubscriptionQuery : IRequest<Result<CurrentSubscriptionDto>>;
