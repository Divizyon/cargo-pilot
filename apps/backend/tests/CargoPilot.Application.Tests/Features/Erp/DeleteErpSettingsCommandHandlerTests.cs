using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.ErpSettings.DeleteErpSettings;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Tests.Features.Erp;

/// <summary>
/// ERP-37: baglanti kaldirma. Kimlik bilgileri kalici silinir, entegrasyon kaydi
/// pasiflestirilir (senkronizasyon gecmisi korunur).
/// </summary>
public sealed class DeleteErpSettingsCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("22222222-2222-4222-8222-222222222222");

    private readonly IErpSettingsRepository _repository = Substitute.For<IErpSettingsRepository>();
    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private DeleteErpSettingsCommandHandler CreateSut()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        return new DeleteErpSettingsCommandHandler(_repository, _integrationRepository, _currentUserService);
    }

    private static ErpSettingsEntity Settings() =>
        new(Guid.NewGuid(), CompanyId, ErpProviderType.Netsis, "NETSIS2024", "erp_okuyucu", "sifreli", "10.0.0.5");

    [Fact]
    public async Task Handle_KayitYok_NotFoundDoner()
    {
        _repository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns((ErpSettingsEntity?)null);

        var result = await CreateSut().Handle(new DeleteErpSettingsCommand(), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.NotFound);
    }

    [Fact]
    public async Task Handle_KayitVar_AyarSilinirEntegrasyonPasiflesir()
    {
        var settings = Settings();
        var integration = new Integration(Guid.NewGuid(), CompanyId, "Netsis", "10.0.0.5", null, null);
        _repository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _integrationRepository.ListTrackedByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns([integration]);

        var result = await CreateSut().Handle(new DeleteErpSettingsCommand(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _repository.Received(1).Remove(settings);
        integration.IsDeleted.Should().BeTrue();
        await _repository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SirketBaglamiYok_YetkiHatasiDoner()
    {
        _currentUserService.CompanyId.Returns((Guid?)null);
        var sut = new DeleteErpSettingsCommandHandler(_repository, _integrationRepository, _currentUserService);

        var result = await sut.Handle(new DeleteErpSettingsCommand(), CancellationToken.None);

        result.Error!.Type.Should().Be(ErrorType.Unauthorized);
    }
}
