using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.GetErpSettings;

public record GetErpSettingsQuery : IRequest<Result<ErpSettingsResponse>>;
