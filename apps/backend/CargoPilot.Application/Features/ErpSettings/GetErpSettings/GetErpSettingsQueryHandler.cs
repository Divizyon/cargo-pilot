using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.GetErpSettings;

public sealed class GetErpSettingsQueryHandler : IRequestHandler<GetErpSettingsQuery, Result<ErpSettingsDto>>
{
    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetErpSettingsQueryHandler(
        IErpSettingsRepository erpSettingsRepository,
        ICurrentUserService currentUserService)
    {
        _erpSettingsRepository = erpSettingsRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ErpSettingsDto>> Handle(GetErpSettingsQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ErpSettingsDto>.Failure(
                new Error(ErrorType.Forbidden, "ErpSettings.NoCompany", "Bu işlem için bir şirket üyeliği gereklidir."));

        var settings = await _erpSettingsRepository.GetByCompanyIdAsync(companyId.Value, cancellationToken);
        if (settings is null)
            return Result<ErpSettingsDto>.Failure(
                new Error(ErrorType.NotFound, "ErpSettings.NotFound", "Bu şirket için ERP ayarı henüz yapılandırılmamış."));

        var dto = new ErpSettingsDto(
            settings.Id,
            settings.CompanyCode,
            settings.Username,
            settings.ServerAddress,
            settings.Provider);

        return Result<ErpSettingsDto>.Success(dto);
    }
}
