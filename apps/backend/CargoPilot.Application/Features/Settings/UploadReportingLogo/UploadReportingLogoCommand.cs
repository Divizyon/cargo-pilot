using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.UploadReportingLogo;

public sealed record UploadReportingLogoCommand(
    byte[] FileBytes,
    string ContentType,
    string FileName) : IRequest<Result<string>>;
