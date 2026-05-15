using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.GetErpSettings;

internal sealed class GetErpSettingsQueryHandler : IRequestHandler<GetErpSettingsQuery, Result<ErpSettingsResponse>>
{
    private readonly IErpSettingsRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public GetErpSettingsQueryHandler(
        IErpSettingsRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ErpSettingsResponse>> Handle(GetErpSettingsQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ErpSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var settings = await _repository.GetByCompanyIdAsync(companyId.Value, cancellationToken);

        if (settings is null)
            return Result<ErpSettingsResponse>.Failure(
                new Error(ErrorType.NotFound, "ErpSettings.NotFound", "ERP bağlantı ayarları bulunamadı."));

        return Result<ErpSettingsResponse>.Success(new ErpSettingsResponse(
            settings.Id,
            settings.ProviderType,
            settings.CompanyCode,
            settings.Username,
            settings.ServerAddress,
            !string.IsNullOrEmpty(settings.PasswordEncrypted)));
    }
}
