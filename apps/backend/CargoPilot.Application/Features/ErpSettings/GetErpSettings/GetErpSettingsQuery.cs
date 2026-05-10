using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.GetErpSettings;

public sealed record GetErpSettingsQuery : IRequest<Result<ErpSettingsDto>>;
