using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

public record UpsertErpSettingsCommand(
    ErpProviderType ProviderType,
    string CompanyCode,
    string Username,
    string ServerAddress,
    string? Password) : IRequest<Result<ErpSettingsResponse>>;
