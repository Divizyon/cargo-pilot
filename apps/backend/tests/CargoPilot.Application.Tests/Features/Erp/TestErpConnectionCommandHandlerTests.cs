using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.ErpSettings.TestErpConnection;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Tests.Features.Erp;

/// <summary>
/// Baglanti testi davranisi (ERP-22/ERP-23/ERP-36): kimlik bilgisi tipli tasinir, sertifika
/// ayari connector'a aynen gecer, salt-okunur hesap uyarisi kullaniciya ulasir ve sifre
/// gonderilmediginde kayitli sifreyle test yapilip sonuc ayarlara islenir.
/// </summary>
public sealed class TestErpConnectionCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-4111-8111-111111111111");

    private readonly IErpConnector _connector = Substitute.For<IErpConnector>();
    private readonly IErpSettingsRepository _settingsRepository = Substitute.For<IErpSettingsRepository>();
    private readonly IErpPasswordProtector _passwordProtector = Substitute.For<IErpPasswordProtector>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private static TestErpConnectionCommand Command(
        bool trustServerCertificate = true,
        string? password = "gizli") =>
        new(ErpProviderType.Netsis, "10.0.0.5", "MUSTERI_DB", "erp_okuyucu", password, trustServerCertificate);

    private static ErpSettingsEntity ExistingSettings() =>
        new(
            Guid.NewGuid(),
            CompanyId,
            ErpProviderType.Netsis,
            "MUSTERI_DB",
            "erp_okuyucu",
            "sifreli",
            "10.0.0.5");

    private TestErpConnectionCommandHandler CreateSut()
    {
        _connector.ProviderType.Returns(ErpProviderType.Netsis);
        _currentUserService.CompanyId.Returns(CompanyId);
        return new TestErpConnectionCommandHandler(
            [_connector], _settingsRepository, _passwordProtector, _currentUserService);
    }

    [Fact]
    public async Task Handle_YazmaYetkiliHesap_UyariYanittaDoner()
    {
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(new ErpConnectionResult(true, null, "salt-okunur hesap önerilir"));

        var result = await CreateSut().Handle(Command(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.IsSuccess.Should().BeTrue();
        result.Data.Warning.Should().Be("salt-okunur hesap önerilir");
    }

    [Fact]
    public async Task Handle_UyariYoksa_WarningNullKalir()
    {
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(new ErpConnectionResult(true, null));

        var result = await CreateSut().Handle(Command(), CancellationToken.None);

        result.Data!.Warning.Should().BeNull();
    }

    [Fact]
    public async Task Handle_SertifikaAyari_ConnectoreAynenGecer()
    {
        ErpCredentials? gecen = null;
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(c =>
            {
                gecen = c.Arg<ErpCredentials>();
                return new ErpConnectionResult(true, null);
            });

        await CreateSut().Handle(Command(trustServerCertificate: false), CancellationToken.None);

        gecen.Should().NotBeNull();
        gecen!.TrustServerCertificate.Should().BeFalse();
        gecen.Database.Should().Be("MUSTERI_DB");
    }

    [Fact]
    public async Task Handle_DesteklenmeyenSaglayici_ValidationHatasiDoner()
    {
        _connector.ProviderType.Returns(ErpProviderType.Netsis);
        var sut = new TestErpConnectionCommandHandler(
            [_connector], _settingsRepository, _passwordProtector, _currentUserService);

        var command = Command() with { ProviderType = ErpProviderType.Logo };
        var result = await sut.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.Validation);
    }

    [Fact]
    public async Task Handle_SifreGonderilmedi_KayitliSifreyleTestEder()
    {
        var settings = ExistingSettings();
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _passwordProtector.Unprotect("sifreli").Returns("kayitli-sifre");

        ErpCredentials? gecen = null;
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(c =>
            {
                gecen = c.Arg<ErpCredentials>();
                return new ErpConnectionResult(true, null);
            });

        var result = await CreateSut().Handle(Command(password: null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        gecen!.Password.Should().Be("kayitli-sifre");
    }

    [Fact]
    public async Task Handle_SifreYokVeKayitliBaglantiYok_ValidationHatasiDoner()
    {
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns((ErpSettingsEntity?)null);

        var result = await CreateSut().Handle(Command(password: " "), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ErpSettings.PasswordRequired");
    }

    [Fact]
    public async Task Handle_BasariliTest_SonucAyarlaraIslenir()
    {
        var settings = ExistingSettings();
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(new ErpConnectionResult(true, null));

        await CreateSut().Handle(Command(), CancellationToken.None);

        settings.LastTestSucceeded.Should().BeTrue();
        settings.LastTestedAtUtc.Should().NotBeNull();
        settings.HasCurrentConnectionTest().Should().BeTrue();
        await _settingsRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_BasarisizTest_SonucBasarisizOlarakIslenir()
    {
        var settings = ExistingSettings();
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(new ErpConnectionResult(false, "Kullanıcı adı veya şifre hatalı."));

        var result = await CreateSut().Handle(Command(), CancellationToken.None);

        result.Data!.IsSuccess.Should().BeFalse();
        settings.LastTestSucceeded.Should().BeFalse();
        settings.HasCurrentConnectionTest().Should().BeTrue();
    }

    [Fact]
    public async Task Handle_BaskaSunucuAdresiTestEdildi_KayitliAyarlaraGoreGuncelSayilmaz()
    {
        var settings = ExistingSettings();
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(new ErpConnectionResult(true, null));

        await CreateSut().Handle(Command() with { ServerAddress = "10.0.0.9" }, CancellationToken.None);

        settings.LastTestSucceeded.Should().BeTrue();
        settings.HasCurrentConnectionTest().Should().BeFalse();
    }

    /// <summary>
    /// Kayitli sifre, istek kayitli baglantidan sapiyorsa cozulmez: aksi halde sifre
    /// istekle secilen keyfi bir sunucuya gonderilebilirdi.
    /// </summary>
    [Theory]
    [InlineData("ServerAddress")]
    [InlineData("Username")]
    [InlineData("CompanyCode")]
    public async Task Handle_SifreYokVeIstekKayitliBaglantidanFarkli_SifreCozulmez(string degisenAlan)
    {
        var settings = ExistingSettings();
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _passwordProtector.Unprotect(Arg.Any<string>()).Returns("kayitli-sifre");

        var command = Command(password: null);
        command = degisenAlan switch
        {
            "ServerAddress" => command with { ServerAddress = "saldirgan.example.com" },
            "Username" => command with { Username = "baska_kullanici" },
            _ => command with { CompanyCode = "BASKA_DB" },
        };

        var result = await CreateSut().Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ErpSettings.PasswordRequiredForNewConfig");
        _passwordProtector.DidNotReceive().Unprotect(Arg.Any<string>());
        await _connector.DidNotReceive().TestConnectionAsync(
            Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SifreVerildi_FarkliSunucuTestEdilebilir()
    {
        var settings = ExistingSettings();
        _settingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(settings);
        _connector.TestConnectionAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<CancellationToken>())
            .Returns(new ErpConnectionResult(true, null));

        var result = await CreateSut().Handle(
            Command() with { ServerAddress = "yeni-sunucu,1433" }, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _passwordProtector.DidNotReceive().Unprotect(Arg.Any<string>());
    }
}
