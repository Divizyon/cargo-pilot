using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

public sealed record UpsertErpSettingsCommand(
    string CompanyCode,
    string Username,
    string ServerAddress,
    string Password,
    ErpProvider Provider
) : IRequest<Result<Guid>>;
