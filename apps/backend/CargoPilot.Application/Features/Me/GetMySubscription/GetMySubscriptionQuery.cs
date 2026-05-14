using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.GetMySubscription;

public sealed record GetMySubscriptionQuery : IRequest<Result<MySubscriptionResponse>>;
