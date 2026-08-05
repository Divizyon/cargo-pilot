using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.UploadReportingLogo;

internal sealed class UploadReportingLogoCommandHandler
    : IRequestHandler<UploadReportingLogoCommand, Result<string>>
{
    private readonly ICompanyRepository _companyRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStorageService _storageService;

    public UploadReportingLogoCommandHandler(
        ICompanyRepository companyRepository,
        ICurrentUserService currentUserService,
        IStorageService storageService)
    {
        _companyRepository = companyRepository;
        _currentUserService = currentUserService;
        _storageService = storageService;
    }

    public async Task<Result<string>> Handle(
        UploadReportingLogoCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<string>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bilgisi bulunamadı."));

        var company = await _companyRepository.GetByIdAsync(companyId.Value, cancellationToken);
        if (company is null)
            return Result<string>.Failure(
                new Error(ErrorType.NotFound, "Company.NotFound", "Şirket bulunamadı."));

        var extension = Path.GetExtension(request.FileName).TrimStart('.').ToLowerInvariant();
        if (string.IsNullOrEmpty(extension))
            extension = request.ContentType.Split('/').LastOrDefault() ?? "png";

        var objectKey = $"logos/{companyId.Value}.{extension}";

        using var stream = new MemoryStream(request.FileBytes);
        var url = await _storageService.UploadAsync(objectKey, stream, request.ContentType, cancellationToken);

        company.SetLogoUrl(url);
        await _companyRepository.SaveChangesAsync(cancellationToken);

        return Result<string>.Success(url);
    }
}
