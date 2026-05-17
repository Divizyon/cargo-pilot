using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.UpdateReportingSettings;

public sealed record UpdateReportingSettingsCommand(
    string? CompanyName,
    string? Phone,
    string? Email,
    string? Address) : IRequest<Result<ReportingSettingsResponse>>;
