using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.UploadPlanThumbnail;

internal sealed class UploadPlanThumbnailCommandHandler : IRequestHandler<UploadPlanThumbnailCommand, Result<string>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStorageService _storageService;

    public UploadPlanThumbnailCommandHandler(
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService,
        IStorageService storageService)
    {
        _planRepository = planRepository;
        _currentUserService = currentUserService;
        _storageService = storageService;
    }

    public async Task<Result<string>> Handle(UploadPlanThumbnailCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        var plan = await _planRepository.GetByIdAsync(request.PlanId, companyId, cancellationToken);
        if (plan is null)
            return Result<string>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        var commaIndex = request.ImageBase64.IndexOf(',');
        var base64Data = request.ImageBase64[(commaIndex + 1)..];
        var imageBytes = Convert.FromBase64String(base64Data);

        var contentType = ExtractContentType(request.ImageBase64);
        var extension = contentType == "image/png" ? "png" : "jpeg";
        var objectKey = $"thumbnails/{plan.Id}.{extension}";

        using var stream = new MemoryStream(imageBytes);
        var url = await _storageService.UploadAsync(objectKey, stream, contentType, cancellationToken);

        plan.SetThumbnailUrl(url);
        await _planRepository.SaveChangesAsync(cancellationToken);

        return Result<string>.Success(url);
    }

    private static string ExtractContentType(string dataUrl)
    {
        var start = dataUrl.IndexOf(':') + 1;
        var end = dataUrl.IndexOf(';');
        if (start > 0 && end > start)
            return dataUrl[start..end];
        return "image/png";
    }
}
