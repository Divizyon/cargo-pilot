using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using CargoPilot.Application.Features.Integrations.TriggerSync;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using MediatR;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Integrations;

public sealed class TriggerSyncCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid IntegrationId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly ISender _sender = Substitute.For<ISender>();

    private TriggerSyncCommandHandler CreateSut() =>
        new(_integrationRepository, _currentUserService, _sender);

    private static Result<SyncErpItemsResult> SyncSuccess() =>
        Result<SyncErpItemsResult>.Success(
            new SyncErpItemsResult(Guid.NewGuid(), Added: 2, Updated: 1, Skipped: 0, ErrorCount: 0, MissingFieldCount: 0, RowErrors: []));

    [Fact]
    public async Task Handle_SirketBaglamiYokken_AuthNoCompanyDoner()
    {
        _currentUserService.CompanyId.Returns((Guid?)null);

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Auth.NoCompany");
        result.Error.Type.Should().Be(ErrorType.Unauthorized);
        await _integrationRepository.DidNotReceiveWithAnyArgs()
            .HasAnyRunningSyncAsync(Guid.Empty, DateTime.MinValue, CancellationToken.None);
    }

    [Fact]
    public async Task Handle_SirkettteCalisanSyncVarken_ConflictDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(true);

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.AlreadyRunning");
        result.Error.Type.Should().Be(ErrorType.Conflict);
        await _integrationRepository.DidNotReceiveWithAnyArgs().GetByIdAsync(Guid.Empty, Guid.Empty);
        await _sender.DidNotReceiveWithAnyArgs().Send(Arg.Any<SyncErpItemsCommand>(), CancellationToken.None);
    }

    [Fact]
    public async Task Handle_KilitKontroluZamanAsimiEsigiyleSorulur()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(true);

        await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        await _integrationRepository.Received(1).HasAnyRunningSyncAsync(
            CompanyId,
            Arg.Is<DateTime>(t => t <= DateTime.UtcNow - ErpSyncPolicy.RunningTimeout),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_EntegrasyonBulunamazsa_NotFoundDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((Integration?)null);

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Integration.NotFound");
        result.Error.Type.Should().Be(ErrorType.NotFound);
        await _sender.DidNotReceiveWithAnyArgs().Send(Arg.Any<SyncErpItemsCommand>(), CancellationToken.None);
    }

    [Fact]
    public async Task Handle_EntegrasyonVarken_SyncErpItemsaDelegeEder()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateIntegration(IntegrationId, CompanyId));
        _sender.Send(Arg.Any<SyncErpItemsCommand>(), Arg.Any<CancellationToken>()).Returns(SyncSuccess());

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.IntegrationId.Should().Be(IntegrationId);
        result.Data.SyncStatus.Should().Be(ErpSyncStatus.Idle);
        await _sender.Received(1).Send(
            Arg.Is<SyncErpItemsCommand>(c => c.IntegrationId == IntegrationId),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DelegeEdilenSyncHataDonerse_AyniHatayiIletir()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateIntegration(IntegrationId, CompanyId));
        _sender.Send(Arg.Any<SyncErpItemsCommand>(), Arg.Any<CancellationToken>())
            .Returns(Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.NotFound, "ErpSettings.NotConfigured", "ERP bağlantı ayarları yapılandırılmamış.")));

        var result = await CreateSut().Handle(new TriggerSyncCommand(IntegrationId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ErpSettings.NotConfigured");
    }
}
