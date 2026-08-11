using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Jobs;
using FluentAssertions;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Jobs;

public sealed class ErpScheduledSyncJobTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly ISender _sender = Substitute.For<ISender>();
    private readonly List<SyncErpItemsCommand> _sentCommands = [];

    private ErpScheduledSyncJob CreateSut() =>
        new(_integrationRepository, _sender, NullLogger<ErpScheduledSyncJob>.Instance);

    public ErpScheduledSyncJobTests()
    {
        ArrangeSyncResult(Result<SyncErpItemsResult>.Success(EmptySyncResult()));
    }

    [Fact]
    public async Task RunAsync_YalnizcaVadesiGelenEntegrasyonlariSenkronizeEder()
    {
        var vadesiGelen1 = ArrangeIntegration(SyncFrequency.Daily, TimeSpan.FromMinutes(-5));
        var vadesiGelen2 = ArrangeIntegration(SyncFrequency.Every4Hours, TimeSpan.FromHours(-1));
        var vadesiGelmeyen = ArrangeIntegration(SyncFrequency.Daily, TimeSpan.FromHours(3));
        ArrangeDueScan(vadesiGelen1, vadesiGelen2, vadesiGelmeyen);

        await CreateSut().RunAsync(CancellationToken.None);

        _sentCommands.Select(c => c.IntegrationId)
            .Should().BeEquivalentTo(new[] { vadesiGelen1.Id, vadesiGelen2.Id });
    }

    /// <remarks>Arka planda HTTP baglami yoktur; sirket kimligi komutla tasinmazsa sync yetkisiz duser.</remarks>
    [Fact]
    public async Task RunAsync_SirketKimliginiKomutlaTasir()
    {
        var integration = ArrangeIntegration(SyncFrequency.Daily, TimeSpan.FromMinutes(-5));
        ArrangeDueScan(integration);

        await CreateSut().RunAsync(CancellationToken.None);

        _sentCommands.Should().ContainSingle()
            .Which.CompanyIdOverride.Should().Be(CompanyId);
    }

    [Fact]
    public async Task RunAsync_CalisanSyncVarsa_VadeKorunurVeSonrakiTaramadaTekrarDenenir()
    {
        var integration = ArrangeIntegration(SyncFrequency.Daily, TimeSpan.FromMinutes(-5));
        var beklenenVade = integration.NextScheduledSyncAt;
        ArrangeDueScan(integration);
        ArrangeSyncResult(Result<SyncErpItemsResult>.Failure(
            new Error(ErrorType.Conflict, "Sync.AlreadyRunning", "Şirket için senkronizasyon zaten çalışıyor.")));

        await CreateSut().RunAsync(CancellationToken.None);

        integration.NextScheduledSyncAt.Should().Be(beklenenVade);
        await _integrationRepository.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    /// <remarks>Sync hic baslamadan reddedilirse vade gecmiste kalir; her taramada ayni hata tekrarlanmamalidir.</remarks>
    [Fact]
    public async Task RunAsync_SyncBaslamadanHataVerirse_VadeIleriAlinir()
    {
        var integration = ArrangeIntegration(SyncFrequency.Every4Hours, TimeSpan.FromMinutes(-5));
        ArrangeDueScan(integration);
        ArrangeSyncResult(Result<SyncErpItemsResult>.Failure(
            new Error(ErrorType.NotFound, "ErpSettings.NotConfigured", "ERP bağlantı ayarları yapılandırılmamış.")));

        await CreateSut().RunAsync(CancellationToken.None);

        integration.NextScheduledSyncAt.Should().BeAfter(DateTime.UtcNow.AddHours(3));
        await _integrationRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    private static Integration ArrangeIntegration(SyncFrequency frequency, TimeSpan nextSyncOffset)
    {
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        integration.UpdateSyncSettings(frequency, DateTime.UtcNow.Add(nextSyncOffset));
        return integration;
    }

    /// <summary>Depo taramasi gercek vade filtresini uygular; is yalnizca donen kayitlari isler.</summary>
    private void ArrangeDueScan(params Integration[] integrations) =>
        _integrationRepository.ListDueForScheduledSyncAsync(Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(call => integrations
                .Where(ErpSyncPolicy.DueForScheduledSync(call.Arg<DateTime>()).Compile())
                .ToList());

    private void ArrangeSyncResult(Result<SyncErpItemsResult> result)
    {
        _sender.Send(Arg.Any<SyncErpItemsCommand>(), Arg.Any<CancellationToken>())
            .Returns(call =>
            {
                _sentCommands.Add(call.Arg<SyncErpItemsCommand>());
                return result;
            });
    }

    private static SyncErpItemsResult EmptySyncResult() =>
        new(
            Guid.NewGuid(),
            Added: 0,
            Updated: 0,
            Skipped: 0,
            ErrorCount: 0,
            MissingFieldCount: 0,
            RowErrors: [],
            SourceTotal: 0,
            DroppedByReason: new Dictionary<string, int>(),
            Unaccounted: 0);
}
