using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Settings.UpdateReportingSettings;

internal sealed class UpdateReportingSettingsCommandHandler
    : IRequestHandler<UpdateReportingSettingsCommand, Result<ReportingSettingsResponse>>
{
    private readonly ICompanyRepository _companyRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpdateReportingSettingsCommandHandler(
        ICompanyRepository companyRepository,
        ICurrentUserService currentUserService)
    {
        _companyRepository = companyRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ReportingSettingsResponse>> Handle(
        UpdateReportingSettingsCommand request,
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

        company.UpdateReportingInfo(
            request.CompanyName ?? company.Name,
            request.Phone,
            request.Email,
            request.Address);

        await _companyRepository.SaveChangesAsync(cancellationToken);

        return Result<ReportingSettingsResponse>.Success(new ReportingSettingsResponse(
            company.Name,
            company.Phone,
            company.Email,
            company.Address,
            company.LogoUrl));
    }
}
