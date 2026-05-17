using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.DeleteReportingLogo;

internal sealed class DeleteReportingLogoCommandHandler
    : IRequestHandler<DeleteReportingLogoCommand, Result<ReportingSettingsResponse>>
{
    private readonly ICompanyRepository _companyRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStorageService _storageService;

    public DeleteReportingLogoCommandHandler(
        ICompanyRepository companyRepository,
        ICurrentUserService currentUserService,
        IStorageService storageService)
    {
        _companyRepository = companyRepository;
        _currentUserService = currentUserService;
        _storageService = storageService;
    }

    public async Task<Result<ReportingSettingsResponse>> Handle(
        DeleteReportingLogoCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ReportingSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var company = await _companyRepository.GetByIdAsync(companyId.Value, cancellationToken);
        if (company is null)
            return Result<ReportingSettingsResponse>.Failure(
                new Error(ErrorType.NotFound, "Company.NotFound", "Şirket bulunamadı."));

        if (!string.IsNullOrEmpty(company.LogoUrl))
        {
            var uri = new Uri(company.LogoUrl);
            var segments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
            if (segments.Length == 2)
                await _storageService.DeleteAsync(segments[1], cancellationToken);
        }

        company.ClearLogoUrl();
        await _companyRepository.SaveChangesAsync(cancellationToken);

        return Result<ReportingSettingsResponse>.Success(new ReportingSettingsResponse(
            company.Name,
            company.Phone,
            company.Email,
            company.Address,
            company.LogoUrl));
    }
}
