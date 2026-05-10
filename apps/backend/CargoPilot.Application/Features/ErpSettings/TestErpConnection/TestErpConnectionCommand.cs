using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

public sealed record TestErpConnectionCommand : IRequest<Result<TestConnectionResultDto>>;
