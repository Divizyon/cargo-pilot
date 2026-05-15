using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Subscriptions.GetPlans;

public sealed record GetSubscriptionPlansQuery : IRequest<Result<IReadOnlyList<SubscriptionPlanDto>>>;
