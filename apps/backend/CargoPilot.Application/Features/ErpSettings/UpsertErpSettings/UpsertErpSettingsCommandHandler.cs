using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

internal sealed class UpsertErpSettingsCommandHandler : IRequestHandler<UpsertErpSettingsCommand, Result<ErpSettingsResponse>>
{
    private readonly IErpSettingsRepository _repository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly ICurrentUserService _currentUserService;

    public UpsertErpSettingsCommandHandler(
        IErpSettingsRepository repository,
        IIntegrationRepository integrationRepository,
        IDraftItemRepository draftItemRepository,
        IErpPasswordProtector passwordProtector,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _integrationRepository = integrationRepository;
        _draftItemRepository = draftItemRepository;
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

            await EnsureIntegrationAsync(companyId.Value, request, cancellationToken);

            await _repository.SaveChangesAsync(cancellationToken);

            return Result<ErpSettingsResponse>.Success(ErpSettingsResponse.FromEntity(newSettings));
        }

        string? newEncryptedPassword = null;
        if (!string.IsNullOrWhiteSpace(request.Password))
            newEncryptedPassword = _passwordProtector.Protect(request.Password);

        var previousDimensionUnit = existing.DimensionUnit;
        var previousWeightUnit = existing.WeightUnit;

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

        await RescaleDraftsIfUnitsChangedAsync(
            companyId.Value, previousDimensionUnit, previousWeightUnit, request, cancellationToken);

        await _repository.SaveChangesAsync(cancellationToken);

        return Result<ErpSettingsResponse>.Success(ErpSettingsResponse.FromEntity(existing));
    }

    /// <summary>
    /// Birim ayari degisince mevcut taslaklarin olculeri yeniden yorumlanir. Bunu bir
    /// sonraki senkronizasyona birakmak ise yaramaz: ERP tarafinda hicbir sey degismedigi
    /// icin satirlar 'degismedi' sayilip atlanir ve kullanici ayari degistirdigi halde
    /// ekranda eski olculeri gormeye devam ederdi.
    /// </summary>
    private async Task RescaleDraftsIfUnitsChangedAsync(
        Guid companyId,
        ErpDimensionUnit previousDimensionUnit,
        ErpWeightUnit previousWeightUnit,
        UpsertErpSettingsCommand request,
        CancellationToken cancellationToken)
    {
        var dimensionRatio = ErpUnitConverter.CentimeterFactor(request.DimensionUnit)
            / ErpUnitConverter.CentimeterFactor(previousDimensionUnit);
        var weightRatio = ErpUnitConverter.KilogramFactor(request.WeightUnit)
            / ErpUnitConverter.KilogramFactor(previousWeightUnit);

        if (dimensionRatio == 1m && weightRatio == 1m)
            return;

        var drafts = await _draftItemRepository.ListTrackedByCompanyAsync(companyId, cancellationToken);
        foreach (var draft in drafts)
            draft.RescaleMeasures(dimensionRatio, weightRatio);
    }

    /// <summary>
    /// Sirkete tek bir entegrasyon kaydi birakir. Baglanti daha once kaldirilmissa eski
    /// kayit canlandirilir; her kurulumda yenisi acilsaydi ayni ERP urunu her entegrasyon
    /// icin bir taslak daha uretir ve bekleyenler listesi kopyalarla dolardi.
    /// </summary>
    private async Task EnsureIntegrationAsync(
        Guid companyId, UpsertErpSettingsCommand request, CancellationToken cancellationToken)
    {
        if (await _integrationRepository.ExistsByCompanyAsync(companyId, cancellationToken))
            return;

        var systemName = request.ProviderType.ToString();

        var removed = await _integrationRepository.GetLatestDeletedByCompanyAsync(companyId, cancellationToken);
        if (removed is not null)
        {
            removed.Reactivate(systemName, request.ServerAddress);
            return;
        }

        _integrationRepository.Add(new Integration(
            Guid.NewGuid(),
            companyId,
            systemName: systemName,
            apiEndpoint: request.ServerAddress,
            mappingTable: null,
            syncInterval: null));
    }
}
