using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.GetReportingSettings;

internal sealed class GetReportingSettingsQueryHandler
    : IRequestHandler<GetReportingSettingsQuery, Result<ReportingSettingsResponse>>
{
    private readonly ICompanyRepository _companyRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetReportingSettingsQueryHandler(
        ICompanyRepository companyRepository,
        ICurrentUserService currentUserService)
    {
        _companyRepository = companyRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ReportingSettingsResponse>> Handle(
        GetReportingSettingsQuery request,
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

        return Result<ReportingSettingsResponse>.Success(new ReportingSettingsResponse(
            company.Name,
            company.Phone,
            company.Email,
            company.Address,
            company.LogoUrl));
    }
}
