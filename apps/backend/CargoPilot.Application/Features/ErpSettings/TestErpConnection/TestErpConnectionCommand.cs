using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

public record TestErpConnectionCommand(
    ErpProviderType ProviderType,
    string ServerAddress,
    string CompanyCode,
    string Username,
    string Password) : IRequest<Result<ErpConnectionTestResponse>>;
