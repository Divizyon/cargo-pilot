using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.GetReportingSettings;

public sealed record GetReportingSettingsQuery : IRequest<Result<ReportingSettingsResponse>>;
