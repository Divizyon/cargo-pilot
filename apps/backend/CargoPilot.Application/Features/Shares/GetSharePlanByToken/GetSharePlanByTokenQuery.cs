using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.GetSharePlanByToken;

public sealed record GetSharePlanByTokenQuery(string Token) : IRequest<Result<SharePlanDto>>;
