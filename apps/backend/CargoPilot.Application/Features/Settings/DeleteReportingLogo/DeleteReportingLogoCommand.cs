using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.DeleteReportingLogo;

public sealed record DeleteReportingLogoCommand : IRequest<Result<ReportingSettingsResponse>>;
