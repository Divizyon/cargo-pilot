using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using MediatR;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

internal sealed class UpsertErpSettingsCommandHandler : IRequestHandler<UpsertErpSettingsCommand, Result<ErpSettingsResponse>>
{
    private readonly IErpSettingsRepository _repository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly ICurrentUserService _currentUserService;

    public UpsertErpSettingsCommandHandler(
        IErpSettingsRepository repository,
        IIntegrationRepository integrationRepository,
        IErpPasswordProtector passwordProtector,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _integrationRepository = integrationRepository;
        _passwordProtector = passwordProtector;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ErpSettingsResponse>> Handle(UpsertErpSettingsCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ErpSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var existing = await _repository.GetByCompanyIdAsync(companyId.Value, cancellationToken);

        if (existing is null)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
                return Result<ErpSettingsResponse>.Failure(
                    new Error(ErrorType.Validation, "ErpSettings.PasswordRequired", "İlk kayıtta şifre zorunludur."));

            var encrypted = _passwordProtector.Protect(request.Password);
            var newSettings = new ErpSettingsEntity(
                Guid.NewGuid(),
                companyId.Value,
                request.ProviderType,
                request.CompanyCode,
                request.Username,
                encrypted,
                request.ServerAddress,
                request.TrustServerCertificate,
                request.DimensionUnit,
                request.WeightUnit);

            _repository.Add(newSettings);

            var integrationExists = await _integrationRepository.ExistsByCompanyAsync(companyId.Value, cancellationToken);
            if (!integrationExists)
            {
                _integrationRepository.Add(new Integration(
                    Guid.NewGuid(),
                    companyId.Value,
                    systemName: request.ProviderType.ToString(),
                    apiEndpoint: request.ServerAddress,
                    mappingTable: null,
                    syncInterval: null));
            }

            await _repository.SaveChangesAsync(cancellationToken);

            return Result<ErpSettingsResponse>.Success(ErpSettingsResponse.FromEntity(newSettings));
        }

        string? newEncryptedPassword = null;
        if (!string.IsNullOrWhiteSpace(request.Password))
            newEncryptedPassword = _passwordProtector.Protect(request.Password);

        existing.Update(
            request.ProviderType,
            request.CompanyCode,
            request.Username,
            request.ServerAddress,
            request.TrustServerCertificate,
            request.DimensionUnit,
            request.WeightUnit,
            newEncryptedPassword);

        var integrations = await _integrationRepository.ListByCompanyAsync(companyId.Value, cancellationToken);
        var integration = integrations.Count > 0 ? integrations[0] : null;
        if (integration is not null)
            integration.Update(request.ProviderType.ToString(), request.ServerAddress, integration.MappingTable, integration.SyncInterval);

        await _repository.SaveChangesAsync(cancellationToken);

        return Result<ErpSettingsResponse>.Success(ErpSettingsResponse.FromEntity(existing));
    }
}
