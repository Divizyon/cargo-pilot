using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Tests.Features.Erp;

/// <summary>
/// Baglanti kaldirilip yeniden kuruldugunda sirkete ikinci bir entegrasyon acilmamalidir.
/// Taslak tekilligi (IntegrationId, ErpId) uzerinde oldugundan yeni kayit, ayni ERP urununun
/// bekleyenler listesinde bir kez daha gorunmesine yol acardi.
/// </summary>
public sealed class UpsertErpSettingsIntegrationReuseTests
{
    private static readonly Guid CompanyId = Guid.Parse("33333333-3333-4333-8333-333333333333");

    private readonly IErpSettingsRepository _repository = Substitute.For<IErpSettingsRepository>();
    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly IDraftItemRepository _draftItemRepository = Substitute.For<IDraftItemRepository>();
    private readonly IErpPasswordProtector _passwordProtector = Substitute.For<IErpPasswordProtector>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private static readonly UpsertErpSettingsCommand Command = new(
        ErpProviderType.Netsis, "NETSIS2024", "erp_okuyucu", "10.0.0.9", "sifre");

    private UpsertErpSettingsCommandHandler CreateSut()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _passwordProtector.Protect(Arg.Any<string>()).Returns("sifreli");
        _repository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns((ErpSettingsEntity?)null);
        return new UpsertErpSettingsCommandHandler(
            _repository, _integrationRepository, _draftItemRepository, _passwordProtector, _currentUserService);
    }

    private static Integration RemovedIntegration()
    {
        var integration = new Integration(Guid.NewGuid(), CompanyId, "Netsis", "10.0.0.5", null, null);
        integration.UpdateSyncSettings(SyncFrequency.Daily, DateTime.UtcNow.AddHours(-1));
        integration.MarkAsDeleted();
        return integration;
    }

    [Fact]
    public async Task Handle_KaldirilmisEntegrasyonVar_YenisiAcilmazEskisiCanlanir()
    {
        var removed = RemovedIntegration();
        _integrationRepository.GetLatestDeletedByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(removed);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _integrationRepository.DidNotReceive().Add(Arg.Any<Integration>());
        removed.IsDeleted.Should().BeFalse();
        removed.IsActive.Should().BeTrue();
        removed.ApiEndpoint.Should().Be("10.0.0.9");
    }

    [Fact]
    public async Task Handle_EntegrasyonCanlandi_OtomatikSenkronizasyonKapaliBaslar()
    {
        var removed = RemovedIntegration();
        _integrationRepository.GetLatestDeletedByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(removed);

        await CreateSut().Handle(Command, CancellationToken.None);

        // Kullanici acisindan bu yeni bir kurulum; kaldirilmadan onceki zamanlama
        // devam etseydi vadesi gecmis plan ilk taramada habersiz tetiklenirdi.
        removed.SyncFrequency.Should().BeNull();
        removed.NextScheduledSyncAt.Should().BeNull();
    }

    [Fact]
    public async Task Handle_HicEntegrasyonYok_YeniKayitAcilir()
    {
        _integrationRepository.GetLatestDeletedByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns((Integration?)null);

        await CreateSut().Handle(Command, CancellationToken.None);

        _integrationRepository.Received(1).Add(Arg.Is<Integration>(i => i.ApiEndpoint == "10.0.0.9"));
    }

    [Fact]
    public async Task Handle_CanliEntegrasyonVar_KaldirilmisKayitAranmaz()
    {
        _integrationRepository.ExistsByCompanyAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(true);

        await CreateSut().Handle(Command, CancellationToken.None);

        _integrationRepository.DidNotReceive().Add(Arg.Any<Integration>());
        await _integrationRepository.DidNotReceive()
            .GetLatestDeletedByCompanyAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}
