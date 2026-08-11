using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.TriggerSync;
using CargoPilot.Domain.Entities;
using FluentAssertions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Integrations;

public sealed class TriggerSyncCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid IntegrationId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private TriggerSyncCommandHandler CreateSut() =>
        new(_integrationRepository, _currentUserService);

    [Fact]
    public async Task Handle_SirketBaglamiYokken_AuthNoCompanyDoner()
    {
        _currentUserService.CompanyId.Returns((Guid?)null);

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Auth.NoCompany");
        result.Error.Type.Should().Be(ErrorType.Unauthorized);
        await _integrationRepository.DidNotReceiveWithAnyArgs().HasAnyRunningSyncAsync(Guid.Empty, CancellationToken.None);
    }

    [Fact]
    public async Task Handle_SirkettteCalisanSyncVarken_ConflictDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.AlreadyRunning");
        result.Error.Type.Should().Be(ErrorType.Conflict);
        await _integrationRepository.DidNotReceiveWithAnyArgs().GetByIdAsync(Guid.Empty, Guid.Empty);
    }

    [Fact]
    public async Task Handle_EntegrasyonBulunamazsa_NotFoundDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(false);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((Integration?)null);

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Integration.NotFound");
        result.Error.Type.Should().Be(ErrorType.NotFound);
    }

    /// <remarks>
    /// Davranis-sabitleme: manuel sync henuz uygulanmadi. ERP-13 ile gercek senaryoya
    /// cevrildiginde bu test guncellenmeli.
    /// </remarks>
    [Fact]
    public async Task Handle_EntegrasyonVarken_SuAnNotImplementedDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(false);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateIntegration(IntegrationId, CompanyId));

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.NotImplemented");
        await _integrationRepository.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
    }
}
