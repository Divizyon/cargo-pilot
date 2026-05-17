using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.UploadPlanThumbnail;

public sealed record UploadPlanThumbnailCommand(Guid PlanId, string ImageBase64) : IRequest<Result<string>>;
