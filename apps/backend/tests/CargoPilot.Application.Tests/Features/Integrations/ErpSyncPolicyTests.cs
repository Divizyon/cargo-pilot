using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Features.Integrations;

public sealed class ErpSyncPolicyTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTime NowUtc = new(2026, 8, 10, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void NextScheduledSyncAt_FrekansYoksa_NullDoner()
    {
        ErpSyncPolicy.NextScheduledSyncAt(null, NowUtc).Should().BeNull();
    }

    [Theory]
    [InlineData(SyncFrequency.Every4Hours, 4)]
    [InlineData(SyncFrequency.Daily, 24)]
    public void NextScheduledSyncAt_FrekansVarsa_SonCalismaAninaGoreIlerler(SyncFrequency frequency, int expectedHours)
    {
        var next = ErpSyncPolicy.NextScheduledSyncAt(frequency, NowUtc);

        next.Should().Be(NowUtc.AddHours(expectedHours));
    }

    [Fact]
    public void DueForScheduledSync_YalnizcaVadesiGelenEntegrasyonlariSecer()
    {
        var vadesiGelen1 = CreateIntegration(SyncFrequency.Daily, NowUtc.AddMinutes(-1));
        var vadesiGelen2 = CreateIntegration(SyncFrequency.Every4Hours, NowUtc.AddHours(-3));
        var vadesiGelmeyen = CreateIntegration(SyncFrequency.Daily, NowUtc.AddHours(2));

        var due = new[] { vadesiGelen1, vadesiGelen2, vadesiGelmeyen }
            .Where(ErpSyncPolicy.DueForScheduledSync(NowUtc).Compile())
            .ToList();

        due.Should().BeEquivalentTo(new[] { vadesiGelen1, vadesiGelen2 });
    }

    [Fact]
    public void DueForScheduledSync_FrekansSecilmemisEntegrasyonuSecmez()
    {
        var otomatikSyncKapali = CreateIntegration(frequency: null, nextScheduledSyncAt: NowUtc.AddHours(-1));

        var due = new[] { otomatikSyncKapali }
            .Where(ErpSyncPolicy.DueForScheduledSync(NowUtc).Compile())
            .ToList();

        due.Should().BeEmpty();
    }

    /// <remarks>
    /// Plan aktarim kaydi urun sync gecmisinde gorunmemeli; o tablonun sayaclari
    /// (kaynak satir, eleme nedeni) aktarim icin anlamsizdir.
    /// </remarks>
    [Fact]
    public void ProductSyncLog_PlanAktarimKayitlariniDisarida_Birakir()
    {
        var integrationId = Guid.NewGuid();
        var urunSync = new SyncLog(Guid.NewGuid(), integrationId);
        var planAktarimi = new SyncLog(Guid.NewGuid(), integrationId, Guid.NewGuid());

        var productLogs = new[] { urunSync, planAktarimi }
            .Where(ErpSyncPolicy.ProductSyncLog.Compile())
            .ToList();

        productLogs.Should().BeEquivalentTo(new[] { urunSync });
    }

    private static Integration CreateIntegration(SyncFrequency? frequency, DateTime? nextScheduledSyncAt)
    {
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        integration.UpdateSyncSettings(frequency, nextScheduledSyncAt);
        return integration;
    }
}
