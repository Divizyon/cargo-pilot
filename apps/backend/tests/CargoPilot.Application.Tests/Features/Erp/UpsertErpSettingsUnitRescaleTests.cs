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
/// ERP birim ayari degistiginde mevcut taslaklarin olculeri yeniden yorumlanmalidir.
/// Senkronizasyon bu farki goremez: ERP tarafinda hicbir sey degismedigi icin satirlar
/// 'degismedi' sayilip atlanir ve ekranda eski olculer kalirdi.
/// </summary>
public sealed class UpsertErpSettingsUnitRescaleTests
{
    private static readonly Guid CompanyId = Guid.Parse("44444444-4444-4444-8444-444444444444");

    private readonly IErpSettingsRepository _repository = Substitute.For<IErpSettingsRepository>();
    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly IDraftItemRepository _draftItemRepository = Substitute.For<IDraftItemRepository>();
    private readonly IErpPasswordProtector _passwordProtector = Substitute.For<IErpPasswordProtector>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private UpsertErpSettingsCommandHandler CreateSut(ErpSettingsEntity existing, params DraftItem[] drafts)
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _repository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(existing);
        _integrationRepository.ListByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns([]);
        _draftItemRepository.ListTrackedByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(drafts);
        return new UpsertErpSettingsCommandHandler(
            _repository, _integrationRepository, _draftItemRepository, _passwordProtector, _currentUserService);
    }

    private static ErpSettingsEntity Settings(
        ErpDimensionUnit dimensionUnit = ErpDimensionUnit.Centimeter,
        ErpWeightUnit weightUnit = ErpWeightUnit.Kilogram) =>
        new(Guid.NewGuid(), CompanyId, ErpProviderType.Netsis, "DIVIZYON", "cargopilot_ro", "sifreli",
            "10.0.0.5", false, dimensionUnit, weightUnit);

    private static UpsertErpSettingsCommand Command(
        ErpDimensionUnit dimensionUnit = ErpDimensionUnit.Centimeter,
        ErpWeightUnit weightUnit = ErpWeightUnit.Kilogram) =>
        new(ErpProviderType.Netsis, "DIVIZYON", "cargopilot_ro", "10.0.0.5", null, false, dimensionUnit, weightUnit);

    private static DraftItem Draft(decimal width = 100m, decimal weight = 8m) =>
        new(Guid.NewGuid(), CompanyId, Guid.NewGuid(), "600.02.0004", "{}", "600.02.0004", "Buzdolabi",
            "STANDARD", ItemCategory.Box, width, 190m, 72m, weight, FragilityType.NonFragile,
            true, 1, 0m, AllowedRotations.All);

    [Fact]
    public async Task Handle_OlcuBirimiMilimetreyeDondu_TaslakOlculeriKuculur()
    {
        var draft = Draft(width: 100m);

        await CreateSut(Settings(), draft).Handle(
            Command(dimensionUnit: ErpDimensionUnit.Millimeter), CancellationToken.None);

        // ERP'deki 100 degeri artik milimetre sayiliyor: 100 mm = 10 cm.
        draft.Width.Should().Be(10m);
        draft.Height.Should().Be(19m);
        draft.Length.Should().Be(7.2m);
    }

    [Fact]
    public async Task Handle_AgirlikBirimiTonaDondu_TaslakAgirligiBuyur()
    {
        var draft = Draft(weight: 8m);

        await CreateSut(Settings(), draft).Handle(
            Command(weightUnit: ErpWeightUnit.Ton), CancellationToken.None);

        draft.Weight.Should().Be(8000m);
    }

    [Fact]
    public async Task Handle_BirimGeriAlindi_OlculerBaslangicDegerineDoner()
    {
        var draft = Draft(width: 100m);
        await CreateSut(Settings(), draft).Handle(
            Command(dimensionUnit: ErpDimensionUnit.Millimeter), CancellationToken.None);

        // Kullanici yanlis secip geri donebilir; oran ters yonde de tam kapanmali.
        await CreateSut(Settings(ErpDimensionUnit.Millimeter), draft).Handle(
            Command(dimensionUnit: ErpDimensionUnit.Centimeter), CancellationToken.None);

        draft.Width.Should().Be(100m);
    }

    [Fact]
    public async Task Handle_BirimDegismedi_TaslaklarOkunmaz()
    {
        await CreateSut(Settings()).Handle(Command(), CancellationToken.None);

        // Her ayar kaydinda tum taslaklari cekmek gereksiz maliyet olurdu.
        await _draftItemRepository.DidNotReceive()
            .ListTrackedByCompanyAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_EksikOlcu_SifirKalirVeOranlaCarpilmaz()
    {
        var draft = Draft(width: 0m);

        await CreateSut(Settings(), draft).Handle(
            Command(dimensionUnit: ErpDimensionUnit.Millimeter), CancellationToken.None);

        // Sifir 'ERP'de eksik' isaretidir; oranlanirsa eksiklik rozeti anlamini yitirir.
        draft.Width.Should().Be(0m);
    }
}
