using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.ErpSettings.TestErpConnection;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Erp;

/// <summary>
/// Baglanti testi davranisi (ERP-22/ERP-23): kimlik bilgisi tipli tasinir, sertifika
/// ayari connector'a aynen gecer ve salt-okunur hesap uyarisi kullaniciya ulasir.
/// </summary>
public sealed class TestErpConnectionCommandHandlerTests
{
    private readonly IErpConnector _connector = Substitute.For<IErpConnector>();

    private static TestErpConnectionCommand Command(bool trustServerCertificate = true) =>
        new(ErpProviderType.Netsis, "10.0.0.5", "MUSTERI_DB", "erp_okuyucu", "gizli", trustServerCertificate);

    private TestErpConnectionCommandHandler CreateSut()
    {
        _connector.ProviderType.Returns(ErpProviderType.Netsis);
        return new TestErpConnectionCommandHandler([_connector]);
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
        var sut = new TestErpConnectionCommandHandler([_connector]);

        var command = Command() with { ProviderType = ErpProviderType.Logo };
        var result = await sut.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.Validation);
    }
}
